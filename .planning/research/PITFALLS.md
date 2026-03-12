# Pitfalls Research

**Domain:** Adding auth + Stripe freemium + dynamic QR redirect + scan analytics to an existing Astro 5 static site (QRCraft v1.1)
**Researched:** 2026-03-11
**Confidence:** HIGH (Stripe webhook model, Astro output modes, Vercel infra) / MEDIUM (analytics bot filtering, feature-gate patterns in islands) / LOW (exact scale thresholds for this specific workload)

---

## Critical Pitfalls

---

### Pitfall 1: Astro Output Mode Misconfiguration Breaks the Existing Static Site

**What goes wrong:**
The existing site ships as `output: "static"` — fully pre-rendered, Lighthouse 100, zero server cost. Adding auth requires at least some SSR pages. Developers switch the entire site to `output: "server"`, which changes the default rendering mode for every page to on-demand SSR. All formerly-static pages that had no `prerender = true` annotation now hit a serverless function on every request. Lighthouse scores drop, cold start latency appears on the homepage, and Vercel usage costs spike.

**Why it happens:**
The mental model for "I need server rendering" is to set the global output to "server." Astro 5's hybrid model (every page is prerendered by default under `output: "static"`, individual pages opt into SSR with `export const prerender = false`) is less obvious and requires marking every SSR route explicitly. This is the correct model for a mostly-static site adding a few server-rendered pages, but it reads as "extra work."

**How to avoid:**
Keep `output: "static"` as the global setting. Only pages that require server rendering (login, dashboard, API routes, dynamic QR redirect) get `export const prerender = false`. All existing public pages (`/`, `/about`) remain static with zero changes. Middleware still runs on all routes — use it for session reading, not for gating static pages.

Note on Astro 5: the `hybrid` output option no longer exists. The old `hybrid` behavior is now just `static` (the default). Use `static` + per-route `prerender = false`.

**Warning signs:**
- Homepage response headers show `x-vercel-cache: MISS` on every request (should be `HIT` for static)
- Cold start latency appears on the `/` route in Vercel function logs
- Vercel function invocation count equals total page views (should only count API/SSR routes)
- `Astro.request.headers` warning emitted for pages that are supposed to be static

**Phase to address:** Auth phase (Phase 1 of v1.1). Establish the output mode strategy before writing any auth code. Document which pages are SSR and which are static in a comment block in `astro.config.mjs`.

---

### Pitfall 2: Middleware Auth Check Applied to Static Pages Causes Runtime Errors

**What goes wrong:**
Auth middleware reads `Astro.cookies` or `request.headers` to check session state. When middleware runs on a statically prerendered page, these context properties are unavailable at build time, causing build errors or runtime warnings. Alternatively, the middleware silently reads stale header values from the CDN edge, granting or denying access based on cached request context rather than live session state.

**Why it happens:**
Astro middleware runs during SSR request handling, not at build time. On prerendered (static) pages, middleware does not execute at request time on Vercel — the CDN serves the pre-built HTML without invoking the Astro adapter. Developers who write session-check middleware assuming it covers all routes discover that public static pages are never protected by it (which is fine) but also that the middleware cannot inject user state into static pages (which surprises them).

There is also a documented security issue: CVE-2025-61925 and CVE-2025-64525 show that Astro's middleware can be bypassed via `x-forwarded-host` header manipulation on SSR routes, which is relevant when middleware is the sole auth guard.

**How to avoid:**
1. Never rely on Astro middleware as the only auth layer for protected data. Middleware is appropriate for redirect-on-unauthenticated (HTTP 302 for dashboard pages). The actual data must be protected at the API/database level regardless.
2. For static pages that show personalized UI (e.g., "Log in / Your Account" in the nav), handle this in the React island using client-side session state — do not attempt to pass auth state from middleware into static page templates.
3. Upgrade Astro promptly — both CVEs mentioned above have patches. Pin to a version that includes the `x-forwarded-host` validation fix.

**Warning signs:**
- `Astro.request.headers` is used in a `.astro` file that does not have `export const prerender = false`
- Middleware performs database lookups for public static pages (unnecessary cost/latency)
- A static page shows "private" data in the Astro template layer (not inside a React island) — this data is baked into the static HTML at build time, not per-user

**Phase to address:** Auth phase (Phase 1). Write a clear routing table that maps each URL to its render mode and auth requirement before implementing middleware.

---

### Pitfall 3: Stripe Webhook Handler Not Idempotent — Causes Duplicate Pro Grants or Revocations

**What goes wrong:**
Stripe delivers webhooks with at-least-once semantics. Network hiccups, 5xx responses, or deployment restarts cause Stripe to retry the same event. If the webhook handler does not check whether the event was already processed, a `customer.subscription.created` event fires twice and the user is granted Pro status twice (harmless but noisy). More critically, `invoice.payment_failed` fires twice and if the handler revokes Pro access on first delivery, the second delivery creates a confusing state (user sees access revoked, then... nothing, since it was already revoked). The most dangerous scenario: a `checkout.session.completed` that creates a database record fires twice and creates two records, corrupting the subscription state.

**Why it happens:**
Vercel serverless functions have cold starts and tight timeout limits. If the function times out after updating the database but before returning HTTP 200 to Stripe, Stripe marks the delivery as failed and retries. The database record was already written.

**How to avoid:**
1. Store processed event IDs in the database. At the start of every webhook handler: `SELECT 1 FROM processed_webhook_events WHERE stripe_event_id = $1` — if found, return HTTP 200 immediately and do nothing.
2. Use database transactions for the full handler operation: write the business logic change AND the event ID record atomically. If the transaction rolls back, the event ID is not recorded and retry is safe.
3. Return HTTP 200 to Stripe as soon as the idempotency check passes and the transaction commits. Never make outbound network calls (e.g., sending welcome emails) inside the synchronous webhook handler — offload to a job queue or fire-and-forget after returning 200.
4. Set a Stripe webhook signing secret and verify it with `stripe.webhooks.constructEvent()` — this prevents replay attacks but does NOT replace idempotency (legitimate retries pass signature verification).

**Warning signs:**
- Webhook handler has no `processed_webhook_events` table or equivalent check
- Handler sends email or makes external API calls before returning 200
- Handler does not use a database transaction
- Stripe Dashboard shows webhook events with repeated delivery attempts and 5xx responses

**Phase to address:** Stripe billing phase. Implement the idempotency table as the first thing in the webhook handler, before any business logic.

---

### Pitfall 4: Missing Stripe Subscription Events Leaves Users on Wrong Tier

**What goes wrong:**
The application only listens to `checkout.session.completed` to grant Pro access. If the user's card expires, the subscription goes `past_due` and eventually `canceled` — but the application never receives `customer.subscription.deleted` or ignores `customer.subscription.updated`. The user retains Pro access indefinitely without paying.

The reverse also happens: a user upgrades mid-cycle, triggering `customer.subscription.updated` with a new `current_period_end`. If not handled, the user's access expiry in the local database is stale and they may be incorrectly locked out.

**Why it happens:**
Tutorials focus on the happy path (`checkout.session.completed` → grant access). The full subscription lifecycle requires handling at minimum six event types. Teams add events incrementally as they discover problems in production.

**How to avoid:**
Implement all six events from day one:
1. `checkout.session.completed` — new subscription, grant Pro
2. `customer.subscription.updated` — plan change, period renewal, status change (e.g., `past_due` → `active` after retry succeeds)
3. `customer.subscription.deleted` — subscription ended, revoke Pro
4. `invoice.payment_succeeded` — renewal confirmed, extend `current_period_end` in local DB
5. `invoice.payment_failed` — mark subscription as `past_due` in local DB, do not immediately revoke but show in-app warning
6. `customer.subscription.trial_will_end` — (if using trials) notify user

Store the Stripe `subscription.status` and `current_period_end` directly in the local database. Do NOT call the Stripe API on every page request to check subscription status — cache it locally and update via webhooks.

Implement a daily reconciliation cron job that calls `stripe.subscriptions.list()` and compares against local DB. Stripe retries webhooks for 3 days; if the server is down longer, the cron catches the discrepancy.

**Warning signs:**
- Stripe Dashboard shows active subscriptions whose users have `is_pro = false` in local DB (or vice versa)
- Only `checkout.session.completed` appears in the webhook event listener registration
- No reconciliation job exists
- `current_period_end` is never updated after the first month

**Phase to address:** Stripe billing phase. Map all six events to handler functions before any go live.

---

### Pitfall 5: Dynamic QR Redirect Has No Rate Limiting — Enables Phishing Abuse and Cost Blowup

**What goes wrong:**
The redirect service at `qrcraft.app/r/{code}` resolves a short code to a destination URL and issues HTTP 301/302. Without rate limiting, anyone can create thousands of Pro accounts via disposable emails and use the redirect service as a free open redirector for phishing campaigns. Even without malicious intent, a viral QR code that receives 100k scans in an hour will exhaust Vercel serverless concurrency limits and database connection pools, causing all dynamic QR scans to fail simultaneously.

**Why it happens:**
Redirect endpoints are treated as lightweight infrastructure with no auth requirement (the redirect should work for anyone who scans the QR). The combination of "no auth required" + "hits a database" + "potentially on a hot URL" creates an unprotected amplification surface.

**How to avoid:**
1. Rate limit the redirect endpoint by IP: maximum 30 redirects per IP per minute. Use Vercel KV or an in-memory edge store — do not hit Postgres for rate limit checks.
2. Validate destination URLs against a blocklist on creation (not at redirect time). Check against known phishing URL lists or use a service like Google Safe Browsing API.
3. Allow users to deactivate their dynamic QR codes. Deactivated codes should return HTTP 410 (Gone), not 404, so scanners show "this code was intentionally disabled."
4. Use Edge Config (Vercel's global sub-1ms read store) for the active/inactive flag so the redirect function can check deactivation status without a database round trip. Cache the destination URL in Edge Config for hot QR codes (refresh via webhook when user edits destination).
5. Monitor for short codes receiving anomalously high scan rates. Alert at 1000 scans/hour per code.

**Warning signs:**
- Redirect endpoint has no rate limiting middleware
- No destination URL validation on QR creation
- Database receives a query for every single scan (no caching layer)
- No way for a user to disable a compromised QR code immediately

**Phase to address:** Dynamic QR redirect phase. Rate limiting and destination validation must be built before the feature ships. Do not add them post-launch.

---

### Pitfall 6: Redirect Performance Kills the Core Value Proposition

**What goes wrong:**
Dynamic QR scans go through: phone camera → QRCraft redirect URL → Stripe/database lookup → destination. If this redirect takes >500ms, users assume the QR code is broken and re-scan. Printed materials are abandoned. The comparison to a static QR (which redirects in <50ms to the real URL) makes the dynamic QR feel inferior.

In practical terms: a Vercel serverless function in `us-east-1` making a Postgres query to a database in `eu-west-1` adds 150-200ms of network latency per redirect on top of cold start time (can be 300-500ms on first hit after idle).

**Why it happens:**
The redirect is architected like a normal API endpoint — an SSR function that queries Postgres, finds the destination, and redirects. This is correct for functionality but wrong for performance. Redirect latency must be treated like CDN asset delivery, not like an API call.

**How to avoid:**
1. Use Vercel Edge Middleware (not a serverless function) for the redirect handler. Edge Middleware runs at the CDN layer globally, eliminating geographic latency. It does not support Postgres directly, which is intentional — it forces the caching architecture.
2. Store the `{short_code: destination_url}` mapping in Vercel Edge Config. Edge Config reads complete in <1ms P99 globally. Capacity is sufficient for thousands of QR codes.
3. On QR creation or destination edit: write to Postgres (source of truth) AND write to Edge Config (cache). Cache invalidation is explicit and event-driven.
4. For Edge Config capacity limits (currently 512KB per project on Pro plan): store only active QR codes. Archived/deactivated codes are excluded. If you exceed capacity, fall back to Vercel KV (Redis-backed, ~5ms reads globally).
5. Cold start does not apply to Edge Middleware — it runs as V8 isolates that are always warm.

Target redirect latency: <100ms P99 globally, including DNS resolution.

**Warning signs:**
- Redirect handler is a Node.js serverless function in a single region
- Every redirect queries Postgres directly
- No caching layer between the redirect endpoint and the database
- Redirect p99 latency exceeds 300ms in monitoring

**Phase to address:** Dynamic QR redirect phase. Edge Middleware + Edge Config architecture must be the initial design, not an optimization retrofit.

---

### Pitfall 7: Scan Analytics Inflated by Bot Traffic and Link Previews

**What goes wrong:**
The "Scans" count for a dynamic QR code quickly becomes meaningless. Sources of inflation:
1. **URL preview bots**: Slack, iMessage, WhatsApp, and social platforms pre-fetch URLs to generate link previews. If a user shares the redirect URL in a message, every recipient's device fetches it for preview generation — none are actual QR scans.
2. **Security scanners**: Corporate email gateways and antivirus services fetch every URL in messages to check for malware. These appear as real HTTP requests.
3. **Search engine crawlers**: Google and Bing may crawl short redirect URLs found in sitemaps or external links.
4. **Headless browser automation**: Competitor monitoring tools, uptime checkers, and web scrapers.

A QR code distributed at a conference with 500 physical attendees might show 3,000 "scans" — 6x inflation — causing users to distrust the analytics entirely.

**Why it happens:**
Analytics are implemented by logging every HTTP hit to the redirect endpoint. The developer treats all HTTP requests as human scans.

**How to avoid:**
1. Filter by `User-Agent`: strip requests from known bots using the IAB/ABC International Spiders and Bots List. Maintain a custom list for Slack (`Slackbot-LinkExpanding`), iMessage (`Twitterbot` and Apple preview agents), and WhatsApp (`WhatsApp`).
2. Filter by HTTP method: only log GET requests that do not have `X-Purpose: preview` or `Purpose: prefetch` headers.
3. Filter by response code: only log requests that result in a redirect (3xx). Requests that short-circuit due to rate limiting or deactivation are not scans.
4. Implement JavaScript-based beacon logging as an alternative: instead of logging at redirect time, serve a tiny redirect page that fires a `navigator.sendBeacon()` before redirecting. This fires from actual browsers, not curl/bots. Trade-off: adds ~100ms to redirect UX.
5. For MVP: log all hits and store the raw user agent. Build the filtering into the analytics display query, not the data collection. This lets you improve filtering retroactively without losing historical data.

**Warning signs:**
- Scan count on a newly created QR code is already >0 before any physical use
- Scan count spikes when the destination URL is shared in a Slack message
- User-Agent is not stored in scan records (cannot retroactively filter)
- Analytics count all HTTP requests including 4xx and 5xx responses

**Phase to address:** Scan analytics phase. Store raw user agents from day one. Apply bot filtering in the display layer. Upgrade filtering logic based on real data in v1.2.

---

### Pitfall 8: Pro Feature Flash of Ungated Content in React Islands

**What goes wrong:**
The QRGeneratorIsland is loaded with `client:visible`. On initial render (before hydration), all UI elements are visible at their default state. When hydration completes, the component fetches session state, discovers the user is not Pro, and hides or locks certain options (custom shapes, logo upload). The user sees the full unlocked UI for 200-800ms before the gate appears — a "flash of ungated content" (FOGC).

The inverse also occurs: a Pro user sees locked UI briefly before hydration confirms their tier, which is less damaging but still jarring.

**Why it happens:**
`client:visible` delays hydration until the island enters the viewport. Auth/session state is not available until hydration completes and a session check resolves (an async operation). The component cannot know the user's tier during SSR because the page is statically prerendered — the server never sees the request.

**How to avoid:**
1. Server-render the auth state into the page as a script tag. In the Astro page template (which runs SSR for any page with `prerender = false`), read the session cookie and inject `<script>window.__USER_TIER__ = "pro"</script>` into the HTML. The island reads this synchronously during hydration, before any async fetch, eliminating the flash.
2. For the specific case of the main generator page (currently static, `prerender = false` would add SSR latency): inject tier as an opaque placeholder that defaults to "free" — show free tier UI by default. Pro unlock is revealed after hydration confirms the tier. This means Pro users see a brief "free UI" flash, but free users (the majority) never see any flash. This is the better trade-off given the free anonymous use case is the core value.
3. Use `client:load` (not `client:visible`) for the feature-gate logic specifically — feature gating must resolve before the user can interact. Use `client:visible` only for non-gated preview sections. Or more practically: keep `client:visible` for the overall island but gate individual elements with an `isLoading` state that shows a skeleton, not locked controls.
4. Never expose "gated" options as visible-but-disabled during the loading state — show a neutral skeleton or nothing. "Visible-but-disabled" is worse than a skeleton because it trains users to try interacting with Pro options before discovering they need to upgrade.

**Warning signs:**
- `useEffect` fetches session on mount; component renders "free" UI first, then "Pro" UI — two renders visible to user
- `client:visible` is used on an island that contains gated feature UI
- No `isLoading` state: component immediately renders final (gated or ungated) UI on first render
- The Astro page containing the island is fully static with no user context injected

**Phase to address:** Auth + Pro gating phase. Design the session injection strategy (server-injected window variable vs client fetch) before building any gated UI. Document the decision in the phase plan.

---

### Pitfall 9: Vercel Serverless Function Database Connection Pool Exhaustion

**What goes wrong:**
API routes for the saved QR library, session handling, and webhook processing each instantiate a Postgres connection pool. Under traffic, Vercel spins up multiple concurrent function instances. Each instance holds its own pool. If each function opens 5 connections and Vercel runs 20 instances, the database receives 100 simultaneous connections — exhausting a standard Postgres limit (typically 25-100 connections on hosted plans). New connections are rejected with `too many clients` errors. The entire application goes down for database-dependent operations.

This is a well-documented Vercel+Postgres failure mode and has bitten many teams who tested with low traffic.

**Why it happens:**
Traditional connection pooling assumes a long-running process that reuses connections over time. Serverless functions are stateless and potentially short-lived. The pool is per-instance, and instances are not coordinated.

**How to avoid:**
1. Use an external connection pooler (PgBouncer in transaction mode) between the application and Postgres. Supabase includes this built-in (port 6543 is the pooler endpoint). Neon includes it. If using a raw Postgres provider, deploy PgBouncer as a sidecar or use Supabase's managed pooler.
2. Set `max: 1` per function connection pool when using PgBouncer — the pooler manages the actual connection reuse. Counterintuitively, each serverless function should hold at most 1 connection; the pooler provides the illusion of a large pool.
3. Use Vercel Fluid Compute for functions that share database connections — Fluid routes concurrent requests to the same warm instance, reducing connection count.
4. Never instantiate the DB pool at module scope in a way that creates connections on import. Use lazy initialization so connections are only opened when the function actually handles a request.

**Warning signs:**
- `max_connections` reached errors in Postgres logs during load tests
- Connection pool `max` is set to 5 or higher in serverless function code
- No external pooler between Vercel and Postgres
- Functions import and initialize the DB client at module scope

**Phase to address:** Auth phase (Phase 1 of v1.1) — the database and connection strategy must be established before any feature that makes DB calls is implemented.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store Stripe subscription status only on first `checkout.session.completed`, never update | Simple initial implementation | Users stuck on wrong tier after plan change, cancellation, or payment failure | Never — add all 6 events from day one |
| Check Pro access by calling `stripe.subscriptions.retrieve()` on every page load | Always fresh data from Stripe | Rate limits, 200-400ms latency per page, Stripe API cost; brittle if Stripe has an incident | Never — cache status in local DB, update via webhooks |
| Use Astro `output: "server"` globally rather than per-route SSR | Simple mental model | All formerly-static pages become serverless calls; Lighthouse scores drop; Vercel costs spike | Only if the site is >50% server-rendered pages (it is not) |
| Log every redirect hit without bot filtering | Accurate raw count, easy to implement | Analytics become meaningless; users file support tickets about inflated counts | Acceptable at MVP only if raw user agents are stored for retroactive filtering |
| No idempotency check on webhook handler | Simpler initial code | Duplicate Pro grants, double-revocations, corrupted subscription state | Never — idempotency table takes 30 minutes to add |
| Default Pro feature gating with `useState(false)` that resolves after session fetch | Fastest to code | FOGC flash; free users briefly see Pro UI before it locks | Never for "hidden-until-Pro" features; acceptable for "locked-Pro" visual state |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Checkout | Redirect to Stripe success URL and grant Pro immediately on client side | Pro access only granted after `checkout.session.completed` webhook is received and validated |
| Stripe + Supabase | RLS policies not updated for `is_pro` column — free users can query Pro data if policy is missing | Add RLS policy: `USING (auth.uid() = user_id AND is_pro = true)` for Pro-only tables before inserting any data |
| Astro middleware + Vercel | Middleware runs on all routes including static assets and Next/Image responses, adding latency | Use `config.matcher` in middleware to exclude `/_astro/`, `/public/`, and all asset extensions |
| Vercel Edge Config + dynamic QR | Edge Config writes take ~100ms and are eventually consistent across regions | After writing, return the new destination URL in the API response so the UI updates immediately without waiting for Edge Config propagation |
| Stripe Customer Portal | Customer portal uses Stripe-hosted URL that expires in 5 minutes | Create a new portal session URL on every user visit; do not cache portal URLs |
| Auth session cookie + Astro islands | `client:visible` island reads cookie in `useEffect` — fires only after scroll | Use `client:idle` for auth-dependent islands on the main page; `client:visible` is correct for below-fold content that is not auth-dependent |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Direct Postgres query per dynamic QR redirect | Redirect P99 >300ms; DB CPU spikes on viral QR codes | Edge Middleware + Edge Config caching for active redirect mappings | At ~1,000 concurrent scans |
| Session validation on every API request via Stripe API call | Dashboard pages take 2-3s to load | Cache session in Supabase/Postgres, validate JWT locally | Immediately — every page load |
| No database connection pooler (PgBouncer) | `too many clients` errors under load; total DB outage | Use Supabase pooler port or deploy PgBouncer | At ~20 concurrent Vercel function instances |
| Scan analytics written synchronously inside redirect handler | Redirect blocked waiting for DB write; latency spike | Write analytics to a queue or use fire-and-forget with `waitUntil()` (Vercel Edge) | At ~500 concurrent scans |
| Bot traffic unfiltered in scan count | Analytics double or triple real scan count; storage grows 3-5x faster than expected | User-agent filtering in display query; beacon logging for human verification | Immediately on any QR code shared digitally |
| All Pro-gated options visible on initial render before session fetch | Layout thrash; "flash of locked controls" UX | Default to free UI; hydrate tier asynchronously; no gated controls visible until tier confirmed | Every page load for every user |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Open redirect without destination validation | Dynamic QR used as phishing vector; brand damage; potential legal liability | Validate destination URLs on creation against blocklist; URL scheme allowlist (http/https only; no `javascript:`, `data:`, `ftp:`) |
| Stripe webhook endpoint without signature verification | Fake webhook events granting Pro to arbitrary users | `stripe.webhooks.constructEvent(rawBody, signature, endpointSecret)` — never parse JSON directly |
| Pro feature gates enforced client-side only | Any user who edits localStorage/cookies or intercepts the session check gets free Pro access | All Pro data (saved QR library, analytics) must be behind server-side auth checks at the API level; client-side gating is UX-only |
| User A can read/write User B's QR codes | Direct-object reference vulnerability if QR IDs are sequential integers | Use UUIDs for QR code IDs; add `WHERE user_id = auth.uid()` to every query; use Supabase RLS |
| Session cookie not `HttpOnly` + `Secure` + `SameSite=Strict` | XSS can steal session token; CSRF attacks | Auth library (Lucia/Auth.js) sets these by default — verify cookie attributes in browser DevTools before launch |
| Dynamic QR destination stored without sanitization | Stored XSS if destination URL is ever rendered in HTML without escaping | Treat destination URL as untrusted user input; validate on write, encode on display |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Forced signup before first QR generation | Destroys the core "no signup, instant QR" value; free users bounce | Keep free anonymous generation unchanged; only prompt signup when user tries to save, create dynamic QR, or access analytics |
| Abrupt Pro gate with no explanation | User clicks a feature, nothing happens, no context | Show upgrade modal with specific benefit: "Dynamic QR codes let you change the destination after printing — upgrade to Pro" |
| Stripe redirect opens in same tab, breaks back button | User completes payment, lands on Stripe success page, presses back, ends up on Stripe not on the app | Use `stripe.redirectToCheckout()` or Stripe Checkout with explicit `success_url` pointing back to the app; never let success_url be Stripe's domain |
| Pro status shown as binary badge only | User does not know when their subscription renews or what happens if payment fails | Show plan name + renewal date + payment status in account settings; send email 7 days before renewal |
| Scan analytics with no time axis | Users see "total scans" but cannot identify when a print campaign ran | Show scan count over time (7d/30d/all-time); make time range selectable from day one |
| Deleting a dynamic QR code does not warn about orphaned scans in print | Printed materials still carry the short URL; after deletion it returns 404 | Warn: "This QR code is already printed. Deleting it will break all physical copies. Deactivate instead?" |

---

## "Looks Done But Isn't" Checklist

- [ ] **Stripe webhooks**: Endpoint only handles `checkout.session.completed` — verify all 6 subscription lifecycle events are handled before launch
- [ ] **Webhook idempotency**: Handler has no duplicate event check — verify a `processed_webhook_events` table exists and is checked first
- [ ] **Astro output mode**: Global `output: "server"` is set — verify only protected/SSR routes have `prerender = false`; all public pages must retain static rendering
- [ ] **Connection pooling**: Postgres pool `max` is >1 per function — verify a PgBouncer pooler is in use; `max` should be 1 per function instance
- [ ] **Pro gating at API level**: Pro UI is hidden client-side — verify every API route serving Pro data checks `is_pro` server-side and returns 403 for free users
- [ ] **Redirect caching**: Dynamic QR redirect queries Postgres directly — verify Edge Config or KV cache is in front of the database for redirect lookups
- [ ] **Bot filtering**: Scan analytics count all HTTP requests — verify user agents are stored and known-bot user agents are excluded from displayed counts
- [ ] **Subscription reconciliation**: No cron job — verify a daily reconciliation job compares local DB against Stripe and alerts on discrepancy
- [ ] **Destination URL validation**: Dynamic QR accepts any URL scheme — verify allowlist enforcement (`http://`, `https://` only) and blocklist check on save

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Global `output: "server"` set incorrectly | LOW | Add `export const prerender = true` to all public pages; redeploy. No data loss. |
| Missing subscription events left Pro users on wrong tier | MEDIUM | Run reconciliation script against Stripe API to find discrepancies; manually fix affected users in DB; add missing event handlers; redeploy |
| Webhook handler processed same event twice | MEDIUM | Audit `subscriptions` table for duplicate entries; de-duplicate; add idempotency table; deploy fix |
| Dynamic QR redirect used for phishing | HIGH | Immediately deactivate offending QR codes; add destination URL blocklist retroactively; notify affected users; potentially involve Stripe for chargebacks if platform was used fraudulently |
| Postgres connection exhaustion caused outage | MEDIUM | Restart DB connection pool; add PgBouncer; reduce function `max` connection count; redeploy. Potential brief data inconsistency if write-in-flight. |
| Scan analytics inflated by bots (months of bad data) | LOW (data quality) | Apply retroactive user-agent filter to display queries; raw data is preserved; no data recovery needed, only display fix |
| FOGC flash noticed by users | LOW | Ship server-injected tier variable to eliminate flash; no data impact |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Astro output mode misconfiguration | Phase 1: Auth | Check Vercel function log — homepage should show `x-vercel-cache: HIT`, not a function invocation |
| Middleware applied to static pages | Phase 1: Auth | Build and deploy to staging; confirm static pages are served from CDN cache header |
| Webhook handler not idempotent | Phase 2: Stripe Billing | Send duplicate test event from Stripe CLI; confirm DB has only one record |
| Missing subscription lifecycle events | Phase 2: Stripe Billing | Stripe CLI: test all 6 event types in sequence; verify DB reflects correct state after each |
| Dynamic QR redirect no rate limiting | Phase 3: Dynamic QR | Load test redirect endpoint at 100 RPS; confirm 429 responses appear before DB connections saturate |
| Redirect latency too high | Phase 3: Dynamic QR | Measure redirect P99 from a non-US location; must be <100ms with Edge Middleware + Edge Config |
| Open redirect / phishing | Phase 3: Dynamic QR | Attempt to create QR with `javascript:` URL and `ftp://` URL; both must be rejected |
| Scan analytics bot inflation | Phase 4: Analytics | Send requests from known bot user agents; verify they are excluded from displayed scan count |
| FOGC in React island | Phase 1/5: Auth + Pro gating | Slow-network DevTools throttle (Fast 3G); inspect frames — no Pro options should be visible before session resolves |
| Postgres connection exhaustion | Phase 1: Auth | Load test with 50 concurrent requests; verify no `too many clients` errors; check `pg_stat_activity` connection count |
| Pro-gating client-side only | Phase 5: Pro feature gates | Fetch Pro API endpoint with a free user's JWT; must return 403 |
| Subscription status stale in DB | Phase 2: Stripe Billing | Cancel a subscription in Stripe Dashboard; within 5 minutes, verify local DB `is_pro = false` |

---

## Sources

- Astro 5 official docs — on-demand rendering, output modes, middleware — [docs.astro.build/en/guides/on-demand-rendering/](https://docs.astro.build/en/guides/on-demand-rendering/) — HIGH confidence
- Astro v5 upgrade guide — `hybrid` output option removal — [docs.astro.build/en/guides/upgrade-to/v5/](https://docs.astro.build/en/guides/upgrade-to/v5/) — HIGH confidence
- CVE-2025-61925 / CVE-2025-64525 — Astro middleware bypass via `x-forwarded-host` — [github.com/advisories/GHSA-hr2q-hp5q-x767](https://github.com/advisories/GHSA-hr2q-hp5q-x767) — HIGH confidence
- Stripe documentation — webhook event types for subscriptions — [docs.stripe.com/billing/subscriptions/webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — HIGH confidence
- Stripe documentation — idempotent requests — [docs.stripe.com/api/idempotent_requests](https://docs.stripe.com/api/idempotent_requests) — HIGH confidence
- Stripe blog / Stigg — webhook best practices — [stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks) — MEDIUM confidence
- Vercel Edge Config documentation — [vercel.com/docs/edge-config](https://vercel.com/docs/edge-config) — HIGH confidence
- Vercel database latency — [db-latency.vercel.app](https://db-latency.vercel.app/) — HIGH confidence
- Vercel connection pooling with serverless functions — [vercel.com/kb/guide/connection-pooling-with-functions](https://vercel.com/kb/guide/connection-pooling-with-functions) — HIGH confidence
- Vercel Fluid Compute + Postgres connection exhaustion — [solberg.is/vercel-fluid-backpressure](https://www.solberg.is/vercel-fluid-backpressure) — MEDIUM confidence
- Vercel BotID documentation — [vercel.com/docs/botid](https://vercel.com/docs/botid) — HIGH confidence
- IAB/ABC International Spiders and Bots List — industry standard for bot filtering — MEDIUM confidence (training knowledge; verify current list)
- Auth0 community — race condition between `isAuthenticated` and `isLoading` — [community.auth0.com/t/react-auth0-possible-race-condition/16619](https://community.auth0.com/t/react-auth0-possible-race-condition/16619) — MEDIUM confidence
- QR code analytics best practices — [qr-insights.com/blog/qr-code-analytics-metrics-guide](https://www.qr-insights.com/blog/qr-code-analytics-metrics-guide) — LOW confidence (single source, vendor blog)

---
*Pitfalls research for: QRCraft v1.1 — monetization layer on existing Astro 5 static site*
*Researched: 2026-03-11*
