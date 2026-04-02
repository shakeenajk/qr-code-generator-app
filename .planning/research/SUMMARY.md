# Project Research Summary

**Project:** QRCraft
**Domain:** QR Code Generator SaaS — v1.3 Scale & Integrate
**Researched:** 2026-03-31
**Confidence:** HIGH (stack, pitfalls) / MEDIUM (features, custom domain architecture)

## Executive Summary

QRCraft v1.3 extends a fully-shipped freemium SaaS (v1.0–v1.2) with the features that move it from a self-serve tool to a developer and agency platform: bulk QR generation, a REST API with API key auth, advanced analytics, i18n for three languages, campaign scheduling, and the groundwork for team workspaces. The research confirms this is an additive build — the existing Astro 5 + Vercel + Turso + Clerk + Stripe stack handles all new requirements without a new database, new runtime, or new deployment model. Net-new npm dependencies are exactly five: `@sentry/astro`, `@upstash/ratelimit`, `@upstash/redis`, `papaparse`, and `jszip`.

The recommended implementation sequence is: Sentry first (zero-risk, improves debuggability for everything after), then rate limiting (required before any public API ships), then bulk QR generation (highest-requested agency feature, tractable without new infra), then the REST API (unlocks developer integrations), then advanced analytics (completes the partially-built analytics system), then UTM and campaign scheduling (moderate complexity, validate solo-user demand), then i18n (significant translation effort, known path), and finally seasonal templates (no infra, pure content). Team workspaces and custom short domains are deferred to v2 — both are VERY HIGH complexity, require new billing tiers, and carry significant data isolation and infrastructure risk that is not justified until solo-user growth validates the platform.

The three highest-risk areas are: (1) multi-tenant data isolation — Turso has no row-level security, so every query on org-scoped tables must enforce tenant scoping in application code; (2) bulk ZIP generation — the 4.5 MB Vercel response body limit will break any server-side ZIP approach above ~20 QR codes, requiring client-side ZIP assembly via jszip in the browser; and (3) i18n SEO — adding translated pages without hreflang tags causes a duplicate content penalty that is harder to recover from than prevent.

---

## Key Findings

### Recommended Stack

The existing stack is unchanged and carries all v1.3 features. The five new dependencies are purpose-specific additions with no architectural overlap. `@sentry/astro` provides full-stack error tracking (server + client); `@upstash/ratelimit` + `@upstash/redis` provide stateful rate limiting that survives serverless cold starts (in-memory rate limits are useless on Vercel); `papaparse` handles browser-side CSV parsing for bulk generation; `jszip` handles client-side ZIP assembly. All other v1.3 features — team schema, UTM columns, date-range analytics, campaign scheduling, seasonal templates, API key generation — are handled by the existing Turso + Drizzle + Node built-ins.

**Core v1.3 technology additions:**

- `@sentry/astro` ^9.x — error tracking — official SDK, works on Vercel Node runtime (not edge), auto-instruments SSR and API routes
- `@upstash/ratelimit` ^2.0.8 — sliding window rate limiting — only serverless-compatible rate limiter (HTTP-based, no TCP connections)
- `@upstash/redis` ^1.37.0 — required peer for ratelimit — also usable for cron scheduling locks
- `papaparse` ^5.5.3 — CSV parsing — browser + Node API, 5M weekly downloads, zero dependencies
- `jszip` ^3.10.1 — client-side ZIP assembly — avoids Vercel 4.5 MB response body limit entirely
- `@inlang/paraglide-js` ^2.15.1 — type-safe i18n — the only verified Astro 5 compatible i18n library (i18next is incompatible; astro-i18next is archived)

**Critical version notes:**
- Paraglide 2.x does NOT need the `@inlang/paraglide-astro` adapter — use `@inlang/paraglide-js` directly with the Vite plugin
- `@sentry/astro` works on Vercel Node runtime ONLY — this project already uses Node (Clerk is edge-incompatible), so it is already satisfied
- Vercel Cron sub-hourly schedules require Vercel Pro — the project is already on Pro

---

### Expected Features

**Must have (P1 — required for v1.3 to ship):**
- Error tracking (Sentry) — zero cost, immediate operational visibility, unblocks everything else
- API rate limiting (Upstash) — required before any public API ships; in-memory alternatives are useless in serverless
- Bulk QR generation (CSV upload, static PNG export, cap at 250 rows on Pro) — highest-requested agency feature
- REST API with API key auth — unlocks developer integrations; opaque keys preferred over JWTs for simplicity and instant revocation
- Advanced analytics (custom date range + CSV export) — completes the partially-built analytics system

**Should have (P2 — add within v1.3 after P1 lands):**
- UTM parameter builder — appends utm_source/medium/campaign to destination URLs, routes to GA4; low-complexity add-on
- Campaign scheduling — `scheduledEnableAt` column + Vercel Cron every 15 min; validates before team features
- Seasonal / holiday template packs — static data additions, no new infra, drives re-engagement
- i18n (ES, FR, DE) — Astro built-in routing + TypeScript literal dictionaries; scope to marketing pages only (~80 strings)

**Defer to v2+ (P3):**
- Team workspaces — new billing tier, new DB tables, Clerk org context, multi-tenant data scoping — not justified until solo-user growth is proven
- Custom short domains — CNAME verification state machine, Vercel Domains API, async DNS propagation — VERY HIGH complexity, enterprise-only pricing justification
- OAuth2 authorization code flow — API keys are sufficient for M2M; OAuth2 adds 1–2 weeks for zero additional benefit at this stage
- SSO / SAML — Clerk supports it when needed; defer until enterprise sales motion begins

---

### Architecture Approach

All v1.3 features live in the existing Astro application — no new services, no new deployment targets, no microservices. The architecture is additive: new API routes under `/api/v1/`, new Drizzle schema tables and column additions, a new `BulkGenerateIsland.tsx` React island, and Astro's built-in i18n routing layer. The existing `output: 'static'` + `adapter: vercel()` configuration is unchanged; every new API route gets `export const prerender = false` to opt into SSR. Clerk middleware in `middleware.ts` exempts `/api/v1/*` routes, which handle their own API key or JWT authentication.

**Major components for v1.3:**
1. `BulkGenerateIsland.tsx` — client-only React island; CSV upload, papaparse, qr-code-styling loop, jszip assembly, download trigger
2. `/api/qr/bulk.ts` — serverless route; CSV validation, Vercel Blob upload of individual PNGs, returns JSON manifest (never streams the ZIP itself)
3. `/api/v1/*` routes — versioned REST API; API key bearer auth via `verifyApiKey()` helper; Drizzle queries scoped to the key's owning user
4. `src/lib/apiAuth.ts` — shared helper; SHA-256 key validation for REST API routes
5. Upstash rate limiter in `middleware.ts` — IP-based for public routes, API-key-hash-based for `/api/v1/*`
6. Vercel Cron at `*/15 * * * *` — hits `/api/cron/campaigns`; idempotent `UPDATE` to activate scheduled campaigns
7. `src/i18n/{en,es,fr,de}.ts` — TypeScript literal dictionaries; `useTranslations(locale)` helper in `.astro` files and React islands
8. Sentry — integrated via `npx astro add @sentry/astro`; source maps uploaded with `VERCEL_GIT_COMMIT_SHA` as release name

---

### Critical Pitfalls

1. **Bulk ZIP via server response hits 4.5 MB Vercel limit** — Do not stream the ZIP through the function response body. Generate QR PNGs server-side, upload to Vercel Blob, return a JSON manifest, then assemble the ZIP client-side with jszip. The browser has no size limit. This architecture decision must be locked before any bulk download code is written.

2. **`prerender = false` missing on API routes** — Static mode silently breaks API routes in production (dev server masks the issue). Every file under `src/pages/api/` must start with `export const prerender = false`. Add a CI check that fails the build if any API route file omits it.

3. **Storing API keys in plaintext** — Never store the full API key value in Turso. Store `sha256(key)` as `keyHash` and only the first 8 chars as `keyPrefix` for display. The key is shown to the user exactly once at creation time. A DB breach exposes no usable credentials.

4. **Multi-tenant data leakage via missing `workspaceId` scoping** — Turso has no row-level security. When team workspaces land, every Drizzle query on `savedQrCodes`, `dynamicQrCodes`, and `landingPages` must scope by `workspaceId`. Create a `withWorkspaceScope()` query helper and write a cross-tenant isolation integration test before any team feature merges.

5. **i18n infinite redirect loop** — Combining `redirectToDefaultLocale: true` with `prefixDefaultLocale: false` in Astro 5 creates an infinite redirect. The correct config: both must be `false` when the English default URL has no prefix. Verify locally before any deploy.

6. **i18n breaks sitemap SEO** — `@astrojs/sitemap` does not add hreflang tags automatically. Add the `i18n` option to the sitemap integration config AND manually add `<link rel="alternate" hreflang>` tags (including `x-default`) to `BaseLayout.astro`. Failure causes a duplicate content SEO penalty.

7. **Campaign scheduling without idempotency** — Vercel Cron can fire twice for the same window and does not retry on failure. The cron handler must check `activatedAt IS NULL` before updating, set an `activatedAt` timestamp on activation, and validate the `CRON_SECRET` header to prevent unauthorized triggering.

8. **In-memory rate limiting** — Module-level `Map` state for rate limits resets on every cold start in Vercel serverless. Use Upstash Redis with `@upstash/ratelimit` declared at module scope (outside the handler function).

9. **Sentry source maps without release name** — Without `release.name` set in the Vite plugin config, source maps upload but are never associated with the deployed version. Use `process.env.VERCEL_GIT_COMMIT_SHA` (auto-populated by Vercel) as the release name.

10. **Custom domain DNS propagation treated as synchronous** — Domain activation must go through a state machine: `pending_verification → verified → active → error`. Build a background poller to check verification status every 15 minutes via the Vercel Domains API. Show the exact CNAME record, not a generic spinner.

---

## Implications for Roadmap

Based on the combined research, the following phase structure is recommended. Dependencies are strict in the first three phases; after that, phases can be reordered based on user demand signals.

---

### Phase 1: Observability Foundation (Sentry + Rate Limiting)

**Rationale:** Zero risk, maximum benefit. Sentry improves debuggability for every subsequent phase. Rate limiting is a prerequisite for any public API — it must be in place before the REST API phase begins. These two features are independent of each other and of all other v1.3 work.

**Delivers:** Error tracking with readable stack traces in production; Upstash Redis infrastructure provisioned; IP-based rate limiting on all public endpoints; `CRON_SECRET` validation pattern established for secure cron endpoints.

**Addresses:** Error tracking (P1), API rate limiting (P1)

**Avoids:** Pitfall 8 (in-memory rate limits reset on cold start), Pitfall 12 (Sentry source maps without release name)

**Research flag:** Standard patterns — skip phase research. Sentry + Astro is documented; Upstash setup is a 30-minute task.

---

### Phase 2: Bulk QR Generation

**Rationale:** Highest-requested feature from the agency user segment. Tractable without team workspaces or the REST API. The architecture decision (client-side ZIP via jszip, server-side blob storage for persistence) must be locked at the start of this phase to avoid the 4.5 MB response body trap.

**Delivers:** CSV upload UI (`BulkGenerateIsland.tsx`), per-row QR generation in the browser, client-side ZIP assembly, download trigger, tier-based row caps (Free: 0, Starter: 50, Pro: 250), progress counter UI.

**Addresses:** Bulk QR generation (P1)

**Avoids:** Pitfall 1 (ZIP response body limit), Pitfall 2 (server-side generation timeout)

**Research flag:** Needs light phase research on whether `qr-code-styling` runs correctly in a Web Worker context (OffscreenCanvas) for large batches. Standard ZIP assembly pattern is documented.

---

### Phase 3: REST API + API Key Management

**Rationale:** Unlocks developer integrations. Rate limiting from Phase 1 must be live before this ships. API key schema design (hashed keys, not plaintext) is a one-way door — get it right before writing any key generation code. Middleware exclusion for `/api/v1/*` from Clerk must be added at the start of this phase.

**Delivers:** API key management UI (create, revoke, list), `/api/v1/qr` CRUD endpoints, `/api/v1/qr/[id]/analytics` endpoint, per-API-key rate limiting, public API documentation page.

**Addresses:** REST API with API key auth (P1)

**Avoids:** Pitfall 3 (prerender=false missing on API routes), Pitfall 11 (plaintext key storage in Turso)

**Research flag:** Standard patterns — API key hashing (SHA-256) and Astro serverless route patterns are well-established. No phase research needed.

---

### Phase 4: Advanced Analytics

**Rationale:** Completes the analytics feature set partially built in v1.2. No new infra — additive Drizzle query changes and UTM column additions. CSV export is a 5-line serialization. Ships independently of the REST API.

**Delivers:** Custom date range picker on analytics panel, date-filtered Drizzle queries using existing `(qrCodeId, scannedAt)` index, CSV export button (server-streamed `text/csv`), UTM columns on `scanEvents`, UTM capture in the redirect handler, UTM parameter builder UI on dynamic QR creation.

**Addresses:** Advanced analytics (P1), UTM parameter builder (P2)

**Avoids:** Analytics performance trap (indexed queries only; never SELECT all scan events and count in JS)

**Research flag:** Standard patterns — Drizzle date range queries and CSV export are both straightforward extensions of the existing system.

---

### Phase 5: Campaign Scheduling

**Rationale:** Moderate complexity; depends only on the existing `dynamicQrCodes` table and Vercel Cron (already on Pro plan). Validates that users want time-based automation before the much-larger team collaboration investment.

**Delivers:** `scheduledEnableAt` and `scheduledPauseAt` columns on `dynamicQrCodes`, date/time picker UI on dynamic QR editor, cron handler at `/api/cron/campaigns` with idempotency guard and secret validation, `*/15 * * * *` vercel.json cron entry, "scheduled" status display in the dashboard.

**Addresses:** Campaign scheduling (P2)

**Avoids:** Pitfall 7 (non-idempotent cron, missing CRON_SECRET validation, Hobby-plan cron frequency assumption)

**Research flag:** Standard patterns — Vercel Cron + Drizzle UPDATE is a known pattern. No phase research needed.

---

### Phase 6: Internationalization (ES, FR, DE)

**Rationale:** Marketing pages only (~80 strings, ~5 pages). Astro 5 built-in i18n routing + TypeScript literal dictionaries avoids i18n library complexity. SEO work (hreflang tags, sitemap i18n config) must happen in the same phase — it cannot be deferred without accumulating a duplicate content penalty. English URLs are preserved (`prefixDefaultLocale: false`).

**Delivers:** `/es/`, `/fr/`, `/de/` URL prefixes for marketing pages; TypeScript translation dictionaries under `src/i18n/`; `useTranslations(locale)` helper; hreflang link tags in `BaseLayout.astro`; sitemap i18n config updated; smoke tests confirming no redirect chain longer than one hop.

**Addresses:** i18n ES/FR/DE (P2)

**Avoids:** Pitfall 5 (infinite redirect from `redirectToDefaultLocale` misconfiguration), Pitfall 6 (hreflang omission causing duplicate content penalty)

**Research flag:** Needs light phase research on Paraglide 2.x Vite plugin configuration with Astro 5 `hybrid` output mode. The compatibility is confirmed but the exact setup has one documented nuance (no adapter needed, Vite plugin only).

---

### Phase 7: Seasonal Template Packs

**Rationale:** No new infra, no new libraries. Static data additions to the existing template system. Good for re-engagement and return visits. Lowest-risk phase in v1.3.

**Delivers:** 5–8 seasonal template presets in `src/data/seasonalTemplates.ts`; template picker UI updates; no schema changes; no new routes.

**Addresses:** Seasonal template packs (P2)

**Avoids:** Over-engineering — these are static data objects, not a database-driven template system.

**Research flag:** Skip — no research needed. Pure content addition to the existing template system.

---

### Phase 8: Team Workspaces (v2 candidate)

**Rationale:** Largest architectural change in scope. New billing tier (Team), new DB tables (workspaces, workspace_members, workspace_invitations), Clerk Organization context, multi-tenant data isolation for every existing query. Defer until solo-user growth proves the market, or treat as the anchor feature of a dedicated v2 milestone.

**Delivers:** Workspace creation, member invitations, Owner/Admin/Member/Viewer roles, shared QR library scoped to workspace, Stripe multi-seat billing integration.

**Addresses:** Team workspaces (P3)

**Avoids:** Pitfall 4 (data leakage via missing workspace scoping), Pitfall 10 (Clerk org_role checked without validating org_id)

**Research flag:** Needs dedicated phase research. Multi-tenant schema design, Clerk Organizations integration, and Stripe multi-seat billing all require architectural review before any code is written.

---

### Phase 9: Custom Short Domains (v2 candidate)

**Rationale:** Most infrastructure-heavy feature in the roadmap. Requires Vercel Domains API integration, a CNAME verification state machine, async DNS propagation handling, background polling, and workspace scoping (depends on Phase 8). Justified only at an enterprise/agency pricing tier.

**Delivers:** Custom domain registration UI, Vercel Domains API integration, `customDomains` state machine table, background verification poller, CNAME instruction display, redirect handler host-based tenant routing.

**Addresses:** Custom short domains (P3)

**Avoids:** Pitfall 8 (treating domain verification as synchronous, no state machine)

**Research flag:** Needs dedicated phase research on current Vercel Domains API capabilities and CNAME verification flow. This is the highest-uncertainty feature in the entire roadmap.

---

### Phase Ordering Rationale

- **Observability before everything** — Sentry and rate limiting are zero-risk additions that improve debuggability for all subsequent work. Any bug in bulk generation or the REST API is harder to diagnose without Sentry already in place.
- **Bulk before API** — Bulk generation validates the agency use case without the complexity of API key management. If bulk QR demand is lower than expected, the API roadmap can be adjusted before investment.
- **Rate limiting before API** — Phase 1 must be live before the public REST API ships (Phase 3). This dependency is hard.
- **Campaign scheduling before team workspaces** — Validates time-based automation demand at the solo-user level before the much-larger team collaboration investment.
- **i18n isolated** — i18n touches every marketing page. Isolate it to control scope creep and ensure SEO work is done correctly in one pass.
- **Team + custom domains deferred** — Both require architectural commitments that should not be made until product-market fit at the solo/agency tier is confirmed.

---

### Research Flags

**Needs phase research:**
- **Phase 2 (Bulk QR)** — Verify `qr-code-styling` runs correctly in a Web Worker context (OffscreenCanvas, no `document` dependency) before committing to the Web Worker architecture.
- **Phase 6 (i18n)** — Verify Paraglide 2.x Vite plugin setup with Astro 5 `hybrid` output mode in a spike before writing translation strings.
- **Phase 8 (Team Workspaces)** — Dedicated architecture review needed: Clerk Organizations vs. custom workspace tables, Stripe multi-seat billing, complete query audit for workspace scoping.
- **Phase 9 (Custom Domains)** — Dedicated research on current Vercel Domains API capabilities, CNAME vs. nameserver verification, SSL provisioning timeline.

**Standard patterns (skip phase research):**
- **Phase 1 (Sentry + rate limiting)** — Both are documented integrations with official Astro/Vercel guides.
- **Phase 3 (REST API)** — API key hashing (SHA-256) and Astro serverless route patterns are well-established in the existing codebase.
- **Phase 4 (Analytics)** — Drizzle date range queries and CSV export are simple extensions of the existing analytics system.
- **Phase 5 (Campaign scheduling)** — Vercel Cron + Drizzle UPDATE is a known, documented pattern.
- **Phase 7 (Seasonal templates)** — Pure content addition. No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All primary choices verified against official docs and npm registry. Version numbers confirmed. i18next incompatibility with Astro 5 confirmed. Paraglide 2.x Vite plugin path verified. |
| Features | MEDIUM | Competitor analysis (Uniqode, QR Tiger, Hovercode, QRCodeKit) used for table stakes and differentiator classification. Implementation complexity estimates are research-based but not battle-tested at this exact stack combination. |
| Architecture | HIGH (Phases 1–7) / MEDIUM (Phases 8–9) | Vercel hard limits (4.5 MB, cron plans), Astro static/SSR split, Clerk edge incompatibility are all verified. Custom domain flow and Stripe multi-seat billing are documented but have no reference implementation on this exact stack. |
| Pitfalls | HIGH (critical pitfalls) / MEDIUM (Turso concurrent writes) | Vercel constraints confirmed. Turso MVCC described as "experimental as of 2026-01" — exact write throughput under concurrent API load has low confidence. |

**Overall confidence:** HIGH for Phases 1–7. MEDIUM for Phases 8–9.

### Gaps to Address

- **Turso concurrent write behavior under REST API load** — The REST API introduces concurrent writes from multiple API key holders. Turso MVCC is experimental; batch writes in single transactions and monitor for lock contention during Phase 3 load testing.
- **`qr-code-styling` in Web Worker context** — The library uses canvas internally. Whether it runs in a Worker (which has `OffscreenCanvas`) vs. requiring the main thread needs a spike before Phase 2 commits to the Web Worker architecture.
- **Paraglide 2.x + Astro 5 `hybrid` output mode** — Compatibility is confirmed but the interaction with `hybrid` (not pure `static`) should be validated in a spike before Phase 6 begins.
- **Stripe multi-seat billing for team tier** — Not covered in current research. Phase 8 requires a dedicated research pass on Stripe's per-seat subscription model before schema and billing code are written.

---

## Sources

### Primary (HIGH confidence)
- Sentry Astro SDK: https://docs.sentry.io/platforms/javascript/guides/astro/
- Upstash ratelimit: https://upstash.com/blog/upstash-ratelimit and https://github.com/upstash/ratelimit-js
- Astro i18n routing: https://docs.astro.build/en/guides/internationalization/
- Vercel Domains API: https://vercel.com/platforms/docs/multi-tenant-platforms/configuring-domains
- Paraglide JS 2.x: https://github.com/Alexandre-Fernandez/astro-i18n

### Secondary (MEDIUM confidence)
- Competitor feature analysis: Uniqode (uniqode.com), QR Tiger (qr-code-generator.com), Hovercode (hovercode.com), QRCodeKit (qrcodekit.com) — product pages and help docs
- API key vs OAuth2 patterns: https://boldsign.com/blogs/api-keys-vs-oauth-authentication/
- Bulk generation patterns: https://qrcodekit.com/guides/bulk-qr-code-creation/
- Team collaboration patterns: https://qr-verse.com/en/blog/qr-code-team-collaboration

### Tertiary (LOW confidence / needs validation during implementation)
- Turso MVCC concurrent write behavior under sustained API load — validate during Phase 3 load testing
- `qr-code-styling` Web Worker compatibility — validate with a spike in Phase 2
- Paraglide 2.x + Astro 5 `hybrid` output mode interaction — validate with a spike before Phase 6

---
*Research completed: 2026-03-31*
*Ready for roadmap: yes*
