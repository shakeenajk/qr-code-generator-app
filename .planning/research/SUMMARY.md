# Project Research Summary

**Project:** QRCraft v1.1 — Freemium Monetization Layer
**Domain:** SaaS freemium add-on on existing Astro 5 + Vercel static site
**Researched:** 2026-03-11
**Confidence:** HIGH

## Executive Summary

QRCraft v1.1 adds a full freemium monetization layer — auth, Stripe billing, saved QR library, dynamic QR redirect, and scan analytics — on top of a complete, production-quality static QR generator. The research establishes a clear stack: Clerk for auth, Turso (libSQL) with Drizzle ORM for the database, Stripe Checkout for payments, and Vercel edge functions for the latency-critical redirect service. The project requires switching Astro from its current static-only output to a hybrid model where the homepage and marketing pages stay fully prerendered (preserving Lighthouse 100) while new dashboard, API, and redirect routes run server-side. The critical insight is that Astro 5's `output: 'static'` already supports per-route SSR via `export const prerender = false` — no global mode change is needed, and adding `@astrojs/vercel` as an adapter is the only required `astro.config.mjs` change.

The recommended approach groups work into five sequential phases, each unlocking the next. Auth and database come first because every other v1.1 feature depends on user identity. Stripe billing comes second because it defines what "Pro" means before any Pro features are built. The saved QR library, dynamic redirect service, and scan analytics follow in strict dependency order — you cannot have dynamic QR without a redirect service, and you cannot have scan analytics without scans being recorded. This ordering eliminates integration dead ends and ensures each phase produces a shippable increment.

The primary risks are operational, not technical. A non-idempotent Stripe webhook handler causes corrupted subscription state that is expensive to recover. The redirect endpoint run as a serverless function instead of an edge function produces unacceptable redirect latency that undermines the core value of dynamic QR codes. Storing raw IP addresses for scan analytics creates GDPR exposure. All three are prevention problems — trivial to avoid when building correctly and expensive to fix post-launch. The research flags specific acceptance criteria for each phase to prevent these from shipping.

---

## Key Findings

### Recommended Stack

The new infrastructure for v1.1 layers onto the existing Astro 5 + React islands + Tailwind v4 + Vercel stack without replacing anything. The single most significant config change is adding `@astrojs/vercel` as an adapter — one line in `astro.config.mjs` — which unlocks server-side rendering for individual routes while leaving the static homepage unchanged.

**Core technologies (new for v1.1):**
- `@clerk/astro` ^2.16.2: Auth — sign-up, sign-in, session, route protection. Official Astro SDK with pre-built UI components and `clerkMiddleware()`. Eliminates custom auth UI entirely. 10K MAU free tier is appropriate for MVP scale.
- `stripe` ^20.4.1 + `@stripe/stripe-js` ^5.x: Payments via Stripe Checkout (hosted). Handles PCI compliance, 3DS, Apple Pay, and billing portal. ~2 hours to integrate vs ~2 days for custom Elements.
- `@libsql/client` ^0.14.x: Turso/libSQL database client. HTTP-based SQLite — no connection pool management, sub-5ms overhead, edge-runtime compatible via `@libsql/client/web`. Free tier is generous; minimum paid is $4.99/mo vs $25/mo for Postgres alternatives.
- `drizzle-orm` ^0.45.1 + `drizzle-kit` ^0.30.x: ORM with native libSQL driver. TypeScript-first, schema-as-code. Confirmed edge-runtime compatible per official Drizzle docs.
- `nanoid` ^5.x: Short-code generation. The `qr_codes.id` (10 chars) serves as both primary key and redirect short code — no separate URL mapping table needed.

**Critical config note:** Use `import vercel from '@astrojs/vercel'` (not the deprecated `/serverless` sub-path). Keep `output: 'static'` in `astro.config.mjs` — Astro 5 hybrid is implicit. Add `adapter: vercel()`. Do NOT switch to `output: 'server'` globally or all formerly-static pages become serverless functions.

**Stack conflict note:** ARCHITECTURE.md references Better Auth + Neon Postgres as an alternative. STACK.md recommendations (Clerk + Turso) are more current and better validated against Astro 5. Use STACK.md as authoritative for technology choices; use ARCHITECTURE.md for patterns, component boundaries, and data flows.

### Expected Features

The v1.0 static generator is complete and ships unchanged. All v1.1 work is additive. Static QR generation must remain fully anonymous and ungated — it is the primary acquisition channel for Pro conversion.

**Must have (table stakes — v1.1 MVP):**
- Email/password auth with session management — identity foundation for everything else
- Stripe Checkout + Customer Portal — revenue and self-serve billing management (legal compliance in many jurisdictions)
- Saved QR library (Pro) — create, name, edit, delete saved QR codes with serialized qr-code-styling settings
- Dynamic QR codes with editable destination URL (Pro) — the #1 Pro feature in the category; print once, change destination forever
- Short-URL redirect service (`/r/:code`) with scan logging — prerequisite for dynamic QR and analytics
- Basic scan analytics: total scans, unique scans, 30-day time-series chart, device breakdown, top countries (Pro)
- Pro feature gates: logo upload and advanced dot shapes behind Pro for authenticated users (anonymous users remain completely ungated)
- Free tier limits: 3 dynamic QR codes max, 500 scans/code soft limit

**Should have (v1.x — add after validation):**
- QR active/paused toggle — pause a campaign without deleting the code
- Copy existing QR as new draft — reduces re-setup friction
- QR expiry date — campaign auto-expiry
- CSV export of scan data — data portability

**Defer (v2+):**
- Custom short domains — very high complexity, enterprise only
- Folder/tag organization — add when users report navigation pain at 20+ codes
- Team/multi-seat accounts — requires org data model redesign
- Scan limit email alerts — requires async job queue

**Anti-features to never build:**
- Ads in redirect path — worst-reviewed pattern in competitor analysis, destroys trust
- Watermarks on free QR output — makes output unusable professionally, kills acquisition funnel
- Requiring account for static QR generation — breaks the core acquisition model
- Deleting data on subscription cancel — users leave angry reviews; gate edit/create, not read

**Feature gate strategy:** Gate logo embed and advanced dot shapes for new authenticated users only. Anonymous static generation stays completely ungated forever. This preserves Lighthouse 100 on the homepage and zero-friction acquisition.

### Architecture Approach

The architecture is a layered Astro 5 hybrid deployment on Vercel. The homepage remains fully static (prerendered at build time, served from CDN). New SSR routes (`/login`, `/signup`, `/dashboard`) opt into server rendering with `export const prerender = false`. A single `src/middleware.ts` validates sessions once per SSR request and injects `locals.user` and `locals.isPro` — eliminating redundant auth checks across all API endpoints. The dynamic QR redirect (`/r/[slug]`) runs as a Vercel edge function for global low-latency redirects. All other new API routes are standard Vercel serverless functions.

Auth state flows server → Astro page → React island as props (not via client-side fetch on mount). Islands receive `user` and `isPro` at SSR render time — zero auth fetches on mount, no flash of ungated content.

**Major components:**
1. `src/middleware.ts` — Session validation via `clerkMiddleware()`, injects `locals.user` + `locals.isPro` into all SSR requests, protects `/dashboard` with redirect to `/login`
2. `src/pages/r/[slug].ts` (edge runtime) — Dynamic QR redirect: DB lookup via `@libsql/client/web` → 302 redirect + fire-and-forget scan event INSERT; must use `/web` import not default import
3. `src/pages/api/stripe/webhook.ts` — Stripe subscription lifecycle (all six events) with idempotency guard; must read raw request body before JSON parsing for signature verification
4. `src/pages/api/qr/` — CRUD for saved QR library; all check `locals.isPro` server-side; POST requires Pro
5. `src/pages/api/analytics/[id].ts` — Scan count aggregation queries; Pro-gated, user ownership enforced
6. `DashboardIsland.tsx`, `AnalyticsIsland.tsx` — React islands receiving auth state as SSR props, calling API endpoints via `fetch()`, never importing from `src/lib/` directly
7. `src/db/schema.ts` + `src/lib/db.ts` — Drizzle schema (5 tables) and Turso client; edge routes use `/web`, serverless routes use default

### Critical Pitfalls

1. **Astro output mode misconfiguration** — Switching to `output: 'server'` globally converts the static homepage to a serverless function, destroying Lighthouse 100. Prevention: keep `output: 'static'`, add `adapter: vercel()`, add `export const prerender = false` only to SSR routes. Verify with `x-vercel-cache: HIT` on homepage response.

2. **Non-idempotent Stripe webhook handler** — Stripe retries webhooks on timeouts; without deduplication the same event fires twice and corrupts subscription state. Prevention: store `stripe_event_id` in a `stripe_events` table as the first operation; return 200 immediately if already present. 30 minutes to implement, must not be deferred.

3. **Redirect endpoint as serverless instead of edge function** — Cold-start serverless adds 200-500ms before the user sees their destination. QR users assume the code is broken. Prevention: `export const runtime = 'edge'` in `/r/[slug].ts`; use `@libsql/client/web`. This is not an optimization — it is the minimum viable redirect experience.

4. **Missing Stripe subscription lifecycle events** — Handling only `checkout.session.completed` leaves users on the wrong tier after cancellation, payment failure, or plan changes. Prevention: implement all six subscription events from day one — `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`, and `customer.subscription.trial_will_end`.

5. **Scan analytics bot inflation** — Link preview bots (Slack, iMessage, WhatsApp) and security scanners inflate scan counts 3-6x, making analytics untrustworthy. Prevention: store raw User-Agent in every scan event and filter known bot agents in the display query (not at collection time — raw data enables retroactive improvements).

---

## Implications for Roadmap

The feature dependency graph drives a strict 5-phase ordering. Each phase is a prerequisite for the next.

### Phase 1: Foundation — Auth, Database, and SSR Infrastructure

**Rationale:** Auth is the prerequisite for billing (Stripe must attach to a user), which is the prerequisite for Pro features. Database schema must be established before any data can be stored. The Astro output mode decision must be made and locked before any SSR routes are written — getting it wrong is the most expensive pitfall to recover from.

**Delivers:** Working sign-up, sign-in, sign-out, session-protected `/dashboard` route. Database schema with all five tables (`users`, `subscriptions`, `qr_codes`, `scan_events`, `stripe_events`). Astro middleware injecting auth context. Vercel adapter configured correctly. Login and signup pages with Clerk pre-built components.

**Addresses:** Email/password auth, route protection, Astro output mode strategy, DB connection approach

**Avoids:** Astro output mode misconfiguration (Pitfall 1), middleware applied to static pages causing errors (Pitfall 2), Postgres connection pool exhaustion (Pitfall 9), flash of ungated content (Pitfall 8)

**Research flag:** Standard patterns — Clerk has an official Astro SDK with a documented quickstart. No additional research needed. Acceptance criteria: homepage must show `x-vercel-cache: HIT`; dashboard must show `x-vercel-cache: MISS`; unauthenticated `/dashboard` must redirect to `/login`.

### Phase 2: Stripe Billing and Pro Tier

**Rationale:** Pro tier must be defined before any Pro features are built. Every subsequent phase gates content behind `locals.isPro`. Building billing after auth (Phase 1) but before library or dynamic QR (Phase 3) means subscription state is available when feature gates are implemented.

**Delivers:** Stripe Checkout integration (free → Pro upgrade), Stripe Customer Portal (manage/cancel), webhook handler for all six subscription lifecycle events, subscription state persisted in `subscriptions` table, middleware updated to read `isPro` from subscriptions, Stripe CLI setup for local webhook testing.

**Addresses:** Stripe Checkout, Customer Portal, self-serve cancellation, subscription lifecycle management

**Avoids:** Non-idempotent webhook handler (Pitfall 3), missing subscription events (Pitfall 4), granting Pro on client-side redirect instead of webhook (ARCHITECTURE integration gotcha)

**Research flag:** Standard Stripe Checkout + webhooks pattern — well documented. The six-event requirement and idempotency table are non-negotiable and must be in the phase acceptance criteria before any code is written.

### Phase 3: Saved QR Library and Pro Feature Gates

**Rationale:** The library requires auth (Phase 1) and a defined Pro tier (Phase 2). Pro gates on logo and advanced shapes require knowing the user's tier. This phase delivers the core Pro value proposition — a persistent, named QR library — before tackling dynamic QR infrastructure.

**Delivers:** QR CRUD API endpoints (`/api/qr/`), DashboardIsland with library list view, Pro gates on logo upload and advanced dot shapes in QRGeneratorIsland (new authenticated users only), free tier limit enforcement (3 dynamic QR max), save-to-library action in QRGeneratorIsland, QR settings serialization to JSON blob.

**Addresses:** Saved QR library (Pro), named QR records, Pro customization gates, free tier limits

**Avoids:** Client-side-only Pro gating (server-side check at every API endpoint is authoritative), forced signup for anonymous users (anonymous static generation stays ungated)

**Research flag:** Standard CRUD pattern — no additional research needed. One early verification: confirm `qr-code-styling` config serializes cleanly to/from JSON for the settings snapshot. Test round-trip fidelity before building the full save flow.

### Phase 4: Dynamic QR Redirect Service

**Rationale:** Dynamic QR codes are the #1 Pro differentiator and the highest-complexity new infrastructure. They depend on Phase 3 (dynamic QR is a type of saved QR) and the Vercel adapter (Phase 1). Building this as a dedicated phase gives the edge function its required focus — redirect latency has the strictest performance requirement in the system.

**Delivers:** Edge function at `/r/[slug].ts` (302 redirect + fire-and-forget scan logging), dynamic QR creation flow in the library, editable destination URL, active/paused toggle, redirect to holding page for deactivated codes, destination URL validation (http/https allowlist on creation).

**Addresses:** Dynamic QR codes, redirect service, scan event recording, active/paused toggle

**Avoids:** Serverless redirect instead of edge function (Pitfall 6), open redirect phishing (Pitfall 5), storing raw IP addresses (GDPR — store SHA-256(IP + daily_salt) as `ip_hash`)

**Research flag:** Two items to confirm during phase planning: (1) the exact `@libsql/client/web` import path in version 0.14.x — it is a documented gotcha and must be verified before writing the edge function; (2) rate limiting approach (Vercel KV vs in-memory edge counter) — brief spike recommended before implementation.

### Phase 5: Scan Analytics Dashboard

**Rationale:** Analytics require scan events (recorded in Phase 4) before there is data to display. Building analytics last means the data model is populated and the display layer can be built and tested against real data.

**Delivers:** Analytics API endpoint (`/api/analytics/[id].ts`) with scan count aggregation, AnalyticsIsland with total/unique scans, 30-day time-series chart, device breakdown, top countries table, bot-filtering in display query (not collection query — raw data preserved for retroactive improvement).

**Addresses:** Scan analytics (Pro), time-series chart, device breakdown, geographic breakdown, unique vs total scan distinction

**Avoids:** Bot inflation making analytics untrustworthy (Pitfall 7 — store raw User-Agent in scan events, filter known bot agents in display query), synchronous scan logging blocking redirect (already addressed in Phase 4 with fire-and-forget)

**Research flag:** Two items to confirm: (1) chart library selection — Recharts is the default choice for React islands, but bundle size impact should be verified before committing; (2) bot User-Agent filtering approach — Vercel BotID is a paid add-on, IAB/ABC list is free but requires maintenance; confirm which approach fits the project before Phase 5 planning.

### Phase Ordering Rationale

- **Dependency chain is strict:** Auth → Billing → Library → Dynamic QR → Analytics. No phase can be safely reordered without breaking a prerequisite.
- **Risk front-loading:** The highest-risk pitfall (output mode misconfiguration) is addressed in Phase 1 before any feature code is written. The second-highest-risk (non-idempotent webhooks) is addressed in Phase 2. By Phase 3 the infrastructure is stable and each new phase adds features to a solid foundation.
- **Shippable increments:** After Phase 2, the billing flow is testable end-to-end. After Phase 3, the library is usable by Pro users. After Phase 4, dynamic QR codes work. Each phase is a product milestone, not just a code milestone.
- **Performance isolation:** Phase 4 (redirect service) has the strictest performance requirement in the system — treating it as a standalone phase gives it the dedicated focus it requires. The <100ms P99 redirect target cannot be achieved by rushing it as a sub-task.

### Research Flags

Phases likely needing a brief research spike during planning:
- **Phase 4 (Dynamic QR Redirect):** `@libsql/client/web` import path in v0.14.x is a documented gotcha. Rate limiting strategy (Vercel KV vs in-memory) needs a decision. Edge Config vs direct DB lookup trade-offs may be worth a 30-minute spike.
- **Phase 5 (Analytics):** Chart library bundle size should be verified before selection. Bot User-Agent filtering approach (Vercel BotID vs IAB list) should be confirmed — one is paid, one requires maintenance.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Auth + Foundation):** Clerk has an official Astro SDK with a documented quickstart. Turso + Drizzle has an official integration tutorial.
- **Phase 2 (Stripe Billing):** Stripe Checkout + webhooks is the most-documented Stripe pattern. The idempotency table is boilerplate.
- **Phase 3 (Saved QR Library):** Standard CRUD over a known schema.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All version numbers confirmed against npm registry as of 2026-03-11. Official SDK docs verified for Clerk, Drizzle, libSQL. Turso free tier confirmed against official pricing page. |
| Features | MEDIUM-HIGH | Competitor feature tiers verified via live competitor research (QRTiger, Hovercode, Uniqode, QR Code Generator). Free tier limits (3 dynamic, 500 scans/code) are calibrated against QRTiger's model from multiple sources. |
| Architecture | HIGH | Astro 5 hybrid output model confirmed via official Astro 5.0 release docs and on-demand rendering guide. Edge vs serverless latency confirmed via official Neon benchmarks and openstatus benchmark. Fire-and-forget scan logging is the documented industry pattern. |
| Pitfalls | HIGH (Stripe/Astro/Vercel), MEDIUM (bot filtering, scale thresholds) | Stripe webhook pitfalls from official Stripe docs. Astro output mode pitfalls from official Astro v5 upgrade guide. CVE references confirmed. Bot filtering thresholds from vendor blogs — treat as directional. |

**Overall confidence:** HIGH

### Gaps to Address

- **ARCHITECTURE.md vs STACK.md stack discrepancy:** ARCHITECTURE.md assumes Better Auth + Neon Postgres; STACK.md recommends Clerk + Turso. Roadmapper should use STACK.md technology choices and ARCHITECTURE.md patterns. The schema in STACK.md is authoritative for implementation — the ARCHITECTURE.md schema uses Neon-specific types (e.g., `bigserial`, `jsonb`) that do not apply to SQLite/Turso.
- **Stripe pricing/plan price point:** Research covers integration patterns but not the specific Pro plan price ($X/month). This is a business input that must be defined before Phase 2 starts — the Stripe product and price ID must exist to create Checkout sessions.
- **Analytics chart library:** FEATURES.md specifies a 30-day time-series chart and device breakdown chart but does not specify a library. Bundle size should be verified during Phase 5 planning — Recharts is the default for React but adds ~50KB gzipped.
- **Stripe webhook reconciliation cron:** PITFALLS.md recommends a daily reconciliation job. Vercel cron jobs require Vercel Pro plan. If on Hobby, alternatives are GitHub Actions scheduled workflow or accepting the 3-day Stripe retry window as sufficient. Resolve during Phase 2 planning.

---

## Sources

### Primary (HIGH confidence)
- [Clerk Astro SDK docs](https://clerk.com/docs/reference/astro/overview) — auth integration, middleware, locals API (updated March 2026)
- [Astro on-demand rendering docs](https://docs.astro.build/en/guides/on-demand-rendering/) — output modes, prerender flag
- [Astro Vercel adapter docs](https://docs.astro.build/en/guides/integrations-guide/vercel/) — adapter config, import path
- [Drizzle + Turso tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso) — ORM + libSQL integration
- [Drizzle + Vercel Edge Functions](https://orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions) — edge runtime compatibility
- [Stripe subscriptions guide](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — Checkout + webhook lifecycle
- [Stripe webhook signature verification](https://docs.stripe.com/webhooks) — raw body requirement, constructEvent
- [Turso pricing](https://turso.tech/pricing) — free tier limits confirmed
- [Vercel Edge Config docs](https://vercel.com/docs/edge-config) — redirect caching strategy
- [Vercel connection pooling guide](https://vercel.com/kb/guide/connection-pooling-with-functions) — serverless DB connection limits
- [Astro v5 upgrade guide](https://docs.astro.build/en/guides/upgrade-to/v5/) — hybrid output option removal
- CVE-2025-61925 / CVE-2025-64525 — Astro middleware bypass via x-forwarded-host

### Secondary (MEDIUM confidence)
- [QRTiger Pricing](https://www.qrcode-tiger.com/payment) — free tier limits: 3 dynamic, 100 scans/code
- [Hovercode Pricing](https://hovercode.com/pricing/) — free tier: 3 dynamic; analytics breakdown
- [openstatus Vercel latency benchmarks](https://www.openstatus.dev/blog/monitoring-latency-vercel-edge-vs-serverless) — edge vs serverless comparison
- [Stripe freemium patterns](https://stripe.com/resources/more/freemium-pricing-explained) — freemium conversion patterns
- [Vercel Fluid Compute + connection exhaustion](https://www.solberg.is/vercel-fluid-backpressure) — serverless connection management
- npm registry — version numbers for `@clerk/astro`, `stripe`, `@astrojs/vercel`, `drizzle-orm` confirmed via WebSearch

### Tertiary (LOW confidence — directional only)
- [QR analytics guide](https://www.qr-insights.com/blog/qr-code-analytics-metrics-guide) — bot inflation magnitude estimates
- IAB/ABC International Spiders and Bots List — bot filtering reference (current list needs verification at implementation time)

---
*Research completed: 2026-03-11*
*Ready for roadmap: yes*
