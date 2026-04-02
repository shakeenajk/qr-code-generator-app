# Architecture Research: v1.3 Integration Points

**Domain:** Freemium SaaS — QR code generator adding bulk generation, developer API, team workspaces, advanced analytics, i18n, campaign scheduling, custom short domains, seasonal templates, rate limiting, and error tracking
**Researched:** 2026-03-31
**Confidence:** HIGH for items building on verified patterns (Vercel cron, Astro i18n, Drizzle schema extension, Sentry Astro); MEDIUM for custom domain flow (Vercel Domains API is well-documented but multi-step orchestration is new code); LOW for OAuth2 client credentials flow (standard RFC but no community reference implementation on this stack)

---

## Context: Existing Architecture (What v1.3 Extends)

```
astro.config.mjs: output: 'static', adapter: vercel()
src/
  pages/
    index.astro                     # static, CDN-cached
    r/[slug].ts                     # prerender=false — Turso lookup → 307
    p/[slug].astro                  # prerender=false — SSR landing page
    api/qr/save.ts                  # prerender=false — Drizzle INSERT
    api/qr/[id].ts                  # prerender=false — CRUD
    api/qr/list.ts                  # prerender=false — SELECT
    api/subscription/status.ts      # prerender=false — tier read
    api/analytics/[slug].ts         # prerender=false — scan counts
    api/webhooks/stripe.ts          # prerender=false — Stripe events
    api/landing/create|[id]|upload  # prerender=false — landing pages
    dashboard/                      # prerender=false — SSR, Clerk-protected
    login.astro / signup.astro      # prerender=false — Clerk
  components/
    QRGeneratorIsland.tsx           # client:only React — qr-code-styling, tabs, save
    ExportButtons.tsx               # client-side PNG/SVG/copy/frame
  db/schema.ts                      # subscriptions, savedQrCodes, dynamicQrCodes, scanEvents,
                                    # stripeEvents, landingPages
  lib/
    qrEncoding.ts                   # VCardState, encodeVCard
    frameComposer.ts                # Canvas 2D QR + frame composition
    billing.ts                      # Stripe tier helpers
    tierLimits.ts                   # Per-tier limits
  middleware.ts                     # clerkMiddleware — /dashboard protection
```

Key constraints:
- `output: 'static'` — pages are CDN-cached unless `export const prerender = false`
- Clerk is **incompatible with Vercel Edge runtime** — all server-side routes must be Lambda (Node.js), not Edge
- `waitUntil` / Fluid Compute is available on Vercel Pro for background work after response sent
- Turso (libSQL) is the only database — no Postgres, no Redis (yet)

---

## Feature 1: Bulk QR Generation (CSV → ZIP)

### Architecture

Bulk generation is a request-response flow, not a true background job. A user uploads a CSV; the server parses it, generates QR PNGs, zips them, and streams the ZIP back. For v1.3 scale (typical upload: 50–500 rows), this fits inside a single serverless function invocation if QR rendering is done server-side.

**Problem:** `qr-code-styling` is a browser DOM library — it uses `document` and `HTMLCanvasElement`. It cannot run in Node.js serverless functions.

**Solution:** Use the headless `qrcode` npm package (`node-qrcode`) for server-side PNG generation. It has no DOM dependency, outputs Buffer directly, and is the standard server-side choice. Style fidelity will be reduced to solid dots only (no gradient, no custom dot shapes, no logo embedding) — this is acceptable for bulk export which prioritizes throughput over aesthetics.

**Alternatively:** Accept this limitation as a v1.3 trade-off and document it. Users who need fully-styled bulk exports are an enterprise-tier feature.

### Data Flow

```
User selects CSV file in BulkGenerateIsland
  → POST /api/qr/bulk { csv: string, options: BulkOptions }
  → API route: papaparse.parse(csv) → rows[]
  → For each row: qrcode.toBuffer(url, { type: 'png', width: 512 })
  → JSZip.file(`${name}.png`, buffer) for each
  → JSZip.generateAsync({ type: 'nodebuffer' })
  → Response with Content-Type: application/zip, Content-Disposition: attachment
```

### Timeout Risk

Vercel serverless functions on Pro have a 60-second max duration. At ~50ms per QR + ZIP overhead, 500 rows takes ~30s — within budget. Impose a hard limit of 500 rows per upload. For larger batches, a queue-based approach (Inngest or Vercel Fluid Compute `waitUntil`) would be needed, but is out of scope for v1.3.

### New Components

| Component | Type | Description |
|-----------|------|-------------|
| `BulkGenerateIsland.tsx` | React island, `client:visible` | CSV upload via `<input type="file">`, options (size, error correction), trigger button |
| `/api/qr/bulk.ts` | serverless, `prerender=false` | POST — papaparse → qrcode → JSZip → stream zip |
| `/dashboard/bulk.astro` | SSR, `prerender=false` | Dashboard page hosting the island |

### Schema Impact

None for v1.3. Bulk exports are ephemeral — no persistence. Future: add a `bulkJobs` table for job history.

### New Dependencies

```
npm install qrcode jszip papaparse
npm install -D @types/qrcode @types/papaparse
```

---

## Feature 2: REST API with OAuth2 Client Credentials

### Architecture

The REST API lives at `/api/v1/[resource]` — a versioned sub-tree within the same Astro app. It is NOT a separate service. This avoids new infrastructure at v1.3 scale, reuses Drizzle/Turso directly, and deploys with the main app.

**Auth scheme:** OAuth2 client credentials flow (machine-to-machine). No user login. Developer creates an API key pair (client_id + client_secret) in their dashboard. To call the API they POST to `/api/v1/token` with credentials → receive a short-lived JWT bearer token → include in `Authorization: Bearer` header on subsequent calls.

**Why not API keys directly?** OAuth2 client credentials is the industry standard for developer APIs and makes rate limiting and token revocation cleaner. Bearer tokens expire (e.g., 1 hour), reducing exposure of compromised secrets. Clients implement a simple token refresh flow.

**Why JWT, not opaque tokens?** JWTs are self-contained — the API routes can verify the signature without a DB lookup on every request, preserving Turso connection budget. Payload includes `sub` (userId/clientId), `tier`, `iat`, `exp`. Signed with `JWT_SECRET` env var.

### New Database Tables

```typescript
// API OAuth2 credentials table
export const apiCredentials = sqliteTable('api_credentials', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  clientId: text('client_id').notNull().unique(),          // public identifier
  clientSecretHash: text('client_secret_hash').notNull(),  // bcrypt hash of secret
  name: text('name').notNull(),                            // "My Agency Integration"
  scopes: text('scopes').notNull().default('qr:read qr:write'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  lastUsedAt: integer('last_used_at'),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('api_credentials_user_id_idx').on(table.userId),
]);
```

### New Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/v1/token` | POST | Exchange client_id + client_secret for JWT bearer token (60 min TTL) |
| `/api/v1/qr` | GET | List caller's QR codes (paginated, max 100) |
| `/api/v1/qr` | POST | Create a QR code |
| `/api/v1/qr/[id]` | GET | Fetch one QR code |
| `/api/v1/qr/[id]` | PATCH | Update destination URL of dynamic QR |
| `/api/v1/qr/[id]` | DELETE | Delete a QR code |
| `/api/v1/qr/[id]/analytics` | GET | Fetch scan counts for a QR code |
| `/dashboard/api-keys.astro` | SSR | Dashboard page to create/revoke API credentials |
| `/api/dashboard/api-keys/*` | serverless | CRUD for `apiCredentials` rows |

### Middleware Separation

The existing `middleware.ts` protects `/dashboard` routes via Clerk. The `/api/v1/*` routes use a **different auth scheme** (JWT bearer) and must NOT go through Clerk middleware. The middleware needs a route exclusion:

```typescript
// middleware.ts — add exemption for /api/v1 (public, JWT-authenticated separately)
const isPublicApiRoute = createRouteMatcher(['/api/v1/(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
  if (isWebhookRoute(context.request)) return;
  if (isPublicApiRoute(context.request)) return; // JWT auth handled per-route
  const { userId } = auth();
  if (!userId && isProtectedRoute(context.request)) {
    return context.redirect('/login');
  }
});
```

Each `/api/v1/*` handler verifies the JWT itself using a shared `verifyApiToken(request)` helper in `src/lib/apiAuth.ts`.

### New Dependencies

```
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs
```

---

## Feature 3: Team Workspaces (Multi-Tenant Schema)

### Architecture

Teams are modeled as a **shared-schema multi-tenancy** pattern: all teams share one Turso database. Each resource (savedQrCodes, dynamicQrCodes, etc.) gains an optional `workspaceId` FK. A user's "personal" workspace has `workspaceId = null` (backward compatible).

**Why not database-per-tenant (Turso's multi-db pattern)?** Multi-db is appropriate when tenants need strong data isolation (compliance, different plans). For QRCraft teams, shared schema is simpler to operate, consistent with the existing stack, and sufficient for the access control requirements.

### New Database Tables

```typescript
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  ownerUserId: text('owner_user_id').notNull(),            // Clerk userId of creator
  plan: text('plan').notNull().default('team'),            // for future tier differentiation
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});

export const workspaceMembers = sqliteTable('workspace_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),                       // Clerk userId
  role: text('role').notNull().default('member'),          // 'owner' | 'admin' | 'member' | 'viewer'
  invitedByUserId: text('invited_by_user_id'),
  joinedAt: integer('joined_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('workspace_members_workspace_idx').on(table.workspaceId),
  index('workspace_members_user_idx').on(table.userId),
]);
```

### Schema Modifications to Existing Tables

Add `workspaceId` as a nullable FK to tables that become workspace-scoped:

```typescript
// savedQrCodes — add column
workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),

// dynamicQrCodes — add column
workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
```

Existing rows have `workspaceId = null` (personal). This is a backward-compatible additive migration.

### Access Control Layer

All API routes and dashboard pages that query savedQrCodes/dynamicQrCodes need to be updated to scope by workspace. Create a utility:

```typescript
// src/lib/workspaceAuth.ts
export async function getEffectiveScope(userId: string, requestedWorkspaceId?: string) {
  if (!requestedWorkspaceId) return { type: 'personal', userId };
  // verify user is a member of requestedWorkspaceId
  const member = await db.select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, requestedWorkspaceId)))
    .limit(1);
  if (!member.length) throw new Error('Not a member of this workspace');
  return { type: 'workspace', workspaceId: requestedWorkspaceId, role: member[0].role };
}
```

### New Routes

| Route | Description |
|-------|-------------|
| `/dashboard/workspaces.astro` | List workspaces user belongs to |
| `/dashboard/workspaces/[id].astro` | Workspace QR library view |
| `/api/workspaces/create.ts` | POST — create workspace |
| `/api/workspaces/[id]/members.ts` | GET list, POST invite, DELETE remove |
| `/api/workspaces/[id]/invite.ts` | POST — send invite email (Clerk email or Resend) |

---

## Feature 4: Advanced Analytics (Date Ranges, CSV Export, UTM Tracking)

### Architecture

This extends the existing `scanEvents` table and analytics API routes. No new infrastructure.

**UTM tracking:** The `/r/[slug].ts` redirect handler already reads headers. It needs to also parse UTM parameters from the incoming URL query string (`?utm_source=...`) and store them on the `scanEvents` row.

**Date range queries:** The existing `scanEvents` table has a `scanned_at` integer epoch column with an index on `(dynamicQrCodeId, scanned_at)`. Date range WHERE clauses use this index efficiently.

**CSV export:** The analytics API route adds an `?format=csv` query param. When set, it returns `Content-Type: text/csv` with rows serialized. No new table or library needed — native string serialization.

### Schema Modification

```typescript
// scanEvents — add UTM columns (additive migration)
utmSource: text('utm_source'),
utmMedium: text('utm_medium'),
utmCampaign: text('utm_campaign'),
utmContent: text('utm_content'),
utmTerm: text('utm_term'),
referrer: text('referrer'),        // Referer header for organic traffic
```

### UTM Capture in Redirect

```typescript
// r/[slug].ts — extract UTM from query string before redirect
const url = new URL(request.url);
const utmSource = url.searchParams.get('utm_source');
// store on scanEvents INSERT
```

### New API Route Surface

```
GET /api/analytics/[slug]?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv
```

The existing `/api/analytics/[slug].ts` gets a `from`/`to` date range filter and a `format` param. Modify in place — no new route needed.

---

## Feature 5: Internationalization (Astro built-in i18n)

### Architecture

Astro 5 has built-in i18n routing. Configuration goes in `astro.config.mjs`. The URL structure for v1.3 is:

- English (default): `/` — no prefix (clean URLs for existing SEO)
- Spanish: `/es/`
- French: `/fr/`
- German: `/de/`

This uses `prefixDefaultLocale: false` so existing URLs are preserved and English SEO equity is not disrupted.

### Configuration

```typescript
// astro.config.mjs addition
i18n: {
  locales: ['en', 'es', 'fr', 'de'],
  defaultLocale: 'en',
  routing: {
    prefixDefaultLocale: false,       // English stays at /
    redirectToDefaultLocale: false,   // / does not 301 to /en/
  },
  fallback: {
    es: 'en',
    fr: 'en',
    de: 'en',
  },
},
```

### File Structure

Content translations live as TypeScript literal objects, not JSON files (simpler, type-safe, no i18n library needed):

```
src/
  i18n/
    en.ts     # English strings (canonical)
    es.ts     # Spanish
    fr.ts     # French
    de.ts     # German
    utils.ts  # useTranslations(locale) helper
```

Static pages that need i18n get duplicated under locale prefixes using `getStaticPaths`:

```typescript
// src/pages/[lang]/index.astro
export function getStaticPaths() {
  return [{ params: { lang: 'es' } }, { params: { lang: 'fr' } }, { params: { lang: 'de' } }];
}
```

The English homepage stays at `src/pages/index.astro` (unchanged).

### Scope Constraint

Only **public marketing pages** are translated in v1.3 (homepage, pricing, use cases). The dashboard and API remain English-only. This limits translation surface to ~5 pages and avoids i18n complexity in the React islands.

### SEO: hreflang Tags

The `Layout.astro` `<head>` section needs hreflang link tags for all pages that have translated versions:

```html
<link rel="alternate" hreflang="en" href="https://qr-code-generator-app.com/" />
<link rel="alternate" hreflang="es" href="https://qr-code-generator-app.com/es/" />
<link rel="alternate" hreflang="fr" href="https://qr-code-generator-app.com/fr/" />
<link rel="alternate" hreflang="de" href="https://qr-code-generator-app.com/de/" />
<link rel="alternate" hreflang="x-default" href="https://qr-code-generator-app.com/" />
```

### No External i18n Library

Paraglide (community recommendation) adds build complexity and a new mental model. For 4 locales and ~5 pages, a plain TypeScript literal dictionary is sufficient and has zero dependencies. Revisit Paraglide if translation volume grows past ~20 pages.

---

## Feature 6: Campaign Scheduling (Cron-Triggered Activation)

### Architecture

A "scheduled campaign" is a `dynamicQrCodes` row that has `isPaused = true` and a future `scheduledEnableAt` timestamp. A Vercel Cron job fires every 15 minutes (minimum on Pro plan) and activates any rows where `scheduledEnableAt <= now()` and `isPaused = true`.

### Schema Modification

```typescript
// dynamicQrCodes — add scheduling columns
scheduledEnableAt: integer('scheduled_enable_at'),    // unix epoch — null means no schedule
scheduledPauseAt: integer('scheduled_pause_at'),      // unix epoch — auto-pause date
```

### New Route: Cron Handler

```typescript
// src/pages/api/cron/campaigns.ts
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  // Verify the request is from Vercel Cron (not an attacker)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${import.meta.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);

  // Enable campaigns whose scheduled_enable_at has passed
  await db.update(dynamicQrCodes)
    .set({ isPaused: false, scheduledEnableAt: null })
    .where(and(lte(dynamicQrCodes.scheduledEnableAt, now), eq(dynamicQrCodes.isPaused, true)));

  // Pause campaigns whose scheduled_pause_at has passed
  await db.update(dynamicQrCodes)
    .set({ isPaused: true, scheduledPauseAt: null })
    .where(and(lte(dynamicQrCodes.scheduledPauseAt, now), eq(dynamicQrCodes.isPaused, false)));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

### vercel.json Cron Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/campaigns",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Note: `*/15 * * * *` requires Vercel Pro. On Hobby it would need to be `0 * * * *` (hourly).

The `CRON_SECRET` is automatically injected by Vercel and must be validated to prevent unauthorized cron triggering.

---

## Feature 7: Custom Short Domains (go.brand.com)

### Architecture

This is the most complex v1.3 feature. It involves three layers:

1. **DNS**: User adds a CNAME record pointing `go.brand.com → qr-code-generator-app.com`
2. **Domain registration**: QRCraft calls Vercel Domains API to add the custom domain to the project
3. **Routing**: The existing `/r/[slug].ts` handler needs to be domain-aware — a scan hitting `go.brand.com/[slug]` must resolve the QR code

### DNS + Vercel Domains API Flow

```
User in dashboard: "Add custom domain" → enters "go.brand.com"
  → POST /api/domains/add { domain: "go.brand.com" }
  → Server calls Vercel REST API:
      POST https://api.vercel.com/v10/projects/{projectId}/domains
      { name: "go.brand.com" }
  → Vercel returns verification challenge (CNAME or TXT record)
  → Server stores pending domain + challenge in customDomains table
  → UI shows user: "Add this CNAME record to your DNS"

User adds CNAME record at their registrar
  → Vercel auto-verifies within minutes (polls or webhook)
  → OR: User clicks "Verify" → POST /api/domains/verify
  → Server calls Vercel REST API:
      POST https://api.vercel.com/v10/projects/{projectId}/domains/{domain}/verify
  → On success: update customDomains row status = 'active'
```

### New Database Table

```typescript
export const customDomains = sqliteTable('custom_domains', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  workspaceId: text('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  domain: text('domain').notNull().unique(),               // "go.brand.com"
  status: text('status').notNull().default('pending'),     // 'pending' | 'active' | 'error'
  vercelDomainId: text('vercel_domain_id'),
  verificationRecord: text('verification_record'),         // JSON: {type, name, value}
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('custom_domains_user_id_idx').on(table.userId),
]);
```

### Routing Modification for Custom Domains

When a request arrives at `go.brand.com/[slug]`, Vercel routes it to the same deployment as `qr-code-generator-app.com`. The `/r/[slug].ts` handler receives it. It needs to work regardless of which domain the request arrived on — and it already does, since it only cares about the slug, not the Host header.

However, custom domain QR codes should encode `go.brand.com/[slug]` not `qr-code-generator-app.com/r/[slug]`. This means:

- The `savedQrCodes.contentData` for dynamic QR codes with custom domains stores the custom domain URL
- When the user selects a custom domain in the dashboard, the QR encoding switches to `https://go.brand.com/[slug]`
- The redirect handler `/r/[slug].ts` serves both `qr-code-generator-app.com/r/[slug]` and `go.brand.com/[slug]`

**Note:** The `[slug]` path on a custom domain does NOT have the `/r/` prefix — it must be a root-path handler. This requires a wildcard catch-all route for custom domains. On Vercel, a second API route at `src/pages/[slug].ts` with domain detection handles this:

```typescript
// src/pages/[slug].ts (NEW — catch-all for custom domains)
export const prerender = false;
export const GET: APIRoute = async ({ params, request }) => {
  const host = request.headers.get('host') ?? '';
  // Only process if host is NOT the canonical domain — prevents conflict with static pages
  if (host.includes('qr-code-generator-app.com') || host.includes('vercel.app')) {
    return new Response(null, { status: 404 });
  }
  // Reuse the slug → redirect logic from /r/[slug].ts
  return handleSlugRedirect(params.slug!, request);
};
```

**Constraint:** This feature requires `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` as environment variables. The Vercel Domains API is only available on Pro+ plans for adding custom domains programmatically.

### Confidence Note

The Vercel Domains API is well-documented (REST, current as of 2025). The catch-all domain routing pattern is MEDIUM confidence — it relies on Vercel correctly routing custom domains to the project and the Host header being forwarded as-is to the serverless function (confirmed by Vercel docs for multi-tenant use cases).

---

## Feature 8: Seasonal/Holiday Template Packs

### Architecture

Purely a client-side data extension. Seasonal templates are additional entries in `src/data/presets.ts` (existing file from v1.2). No new infrastructure.

A "seasonal pack" is a named group of presets tagged with a season/holiday (e.g., `tag: 'christmas'`). The `TemplateSection.tsx` component filters visible presets by tag. Active tags cycle based on current month.

```typescript
// src/data/presets.ts — extend existing structure
export interface Preset {
  id: string;
  name: string;
  tag?: 'christmas' | 'halloween' | 'valentines' | 'summer' | 'general';
  frame: FrameSectionState;
  colors: ColorSectionState;
  shapes: ShapeSectionState;
}
```

No DB, no API routes, no new dependencies.

---

## Feature 9: API Rate Limiting

### Architecture

Rate limiting must protect two surfaces:
1. **Public API** (`/api/v1/*`) — per client_id token, strict limits (e.g., 100 req/min for Pro)
2. **Internal API routes** (`/api/qr/*`, `/api/landing/*`) — per authenticated userId, prevent abuse

Rate limiting requires a fast, distributed counter store. Turso (SQLite) is not suitable for this — concurrent counter increments and TTL expiry are awkward in SQLite.

**Recommended: Upstash Redis + @upstash/ratelimit**

Upstash is a serverless Redis with an HTTP-based SDK (no persistent connection — critical for Vercel serverless). `@upstash/ratelimit` provides sliding window and fixed window algorithms out of the box. It is the standard choice for Vercel serverless rate limiting (confirmed by Vercel template library).

```typescript
// src/lib/rateLimiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const apiRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),                          // UPSTASH_REDIS_REST_URL + TOKEN
  limiter: Ratelimit.slidingWindow(100, '1 m'),    // 100 req/min per identifier
  analytics: true,
});

export const dashboardRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'),     // 60 req/min for internal routes
  analytics: true,
});
```

Usage in `/api/v1/*` handlers:

```typescript
const identifier = `api_${clientId}`;
const { success, limit, reset, remaining } = await apiRatelimit.limit(identifier);
if (!success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(reset),
      'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
    },
  });
}
```

**Why not Vercel Edge Middleware for rate limiting?** Clerk is incompatible with Edge runtime. Since the middleware already runs in Node.js Lambda, adding rate limiting there would co-locate it correctly. However, per-route rate limiting (different limits for API vs dashboard) is cleaner to implement at the handler level.

### New Dependencies

```
npm install @upstash/ratelimit @upstash/redis
```

### New Environment Variables

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Feature 10: Error Tracking (Sentry)

### Architecture

`@sentry/astro` is the official Sentry SDK for Astro. It instruments both the Node.js server runtime (API routes, SSR pages) and the browser (React islands, client-side JS). Installation is via Astro integration in `astro.config.mjs`.

```typescript
// astro.config.mjs
import sentry from '@sentry/astro';

export default defineConfig({
  integrations: [
    sentry({
      dsn: import.meta.env.PUBLIC_SENTRY_DSN,
      sourceMapsUploadOptions: {
        project: 'qrcraft',
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
      tracesSampleRate: 0.1,     // 10% of transactions traced (cost control)
      replaysSessionSampleRate: 0, // disable session replay (cost)
      replaysOnErrorSampleRate: 0.1, // capture replay on errors
    }),
    clerk(),
    react(),
    // ...
  ],
});
```

**Important:** `@sentry/astro` only supports Node.js runtime — NOT Vercel Edge. All existing routes are already Node.js Lambda (due to Clerk constraint), so this is compatible.

**Source maps:** The Sentry integration automatically uploads source maps on `astro build` using `SENTRY_AUTH_TOKEN`. This is critical for readable stack traces in production.

### New Environment Variables

```
PUBLIC_SENTRY_DSN=          # browser-safe, prefix PUBLIC_
SENTRY_AUTH_TOKEN=          # build-time only, source map upload
SENTRY_ORG=
SENTRY_PROJECT=
```

### New Dependencies

```
npm install @sentry/astro
```

---

## Updated System Architecture Diagram (v1.3)

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CDN (Vercel Edge)                            │
│  Static pages: /, /pricing, /use-cases, /es/, /fr/, /de/            │
│  (served from edge cache, zero Lambda invocations)                   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ non-static requests
┌──────────────────────────────▼───────────────────────────────────────┐
│                     Vercel Lambda (Node.js)                          │
├───────────────┬──────────────┬──────────────┬────────────────────────┤
│  Redirect     │  REST API    │  Internal    │  Dashboard             │
│  /r/[slug]    │  /api/v1/*   │  /api/*      │  /dashboard/*          │
│  /[slug]      │  JWT auth    │  Clerk auth  │  Clerk + SSR           │
│  (custom      │  Rate limit  │  Rate limit  │                        │
│  domain)      │  (Upstash)   │  (Upstash)   │                        │
├───────────────┴──────────────┴──────────────┴────────────────────────┤
│                     Cron Jobs (Vercel Cron)                          │
│  /api/cron/campaigns — every 15min — activate/pause scheduled QRs    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────┐
│                         Data Layer                                   │
├───────────────┬──────────────────────────────┬────────────────────── ┤
│  Turso        │  Upstash Redis               │  Vercel Blob          │
│  (libSQL)     │  (rate limit counters)       │  (PDFs, images)       │
│  via Drizzle  │  @upstash/ratelimit          │                       │
├───────────────┴──────────────────────────────┴────────────────────── ┤
│                         External Services                            │
│  Clerk (auth)  •  Stripe (billing)  •  Sentry (errors)              │
│  Vercel Domains API (custom domain provisioning)                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Recommended Project Structure (v1.3 Additions)

```
src/
├── pages/
│   ├── [slug].ts               NEW — catch-all for custom domain redirects
│   ├── [lang]/                 NEW — i18n pages (es, fr, de)
│   │   └── index.astro
│   ├── api/
│   │   ├── v1/                 NEW — public REST API
│   │   │   ├── token.ts        POST — OAuth2 client credentials token exchange
│   │   │   ├── qr/
│   │   │   │   ├── index.ts    GET list, POST create
│   │   │   │   └── [id].ts     GET, PATCH, DELETE
│   │   │   └── qr/[id]/analytics.ts
│   │   ├── qr/
│   │   │   └── bulk.ts         NEW — CSV → ZIP bulk generation
│   │   ├── cron/
│   │   │   └── campaigns.ts    NEW — Vercel Cron handler
│   │   ├── domains/
│   │   │   ├── add.ts          NEW — POST, calls Vercel Domains API
│   │   │   └── verify.ts       NEW — POST, verifies domain ownership
│   │   ├── workspaces/
│   │   │   ├── create.ts       NEW
│   │   │   └── [id]/
│   │   │       ├── members.ts  NEW
│   │   │       └── invite.ts   NEW
│   │   └── dashboard/
│   │       └── api-keys.ts     NEW — CRUD for apiCredentials
│   └── dashboard/
│       ├── api-keys.astro      NEW — manage API credentials
│       ├── bulk.astro          NEW — bulk QR generation page
│       └── workspaces.astro    NEW — team workspace management
├── components/
│   └── BulkGenerateIsland.tsx  NEW — CSV upload + bulk export UI
├── db/schema.ts                MODIFIED — add apiCredentials, workspaces, workspaceMembers,
│                                          customDomains; extend dynamicQrCodes, scanEvents
├── lib/
│   ├── apiAuth.ts              NEW — verifyApiToken(request) → JWT validation
│   ├── rateLimiter.ts          NEW — Upstash ratelimit instances
│   └── workspaceAuth.ts        NEW — getEffectiveScope() workspace membership check
├── i18n/
│   ├── en.ts                   NEW — English string literals
│   ├── es.ts                   NEW — Spanish
│   ├── fr.ts                   NEW — French
│   ├── de.ts                   NEW — German
│   └── utils.ts                NEW — useTranslations(locale) helper
└── middleware.ts               MODIFIED — exempt /api/v1/* from Clerk middleware
vercel.json                     NEW (or MODIFIED) — add crons section
```

---

## Component Boundaries Summary

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `BulkGenerateIsland.tsx` | CSV file upload, options form, triggers bulk API, downloads ZIP | `POST /api/qr/bulk` |
| `/api/qr/bulk.ts` | papaparse → qrcode buffers → JSZip → stream | `qrcode`, `jszip`, `papaparse` npm packages |
| `/api/v1/token.ts` | Validates client_id/secret, returns JWT | `apiCredentials` table, `bcryptjs`, `jsonwebtoken` |
| `/api/v1/qr/index.ts` | CRUD facade over `savedQrCodes` | `db`, `apiAuth.ts`, `rateLimiter.ts` |
| `apiAuth.ts` | Verifies JWT bearer token on `/api/v1/*` routes | `jsonwebtoken`, called by every v1 handler |
| `rateLimiter.ts` | Upstash sliding window counters | `@upstash/ratelimit`, `@upstash/redis` |
| `workspaceAuth.ts` | Verifies user membership in a workspace | `db` (workspaceMembers table) |
| `/api/cron/campaigns.ts` | Drizzle UPDATE to activate/pause scheduled QRs | `db`, Vercel CRON_SECRET |
| `/api/domains/add.ts` | Calls Vercel Domains API, stores pending domain | `customDomains` table, `VERCEL_TOKEN` env var |
| `/[slug].ts` | Custom domain catch-all redirect | Reuses slug lookup logic from `/r/[slug].ts` |
| `i18n/utils.ts` | `useTranslations(locale)` returns typed string dictionary | Imported by Astro pages |

---

## Data Flow Changes

### Bulk Generation Flow

```
User uploads CSV → BulkGenerateIsland
  → POST /api/qr/bulk { csv: "name,url\nBrand QR,https://..." }
  → papaparse.parse() → rows[]
  → For each row: qrcode.toBuffer(url) → PNG Buffer
  → JSZip: zip.file(`${row.name}.png`, buffer)
  → zip.generateAsync({ type: 'nodebuffer' })
  → Response(zipBuffer, { headers: { 'Content-Type': 'application/zip' } })
User browser: downloads brand-qr-codes.zip
```

### OAuth2 API Flow

```
Developer: POST /api/v1/token { client_id, client_secret }
  → DB lookup apiCredentials WHERE clientId = client_id
  → bcrypt.compare(client_secret, clientSecretHash)
  → jwt.sign({ sub: userId, clientId, tier, scopes }, JWT_SECRET, { expiresIn: '1h' })
  → Response { access_token, token_type: 'Bearer', expires_in: 3600 }

Developer: GET /api/v1/qr (Authorization: Bearer <token>)
  → apiAuth.verifyApiToken(request) → decoded JWT
  → rateLimiter.check(clientId)
  → db.select().from(savedQrCodes).where(eq(savedQrCodes.userId, decoded.sub))
  → Response(JSON)
```

### Campaign Scheduling Flow

```
User sets enable date on dynamic QR in dashboard
  → PATCH /api/qr/[id] { scheduledEnableAt: unix_epoch, isPaused: true }
  → DB UPDATE

Vercel Cron fires every 15min → GET /api/cron/campaigns
  → Authorization: Bearer {CRON_SECRET} header check
  → db.update(dynamicQrCodes).set({ isPaused: false }).where(scheduledEnableAt <= now)
  → db.update(dynamicQrCodes).set({ isPaused: true }).where(scheduledPauseAt <= now)
```

### Custom Domain Flow

```
User enters "go.brand.com" → POST /api/domains/add
  → POST https://api.vercel.com/v10/projects/{projectId}/domains
  → Vercel returns { verified: false, verification: [{ type: 'CNAME', domain: 'go.brand.com', value: 'cname.vercel-dns.com' }] }
  → INSERT customDomains { domain, status: 'pending', verificationRecord: JSON }
  → UI shows verification instructions

User adds CNAME → clicks "Verify" → POST /api/domains/verify
  → POST https://api.vercel.com/v10/projects/{projectId}/domains/go.brand.com/verify
  → On success: UPDATE customDomains SET status = 'active'
  → Domain now routes to Vercel deployment

User scan: GET https://go.brand.com/abc123
  → Vercel routes to deployment (custom domain is now registered)
  → /[slug].ts catches it (host != canonical domain)
  → Reuse slug lookup → 307 to destinationUrl
```

---

## Scaling Considerations

| Concern | Current state | v1.3 impact | Mitigation |
|---------|--------------|-------------|------------|
| Turso connection limit | Low — 1 connection per Lambda cold start | More tables, more routes | libSQL HTTP driver is stateless — each invocation opens a new connection; Turso Pro handles this |
| Rate limit storage | N/A | Upstash Redis adds a new dependency | Upstash free tier: 10k req/day; Pro: 100k/day — sufficient at v1.3 scale |
| Bulk ZIP generation memory | N/A | 500 QR PNGs ≈ 10MB in memory | jszip streams; Lambda 1GB memory limit is adequate. Hard-cap rows at 500 |
| Cron timing precision | N/A | 15-min polling means up to 15min delay for scheduled campaigns | Acceptable for scheduling use case; document this to users |
| i18n build time | Fast today | 3 new locales × 5 pages = 15 extra static pages | Negligible — static build stays under 30s |
| Vercel Domains API calls | N/A | 1 API call per custom domain add/verify | Rare action — no caching needed |
| Sentry overhead | N/A | `tracesSampleRate: 0.1` keeps trace volume low | Redirect path (`/r/[slug]`) should be excluded from tracing to protect latency |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Running qr-code-styling in Node.js serverless

**What people do:** Import the browser QR library in API routes for bulk generation.
**Why it's wrong:** `qr-code-styling` requires `document`, `HTMLCanvasElement`, `Image` — it throws in Node.js. It also bundles ~300KB of browser code.
**Do this instead:** Use `node-qrcode` (`qrcode` on npm) in serverless contexts. Accept reduced style fidelity for bulk exports.

### Anti-Pattern 2: Storing JWT signing secret in the database

**What people do:** Generate a random secret per-client and store it in the DB to validate tokens.
**Why it's wrong:** Every API call requires a DB lookup to get the secret — defeats the purpose of JWTs.
**Do this instead:** Sign all API JWTs with a single `JWT_SECRET` env var. Embed the `clientId` in the JWT payload. Verify with the shared secret — no DB lookup needed.

### Anti-Pattern 3: Blocking the redirect on rate limit check

**What people do:** Apply rate limiting to `/r/[slug]` QR redirects.
**Why it's wrong:** The redirect is the core product — a scan should ALWAYS complete even if the rate limiter is unavailable. Rate limiting adds latency to a path where every millisecond counts.
**Do this instead:** Rate limit only `/api/*` and `/api/v1/*`. Never add rate limiting to the `/r/` redirect path.

### Anti-Pattern 4: Multi-tenant shared queries without workspace scope

**What people do:** Add workspace tables but forget to scope every query.
**Why it's wrong:** Users see each other's QR codes; workspace isolation is broken.
**Do this instead:** Route all queries through `getEffectiveScope()`. Write a test for each API route that verifies cross-workspace data isolation.

### Anti-Pattern 5: Prefix English URLs for i18n

**What people do:** Set `prefixDefaultLocale: true` so all URLs become `/en/...`.
**Why it's wrong:** Changes all existing English URLs → 301 redirects everywhere → loses accumulated SEO equity on `/`, `/pricing`, `/use-cases`.
**Do this instead:** `prefixDefaultLocale: false` (the default). English stays at clean URLs. Other locales get prefixes.

---

## Build Order (Dependency Rationale)

### Phase 1: Infrastructure Hardening (build first — no feature dependencies)

1. **Error tracking (Sentry)** — install `@sentry/astro`, configure DSN, deploy. This should be the very first thing so all subsequent phases have error visibility.
2. **API rate limiting (Upstash)** — create Upstash account, install `@upstash/ratelimit`, wire `rateLimiter.ts`. Apply to existing `/api/*` routes now, extend later.

### Phase 2: Developer API (depends on: rate limiting)

3. **DB schema migration** — add `apiCredentials` table; run `drizzle-kit push`.
4. **Dashboard: API key management** — `/dashboard/api-keys.astro` + `/api/dashboard/api-keys.ts`.
5. **OAuth2 token endpoint** — `/api/v1/token.ts` + `apiAuth.ts`.
6. **REST API routes** — `/api/v1/qr/*` and analytics. Rate limiting already in place.

### Phase 3: Bulk Generation (depends on: nothing except existing save flow)

7. **Install server-side QR and ZIP deps** — `qrcode`, `jszip`, `papaparse`.
8. **`/api/qr/bulk.ts`** — parse → generate → zip → stream.
9. **`BulkGenerateIsland.tsx`** — CSV upload UI.
10. **`/dashboard/bulk.astro`** — page wrapping the island.

### Phase 4: Team Workspaces (depends on: stable API layer from Phase 2)

11. **DB schema migration** — add `workspaces`, `workspaceMembers`; add `workspaceId` to `savedQrCodes`, `dynamicQrCodes`.
12. **`workspaceAuth.ts`** — membership verification utility.
13. **Workspace API routes** — create, invite, member management.
14. **Dashboard workspace pages** — list, manage.
15. **Update existing QR API routes** — scope queries through `getEffectiveScope()`.

### Phase 5: Advanced Analytics (depends on: existing scanEvents table)

16. **DB schema migration** — add UTM columns to `scanEvents`.
17. **Update `/r/[slug].ts`** — capture UTM params from incoming scan URL.
18. **Update `/api/analytics/[slug].ts`** — add `from`, `to`, `format` params; CSV output.
19. **Dashboard analytics UI** — date range picker, CSV export button.

### Phase 6: Campaign Scheduling (depends on: existing dynamicQrCodes)

20. **DB schema migration** — add `scheduledEnableAt`, `scheduledPauseAt` to `dynamicQrCodes`.
21. **`/api/cron/campaigns.ts`** — Vercel Cron handler.
22. **`vercel.json`** — add crons section.
23. **Dashboard UI** — date picker for schedule on dynamic QR edit form.

### Phase 7: Internationalization (independent, but defer to late to avoid merge conflicts with earlier phases)

24. **`i18n/` directory** — English base + 3 translations.
25. **`astro.config.mjs` i18n config** — add i18n block.
26. **`[lang]/index.astro`** — translated homepage.
27. **Other translated pages** — pricing, use cases.
28. **hreflang tags** — update `Layout.astro`.

### Phase 8: Custom Short Domains (most complex, build last)

29. **DB schema migration** — add `customDomains` table.
30. **`/api/domains/add.ts` and `verify.ts`** — Vercel Domains API integration.
31. **`/[slug].ts`** — catch-all route for custom domain redirects.
32. **Dashboard domain management UI**.

### Phase 9: Seasonal Templates (depends on: existing preset system from v1.2)

33. **Extend `src/data/presets.ts`** — add seasonal preset entries with tags.
34. **Update `TemplateSection.tsx`** — filter by season tag based on current month.

**Rationale for this ordering:**
- Sentry first: all phases have error visibility from day one
- Rate limiting second: protects existing API surface before new surface is added
- Developer API third: creates new revenue surface; workspace feature depends on stable API
- Workspaces fourth: depends on API layer; complex enough to warrant its own phase
- Analytics fifth: low-risk schema extension on a stable table
- Scheduling sixth: small DB change + one cron route, quick win
- i18n seventh: independent but deferred to avoid merge conflicts during heavy schema migration phases
- Custom domains last: most moving parts (Vercel API, catch-all routing, DNS verification); stable codebase reduces risk

---

## Integration Points: New vs. Modified Components

| Component | Status | Integrates With |
|-----------|--------|-----------------|
| `middleware.ts` | MODIFIED | Exempt `/api/v1/*` from Clerk auth |
| `astro.config.mjs` | MODIFIED | Add Sentry integration, i18n config |
| `db/schema.ts` | MODIFIED | Add 4 tables, extend 2 existing tables |
| `src/pages/r/[slug].ts` | MODIFIED | Add UTM param capture on scan insert |
| `/api/analytics/[slug].ts` | MODIFIED | Add date range + CSV export |
| `/api/qr/*.ts` (existing) | MODIFIED | Add workspace scope via getEffectiveScope |
| `src/pages/[slug].ts` | NEW | Custom domain catch-all redirect |
| `src/pages/[lang]/index.astro` | NEW | i18n translated pages |
| `src/i18n/` | NEW | Translation dictionaries + helper |
| `src/lib/apiAuth.ts` | NEW | JWT verification for /api/v1/* |
| `src/lib/rateLimiter.ts` | NEW | Upstash ratelimit instances |
| `src/lib/workspaceAuth.ts` | NEW | Workspace membership gate |
| `/api/v1/token.ts` | NEW | OAuth2 token endpoint |
| `/api/v1/qr/*.ts` | NEW | Public REST API routes |
| `/api/qr/bulk.ts` | NEW | CSV → ZIP bulk endpoint |
| `/api/cron/campaigns.ts` | NEW | Vercel Cron schedule handler |
| `/api/domains/add.ts` | NEW | Vercel Domains API caller |
| `/api/domains/verify.ts` | NEW | Domain verification caller |
| `BulkGenerateIsland.tsx` | NEW | CSV upload + download UI |
| `vercel.json` | NEW | Cron schedule configuration |

---

## Open Questions / Gaps

1. **Workspace billing model**: Does a workspace consume one Pro subscription or require separate seats? This affects the `workspaces` table and tier-check logic. Needs product decision before building Phase 4.
2. **Bulk export style fidelity**: `node-qrcode` produces plain black-and-white QR codes — no gradients, no custom dot shapes, no logo. Is this acceptable, or should bulk export be restricted to users who accept the limitation? Document clearly in UI.
3. **JWT token storage client-side**: The documentation for the REST API must advise developers to store JWT tokens securely (env vars, not localStorage). This is documentation, not code, but should be in the API docs page.
4. **Custom domain catch-all route conflict**: `src/pages/[slug].ts` as a root-level catch-all may conflict with existing static pages if Vercel's routing resolution order doesn't prioritize static files. Needs a test deployment to confirm. Mitigation: use a subdirectory like `/go/[slug].ts` instead if conflict occurs.
5. **Campaign scheduling granularity**: 15-minute Vercel Cron polling means users cannot schedule activation to the minute — only to the nearest 15-minute boundary. Document this UX limitation clearly.
6. **Rate limit on redirect path**: Confirmed anti-pattern (do NOT rate-limit `/r/[slug]`). But anonymous bulk scraping via the redirect is a real risk if someone discovers the pattern. Mitigation: bot detection already in place in the redirect handler (BOT_UA_PATTERNS).
7. **i18n React island translations**: The `QRGeneratorIsland` is a React island. Astro's `astro:i18n` module is not accessible inside React components. Either pass translated strings as props from the Astro parent, or duplicate a minimal translation object in the island. Decision needed before implementing Phase 7.

---

## Sources

- [Vercel Cron Jobs — official docs](https://vercel.com/docs/cron-jobs) — cron expression format, CRON_SECRET, invocation mechanism (HIGH confidence)
- [Vercel Fluid Compute — official blog](https://vercel.com/blog/introducing-fluid-compute) — waitUntil for background tasks, default for new projects April 2025 (HIGH confidence)
- [Astro i18n Routing — official docs](https://docs.astro.build/en/guides/internationalization/) — prefixDefaultLocale, fallback, routing strategies (HIGH confidence)
- [Upstash Ratelimit — official docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) — sliding window algorithm, Vercel integration (HIGH confidence)
- [@upstash/ratelimit GitHub](https://github.com/upstash/ratelimit-js) — API surface, Vercel Edge + Lambda usage (HIGH confidence)
- [Sentry Astro integration — official docs](https://docs.sentry.io/platforms/javascript/guides/astro/) — installation, Node.js runtime only, source maps (HIGH confidence)
- [Vercel Domains API — add domain to project](https://vercel.com/docs/rest-api/projects/add-a-domain-to-a-project) — POST endpoint, verification flow (HIGH confidence)
- [Vercel Multi-tenant domain management](https://vercel.com/docs/multi-tenant/domain-management) — custom domain routing for SaaS platforms (MEDIUM confidence)
- [Turso + Drizzle multi-tenant SaaS article](https://turso.tech/blog/creating-a-multitenant-saas-service-with-turso-remix-and-drizzle-6205cf47) — shared-schema vs database-per-tenant tradeoffs (MEDIUM confidence)
- [Papa Parse docs](https://www.papaparse.com/) — server-side CSV parsing (HIGH confidence)
- Existing codebase: `src/db/schema.ts`, `src/pages/r/[slug].ts`, `src/middleware.ts`, `src/pages/api/qr/list.ts`, `astro.config.mjs`

---
*Architecture research for: QRCraft v1.3 Scale & Integrate*
*Researched: 2026-03-31*
