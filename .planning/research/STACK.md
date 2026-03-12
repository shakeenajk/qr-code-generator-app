# Stack Research

**Domain:** SaaS freemium add-on — auth, payments, database, dynamic QR redirect, scan analytics on existing Astro 5 + Vercel app
**Researched:** 2026-03-11
**Confidence:** HIGH (all primary choices verified against official docs or npm; version numbers confirmed via WebSearch against npm registry)

---

## Scope Note

This file covers ONLY the new infrastructure required for v1.1 Monetization. The existing stack (Astro 5, React islands, qr-code-styling, Tailwind v4, Playwright, `@astrojs/vercel`) is validated and unchanged. The decisions answered here are:

1. Which auth provider fits Astro 5 + Vercel with the least friction?
2. Which database fits a small SaaS with users, QR codes, and scan events?
3. How do we implement the dynamic QR redirect service on Vercel?
4. How do we integrate Stripe subscriptions?
5. What ORM connects the database to server-side Astro routes?

---

## Recommended Stack

### Core Technologies (New for v1.1)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@clerk/astro` | ^2.16.2 | Auth — sign-up, sign-in, session, user management | Official Astro SDK (updated March 2026). Pre-built UI components (`<SignIn>`, `<UserButton>`). `clerkMiddleware()` for route protection in 5 lines. Provides `locals.auth()` and `locals.currentUser()` in Astro components and API routes. 10K MAU free. Eliminates custom auth UI entirely. |
| `stripe` | ^20.4.1 | Stripe server SDK — subscriptions, Checkout sessions, webhooks | Official Node SDK for Stripe API. Works in Vercel serverless functions. Handles Checkout session creation, subscription lifecycle events, webhook signature verification via `stripe.webhooks.constructEvent()`. |
| `@stripe/stripe-js` | ^5.x | Stripe client SDK — Checkout redirect | Loads Stripe.js in the browser. Used client-side to redirect to hosted Checkout page. Required by Stripe for PCI-compliant flows. |
| `@libsql/client` | ^0.14.x | Turso/libSQL database client | HTTP-based SQLite client for Turso cloud. Works in both Vercel serverless and edge runtimes. Use `@libsql/client` for serverless, `@libsql/client/web` for edge runtime files. Sub-5ms connection overhead — no TCP connection pooling needed. |
| `drizzle-orm` | ^0.45.1 | ORM — type-safe SQL against Turso/libSQL | Native libSQL driver support. TypeScript-first, schema-as-code. Compiles to plain SQL with no runtime overhead. Works in Vercel edge and serverless. Pairs with `drizzle-kit` for migrations. |
| `drizzle-kit` | ^0.30.x | Migration CLI for Drizzle schema | Generates and runs SQL migrations from Drizzle schema definitions. Run `npx drizzle-kit generate` then `npx drizzle-kit migrate` locally or in CI before deploy. |
| `nanoid` | ^5.x | Short-code generation for dynamic QR slugs | Generates collision-resistant 8–10 character slugs (e.g., `abc123xy`) for redirect URLs. Tiny (~130 bytes), no dependencies, works in edge runtime. ESM-native — compatible with Astro 5. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `svix` | ^1.x | Webhook signature verification for Clerk events | Only needed if syncing Clerk user events (e.g., `user.deleted`) to your database. The `stripe` SDK handles its own webhook verification natively — `svix` is for Clerk webhooks only. |

### Development Tools (New for v1.1)

| Tool | Purpose | Notes |
|------|---------|-------|
| `drizzle-kit` | Schema migration CLI | `npx drizzle-kit generate` then `npx drizzle-kit migrate`. Run before each deploy when schema changes. |
| Turso CLI | DB management, local dev inspection | `brew install tursodatabase/tap/turso`. Create DBs, inspect schema, run queries in shell. |
| Stripe CLI | Local webhook forwarding during development | `stripe listen --forward-to localhost:4321/api/stripe/webhook`. Required to test webhook flows locally without a public URL. |
| Clerk Dashboard | API key management, user management, OAuth config | No install. Configure JWT templates, OAuth providers, and webhook endpoints (for user sync) via web UI. |

---

## Critical Architecture Change: Static to Server Output

The most important infrastructure decision for v1.1 is switching Astro from `output: 'static'` to `output: 'server'`. This is a one-line change in `astro.config.mjs` but has meaningful consequences.

**Current (v1.0):** `output: 'static'` — all pages pre-rendered at build, no server runtime
**Required (v1.1):** `output: 'server'` — server runtime enabled; opt static pages back in with `export const prerender = true`

```js
// astro.config.mjs — required change
import vercel from '@astrojs/vercel';  // NOT '@astrojs/vercel/serverless' (deprecated path)

export default defineConfig({
  output: 'server',           // was: 'static'
  adapter: vercel(),
  // ... all existing integrations unchanged
});
```

**Pages that must keep `export const prerender = true`** (stay static, preserve Lighthouse 100):
- `src/pages/index.astro` — the QR generator (client-side React island, no server needed)
- `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`

**Pages/routes that require SSR (new in v1.1):**
- `src/pages/dashboard.astro` — saved QR library (reads from DB)
- `src/pages/api/stripe/checkout.ts` — creates Checkout session
- `src/pages/api/stripe/webhook.ts` — receives Stripe events
- `src/pages/r/[slug].ts` — dynamic QR redirect + scan event recording

**Why `output: 'server'` over `output: 'hybrid'`:** The `hybrid` mode has a documented issue in Astro 5 + Vercel where API routes are treated as static assets, returning HTML or 405 errors. The fix is `output: 'server'` with explicit `prerender = true` flags on static pages. This is the Astro-recommended approach as of early 2026.

---

## Auth Decision: Clerk

**Recommendation: Clerk (`@clerk/astro` ^2.16.2)**

### Comparison Matrix

| Criterion | Clerk | Supabase Auth | Auth.js v5 | Better Auth |
|-----------|-------|---------------|------------|-------------|
| Official Astro SDK | Yes (Jul 2024, updated Mar 2026) | No (community wrappers only) | Community integration only | Yes (first-class) |
| Pre-built UI components | Full — SignIn, SignUp, UserButton, OrganizationProfile | None — build your own forms | None — build your own forms | Partial |
| React island compatible | Yes — components work inside React islands | Manual JWT parsing | Manual | Manual |
| Astro middleware integration | `clerkMiddleware()` — 5 lines | Manual JWT validation on every protected route | `auth()` helper | `auth()` helper |
| Astro locals (`locals.auth()`) | Built-in | Manual | Manual | Manual |
| Free tier | 10K MAU free | 50K MAU free | Self-hosted (free) | Self-hosted (free) |
| Paid tier cost | $25/mo + $0.02/MAU over 10K | $25/mo (Pro, includes auth) | Infrastructure cost only | Infrastructure cost only |
| Setup time (estimated) | 30–60 min | 3–5 hours | 4–8 hours | 3–5 hours |
| Database coupling | None — standalone auth service | Requires Supabase Postgres for RLS | None | None |
| Session storage | Managed by Clerk (no extra config) | JWT in cookies (manual setup) | `unstorage`-based (manual driver config) | Manual |

**Why not Supabase Auth:** Supabase Auth's main value is tight integration with Supabase Postgres via Row Level Security. QRCraft uses Turso (not Supabase Postgres), so there is no RLS benefit. Using Supabase Auth without Supabase Postgres adds auth complexity without the ecosystem payoff. The result is more setup work than Clerk with no advantage.

**Why not Auth.js v5:** The Astro integration is community-maintained (`auth-astro`, not `@auth/astro`). There is no official `@auth/astro` package from the Auth.js team. Community packages have documented friction with Astro 5. No pre-built UI. Not worth choosing over Clerk when Clerk has an official, actively maintained SDK with Astro-native helpers.

**Why not Better Auth:** Better Auth is an excellent self-hosted option, and it has first-class Astro integration. The case for choosing it over Clerk is cost (self-hosted = free at any scale) and data sovereignty. The case against: you must configure session storage, email delivery (SMTP), and potentially an OAuth provider. For a bootstrapped MVP at <10K MAU, this is unnecessary operational overhead. Better Auth becomes the right choice if QRCraft grows past ~50K MAU and Clerk cost becomes a line item worth optimizing.

---

## Database Decision: Turso (libSQL)

**Recommendation: Turso via `@libsql/client` + Drizzle ORM**

### Comparison Matrix

| Criterion | Turso (libSQL) | Supabase Postgres | Neon Postgres | PlanetScale |
|-----------|----------------|-------------------|---------------|-------------|
| Free tier | 5 GB storage, unlimited DBs | 500 MB, 2 projects | 0.5 GB, 20 projects | No hobby tier (removed 2024) |
| Minimum paid cost | $4.99/mo (Developer) | $25/mo | $19/mo | $39/mo |
| Cold start in Vercel serverless | <5ms (HTTP-based client) | 100–300ms (TCP, needs pooler) | 50–200ms | 50–200ms |
| Edge runtime compatible | Yes — `@libsql/client/web` | No (requires TCP) | Partial (HTTP extension required) | No |
| Concurrent writes | Single-writer per DB (sufficient at this scale) | Full concurrent | Full concurrent | Full concurrent |
| ORM support | Drizzle (native), Prisma (experimental) | Drizzle, Prisma, Supabase JS | Drizzle, Prisma | Drizzle, Prisma |
| Auth coupling | None | Optional (Supabase Auth + RLS) | None | None |
| Geo replication | Yes (edge replicas) | No (single region) | Multi-region (paid) | Multi-region |

**Why Turso over Supabase Postgres:** QRCraft's write pattern is low-frequency (save QR, record scan). The read pattern is simple point lookups (fetch QR by slug, fetch user's QR library). Turso's single-writer limitation is not a constraint at this scale. The HTTP client eliminates Postgres connection pool management. The free tier is dramatically more generous. The monthly cost difference is $0 vs $25 at MVP stage — this is the right default.

**Why Turso over Neon Postgres:** Neon is the right call if the data model requires Postgres-specific features (JSONB operators, pg_vector, full-text search, complex CTEs). QRCraft's schema is simple — three tables with straightforward queries. SQLite is sufficient. Neon is a valid upgrade path if complex analytics queries emerge later.

**Why Turso over PlanetScale:** PlanetScale removed its hobby plan in 2024. The lowest available tier is $39/mo. This is not appropriate for a bootstrapped MVP.

**Recommended schema (logical, not final DDL):**

```
users
  clerk_user_id TEXT PRIMARY KEY   -- from Clerk JWT
  stripe_customer_id TEXT          -- set when Stripe customer created
  plan TEXT DEFAULT 'free'         -- 'free' | 'pro'
  created_at INTEGER               -- unix timestamp

qr_codes
  id TEXT PRIMARY KEY              -- nanoid
  user_id TEXT                     -- FK → users.clerk_user_id
  name TEXT
  content_type TEXT                -- 'url' | 'text' | 'wifi' | 'vcard'
  config_json TEXT                 -- serialized qr-code-styling options
  is_dynamic INTEGER DEFAULT 0     -- boolean: 0 | 1
  slug TEXT UNIQUE                 -- only for dynamic QR codes, e.g. 'abc123xy'
  destination_url TEXT             -- only for dynamic QR codes
  created_at INTEGER
  updated_at INTEGER

scan_events
  id TEXT PRIMARY KEY              -- nanoid
  qr_code_id TEXT                  -- FK → qr_codes.id
  scanned_at INTEGER               -- unix timestamp
  user_agent TEXT
  country TEXT                     -- from Vercel x-vercel-ip-country header
```

---

## Payments: Stripe Checkout (Hosted)

**Recommendation: Stripe Checkout (hosted payment page) + server-side webhooks**

Stripe is the only serious choice for a consumer SaaS. The question is which Stripe integration pattern. Use hosted Checkout, not custom Elements.

**Why Stripe Checkout over Stripe Elements:**
- Checkout handles PCI compliance (SAQ A vs SAQ D), 3DS, Apple Pay, Google Pay automatically
- ~2 hours to implement vs ~2+ days for a custom Elements form built correctly
- Customer billing portal (`stripe.billingPortal.sessions.create()`) is included — users can manage their subscription without any additional UI
- No card number UI to build, test, or maintain

**Integration flow:**

```
1. User clicks "Upgrade to Pro"
   → POST /api/stripe/checkout (Astro API route, serverless function)
   → stripe.checkout.sessions.create({ mode: 'subscription', priceId, customerId, successUrl, cancelUrl })
   → Return { url: checkoutSessionUrl }
   → Client-side redirect to Stripe-hosted checkout

2. Stripe sends POST to /api/stripe/webhook after payment:
   - customer.subscription.created  → UPDATE users SET plan = 'pro'
   - customer.subscription.deleted  → UPDATE users SET plan = 'free'
   - invoice.payment_failed         → (optional) flag for dunning email

3. User clicks "Manage billing"
   → POST /api/stripe/portal (creates billing portal session)
   → Redirect to Stripe-hosted portal
```

**Critical implementation detail:** The webhook handler must read the raw request body as text (`await request.text()`) before JSON parsing, then verify with `stripe.webhooks.constructEvent(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET)`. Parsing JSON first corrupts the signature validation.

---

## Redirect Service: Vercel Edge Function

**Recommendation: Vercel edge function at `src/pages/r/[slug].ts`**

Dynamic QR codes encode a URL like `https://qrcraft.app/r/abc123xy`. When a physical QR code is scanned:

1. Edge function at `/r/[slug]` receives the request
2. Looks up the slug in Turso (via `@libsql/client/web`)
3. Records a scan event (timestamp, user agent, country from Vercel geo headers)
4. Returns a `302` redirect to the destination URL

**Why edge over serverless for this route:**
- Edge functions run globally at Vercel's CDN edge nodes — ~50ms end-to-end for a redirect
- Serverless functions run from a single region — ~200–300ms for users far from that region
- A physical QR code is scanned by a user staring at a loading screen. Latency matters.
- Vercel edge functions expose `request.headers.get('x-vercel-ip-country')` — free geo data for scan analytics without an external IP lookup service

**Key implementation constraint:** The default `@libsql/client` import uses Node.js APIs that are unavailable in the edge runtime. Use `@libsql/client/web` specifically in edge-runtime files.

```ts
// src/pages/r/[slug].ts
export const prerender = false;
export const runtime = 'edge';

import { createClient } from '@libsql/client/web';  // NOT '@libsql/client'
```

**Why not a separate redirect microservice:** Unnecessary complexity. Vercel edge functions are globally distributed — this IS the globally-distributed redirect service. No additional domain, no separate deployment, no additional infrastructure cost.

---

## Pro Feature Gating

Feature gating operates at two layers:

1. **Server-side (authoritative):** API routes and server-rendered pages check `user.plan === 'pro'` from the database before returning data or accepting mutations. This is the real gate — it cannot be bypassed.

2. **Client-side (UX only):** React island disables/hides Pro controls when the user is on the free tier. This is cosmetic — it improves UX but provides no security. Never rely on client-side gating alone.

**Pattern:** When a Pro-only API route is called:
- Load user from DB by `locals.auth().userId`
- If `user.plan !== 'pro'`, return `403 { error: 'pro_required' }`
- Client renders upgrade prompt on `403`

---

## Installation

```bash
# Auth
npm install @clerk/astro

# Payments
npm install stripe @stripe/stripe-js

# Database + ORM
npm install @libsql/client drizzle-orm
npm install -D drizzle-kit

# Utilities
npm install nanoid

# Adapter (upgrade if needed — import path changed in v8+)
npm install @astrojs/vercel@latest
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Clerk (`@clerk/astro`) | Better Auth (self-hosted) | When MAU exceeds ~50K and Clerk's $0.02/MAU charge becomes significant; or when you require fully on-premises auth with no third-party dependency |
| Clerk | Supabase Auth | Only when already committed to Supabase Postgres and want Row Level Security without a separate auth layer |
| Turso (libSQL) | Neon Postgres | When the data model requires Postgres-specific features: JSONB operators, pg_vector, full-text search, complex window functions |
| Turso | Supabase Postgres | When buying into the full Supabase ecosystem (auth + realtime + storage + edge functions) and want everything managed in one dashboard |
| Stripe Checkout (hosted) | Stripe Elements (custom form) | When the product requires a fully custom payment UI and the team has 2+ weeks to implement and test a PCI-compliant card form |
| Vercel edge function for redirect | Cloudflare Worker | When the app is deployed on Cloudflare Pages or needs multi-platform deployments; Workers have equivalent edge latency |
| Drizzle ORM | Prisma | When the team is deeply familiar with Prisma and the schema is complex enough that Prisma's migration tooling adds value; note Prisma's edge runtime support for libSQL is experimental as of early 2026 |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `import vercel from '@astrojs/vercel/serverless'` | Deprecated import path in `@astrojs/vercel` v8+; causes import errors in Astro 5 | `import vercel from '@astrojs/vercel'` |
| `output: 'hybrid'` in Astro config | Documented issue: Vercel treats API routes as static assets in hybrid mode, returning HTML or 405 errors | `output: 'server'` with explicit `export const prerender = true` on static pages |
| Prisma with Turso/libSQL | Prisma's libSQL/edge runtime support is marked experimental; documented compatibility issues and slow build times | Drizzle ORM (native libSQL support, lightweight, production-ready) |
| `@libsql/client` (default) in edge runtime files | Uses Node.js APIs unavailable in the Vercel edge runtime — throws at runtime | `@libsql/client/web` in any file with `export const runtime = 'edge'` |
| Supabase Auth standalone (without Supabase DB) | Adds auth complexity (custom forms, RLS setup) without the bundled database that makes Supabase worthwhile | Clerk |
| PlanetScale | Removed hobby plan in 2024; minimum tier is $39/mo | Turso (free tier) or Neon ($19/mo) |
| Stripe Elements (custom card form) without PCI review | Custom card input forms expand PCI scope to SAQ D, requiring annual assessment | Stripe Checkout (hosted, SAQ A — simplest compliance path) |
| Rolling custom JWT session management | High security surface area; weeks of work to implement token refresh, revocation, CSRF protection correctly | Clerk (handles all of this as a managed service) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@clerk/astro` ^2.16.2 | Astro 5.x | Official SDK; docs last updated March 2026 |
| `@astrojs/vercel` ^9.0.4 | Astro 5.x | Use `import vercel from '@astrojs/vercel'` (not the old `/serverless` sub-path) |
| `drizzle-orm` ^0.45.1 | `@libsql/client` ^0.14.x | Use these together — Drizzle has native libSQL driver for this version range |
| `@libsql/client` ^0.14.x | Turso cloud | Default import for serverless; `/web` import for edge runtime |
| `stripe` ^20.4.1 | Node 18+ | Vercel serverless functions run Node 18/20 — compatible |
| `nanoid` ^5.x | Astro 5 (ESM) | v5 is ESM-only; Astro 5 is ESM-native — no compatibility issues |
| `drizzle-orm` ^0.45.1 | Vercel edge runtime | Confirmed by Drizzle's official "Drizzle with Vercel Edge Functions" tutorial |

---

## Sources

- [Clerk Astro SDK overview](https://clerk.com/docs/reference/astro/overview) — integration setup, locals API, middleware. Updated March 2026. HIGH confidence.
- [Clerk Astro quickstart](https://clerk.com/docs/astro/getting-started/quickstart) — step-by-step setup with `@astrojs/node` adapter pattern. HIGH confidence.
- [Clerk pricing](https://clerk.com/pricing) — 10K MAU free, $25/mo Pro plan. Confirmed by multiple 2026 sources. MEDIUM confidence (official site, but pricing can change).
- [Turso pricing](https://turso.tech/pricing) — 5 GB storage, unlimited databases on free tier. HIGH confidence (official site).
- [Drizzle ORM + Turso tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso) — integration pattern, libSQL driver. HIGH confidence (official Drizzle docs).
- [Drizzle + Vercel Edge Functions](https://orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions) — edge runtime compatibility confirmed. HIGH confidence (official Drizzle docs).
- [Stripe subscriptions guide](https://docs.stripe.com/billing/subscriptions/build-subscriptions) — Checkout + webhook lifecycle. HIGH confidence (official Stripe docs).
- [Astro Vercel adapter docs](https://docs.astro.build/en/guides/integrations-guide/vercel/) — `output: 'server'`, import path change, `prerender` flag pattern. HIGH confidence (official Astro docs).
- [Vercel edge vs serverless latency](https://www.openstatus.dev/blog/monitoring-latency-vercel-edge-vs-serverless) — 167ms edge vs 287ms serverless for warm executions. MEDIUM confidence (third-party benchmark).
- [Supabase + Clerk integration docs](https://supabase.com/docs/guides/auth/third-party/clerk) — confirms Clerk works as a standalone auth layer with non-Supabase databases. HIGH confidence.
- WebSearch: `output: 'hybrid'` API route issues on Astro 5 + Vercel — documented in GitHub issues and community posts recommending `output: 'server'` as the fix. MEDIUM confidence.
- `@clerk/astro` version 2.16.2 — confirmed via WebSearch npm metadata (published ~March 11, 2026). HIGH confidence.
- `stripe` version 20.4.1 — confirmed via WebSearch npm metadata (published ~March 8, 2026). HIGH confidence.
- `@astrojs/vercel` version 9.0.4 — confirmed via WebSearch npm metadata. HIGH confidence.
- `drizzle-orm` version 0.45.1 — confirmed via WebSearch npm metadata. HIGH confidence.

---

*Stack research for: QRCraft v1.1 Monetization — auth, payments, database, dynamic QR redirect, scan analytics*
*Researched: 2026-03-11*
