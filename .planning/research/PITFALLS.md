# Pitfalls Research — v1.3 Scale & Integrate

**Domain:** Adding bulk generation, REST API, team collaboration, advanced analytics, i18n, campaign scheduling, custom short domains, seasonal templates, rate limiting, and error tracking to an existing Astro 5 + Vercel + Turso + Clerk + Stripe SaaS.
**Researched:** 2026-03-31
**Confidence:** HIGH (Vercel hard limits, Astro static/SSR split, Clerk Organizations, Turso write constraints) / MEDIUM (OAuth2 key rotation pattern, custom domain SSL provisioning) / LOW (exact Turso write throughput under concurrent API load)

This document covers pitfalls **specific to v1.3 additions**. Prior PITFALLS.md files (v1.1 for auth/Stripe/Turso connection pooling, v1.2 for AdSense/frame composition/landing pages) remain relevant and are not repeated here.

---

## Critical Pitfalls

---

### Pitfall 1: Bulk ZIP Generation Hits the 4.5 MB Response Body Limit

**What goes wrong:**
A user uploads a CSV of 50 QR codes. The serverless endpoint reads the CSV, generates 50 QR PNG buffers via `qr-code-styling`, compresses them into a ZIP, and tries to return the ZIP as a download response. At ~200 KB per 3× PNG, 50 codes = ~10 MB compressed ZIP. Vercel returns `413: FUNCTION_PAYLOAD_TOO_LARGE` mid-stream. The user gets a broken download with no meaningful error message.

The 4.5 MB limit applies to **both request body and response body** on Vercel serverless functions (all plans, not just Hobby). This is a hard AWS Lambda constraint, not a Vercel configuration option.

**Why it happens:**
The natural implementation — generate everything in one function, stream back a ZIP — works in local development with `vite dev` (no 4.5 MB cap). It fails silently in production. CSV files are small (a few KB), so developers don't think about output size.

**How to avoid:**
Do not generate and stream the ZIP in a single serverless function. Use the same pattern already established for PDF uploads in v1.2: split into two operations.

1. **Generation function** — reads CSV, generates QR code buffers, uploads each PNG directly to Vercel Blob (via `@vercel/blob` `put()`), returns a JSON manifest of blob URLs. This function never streams binary data back through the response body.
2. **Download function** — takes the manifest, fetches the blobs server-side (or streams them into a ZIP client-side using `JSZip` in the browser).

Client-side ZIP assembly is the cleanest option: use `jszip` in the browser to fetch blob URLs and package them. The browser has no 4.5 MB constraint. This also means the server does less work and the user can see a progress indicator.

**Warning signs:**
- Bulk endpoint returns binary data in the response body (not a Blob URL or manifest)
- No integration test that generates >25 QR codes
- Local tests pass but staging downloads are broken

**Phase to address:** Bulk QR generation phase. Must be the first design decision, before any code is written for the download path.

---

### Pitfall 2: Bulk Function Timeout on Large CSV Batches

**What goes wrong:**
Even if the response size is solved, a 200-row CSV where each QR code requires a `qr-code-styling` render + canvas composition (for frames) takes 30–60 ms per code server-side = 6–12 seconds for 200 codes. On Hobby Vercel, the default max duration is 300s (with Fluid Compute enabled), but cold start + initialization easily pushes a per-code CPU cost over budget when the batch size grows. More importantly, the user is staring at a spinner with no feedback.

**Why it happens:**
`qr-code-styling` uses a canvas/DOM environment in Node that is heavier than it looks. Frame composition adds a second canvas pass. Developers prototype with 10-row CSVs and assume the function will scale linearly.

**How to avoid:**
- Move QR generation to the **client side** for bulk too — the same `qr-code-styling` library that powers the live preview can be called in a Web Worker. The user's browser generates all codes locally, exactly as the single-code flow works today. The server only handles: (a) CSV parsing/validation and (b) blob uploads if saving is needed.
- Cap CSV row count at a tier-specific limit enforced before processing (Free: 0, Starter: 50, Pro: 250) to prevent abuse regardless of approach.
- If server-side generation is required, use a queue (Upstash Workflow or QStash) with a background job and a polling endpoint rather than a single long-lived function.

**Warning signs:**
- Bulk endpoint imports `qr-code-styling` as a server-side dependency
- No row count limit enforced before processing begins
- No progress feedback to the user during generation

**Phase to address:** Bulk QR generation phase. Architecture decision (client-side vs server-side generation) must be locked before implementation.

---

### Pitfall 3: REST API Routes Require `output: 'server'` or Per-Route `prerender = false` — Breaks the Static Site

**What goes wrong:**
The current project uses `output: 'static'` in `astro.config.mjs`. Astro static endpoints (`.ts` files in `src/pages/api/`) are called at **build time**, not at request time. An API endpoint like `GET /api/v1/qr-codes` that queries Turso for the authenticated user's saved codes will always return an empty array at build time (no user context exists). POST/DELETE endpoints don't work at all in static mode — only GET is called at build time.

The typical discovery path: developer adds `src/pages/api/v1/qr-codes.ts`, tests locally (Vite dev server behaves like SSR), deploys, gets empty responses or 404s in production.

**Why it happens:**
Astro's dev server simulates on-demand rendering for all routes regardless of `output` setting. The static/SSR split only manifests at build time and in Vercel deployment. The docs mention `export const prerender = false` but this is easy to miss.

**How to avoid:**
Every API route file must include:
```typescript
export const prerender = false;
```
This is non-negotiable for any endpoint that handles live requests. Alternatively, configure `output: 'hybrid'` at the project level (Astro 5 default is `static`, `hybrid` allows per-page opt-out of prerendering). Do not change `output: 'server'` globally — that would make every page SSR and destroy the Lighthouse 100 score.

Add a build-time CI check: if any `src/pages/api/**/*.ts` file does not contain `prerender = false`, fail the build.

**Warning signs:**
- API routes return stale/empty data in production but work in `npm run dev`
- No `export const prerender = false` at the top of API route files
- `astro.config.mjs` still shows `output: 'static'` without `hybrid` mode enabled

**Phase to address:** REST API phase. This is a prerequisite architecture decision. Check during the first API endpoint implementation.

---

### Pitfall 4: Multi-Tenant Data Leakage — Missing `organizationId` in Every Query

**What goes wrong:**
Team collaboration introduces an `organizations` table and an `organizationId` foreign key on `qrCodes`, `dynamicQrCodes`, and `landingPages`. A developer writes a query to list all QR codes for a dashboard:

```typescript
// Looks correct. Is a data leak.
const codes = await db.select().from(qrCodes).where(eq(qrCodes.userId, userId));
```

This returns only the user's own codes — but if the user switches organization context, or if a team member queries through the API, the filter is wrong. The correct filter for team resources is `organizationId`, not `userId`. A single missed `WHERE organizationId = ?` anywhere in the codebase can expose one tenant's QR codes to another.

Turso/libSQL does not have Row-Level Security (RLS). There is no database-level backstop. **Application code is the only enforcement layer.** Every missed filter is a live data breach.

**Why it happens:**
v1.1 and v1.2 were single-tenant (per-user). All queries filtered by `userId`. When organization context is added, most queries are updated but some are missed — especially in edge cases like admin views, analytics aggregation, and webhook handlers.

**How to avoid:**
1. Create a `withOrgScope()` Drizzle query helper that enforces `AND organizationId = ?` on every table that has an org FK. Never write raw `.where(eq(...userId...))` on org-scoped tables directly.
2. After adding organization support, audit every Drizzle query in the codebase with a grep for `from(qrCodes)`, `from(dynamicQrCodes)`, `from(landingPages)` — verify each has org or user scoping appropriate to the context.
3. Write an integration test that creates two organizations with overlapping user IDs, and asserts that querying as org A never returns org B's data.
4. API routes must extract `organizationId` from the validated JWT/session before any DB query, not from the request body (which an attacker can forge).

**Warning signs:**
- Queries filter only by `userId` on tables that have `organizationId`
- No `withOrgScope()` helper or equivalent abstraction in the data layer
- No cross-tenant isolation test in the test suite
- `organizationId` passed as a query parameter or request body field (not from server-validated session)

**Phase to address:** Team collaboration phase. Zero tolerance — any merge that touches DB queries for org-scoped tables must pass the cross-tenant isolation test.

---

### Pitfall 5: Astro i18n Infinite Redirect Loop with `redirectToDefaultLocale` + `prefixDefaultLocale: false`

**What goes wrong:**
The most common Astro i18n misconfiguration causes an infinite redirect loop that crashes the deployment. In Astro v5, if `redirectToDefaultLocale: true` (the old default) is combined with `prefixDefaultLocale: false`, a request to `/` redirects to `/en/`, which then matches the default locale prefix and redirects back to `/` — loop.

In Astro v6, `redirectToDefaultLocale` defaults to `false` and is **only valid** when `prefixDefaultLocale: true`. But the project is on Astro 5, and developers often copy v6 config examples that assume different defaults.

**Why it happens:**
i18n documentation examples vary by Astro version. The config field `redirectToDefaultLocale` has changed defaults between v5 and v6. Developers adding i18n for the first time copy examples without checking version compatibility.

**How to avoid:**
For this project (Astro 5, `output: 'hybrid'`), use:
```javascript
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es', 'fr', 'de'],
  routing: {
    prefixDefaultLocale: false,   // /about not /en/about for English
    redirectToDefaultLocale: false // Must be false when prefixDefaultLocale is false in Astro 5
  }
}
```
Test the routing in local dev before deploying. Add a smoke test that hits `/`, `/es/`, `/fr/`, `/de/` and asserts no redirect chain longer than one hop.

**Warning signs:**
- `redirectToDefaultLocale: true` with `prefixDefaultLocale: false` in the same config
- Copying i18n config from Astro v6 docs while running Astro v5
- Browser shows "Too many redirects" on the homepage after adding i18n config

**Phase to address:** i18n phase — first commit, before any content translation.

---

### Pitfall 6: i18n Breaks Existing `@astrojs/sitemap` Integration and SEO

**What goes wrong:**
The project has a working sitemap at `/sitemap-index.xml` with full coverage. Adding i18n creates duplicate URL paths: `/about` and `/es/about` both exist. Without proper `hreflang` annotations and sitemap i18n configuration, Google sees these as duplicate thin content pages, which penalizes SEO — the opposite of the goal.

Additionally, `@astrojs/sitemap` does not automatically generate `hreflang` link tags in page `<head>`. Developers assume the sitemap integration handles multilingual SEO automatically. It does not.

**Why it happens:**
The sitemap integration generates URLs but does not inject `<link rel="alternate" hreflang="...">` tags. These must be added manually to each page's `<head>` using Astro's `Astro.currentLocale` and `getRelativeLocaleUrl()`.

**How to avoid:**
1. Configure the sitemap integration's `i18n` option to emit per-locale URLs with the correct `hreflang` values:
   ```javascript
   sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' } } })
   ```
2. Add `hreflang` link tags to `BaseLayout.astro` using `getRelativeLocaleUrl()` for each supported locale.
3. Include an `x-default` hreflang pointing to the English URL.
4. After deploying i18n, run a Screaming Frog (or equivalent) crawl and verify no duplicate content flags.

**Warning signs:**
- Sitemap only contains English URLs after i18n is added
- No `<link rel="alternate" hreflang>` tags in page source
- Google Search Console reports duplicate content for `/about` and `/es/about`

**Phase to address:** i18n phase — before enabling any translated pages in production.

---

### Pitfall 7: Campaign Scheduling Relies on Vercel Cron — Which Is Not Precise and Never Retries

**What goes wrong:**
Campaign scheduling requires: "At the configured publish date, flip `dynamicQrCode.isEnabled = true`." Developers implement a Vercel Cron job (`vercel.json` cron entry) that runs every minute and checks for pending campaigns.

Problems:
1. Hobby plan cron runs at most once per day. This feature requires Pro plan to run minutely.
2. Vercel cannot guarantee exact timing — a cron configured for `0 9 * * *` may fire anywhere between 9:00 and 9:59 AM.
3. **Vercel does not retry failed cron invocations.** If the cron function errors (DB timeout, cold start crash), the campaign never activates.
4. Cron jobs do not follow redirects — if the cron endpoint returns a 3xx, the job silently completes.
5. There is no built-in idempotency — if Vercel delivers the same cron event twice (documented as possible), the campaign may try to activate twice and cause duplicate scan events.

**Why it happens:**
Vercel Cron is the obvious first choice for scheduled work. Its limitations are not immediately visible in the docs overview. The retry/idempotency gaps only surface in production under load.

**How to avoid:**
- Use **QStash** (Upstash's message queue with scheduling) as the cron backend instead of Vercel Cron. QStash supports retry with exponential backoff, guaranteed at-least-once delivery, and precise scheduling (minute-granular).
- Alternatively, use Vercel Cron for a polling sweep but make the activation logic **idempotent** (check `isEnabled` before updating, use a `activatedAt` timestamp to skip already-activated records) and add alerting when the sweep finds campaigns past their scheduled date that are still inactive.
- Always record a `scheduledFor` timestamp and an `activatedAt` timestamp on the campaign. If `scheduledFor < now AND activatedAt IS NULL`, the campaign missed its window — surface this in the admin UI.

**Warning signs:**
- `vercel.json` cron expression is `* * * * *` (every minute) — will fail on Hobby plan
- No idempotency check in the cron handler
- Campaign activation uses `UPDATE ... WHERE scheduledFor <= now()` without a `AND activatedAt IS NULL` guard
- No alerting or logging for missed activations

**Phase to address:** Campaign scheduling phase. Decide on QStash vs Vercel Cron before writing any scheduler code.

---

### Pitfall 8: Custom Short Domains Require Wildcard SSL — Which Requires Vercel Nameserver Control

**What goes wrong:**
`go.brand.com` requires: (1) the user adds a CNAME record pointing `go` to Vercel, (2) Vercel issues an SSL certificate for `go.brand.com`, (3) the app routes requests from that hostname to the correct tenant's dynamic QR codes.

The showstopper: Vercel issues individual per-subdomain certificates on demand. This works for `go.brand.com` but requires the domain to be added to the Vercel project via the Vercel API (`POST /v9/projects/{projectId}/domains`). This is a programmatic domain registration step most developers forget to build.

The bigger problem: the user must complete a DNS verification step that can take 24–48 hours to propagate globally. If the app treats domain verification as synchronous ("add domain → use domain"), users get SSL errors for up to 48 hours.

**Why it happens:**
Developers build the database schema and UI for custom domains, then discover the async verification/provisioning loop late. The Vercel Domains API is straightforward but the state machine (pending → verifying → active → error) has to be built from scratch.

**How to avoid:**
1. Build a `customDomains` table with states: `pending_verification`, `verified`, `active`, `error`.
2. After user submits `go.brand.com`, call the Vercel Domains API to register the domain on the project. Store the verification token.
3. Show the user the exact CNAME record to add (not a wall of text — a copyable record).
4. Use a background poller (Vercel Cron or QStash) to check domain verification status via `GET /v9/projects/{projectId}/domains/{domain}` every 15 minutes, updating the DB state.
5. Only route traffic through a verified custom domain. Show a clear "pending DNS propagation" state in the UI.
6. Wildcard subdomain setup (for `*.qr-code-generator-app.com`) requires Vercel nameserver control of the root domain. The project already points Porkbun to Vercel DNS — this is already satisfied.

**Warning signs:**
- No `customDomains` state machine table (just a `customDomain: string | null` column on the workspace)
- Domain added to Vercel project synchronously in the same request as the user's form submit
- No user-facing "DNS pending" state
- No background verification poller

**Phase to address:** Custom domains phase. This is the most infrastructure-heavy feature in v1.3. Needs its own phase with dedicated architecture work.

---

### Pitfall 9: Rate Limiting Built with In-Memory State Resets on Every Cold Start

**What goes wrong:**
Developer adds rate limiting to API routes using a local `Map<string, number>` to track request counts per API key. This works perfectly in local development. In Vercel production, every function invocation may run in a different container (or the same container after a cold start resets all in-memory state). The rate limit map is cleared on every cold start, making the rate limit effectively useless under normal traffic patterns.

**Why it happens:**
In-memory rate limiting is the fastest-to-implement option and works in long-lived server processes (Node.js Express, Fastify). Developers copy this pattern without accounting for the stateless/ephemeral nature of serverless functions.

**How to avoid:**
Use **Vercel KV** (Redis-compatible) or **Upstash Redis** as the rate limit store. The `@upstash/ratelimit` package integrates with both and supports sliding window and fixed window algorithms.

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { kv } from "@vercel/kv";

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req/min
});
```

Declare the `ratelimit` instance **outside** the handler function (module scope) so it survives function re-use within a warm container. This uses Upstash's built-in caching for the window state, reducing Redis round-trips.

**Warning signs:**
- Rate limit state stored in a module-level `Map` or `Set`
- No external Redis/KV dependency in `package.json`
- Rate limit passes load tests locally but fails to enforce limits under concurrent Vercel invocations

**Phase to address:** API rate limiting phase — applies to both the REST API and the public redirect endpoint.

---

### Pitfall 10: Clerk Organizations — Role Permissions Not Scoped to Active Organization

**What goes wrong:**
Clerk Organizations allow users to be members of multiple organizations with different roles in each. A user who is an `admin` in Organization A and a `member` in Organization B logs in. The API endpoint reads `session.claims.org_role` without checking `session.claims.org_id`. When the user switches organization context in the UI but the frontend doesn't trigger a session refresh, the server-side role check still reads the role from the previous active organization — granting admin access in Org B.

**Why it happens:**
Clerk sets `org_role` and `org_id` together in the JWT claims. When the active organization changes, the JWT must be refreshed. If the frontend doesn't call `setActive({ organization: newOrgId })` before making the next API call, the stale JWT still carries the old org context.

**How to avoid:**
1. Every API route that checks organization roles must validate **both** `orgId` and `orgRole` from the session — never `orgRole` alone.
2. After `setActive()` in the frontend, wait for the session token to refresh before making org-scoped API calls. Clerk's `useOrganization()` hook returns a loading state during the switch — honor it.
3. Server-side: verify the `orgId` from the session matches the `organizationId` of the resource being accessed. Don't trust the `organizationId` from the request body — always use the session-derived value.
4. Write an integration test: create a user with admin role in Org A and member role in Org B, make an admin-gated request while the session carries Org A context, verify the request succeeds. Make the same request with Org B context in the JWT, verify it fails.

**Warning signs:**
- API routes check `session.orgRole` without also asserting `session.orgId === resource.organizationId`
- Frontend calls org-scoped API endpoints immediately after `setActive()` without awaiting session refresh
- No integration test for cross-org role boundary

**Phase to address:** Team collaboration phase.

---

### Pitfall 11: API OAuth2 — Storing API Keys as Plaintext in Turso

**What goes wrong:**
Developer adds an `apiKeys` table with `keyValue TEXT` to store OAuth2 client secrets or bearer tokens. Turso is an external database accessible with a connection string. If the Turso DB is compromised (credential leak, misconfiguration), all API keys are immediately usable by an attacker. Every customer API integration is breached.

**Why it happens:**
Keys are typically short strings. Developers treat them like config values and store them as-is. The practice of hashing API keys (like passwords) is less widely known than password hashing.

**How to avoid:**
Never store the full API key value. Use the same pattern as password hashing:
1. Generate a key: `qrc_live_<32-byte-random-hex>` — this is shown to the user once only.
2. Store in DB: `keyHash = sha256(fullKey)`, `keyPrefix = 'qrc_live_xxxx'` (first 8 chars for display), `createdAt`, `lastUsedAt`, `revokedAt`.
3. On API request: hash the incoming bearer token, compare against stored `keyHash`.

This means a DB breach exposes no usable keys. The `keyPrefix` allows users to identify which key is in use without storing the secret.

**Warning signs:**
- `apiKeys` table has a `value TEXT NOT NULL` column that stores the full key
- API key shown in the dashboard was retrieved from DB, not from a one-time creation response
- No `keyHash` column in the schema

**Phase to address:** REST API phase — schema design decision made before any key generation code is written.

---

### Pitfall 12: Sentry Source Maps Not Uploading on Vercel — Errors Show Minified Stack Traces

**What goes wrong:**
Sentry is integrated and errors appear in the dashboard. But stack traces show minified code: `at t (chunk-abc123.js:1:8392)` instead of real function names and file paths. Source maps were not uploaded to Sentry during the Vercel build.

This is the most common Sentry/Vercel integration failure mode. The Sentry Vite plugin runs during build but emits a warning: `No release name provided. Will not inject release.` — which is easy to miss in Vercel build logs. Without a release name, source maps are uploaded but never associated with the deployed version, so Sentry can't apply them.

**Why it happens:**
The Sentry Vite plugin requires `SENTRY_RELEASE` to be set as an environment variable in Vercel. Vercel does not set this automatically. Developers add the Sentry integration and assume the Vercel + Sentry integration handles it. The Vercel Sentry integration creates an auth token but does not set a release name.

**How to avoid:**
In `astro.config.mjs` / `vite.config.ts`, set the release name explicitly:
```javascript
sentryVitePlugin({
  release: { name: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local' },
  sourcemaps: { assets: './dist/**' },
});
```
Set `VERCEL_GIT_COMMIT_SHA` is already populated by Vercel — no manual env var needed.

Also: Sentry Astro SDK only works on **Node.js runtime**, not Edge runtime. The current project uses Node runtime for all API functions (Clerk is incompatible with Edge) — this is already satisfied.

**Warning signs:**
- Sentry events show minified stack traces in production
- Vercel build logs contain: `No release name provided. Will not inject release.`
- `sentryVitePlugin` config does not set `release.name`
- Sentry Vercel integration was deleted and recreated (breaks the internal auth token)

**Phase to address:** Error tracking phase (Sentry setup). Verify source maps are working on the first Sentry-enabled deployment before any other work continues.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `organizationId` scoping on "admin-only" endpoints | Faster implementation | Any future role change creates a data leak surface | Never |
| Store API keys as plaintext | No hashing complexity | Full credential exposure on DB breach | Never |
| Use Vercel Cron for campaign scheduling without idempotency | Quick first implementation | Campaigns randomly miss their window in production | Never |
| Rate limit with in-memory Map | Zero dependencies | Useless in serverless — all limits reset on cold start | Local dev only |
| Single `output: 'static'` for all API routes | Simpler build config | API routes return empty data in production | Never |
| Client-side organization ID from request body | Simpler frontend code | Allows tenant impersonation — always use session-derived org ID | Never |
| Skip hreflang tags for now, add later | Faster i18n launch | Duplicate content penalty accumulates; harder to recover SEO than prevent | Only if launching in one locale at a time with a clear follow-up deadline |
| Generate ZIP server-side without streaming | Simpler mental model | Hits 4.5 MB limit for any batch > ~20 QR codes | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Vercel Functions | Assuming 10s timeout — current limit with Fluid Compute is 300s default, 800s max on Pro | Set explicit `maxDuration` in function config; don't assume the old 10s limit applies |
| Vercel Cron | Using `* * * * *` (minutely) on any plan thinking it's supported | Hobby: daily max. Pro: minutely supported. Check plan before designing scheduling logic |
| Vercel KV | Treating it as persistent storage — it is a Redis cache with eviction | Store rate limit windows in KV; store canonical data in Turso. Never put primary records in KV only |
| Clerk `useOrganization()` | Reading `organization.id` before the hook finishes loading after `setActive()` | Check `isLoaded` before using org context; await session refresh after org switch |
| Turso concurrent writes | Expecting MVCC (concurrent writes) to be production-stable | MVCC is still tagged experimental as of 2026-01. Assume single-writer semantics. Batch writes in a single transaction |
| `@astrojs/sitemap` | Assuming it adds hreflang tags automatically with i18n config | Sitemap integration handles URL generation. Hreflang `<link>` tags must be added manually in BaseLayout.astro |
| Sentry Vercel integration | Assuming the integration handles source map uploads end-to-end | Integration provides auth token only. Must configure `release.name` in Vite plugin manually |
| Vercel Domains API | Adding custom domain synchronously in the request handler | Domain registration is async. Build a state machine: `pending → verifying → active → error` |
| `qr-code-styling` (server) | Importing it in a serverless function expecting a headless canvas environment | The library works in Node but requires `canvas` peer dependency — adds ~40 MB to function bundle, approaching the 250 MB limit. Keep generation client-side |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Bulk QR generation server-side (50+ codes) | 504 timeout on bulk endpoint | Generate in browser Web Worker; server only validates CSV and manages blob storage | >20 codes with frame composition |
| No connection reuse for Turso in API routes | Each API request opens a new libSQL connection, adds 50-200ms | Declare `db` client at module scope (outside handler) so it survives warm re-use | Every API call in production |
| Full QR library fetch for analytics date ranges | `SELECT *` for 90-day date range on `scanEvents` returns thousands of rows | Add index on `(qrCodeId, scannedAt)`. Use aggregation queries — never SELECT all events and count in JS | ~500 scans per QR code |
| Translating URLs (localized slugs) without precomputed route map | Astro `getRelativeLocaleUrl()` called 50x per page build for nav links | Build a static route map at build time; don't compute translations per-render | Large pages with many internal links |
| ZIP generation blocking event loop | ZIP compression in the main thread stalls other concurrent requests in the same warm container (Fluid Compute) | Use streaming ZIP (`archiver` with pipe) or move to client-side | 100+ file ZIP generation |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `organizationId` from request body instead of validated session | Tenant impersonation — attacker reads/modifies another org's QR codes | Always derive `organizationId` from `auth().sessionClaims.org_id` on the server, never from request |
| Plaintext API key storage in Turso | Full credential exposure on DB breach | Hash API keys with SHA-256; store only hash + prefix |
| Unscoped bulk CSV processing | User uploads CSV with other users' QR code IDs and regenerates them | Validate every QR code ID in the CSV belongs to the authenticated user's org before processing |
| No per-API-key rate limiting | One compromised key can exhaust free tier quota or trigger Turso row write limits | Rate limit by API key ID in Vercel KV, not just by IP |
| Custom domain CNAME verification skipped | Attacker registers `go.evil.com` as a custom domain for a different org's workspace | Require DNS TXT ownership verification before activating any custom domain |
| Cron endpoint publicly accessible without secret | Anyone can POST to `/api/cron/activate-campaigns` and trigger mass activation | Check `Authorization: Bearer $CRON_SECRET` header on all cron endpoints; Vercel auto-injects this when configured |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress feedback during bulk CSV processing | User sees spinner for 30s+ on large batch, assumes the page crashed | Show per-row progress counter ("Generating 23/100...") updated via client-side state |
| Campaign "scheduled" but no confirmation of timezone | User in GMT+5 schedules 9 AM, fires at wrong time | Always display and store timestamps in UTC; show the user's local equivalent at the confirmation step |
| i18n language switcher resets user's QR state | User switches language, the generator resets to defaults because URL changes unmount/remount the island | Preserve generator state in sessionStorage or URL params that survive locale navigation |
| Custom domain "pending" shown as generic spinner | User doesn't know what DNS action to take | Show the exact CNAME target, expected TTL, and a "check again" button — not just "pending" |
| Bulk download starts before all codes are generated | First QR code appears in ZIP, rest are missing because generation is async | Gate the download button until all generations are complete; use a progress bar |
| Team invitation email looks like spam | Invitee doesn't join; team owner assumes it's broken | Use a recognizable From address (`noreply@qr-code-generator-app.com`) and include the inviter's name in the subject line |

---

## "Looks Done But Isn't" Checklist

- [ ] **Bulk generation:** Verify the ZIP download works for exactly 51 rows (>50 threshold) on a real Vercel Pro deployment, not just local dev.
- [ ] **REST API:** Test every API endpoint from a fresh `curl` session with no Clerk session cookie — only the bearer token should grant access.
- [ ] **Team collaboration:** Create two organizations, add the same user to both, verify switching orgs updates all dashboard data and no cross-org data bleeds.
- [ ] **API rate limiting:** Confirm the rate limit counter persists across multiple Vercel function invocations (not in-memory) by hitting the limit, waiting for the window, and verifying it resets.
- [ ] **i18n:** Run `Lighthouse` on `/es/`, `/fr/`, `/de/` — confirm scores are within 5 points of the English version.
- [ ] **i18n:** Check Google Search Console 48 hours after deploy — confirm no "Duplicate without user-selected canonical" errors for translated pages.
- [ ] **Campaign scheduling:** Create a campaign scheduled 2 minutes in the future. Verify the QR code URL is inactive before the time and active after. Verify running the cron twice doesn't create duplicate scan events.
- [ ] **Custom domains:** Add a custom domain, verify the DNS "pending" state is shown, verify that attempting to use the domain before verification fails gracefully (not a 500).
- [ ] **Sentry:** Deliberately throw an error from an API route in a staging deploy. Confirm the Sentry alert shows a readable stack trace (not minified).
- [ ] **API keys:** Verify the full key value cannot be retrieved from the dashboard or any API endpoint after initial creation.
- [ ] **Cron security:** Confirm the cron activation endpoint returns 401 when called without the `CRON_SECRET` header.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Multi-tenant data leak discovered | HIGH | Rotate all affected session tokens immediately; audit query logs for cross-org accesses; notify affected users per GDPR/CCPA; add RLS-equivalent query helper and regression test before re-enabling the feature |
| Plaintext API keys already stored | HIGH | Force-rotate all existing keys; inform all API users; rehash on reissue; cannot recover already-leaked keys |
| Bulk endpoint hits 4.5 MB limit in production | MEDIUM | Hotfix: cap batch size at 20 rows server-side. Then rebuild with client-side ZIP assembly. Deploy within 1 release cycle |
| Campaign scheduling missed activations | MEDIUM | Run a one-time backfill script: `UPDATE dynamicQrCodes SET isEnabled=true WHERE scheduledFor <= now() AND activatedAt IS NULL`. Add the poller idempotency fix |
| i18n infinite redirect loop in production | MEDIUM | Revert i18n config commit immediately (Vercel instant rollback). Fix `redirectToDefaultLocale` config. Re-deploy |
| Sentry showing minified stack traces | LOW | Add `release.name` to Vite plugin config. Source maps begin uploading on next deployment. Existing errors remain unresolvable but new ones are readable |
| Rate limit not persisting across invocations | LOW | Add Vercel KV dependency. Migrate rate limiter from in-memory Map to KV store. No data migration needed |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Bulk ZIP hits 4.5 MB response limit | Bulk QR generation | Integration test: generate 51 codes, verify valid ZIP received |
| Bulk generation timeout on large CSV | Bulk QR generation | Perf test: 200-row CSV completes in <30s client-side |
| API routes need `prerender = false` | REST API (first endpoint) | CI check: any `src/pages/api/**` file missing `prerender = false` fails build |
| Multi-tenant data leakage via missing org scope | Team collaboration | Cross-org isolation integration test: Org A query cannot return Org B data |
| Clerk org role not scoped to active org | Team collaboration | Integration test: admin in Org A is not admin in Org B |
| API key stored as plaintext | REST API (schema design) | Schema review: `apiKeys` table has `keyHash`, not `keyValue` |
| i18n infinite redirect loop | i18n (config commit) | Smoke test: no redirect chain >1 hop on `/`, `/es/`, `/fr/`, `/de/` |
| i18n breaks sitemap / SEO | i18n | Validate hreflang tags in page source; sitemap has all locale variants |
| Campaign scheduling misses activations | Campaign scheduling | Scheduled activation integration test with 2-minute lead time |
| Custom domain no async state machine | Custom domains | UI shows `pending_verification` state; domain not routable until verified |
| In-memory rate limiting resets | API rate limiting | Concurrent load test: 200 requests from fresh invocations — limit enforces correctly |
| Sentry source maps not uploading | Error tracking (Sentry setup) | Trigger a deliberate error in staging; confirm readable stack trace in Sentry |

---

## Sources

- [Vercel Functions Limits (official)](https://vercel.com/docs/functions/limitations) — authoritative; 4.5 MB body limit, 300/800s max duration, 1,024 file descriptors
- [Vercel Cron Jobs (official)](https://vercel.com/docs/cron-jobs) — Hobby plan daily-max limit, non-precise timing, no retry behavior
- [Vercel KB: How to bypass 4.5 MB body size limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — streaming and Blob upload patterns
- [Astro i18n Routing (official docs)](https://docs.astro.build/en/guides/internationalization/) — `redirectToDefaultLocale` + `prefixDefaultLocale` interaction
- [Astro i18n issue: `redirectToDefaultLocale` defaults changed in v6](https://github.com/withastro/astro/issues/9300)
- [Astro Endpoints (official docs)](https://docs.astro.build/en/guides/endpoints/) — static endpoints called at build time; `prerender = false` requirement
- [Clerk Multi-Tenant Architecture (official)](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture) — org role/id scoping
- [Clerk Organizations (official)](https://clerk.com/docs/guides/organizations/overview) — roles defined at application level
- [ZenStack: Clerk multi-tenancy with Next.js](https://zenstack.dev/blog/clerk-multitenancy) — org role scoping pitfall example
- [Turso concurrent writes / MVCC blog](https://turso.tech/blog/beyond-the-single-writer-limitation-with-tursos-concurrent-writes) — MVCC still experimental as of early 2026
- [Sentry for Astro (official)](https://docs.sentry.io/platforms/javascript/guides/astro/) — Node-only runtime, source maps config
- [Sentry: troubleshoot source map upload errors on Vercel](https://sentry.zendesk.com/hc/en-us/articles/26753374928155) — release name requirement
- [Upstash Rate Limiting with Vercel Edge](https://upstash.com/blog/edge-rate-limiting) — `@upstash/ratelimit` sliding window pattern
- [Vercel Multi-Tenant Domain Management (official)](https://vercel.com/docs/multi-tenant/domain-management) — per-tenant custom domain provisioning via API
- [SaaS Custom Domains DNS-01 ACME](https://www.dchost.com/blog/en/bring-your-own-domain-get-auto%E2%80%91ssl-how-dns%E2%80%9101-acme-scales-multi%E2%80%91tenant-saas-without-drama/) — async verification pattern
- [Turso Free Tier Limits 2025](https://www.freetiers.com/directory/turso) — 500M row reads / 10M writes / month
- [Clerk Billing limitations](https://clerk.com/docs/guides/billing/overview) — USD-only, no refunds, no tax/VAT
- [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute) — cold start behavior, default enabled for new projects since April 2025

---
*Pitfalls research for: QRCraft v1.3 Scale & Integrate — Astro 5 + Vercel + Turso + Clerk SaaS*
*Researched: 2026-03-31*
