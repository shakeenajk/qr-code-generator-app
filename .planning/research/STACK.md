# Stack Research

**Domain:** SaaS freemium add-on — auth, payments, database, dynamic QR redirect, scan analytics on existing Astro 5 + Vercel app
**Researched (v1.1):** 2026-03-11
**Researched (v1.2):** 2026-03-30
**Researched (v1.3):** 2026-04-01
**Confidence:** HIGH (primary choices verified against official docs or npm; version numbers confirmed via WebSearch against npm registry)

---

## Scope Note — v1.3

This section covers new infrastructure for v1.3 Scale & Integrate. The full v1.1 + v1.2 stack is validated and unchanged — do not re-research Astro 5, React islands, qr-code-styling, Tailwind v4, Playwright, `@astrojs/vercel`, Clerk, Turso/Drizzle, Stripe, Recharts, lucide-react, `@vercel/blob`, `astro-seo`, `astro-seo-schema`, or `schema-dts`.

The new decisions for v1.3 are:

1. How do we implement bulk QR generation (CSV upload → ZIP download)?
2. How do we build a REST API with OAuth2 (API key issuance + validation)?
3. What is needed for team collaboration (workspaces, roles, shared library)?
4. What is needed for advanced analytics (date ranges, CSV export, UTM tracking)?
5. How do we implement i18n (ES, FR, DE)?
6. How do we implement campaign scheduling (create now, auto-enable on date)?
7. How do we support custom short domains (go.brand.com)?
8. What is needed for seasonal template packs?
9. How do we implement API rate limiting?
10. How do we add error tracking (Sentry)?

---

## v1.3 Recommended Additions

### New Libraries

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@sentry/astro` | ^9.x (latest 10.46.0) | Error tracking — client + server exceptions, performance spans | Official Sentry SDK for Astro. Wraps `@sentry/node` server-side and `@sentry/browser` client-side. Auto-instruments SSR middleware and Astro API routes. Installs via `npx astro add @sentry/astro`. Works on Vercel Node runtime (NOT edge). Source maps uploaded automatically on `astro build`. |
| `@upstash/ratelimit` | ^2.0.8 | API rate limiting — sliding window, fixed window, token bucket algorithms | Only connectionless (HTTP-based) rate limiting library designed for serverless. No persistent Redis connection. Uses Upstash Redis as the state store. Works in Vercel serverless functions. Paired with `@upstash/redis`. |
| `@upstash/redis` | ^1.37.0 | Redis client for Upstash serverless Redis | HTTP-based Redis client — no TCP connection. Required peer for `@upstash/ratelimit`. Also usable for campaign scheduling locks and caching. |
| `papaparse` | ^5.5.3 | CSV parsing for bulk QR generation (CSV upload) | Industry-standard CSV parser. Browser + Node.js. 5M weekly downloads. Streaming support for large files. Auto-detects delimiters. No dependencies. |
| `jszip` | ^3.10.1 | ZIP archive generation for bulk QR download | Browser-native ZIP creation. Well-maintained (4M+ weekly downloads). Generates ZIP from in-memory files (no temp filesystem needed). Runs client-side — zero server cost for ZIP assembly. |
| `@inlang/paraglide-js` | ^2.15.1 | i18n — type-safe, compile-time message extraction for ES/FR/DE | The only i18n library verified compatible with Astro 5 in 2026. `i18next` is documented as incompatible with Astro 5. Paraglide 2.x no longer needs the `@inlang/paraglide-astro` adapter — use `@inlang/paraglide-js` directly. Compile-time extraction means zero runtime overhead; unused translations tree-shaken automatically. TypeScript-first: message keys are type-checked at build time. |

### What is Already Covered (Do Not Add)

| Need | Already Solved By | Why Not a New Addition |
|------|-------------------|------------------------|
| Bulk QR rendering | `qr-code-styling` (existing) | Already generates QR PNGs and SVGs client-side. Bulk mode calls the existing generator in a loop over parsed CSV rows. No new QR library needed. |
| Team workspace data model | Turso + Drizzle ORM (existing) | New `teams`, `team_members`, `team_invitations` tables in the existing Drizzle schema. No new database or ORM needed. |
| UTM parameter storage | Turso + Drizzle ORM (existing) | Add `utm_source`, `utm_medium`, `utm_campaign` columns to `scan_events`. Already stored per redirect event. No new infra needed. |
| Analytics date-range queries | Turso + Drizzle ORM (existing) | Drizzle supports `gte`/`lte` on timestamp columns. Custom date range = parameterized WHERE clause on existing `scan_events` table. |
| CSV export for analytics | No library needed | Analytics data returned from existing Turso queries. CSV serialization is a 5-line reduce over the result rows. No csv-stringify dependency required. |
| OAuth2 client credential generation | Node.js built-in `crypto` | API keys are `crypto.randomBytes(32).toString('hex')` — cryptographically secure, no library needed. Store hashed (SHA-256) in a new `api_keys` Turso table. |
| Campaign scheduling data model | Turso + Drizzle ORM + Vercel Cron | `scheduled_at` timestamp column on `qrCodes` table. Vercel Cron job (vercel.json) hits `/api/cron/activate-campaigns` every minute on Pro plan. No new database or scheduler library needed. |
| Seasonal templates | No library needed | Templates are static data objects (color presets, frame configs) stored in `src/data/templates.ts`. New seasonal entries = new data objects. No npm package needed. |
| JWT signing for OAuth2 tokens | No library needed | Use Clerk's existing session tokens for user-scoped API access. For machine-to-machine (API key flow), use opaque keys (not JWTs) — simpler to revoke, no signing library required. |

---

## Decision Rationale

### (1) Bulk QR Generation

**Approach: Client-side CSV parse (papaparse) + client-side QR render loop (qr-code-styling) + client-side ZIP assembly (jszip).**

The bulk generation flow is entirely client-side:

```
User uploads CSV
  → papaparse.parse(file) → array of { url, name, ... }
  → forEach row: qr-code-styling.getRawData('png') → Uint8Array
  → jszip: zip.file(`${row.name}.png`, uint8array)
  → zip.generateAsync({ type: 'blob' }) → download
```

Why client-side for everything:
- **No server cost**: 1,000-row bulk export uses zero Vercel function invocations
- **No file size limit**: Vercel serverless functions have a 4.5 MB request body limit — a 100-QR ZIP could easily exceed this
- **Already proven**: The existing generator already renders QR codes client-side; the bulk mode is a loop over that same path
- **Memory bound**: At ~50 KB per QR PNG, 1,000 QR codes = ~50 MB in memory. This is within browser limits for Pro/Business tier users (target audience). Add a 500-row hard cap with a clear UI warning for free tier.

**papaparse** is recommended over `csv-parse` for the browser use case: `csv-parse` is Node-only; papaparse works in both browser and Node with identical API. Since parsing happens in the React island (browser context), papaparse is the correct choice.

**jszip** is recommended over `client-zip` (the streaming alternative): jszip 3.x is well-tested, has a simple `.file()/.generateAsync()` API, and supports both Blob and ArrayBuffer inputs — which is what `qr-code-styling.getRawData()` returns. `client-zip` is 40x faster on throughput benchmarks but its streaming API adds complexity; at the scale of 500 QR codes, jszip finishes in under 2 seconds, making throughput irrelevant.

---

### (2) REST API with OAuth2

**Approach: Opaque API keys (not OAuth2 authorization code flow). Stored hashed in Turso. Validated in Astro API route middleware.**

The "OAuth2" requirement for developer/agency integrations means a machine-to-machine API key system (OAuth2 Client Credentials grant pattern), not a full OAuth2 authorization server with authorization codes.

Implementation:

```
1. User visits /dashboard/api-keys
2. Server generates: key = crypto.randomBytes(32).toString('hex') → 64-char hex string
3. Server stores: { userId, keyPrefix (first 8 chars), keyHash (SHA-256(key)), createdAt, lastUsedAt, name }
4. User copies key (shown once — never stored in plaintext)
5. API request: Authorization: Bearer qrc_<key>
6. Astro API route middleware: SHA-256(incoming key), lookup hash in api_keys table, check userId/tier
```

Why opaque keys over JWTs:
- Instant revocation: delete the DB row, key stops working immediately. JWT revocation requires a blocklist.
- No signing secret to rotate/manage
- Industry pattern for developer API keys (Stripe, GitHub, Vercel all use opaque keys)

Why not a full OAuth2 server (Auth0, Keycloak, `oauth2-server`):
- Full OAuth2 with authorization codes + refresh tokens + consent screens is appropriate for third-party OAuth flows ("Login with QRCraft"). QRCraft does not have that use case in v1.3.
- Adding an OAuth2 server library adds ~500KB and significant complexity for what is essentially "issue API keys and validate them in middleware."

**No new npm package for key generation**: Node.js `crypto` module is built-in and produces cryptographically secure keys. `nanoid` is already installed and could generate key suffixes, but `crypto.randomBytes` is more appropriate for security-sensitive tokens.

---

### (3) Team Collaboration

**Approach: New Turso tables only. No new library.**

Team collaboration requires three new Drizzle schema tables added to the existing Turso database:

```
teams: { id, name, ownerId (FK users), createdAt }
team_members: { teamId, userId, role ('owner'|'admin'|'member'), joinedAt }
team_invitations: { id, teamId, email, role, token, expiresAt, acceptedAt }
```

QR codes gain a nullable `teamId` column. When `teamId` is set, the QR is owned by the team; when null, it's personal.

**Role enforcement**: Checked in Astro API route handlers — read the `team_members.role` for the requesting Clerk user ID before allowing create/edit/delete operations. No RBAC library needed; the role check is a single Drizzle query.

**No new package**: Turso + Drizzle already handle multi-tenant data patterns. The pattern is a standard join table, not a new technology problem.

---

### (4) Advanced Analytics

**Approach: Parameterized Drizzle queries with date range filtering. CSV export via manual serialization. UTM columns on scan_events.**

Three additions to the existing analytics system, all in the existing Turso/Drizzle layer:

1. **Custom date ranges**: Add `from` and `to` query params to existing analytics endpoints. In the Drizzle query: `where(and(gte(scanEvents.scannedAt, from), lte(scanEvents.scannedAt, to)))`. No library.

2. **CSV export**: Convert the analytics result array to CSV:
   ```typescript
   const csv = [headers, ...rows.map(r => Object.values(r).join(','))].join('\n');
   return new Response(csv, { headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="analytics.csv"' }});
   ```
   This is ~5 lines. No `csv-stringify` dependency warranted.

3. **UTM tracking**: Add `utmSource`, `utmMedium`, `utmCampaign` columns to `scanEvents` Drizzle schema. The redirect handler (`/api/redirect/[slug]`) extracts UTM params from the incoming URL query string and stores them with the scan event. No library — `new URL(request.url).searchParams.get('utm_source')`.

---

### (5) Internationalization (ES, FR, DE)

**Recommendation: `@inlang/paraglide-js` ^2.15.1 with Astro's built-in i18n routing.**

The i18n stack is two-layer:

- **Routing**: Astro's built-in i18n routing (added in v4, stable in v5). Configure `i18n.locales` and `i18n.defaultLocale` in `astro.config.mjs`. Astro automatically creates `/es/`, `/fr/`, `/de/` URL prefixes and provides `getRelativeLocaleUrl()` helper for internal links. No extra package.

- **Translations**: Paraglide JS 2.x for message extraction and type-safe translation functions. Messages stored in JSON files under `src/messages/`. The Paraglide compiler runs at build time, generating typed `m.hero_title()` functions — no runtime lookup overhead. Tree-shaking removes unused locale strings from each page's bundle.

Why Paraglide over alternatives:
- `astro-i18next` (astro-i18next): Repository is archived/unmaintained. Do not use.
- `react-i18next` / `i18next`: Documented as incompatible with Astro 5 as of March 2026 (search result: "i18next is not yet compatible with Astro 5"). React Context-based — only works in React islands, not in `.astro` files.
- `react-intl`: React Context-only. Cannot translate `.astro` server-rendered content.
- **Paraglide 2.x**: Works in both `.astro` files and React islands. No adapter needed for Astro 5 (the `@inlang/paraglide-astro` adapter is for 1.x; 2.x uses Vite plugin integration directly).

**Setup**: Use the Paraglide Vite plugin in `astro.config.mjs`. Run `npx @inlang/paraglide-js init` to scaffold message files. The Inlang VS Code extension (optional dev tool) provides inline translation previews.

**Scope**: Translate marketing copy (hero, features, pricing page, FAQ). Keep the generator UI in English for v1.3 — full UI translation is a v2 concern. This bounds the translation work to ~80 strings.

---

### (6) Campaign Scheduling

**Approach: `scheduledAt` column in Turso + Vercel Cron Job. No scheduler library.**

Campaign scheduling means: "set a QR code to go live on a future date/time."

Implementation:
- Add `scheduledAt DATETIME` and `status TEXT` ('draft' | 'scheduled' | 'active') columns to the `qrCodes` Drizzle schema
- When `status = 'scheduled'`, the dynamic redirect returns 404 (or a "not yet available" page)
- A Vercel Cron Job defined in `vercel.json` hits `/api/cron/activate-campaigns` every minute (Pro plan) or every hour (Hobby plan):
  ```json
  { "crons": [{ "path": "/api/cron/activate-campaigns", "schedule": "* * * * *" }] }
  ```
- The cron endpoint runs: `UPDATE qrCodes SET status='active' WHERE status='scheduled' AND scheduledAt <= NOW()`

**Why not node-cron**: node-cron does not work in Vercel serverless functions — the process is destroyed after each request, so the event loop that node-cron attaches to never persists. Vercel Cron Jobs are the only correct approach on Vercel.

**Reliability caveat**: Vercel Cron Jobs on Pro plan are invoked "anywhere within the minute." For campaign scheduling, this means up to 59-second delay. This is acceptable for marketing campaigns. If sub-minute precision becomes required, use an external cron service (cron-job.org, EasyCron) pointing at the same endpoint.

**Cron plan requirement**: Vercel Cron Jobs with sub-hourly schedules require the Pro plan ($20/month). The project is already on Pro (required for Clerk + Turso + Stripe deployment). No additional cost.

---

### (7) Custom Short Domains

**Approach: Vercel REST API (`POST /v9/projects/{id}/domains`) called from Astro API route. No `@vercel/sdk` needed.**

Custom short domains (go.brand.com) allow Pro users to use their own subdomain for dynamic QR redirects instead of `qr-code-generator-app.com/r/[slug]`.

Implementation pattern:
1. User enters their domain (`go.brand.com`) in the dashboard
2. Astro API route calls Vercel REST API to add the domain to the project:
   ```
   POST https://api.vercel.com/v9/projects/{projectId}/domains
   Authorization: Bearer {VERCEL_API_TOKEN}
   Body: { "name": "go.brand.com" }
   ```
3. Vercel responds with the required DNS record (CNAME value)
4. UI shows the user: "Add CNAME record: `go.brand.com` → `cname.vercel-dns.com`"
5. After DNS propagates, Vercel auto-issues SSL cert
6. Redirect handler at `/api/redirect/[slug]` reads `request.headers.get('host')` to look up which user's domain is being used

**Why raw REST API over `@vercel/sdk`**: The `@vercel/sdk` is in beta and the search results note "there may be breaking changes between versions without a major version update." The REST API is stable and the domain endpoint is a single `fetch()` call — no SDK overhead warranted.

**Why this is feasible**: Vercel's multi-tenant documentation (Vercel for Platforms) documents exactly this pattern. Hashnode uses it for 35,000+ custom domains. The only constraint is that Vercel's wildcard SSL cert generation requires Vercel nameservers OR per-domain CNAME — the CNAME approach is simpler for users (no nameserver change required).

**Stored in Turso**: New `customDomains` table: `{ userId, domain, vercelDomainId, status ('pending'|'active'|'error'), addedAt }`.

---

### (8) Seasonal Template Packs

**Approach: Static data objects in TypeScript. No library.**

Seasonal templates are style presets (color palette + frame style + dot shape combos) for holidays (Christmas, Halloween, Valentine's Day, etc.). They are stored as typed objects in `src/data/seasonalTemplates.ts`:

```typescript
export const SEASONAL_TEMPLATES = [
  { id: 'christmas-2025', name: 'Christmas', season: 'winter', colors: { dots: '#C41E3A', bg: '#FFFFFF' }, dotType: 'rounded', frame: 'snowflake' },
  ...
] satisfies SeasonalTemplate[];
```

These objects feed the existing template rendering system (already built in v1.2). Adding new seasonal packs = adding new entries to this array. No npm package; no API call; no database storage (templates are static, user customizes on top of them).

---

### (9) API Rate Limiting

**Recommendation: `@upstash/ratelimit` ^2.0.8 + `@upstash/redis` ^1.37.0.**

Rate limiting must protect:
- All `/api/*` endpoints (especially bulk generation and redirect)
- The new REST API endpoints (`/api/v1/*`) with per-API-key limits

Implementation in Astro middleware (`src/middleware.ts`):

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min per IP
});

// In middleware:
const identifier = request.headers.get('x-forwarded-for') ?? 'anonymous';
const { success, limit, remaining } = await ratelimit.limit(identifier);
if (!success) return new Response('Too Many Requests', { status: 429 });
```

For API key endpoints, use the API key hash as the identifier instead of IP.

**Why Upstash over alternatives**:
- Vercel Edge Middleware rate limiting without Upstash requires maintaining state across serverless invocations — impossible without external storage
- Upstash Redis is HTTP-based (no TCP connection pooling issues in serverless)
- `@upstash/ratelimit` 2.0.8 is the maintained version; `@vercel/kv` (Vercel's KV wrapper) is also Upstash under the hood but adds an indirection layer
- Free Upstash tier: 10K commands/day. At 100 requests/minute per user, this covers approximately 1,666 user-minutes/day before paid tier ($0.2/100K commands)

**New environment variables**:
```
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

---

### (10) Error Tracking (Sentry)

**Recommendation: `@sentry/astro` ^9.x (latest 10.46.0).**

Setup via the Astro CLI integration:
```bash
npx astro add @sentry/astro
```

This adds the Sentry integration to `astro.config.mjs` and creates `sentry.client.config.ts` and `sentry.server.config.ts`. For Vercel Node runtime, the SDK auto-instruments:
- SSR page errors
- API route exceptions
- Unhandled promise rejections

**Runtime constraint**: `@sentry/astro` works on Vercel Node runtime only. This project uses Node serverless functions (not edge) for all Clerk-protected routes — confirmed compatible.

**Source maps**: The SDK uploads source maps automatically on `astro build` when `SENTRY_AUTH_TOKEN` is set. Set `sourceMapsUploadOptions.enabled: true` in the integration config.

**Sampling**: Set `tracesSampleRate: 0.1` (10% performance traces) in production to avoid Sentry quota burn. Set `replaysSessionSampleRate: 0` — session replay is not needed and consumes quota rapidly.

**New environment variables**:
```
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...   # for source map upload at build time
```

---

## Installation (v1.3 Additions Only)

```bash
# Error tracking
npx astro add @sentry/astro

# Rate limiting (requires Upstash Redis account)
npm install @upstash/ratelimit @upstash/redis

# Bulk QR — CSV parsing
npm install papaparse
npm install -D @types/papaparse

# Bulk QR — ZIP generation (browser-side)
npm install jszip

# i18n translations
npm install @inlang/paraglide-js
npx @inlang/paraglide-js init
```

**New environment variables to add in Vercel dashboard:**

```
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
VERCEL_API_TOKEN=...   # for custom domain provisioning via Vercel REST API
VERCEL_PROJECT_ID=...  # target project for domain API calls
```

---

## Alternatives Considered (v1.3)

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| i18n | `@inlang/paraglide-js` | `react-i18next` / `i18next` | Documented incompatible with Astro 5. React Context-based — cannot translate `.astro` file content. |
| i18n | `@inlang/paraglide-js` | `astro-i18next` | Repository archived/unmaintained. Dead project. |
| Rate limiting | `@upstash/ratelimit` | In-memory rate limit | Serverless functions share no memory between invocations. In-memory state resets on every cold start. Useless. |
| Rate limiting | `@upstash/ratelimit` | `@vercel/kv` + manual logic | `@vercel/kv` is Upstash under the hood with an extra abstraction layer. Use the source directly. |
| ZIP generation | `jszip` | `archiver` | `archiver` is Node.js streaming — cannot run in the browser React island. Bulk ZIP must be client-side to avoid 4.5 MB serverless body limit. |
| ZIP generation | `jszip` | `client-zip` | 40x faster on benchmarks, but streaming API is more complex. At 500 QR codes jszip finishes in <2 seconds — throughput is irrelevant. |
| Campaign scheduling | Vercel Cron Jobs | `node-cron` | node-cron does not work in Vercel serverless — the process is destroyed after each request, killing the event loop node-cron attaches to. |
| Campaign scheduling | Vercel Cron Jobs | External cron service | External services (EasyCron, cron-job.org) are a valid alternative if sub-minute precision is needed, but add an external dependency. Vercel Cron is native to the existing infra. |
| Custom domains | Vercel REST API directly | `@vercel/sdk` | SDK is in beta with breaking-change warnings. Single `fetch()` call to the stable REST API is simpler and more predictable. |
| API keys | Opaque keys (crypto built-in) | JWT tokens | JWTs require a signing secret, cannot be instantly revoked without a blocklist, and add ~50KB of library weight. Opaque keys are the industry standard for developer API keys (Stripe, GitHub, Vercel all use them). |
| Error tracking | `@sentry/astro` | Datadog, Honeybadger | Sentry has the best Astro 5 integration (official SDK). Datadog is enterprise-priced. Honeybadger lacks Astro-specific middleware instrumentation. |

---

## What NOT to Add (v1.3)

| Avoid | Why |
|-------|-----|
| `@vercel/sdk` | Beta SDK with breaking change warnings; only need a single REST endpoint for domain provisioning — use `fetch()` directly |
| `jsonwebtoken` or `jose` for API auth | Opaque API keys are simpler, instantly revocable, and the industry standard for developer API keys. No JWT complexity needed. |
| `node-cron`, `agenda`, `bull` | None work in Vercel serverless. Use Vercel Cron Jobs defined in `vercel.json`. |
| `csv-stringify` | Analytics CSV export is ~5 lines of `Array.map().join()`. A library adds a dependency for trivial serialization. |
| `react-i18next` or `i18next` | Documented incompatible with Astro 5. Cannot translate `.astro` server-rendered content (React Context is client-only). |
| `astro-i18next` | Repository is archived/unmaintained. Do not use. |
| `oauth2-server` or `node-oauth2-server` | Full OAuth2 authorization server adds 500KB+ and complex token flows. v1.3 needs API keys for machine-to-machine use, not a third-party OAuth2 flow. |
| `passport` or `passport-oauth2` | Same reason as above. Clerk already handles user auth. API key validation is a middleware function, not a Passport strategy. |
| A full Redis instance (ioredis, redis npm) | TCP-based Redis clients have connection pooling issues in serverless environments. Upstash's HTTP-based client is purpose-built for this deployment model. |

---

## Version Compatibility (v1.3 New Additions)

| Package | Version | Compatible With | Confidence |
|---------|---------|-----------------|------------|
| `@sentry/astro` | ^10.46.0 | Astro 5.x, Vercel Node runtime | HIGH — official Sentry SDK; Astro docs link to it directly |
| `@upstash/ratelimit` | ^2.0.8 | Vercel serverless, `@upstash/redis` ^1.37.0 | HIGH — npm registry confirmed version 2.0.8, published 3 months ago |
| `@upstash/redis` | ^1.37.0 | Vercel serverless, Cloudflare Workers, edge | HIGH — npm registry confirmed version 1.37.0, published 20 days ago |
| `papaparse` | ^5.5.3 | Browser, Node.js | HIGH — 5M weekly downloads, actively maintained, no breaking changes since 5.x |
| `jszip` | ^3.10.1 | Browser, Node.js | HIGH — 4M+ weekly downloads; version 3.10.1 is current stable |
| `@inlang/paraglide-js` | ^2.15.1 | Astro 5.x (Vite plugin), TypeScript 5.x | MEDIUM — Astro 5 compatibility confirmed via search results; adapter-free 2.x approach is recent; verify integration guide on inlang.com before starting |

---

## Full Resolved Stack (v1.0 + v1.1 + v1.2 + v1.3)

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Astro | ^5.17.1 |
| UI Components | React + React DOM | ^19.2.4 |
| Styling | Tailwind CSS v4 | ^4.2.1 |
| QR Generation | qr-code-styling | ^1.9.2 |
| Auth | @clerk/astro | ^3.0.4 |
| Database client | @libsql/client | ^0.17.0 |
| ORM | drizzle-orm | ^0.45.1 |
| Payments | stripe | ^20.4.1 |
| Charts | recharts | ^3.8.1 |
| Icons | lucide-react + lucide-astro | ^1.7.0 / ^0.556.0 |
| Toasts | sonner | ^2.0.7 |
| Sitemap | @astrojs/sitemap | ^3.7.0 |
| Vercel adapter | @astrojs/vercel | ^9.0.5 |
| File storage | @vercel/blob | ^2.3.2 |
| SEO meta | astro-seo | ^1.1.0 |
| SEO schema | astro-seo-schema | ^7.x |
| SEO schema types | schema-dts | ^1.x |
| **Error tracking (NEW)** | **@sentry/astro** | **^10.46.0** |
| **Rate limiting (NEW)** | **@upstash/ratelimit** | **^2.0.8** |
| **Redis client (NEW)** | **@upstash/redis** | **^1.37.0** |
| **CSV parsing (NEW)** | **papaparse** | **^5.5.3** |
| **ZIP generation (NEW)** | **jszip** | **^3.10.1** |
| **i18n (NEW)** | **@inlang/paraglide-js** | **^2.15.1** |
| Testing | @playwright/test | ^1.58.2 |
| Migration CLI | drizzle-kit | 0.31.9 |

---

## Sources (v1.3)

- [@sentry/astro npm page](https://www.npmjs.com/package/@sentry/astro) — version 10.46.0, published 5 days ago, official SDK. HIGH confidence.
- [Sentry Astro docs](https://docs.sentry.io/platforms/javascript/guides/astro/) — Node runtime only (not edge), `npx astro add @sentry/astro` install path. HIGH confidence.
- [Astro Sentry guide](https://docs.astro.build/en/guides/backend/sentry/) — official Astro docs link to @sentry/astro. HIGH confidence.
- [@upstash/ratelimit npm](https://www.npmjs.com/package/@upstash/ratelimit) — version 2.0.8, HTTP-based, designed for serverless. HIGH confidence.
- [@upstash/redis npm](https://newreleases.io/project/npm/@upstash/redis/release/1.35.8) + WebSearch — version 1.37.0, published 20 days ago. HIGH confidence.
- [Upstash ratelimit docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) — sliding window algorithm, serverless-first design. HIGH confidence.
- [papaparse npm](https://www.npmjs.com/package/papaparse) — version 5.5.3, 5M weekly downloads, RFC 4180 compliant, browser + Node. HIGH confidence.
- [jszip npm](https://www.npmjs.com/package/jszip) / [jszip docs](https://stuk.github.io/jszip/) — version 3.10.1 current stable. HIGH confidence.
- [@inlang/paraglide-js npm](https://www.npmjs.com/package/@inlang/paraglide-js) — version 2.15.1, published 12 days ago. HIGH confidence.
- WebSearch: "Astro i18n built-in vs astro-i18next react-intl comparison 2025" — Paraglide recommended for Astro 5; i18next incompatible with Astro 5; astro-i18next archived. MEDIUM confidence (multiple sources agree).
- [Astro i18n routing docs](https://docs.astro.build/en/guides/internationalization/) — built-in i18n routing, `getRelativeLocaleUrl()` helper. HIGH confidence.
- [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) — vercel.json `crons` config, Pro plan for sub-hourly schedules, up-to-59-second invocation delay. HIGH confidence.
- WebSearch: "node-cron Vercel serverless" — confirms node-cron fails on Vercel (process destroyed after each request). HIGH confidence (multiple sources).
- [Vercel multi-tenant domain management](https://vercel.com/docs/multi-tenant/domain-management) — `POST /v9/projects/{id}/domains` REST endpoint, CNAME provisioning pattern. HIGH confidence.
- [Vercel for Platforms — Configuring Custom Domains](https://vercel.com/platforms/docs/multi-tenant-platforms/configuring-domains) — SaaS domain provisioning pattern, SSL auto-issuance. HIGH confidence.
- WebSearch: `@vercel/sdk` beta warning — "breaking changes between versions without major version update." MEDIUM confidence (npm advisory).
- WebSearch: "archiver vs jszip serverless browser 2026" — archiver is Node.js streams only (no browser); jszip works in browser context. HIGH confidence.

---

*Stack research for: QRCraft v1.3 Scale & Integrate — bulk generation, REST API, team workspaces, analytics, i18n, scheduling, custom domains, seasonal templates, rate limiting, error tracking*
*Researched: 2026-04-01*

---

## v1.2 Historical Research (Preserved)

The section below is the original v1.2 stack research. It documents decisions already made and validated. Do not revisit unless requirements change.

---

### v1.2 Scope Note

This file covers the new infrastructure required for v1.2 Growth & Content. The validated v1.1 stack (Astro 5, React islands, qr-code-styling, Tailwind v4, Playwright, `@astrojs/vercel`, Clerk, Turso/Drizzle, Stripe, Recharts, lucide-react) is complete and unchanged. **Do not re-research those choices.**

The new decisions for v1.2 are:

1. How do we serve Google AdSense on the free tier with appropriate consent handling?
2. How do we store uploaded cover images for PDF and App Store hosted landing pages?
3. How do we render decorative QR code frames ("Scan Me" text, phone mockup borders) around the existing qr-code-styling output and export them as PNG/SVG?
4. How do we generate programmatic screenshots of the app for the how-to section?
5. What (if anything) is needed for SEO improvements beyond the existing `@astrojs/sitemap`?
6. What is needed for vCard field enhancements?

---

### v1.2 Recommended Additions

#### New Libraries

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@vercel/blob` | ^0.27.x | File storage for PDF/App Store cover image uploads | Already on Vercel — no new infra account needed. Supports client-side browser uploads via short-lived token exchange (presigned pattern). Upload goes directly browser → Vercel Blob CDN without hitting your server. 1 GB free on Vercel hobby, then $0.023/GB/month. Returned URLs are public CDN URLs suitable for `<img>` tags on hosted landing pages. |
| `astro-seo` | ^1.1.0 | Per-page SEO meta tags, Open Graph, Twitter cards, canonical URLs | Maintained (updated Feb 2026, healthy release cadence). Reduces boilerplate for per-page meta tags on the new PDF/App Store landing pages. The existing index.astro already handles head tags manually — this library standardizes it across the new dynamic pages. |
| `astro-seo-schema` | ^7.x | JSON-LD structured data components for Astro | Part of the `@codiume/orbit` monorepo. Outputs `<script type="application/ld+json">` with escaped schema. Powered by `schema-dts` for TypeScript safety. Required for adding SoftwareApplication and BreadcrumbList schema to App Store landing pages and HowTo schema to the how-to section. |
| `schema-dts` | ^1.x | TypeScript type definitions for Schema.org | Peer dependency of `astro-seo-schema`. Provides compile-time safety for all JSON-LD structures. No runtime overhead — types only. |

#### What is Already Covered (Do Not Add)

| Need | Already Solved By | Why Not a New Addition |
|------|-------------------|------------------------|
| Playwright screenshots | `@playwright/test` ^1.58.2 (devDep) | Already installed. Write a separate `scripts/generate-screenshots.ts` that runs before build. No new package needed. |
| QR code frame rendering | Browser Canvas API + `qr-code-styling` | Implemented as pure client-side canvas composition. No library needed — see Architecture section. |
| Sitemap generation | `@astrojs/sitemap` ^3.7.0 | Already installed. New dynamic pages (PDF/App Store landing pages) auto-included when added to Astro routes. |
| vCard field additions | No library needed | vCard format (RFC 6350) is a simple text protocol. TITLE, ORG, ADR, URL, X-SOCIALPROFILE fields are added by extending the existing string template in the vCard content type builder. |
| QR code SVG/PNG export | `qr-code-styling` | Already installed. Frame compositing extends the existing export flow using browser Canvas; no new QR library needed. |
| Consent management (US only) | No CMP needed yet | Google AdSense only requires a Google-certified CMP (IAB TCF v2.3) for EEA/UK/Switzerland visitors. For a US-only-targeted site, no CMP is required. Add a Google-certified CMP (CookieYes or similar) only if/when the site explicitly targets EEA traffic. Do not add CMP complexity before it is required. |

---

### v1.2 Decision Rationale

#### (1) Google AdSense

**Approach: Raw `<script>` tag in Astro `<head>`, Auto Ads enabled, no wrapper library.**

AdSense integration in Astro requires no npm package. The integration is a single async script tag placed in the `<head>` of the layout:

```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
  crossorigin="anonymous"
></script>
```

Auto Ads (Google automatically places ad units) is recommended over manual unit placement. It requires only the single head script and Google's crawler to verify the site. Manual ad units require an additional `<ins class="adsbygoogle">` block per placement — more flexibility but more implementation overhead. Start with Auto Ads; switch to manual units if the auto placement degrades UX.

**Consent / GDPR:** AdSense requires a Google-certified CMP (IAB TCF v2.3) only for EEA/UK/Switzerland visitors. QRCraft does not currently target European traffic. Until European marketing channels are opened, no CMP is needed. If EEA traffic grows to >5% of sessions (visible in Google Analytics), add CookieYes (Google-certified, ~$10/month) at that point.

**Performance impact:** Google Publisher Ads Lighthouse audit recommends loading AdSense with a static `async` script tag (not injected via `document.createElement`). Astro's `<head>` slot produces a static script tag — this is already correct. Estimated impact on Lighthouse: -2 to -5 points on performance (ad network JS is unavoidable). The existing score is 100; this may bring it to ~95, which is acceptable.

**Placement constraint (from PROJECT.md):** AdSense only on generator page, never in the QR redirect path (`/r/[slug]`). The redirect route is a fast 307 response — no HTML, no ad opportunity, and adding ads there destroys user trust.

**No npm package recommendation:** There is no maintained Astro-specific AdSense package with meaningful benefit. The `next-adsense` pattern (a React component wrapping the `<ins>` tag) does not translate usefully to Astro's static layout system. Use the raw script tag approach.

---

#### (2) File Storage for PDF/App Store Cover Images

**Recommendation: `@vercel/blob` ^0.27.x**

PDF and App Store content types require users to upload a cover photo (for the hosted landing page). This image needs to be:
- Stored persistently (not in the Turso DB as a blob — SQL is not appropriate for binary files)
- Served on a public URL for the `<img>` tag on the landing page
- Uploaded directly from the browser (files can be >4.5 MB)

`@vercel/blob` is the right choice because:
- Already on Vercel — no new account, no new credentials workflow, no cross-platform IAM
- Client upload pattern uses a server-side token exchange (`handleUpload` in an Astro API route), then the file goes browser → Vercel Blob CDN directly. The master BLOB_READ_WRITE_TOKEN stays server-side only.
- Returns a permanent CDN URL after upload — store this URL string in the `qr_codes` config JSON or a new `landing_pages` Turso table column
- Latest stable version: `@vercel/blob` 2.3.2 (March 2026, actively maintained, 171 downstream projects)

**Pattern:**

```
1. User selects cover image in React island
2. React island calls POST /api/blob/upload-token (Astro API route)
   → Server calls handleUpload() with BLOB_READ_WRITE_TOKEN → returns short-lived client token
3. React island calls upload(file, { handleUploadUrl: '/api/blob/upload-token' }) from @vercel/blob/client
   → File goes directly browser → Vercel Blob (server not in the file path)
4. Vercel Blob returns { url: 'https://[hash].blob.vercel-storage.com/cover.jpg' }
5. React island stores returned URL in the landing page config (saved to Turso via existing API)
```

**Alternative considered: Cloudinary.** Cloudinary has an official Astro integration (`astro-cloudinary`) and provides image transformation (resize, format conversion) on the fly. For QRCraft's use case (store an uploaded cover photo, display it), transformation capability is not needed in v1.2. Cloudinary's free tier is limited (25 credits/month in 2025). Vercel Blob is simpler to set up (one environment variable: `BLOB_READ_WRITE_TOKEN`) and already within the Vercel ecosystem. Cloudinary is the right upgrade if image transformation (thumbnail generation, WebP conversion) becomes needed in v1.3+.

---

#### (3) QR Code Decorative Frames

**Approach: Browser Canvas API composition — no new library.**

The decorative frame feature (border, "Scan Me" text, phone mockup frames) is implemented as a canvas composition layer on top of the existing `qr-code-styling` output. No additional QR library is needed.

**How it works:**

`qr-code-styling` already produces a PNG data URL via its `getRawData('png')` method (or via `download()`). The frame renderer:

1. Creates a new `<canvas>` sized to `QR_SIZE + FRAME_PADDING`
2. Draws the frame background (solid color, rounded corners via `ctx.roundRect`)
3. Draws the QR code image via `ctx.drawImage(qrBitmap, xOffset, yOffset)`
4. Draws frame label text via `ctx.fillText("SCAN ME", centerX, labelY)` with chosen font
5. For phone mockup frames: draws a pre-bundled SVG phone outline via `ctx.drawImage(phoneOutlineBitmap, ...)`
6. Exports the composed canvas via `canvas.toDataURL('image/png')` for download, or `canvas.toBlob()` for clipboard

**For SVG export with frame:** The frame must be composed as an SVG wrapper around the existing QR SVG. Use `qr-code-styling`'s `getRawData('svg')` to get the inner QR SVG string, then wrap it in a parent SVG that includes a `<rect>` border, `<text>` label, and optionally a phone outline `<path>`. Serialize with `new XMLSerializer().serializeToString(svgElement)` and offer as a download. This is pure browser DOM manipulation — no library.

**Phone mockup frame asset:** Store the phone outline as a static SVG asset in `src/assets/frames/phone-mockup.svg`. Parse it into an `Image` bitmap at component mount and reuse across renders. No CDN fetch at render time.

**Why no frame library:** The two available QR frame libraries (`qrcanvas`, `EasyQRCodeJS`) would require replacing `qr-code-styling` entirely, discarding all existing dot shape/gradient/eye customization. The canvas composition approach adds ~80 lines of code and zero dependencies. Compositing QR code + frame is a well-understood canvas operation.

---

#### (4) Programmatic Screenshots for How-To Section

**Approach: Playwright script run at build time — no new package.**

`@playwright/test` is already installed as a dev dependency. The how-to screenshot generation is a standalone script (`scripts/generate-screenshots.ts`) that:

1. Starts the Astro dev server (`astro dev`)
2. Uses Playwright to navigate to specific app states (URL tab active, custom colors applied, download modal open)
3. Takes element-scoped screenshots via `page.locator('.qr-preview').screenshot()`
4. Saves PNG files to `public/how-to/` (committed to repo, served as static assets)

Run this script:
- Manually when the UI changes (`npm run screenshots`)
- In CI before build when UI-affecting commits are detected

**Package.json script:**

```json
"screenshots": "tsx scripts/generate-screenshots.ts"
```

`tsx` is already available via Node.js 18+ (or install `tsx` as a dev dep if not present — `tsx` ^4.x, ~50KB, zero risk). Alternatively, use `ts-node` if already in the project; check `devDependencies` before adding.

**Why not a dedicated screenshot service (ScreenshotOne, Puppeteer service, etc.):** The app is self-owned and deployed. Playwright already runs against it for E2E tests. A screenshot service adds external dependency, cost, and authentication complexity for a task that Playwright solves locally in 30 lines of code.

---

#### (5) SEO Improvements

**Approach: `astro-seo` ^1.1.0 + `astro-seo-schema` for JSON-LD, existing `@astrojs/sitemap` for sitemap. No other additions.**

The existing stack already has:
- `@astrojs/sitemap` — auto-generates sitemap.xml from Astro pages
- Manual `<meta>` tags in existing layout — functional but not standardized

**What v1.2 adds:**

- **`astro-seo`:** Standardizes Open Graph, Twitter card, canonical URL, and description meta tags for the new PDF/App Store landing pages and the new use cases / how-to pages. Install once, use in each page's `<head>`.

- **`astro-seo-schema`:** Adds JSON-LD structured data for:
  - `SoftwareApplication` schema on App Store landing pages (name, operatingSystem, applicationCategory, offers) — enables rich results in Google Search
  - `HowTo` schema on the how-to section — enables rich result step display in SERP
  - `BreadcrumbList` on interior content pages

- **Google Search Console:** No library. Register the domain (already done as part of v1.0 with Lighthouse 100), submit the updated sitemap, and request re-indexing after v1.2 ships. Search Console is a web tool, not a code dependency.

- **Content pages:** The QR use cases landing page (`/use-cases/`) and the individual use case pages (`/use-cases/business-cards/`, etc.) are new Astro static pages. Their SEO value is purely in content and internal linking — no library needed for that.

---

#### (6) vCard Field Enhancements

**Approach: No library. Extend existing string template.**

vCard 4.0 (RFC 6350) is a plain-text format. The existing vCard content type builds a string like:

```
BEGIN:VCARD
VERSION:3.0
FN:Full Name
TEL:+1234567890
EMAIL:user@example.com
END:VCARD
```

The new fields (TITLE, ORG, ADR, URL, work phone, LinkedIn) are added by extending this template:

```
TITLE:Software Engineer
ORG:Acme Corp
ADR;TYPE=work:;;123 Main St;City;State;12345;Country
URL:https://example.com
X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/username
TEL;TYPE=work:+1234567890
```

**LinkedIn:** The `X-SOCIALPROFILE;TYPE=linkedin:` property is a widely-used non-standard extension (vCard 4.0 does not have an official social profile field in RFC 6350). iOS Contacts, Android Contacts, and most vCard-compatible apps support it via the `X-` extension mechanism. A draft IETF extension (`draft-george-vcarddav-vcard-extension`) exists for standardizing this but has not been ratified. The `X-SOCIALPROFILE` approach is the de facto standard as of 2026 — HIGH confidence that target scanners (smartphone cameras) will parse it correctly.

**No new npm package is needed.** The QR code payload for vCard is a client-side string — this is already how `qr-code-styling` receives its content. Extend the existing form state and template function.

---

### v1.2 Installation (Additions Only)

```bash
# File storage for cover image uploads (PDF/App Store content types)
npm install @vercel/blob

# SEO — per-page meta tags
npm install astro-seo

# SEO — JSON-LD structured data
npm install astro-seo-schema schema-dts
```

**Environment variable to add in Vercel dashboard:**

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...   # from Vercel Blob store creation
```

---

### v1.2 Sources

- [Vercel Blob documentation](https://vercel.com/docs/vercel-blob) — client upload pattern, token exchange, presigned URLs. HIGH confidence (official Vercel docs).
- [Vercel Blob client upload guide](https://vercel.com/docs/vercel-blob/client-upload) — `handleUpload` + `upload()` from `@vercel/blob/client`. HIGH confidence.
- [@vercel/blob npm page](https://www.npmjs.com/package/@vercel/blob) — version 2.3.2, published March 2026, 171 downstream packages. HIGH confidence.
- [astro-seo npm page](https://www.npmjs.com/package/astro-seo) — version 1.1.0, published ~2 months before March 2026, Snyk health: Healthy. HIGH confidence.
- [astro-seo-schema (orbit monorepo)](https://github.com/codiume/orbit/tree/main/packages/astro-seo-schema) — `<Schema>` component backed by schema-dts. MEDIUM confidence (verify current version on npm before install).
- [Google AdSense head placement](https://support.google.com/adsense/answer/9274516) — official guidance to place script in `<head>`. HIGH confidence.
- [Google Publisher Ads Lighthouse audit: load scripts statically](https://developers.google.com/publisher-ads-audits/reference/audits/script-injected-tags) — confirms static `async` script tag is preferred over JS-injected tags. HIGH confidence.
- [Google AdSense TCF/CMP requirement](https://support.google.com/adsense/answer/13554116) — CMP required only for EEA/UK/Switzerland; US visitors do not require a certified CMP. HIGH confidence (official Google AdSense Help).
- [RFC 6350 — vCard 4.0](https://www.rfc-editor.org/rfc/rfc6350) — TITLE, ORG, ADR, URL field definitions. HIGH confidence (official IETF standard).
- [Playwright screenshot docs](https://playwright.dev/docs/screenshots) — `page.locator().screenshot()` API for element-scoped captures. HIGH confidence (official Playwright docs).

---

## v1.1 Historical Research (Preserved)

The section below is the original v1.1 stack research. It documents the decisions already made and validated. Do not revisit these unless requirements change.

---

### v1.1 Scope Note

This section covers the new infrastructure for v1.1 Monetization. The existing stack (Astro 5, React islands, qr-code-styling, Tailwind v4, Playwright, `@astrojs/vercel`) is validated and unchanged. The decisions answered here are:

1. Which auth provider fits Astro 5 + Vercel with the least friction?
2. Which database fits a small SaaS with users, QR codes, and scan events?
3. How do we implement the dynamic QR redirect service on Vercel?
4. How do we integrate Stripe subscriptions?
5. What ORM connects the database to server-side Astro routes?

---

### v1.1 Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@clerk/astro` | ^2.16.2 | Auth — sign-up, sign-in, session, user management | Official Astro SDK (updated March 2026). Pre-built UI components. `clerkMiddleware()` for route protection in 5 lines. 10K MAU free. |
| `stripe` | ^20.4.1 | Stripe server SDK — subscriptions, Checkout sessions, webhooks | Official Node SDK. Handles Checkout session creation, subscription lifecycle events, webhook signature verification. |
| `@stripe/stripe-js` | ^5.x | Stripe client SDK — Checkout redirect | Loads Stripe.js in the browser. Required by Stripe for PCI-compliant flows. |
| `@libsql/client` | ^0.14.x | Turso/libSQL database client | HTTP-based SQLite client. Works in both Vercel serverless and edge runtimes. Sub-5ms connection overhead. |
| `drizzle-orm` | ^0.45.1 | ORM — type-safe SQL against Turso/libSQL | Native libSQL driver support. TypeScript-first. Works in Vercel edge and serverless. |
| `drizzle-kit` | ^0.30.x | Migration CLI for Drizzle schema | Generates and runs SQL migrations from Drizzle schema definitions. |
| `nanoid` | ^5.x | Short-code generation for dynamic QR slugs | 8–10 character collision-resistant slugs. ESM-native — compatible with Astro 5. |

### v1.1 Critical Architecture Change

Switching Astro from `output: 'static'` to `output: 'server'` was the key v1.1 infrastructure decision. Static pages opt back in with `export const prerender = true`. The `output: 'hybrid'` mode has a documented Astro 5 + Vercel bug where API routes return HTML or 405 errors — use `output: 'server'` only.

### v1.1 Sources

- Clerk Astro SDK, Turso pricing, Drizzle + Turso tutorial, Stripe subscriptions guide, Astro Vercel adapter docs — all HIGH confidence, official documentation, verified March 2026.
