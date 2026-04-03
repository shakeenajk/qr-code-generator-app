# Phase 19: REST API + API Key Management - Research

**Researched:** 2026-03-31
**Domain:** REST API with opaque API key authentication, server-side QR generation, per-key rate limiting, Drizzle schema extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| API-01 | Developer can create a QR code via POST /api/v1/generate with JSON body (URL, text, WiFi, vCard content types) | `qrcode` npm 1.5.4 generates PNG Buffer and SVG string server-side with no DOM dependency; route lives at `src/pages/api/v1/generate.ts` |
| API-02 | Developer can manage API keys in the dashboard (create, revoke, view usage) | New `apiKeys` Drizzle table stores `keyHash` (SHA-256), `keyPrefix` (8 chars for display), `name`, `usageCount`, `revokedAt`; dashboard island handles CRUD |
| API-03 | API requests are rate-limited per key with usage tracking visible in dashboard | Upstash `Ratelimit` supports per-identifier limits — pass `keyHash` as identifier; `usageCount` incremented on each successful request |
| API-04 | API returns QR code as base64 PNG or SVG in JSON response | `qrcode.toDataURL()` returns `data:image/png;base64,...`; `qrcode.toString({type:'svg'})` returns XML string; both returned in a JSON envelope |
</phase_requirements>

---

## Summary

Phase 19 adds a public REST API so developers can generate QR codes programmatically. The API is authenticated with opaque API keys: a 64-character hex string generated server-side, shown to the user exactly once, and stored only as its SHA-256 hash in Turso. The raw key is never persisted — a DB breach exposes no usable credentials.

The single endpoint for v1.3 scope is `POST /api/v1/generate`. It lives inside the same Astro app at `src/pages/api/v1/generate.ts`, requires `export const prerender = false`, and is exempt from Clerk middleware via a route matcher on `/api/v1/(.*)`. On each request the route extracts the `Authorization: Bearer <key>` header, hashes it with SHA-256, looks up the hash in the `api_keys` Drizzle table, and proceeds if the key is active and not revoked. Server-side QR generation uses the `qrcode` npm package (1.5.4) — it has no DOM dependency, uses `pngjs` for PNG encoding, and runs cleanly on Vercel Node runtime.

The existing Upstash rate limiter in `rateLimit.ts` uses IP as the identifier. For `/api/v1/*` routes a separate `Ratelimit` instance is created with a tighter window (e.g., 100 req/60s per key) using `keyHash` as the identifier — this is the documented per-identifier pattern from Upstash's `limiter.limit(identifier)` API. Per-key `usageCount` is incremented via a Drizzle `UPDATE` on each successful response.

The dashboard API key management UI is a React island (`ApiKeyManagerIsland.tsx`) on a new `src/pages/dashboard/api-keys.astro` page. It shows a masked list of keys (prefix only, never full key), a "Create" button that calls `POST /api/dashboard/api-keys`, a "Revoke" button per key, and a per-key usage counter.

**Primary recommendation:** Opaque API keys with SHA-256 hashing (not JWTs). No new auth libraries needed. Add `qrcode@1.5.4` + `@types/qrcode@1.5.6`. Everything else is built on the existing Upstash + Drizzle + Astro stack.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `qrcode` | 1.5.4 | Server-side QR PNG + SVG generation | No DOM dependency; uses `pngjs` for PNG (pure JS, no canvas); `toBuffer()` for PNG Buffer, `toString({type:'svg'})` for SVG XML; 6M weekly downloads; the standard choice for Node.js QR generation |
| `@types/qrcode` | 1.5.6 | TypeScript types for qrcode | Official types package; covers `toBuffer`, `toDataURL`, `toString` signatures |
| Node.js `crypto` (built-in) | Node 24 (in project) | SHA-256 key hashing + key generation | `crypto.randomBytes(32).toString('hex')` = 64-char cryptographically secure hex key; `crypto.createHash('sha256').update(key).digest('hex')` = hash for storage; no npm package needed |
| `@upstash/ratelimit` | ^2.0.8 (already installed) | Per-key rate limiting | Already in the project for IP-based limiting; same library supports per-identifier limiting by passing `keyHash` as the `limit(identifier)` argument |
| `@upstash/redis` | ^1.37.0 (already installed) | Redis client for Upstash | Already in the project |
| Drizzle ORM | ^0.45.1 (already installed) | `apiKeys` table CRUD | Already in the project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | already installed | Copy-to-clipboard icon, key icons in dashboard | Use `Copy`, `Key`, `Trash2` icons in `ApiKeyManagerIsland.tsx` |
| `sonner` | already installed | Toast for "Key copied" and revoke confirmation | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Opaque keys + SHA-256 | JWTs (`jsonwebtoken`) | JWTs eliminate per-request DB lookup; but instant revocation requires a blocklist (another DB call). Net wash on latency; opaque keys are simpler, have no signing secret to manage, and match the pattern of Stripe/GitHub/Vercel. STATE.md locks this decision. |
| `qrcode` npm | `qr-code-styling` | `qr-code-styling` requires DOM/canvas — cannot run in Vercel Node serverless functions. `qrcode` uses pngjs (pure JS). `qr-code-styling` generates styled QR codes; `qrcode` generates only solid black-on-white — acceptable for a developer API. |
| `qrcode` npm | `easyqrcodejs-nodejs` | Also DOM-free; supports custom colors/logos but heavier dependency tree. `qrcode` is the established choice with 6M weekly downloads. |

**Installation (new packages only):**
```bash
npm install qrcode
npm install -D @types/qrcode
```

**Version verification (confirmed 2026-03-31):**
- `qrcode`: 1.5.4 (latest) — `npm view qrcode version`
- `@types/qrcode`: 1.5.6 (latest) — `npm view @types/qrcode version`

---

## Architecture Patterns

### Recommended Project Structure (additions)

```
src/
  pages/
    api/
      v1/
        generate.ts          # POST /api/v1/generate — public, API key auth
      dashboard/
        api-keys.ts          # GET/POST /api/dashboard/api-keys — Clerk auth, CRUD
        api-keys/
          [id].ts            # DELETE /api/dashboard/api-keys/[id] — revoke
    dashboard/
      api-keys.astro         # SSR dashboard page, Clerk protected
  components/
    dashboard/
      ApiKeyManagerIsland.tsx  # React island — list, create, revoke keys
  lib/
    apiAuth.ts               # verifyApiKey(request) helper — shared across /api/v1/*
    apiRateLimit.ts          # per-key Ratelimit instance (separate from IP limiter)
  db/
    schema.ts                # + apiKeys table
```

### Pattern 1: API Key Generation + Storage

**What:** Generate a secure random key, show it once to the user, store only its SHA-256 hash.
**When to use:** Always. Never store raw keys in the database.

```typescript
// src/pages/api/dashboard/api-keys.ts
export const prerender = false;
import { db } from '../../../db/index';
import { apiKeys } from '../../../db/schema';

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { name } = await request.json();

  // Generate: 64-char hex — cryptographically secure
  const rawKey = `qrc_${crypto.randomBytes(32).toString('hex')}`;

  // Hash for storage — SHA-256 is sufficient for API key hashing
  // (bcrypt is overkill here: keys are already high-entropy; SHA-256 is fast + deterministic)
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12); // "qrc_" + 8 chars — safe for display

  await db.insert(apiKeys).values({
    userId,
    name,
    keyHash,
    keyPrefix,
    usageCount: 0,
  });

  // Return raw key ONCE — never persisted, never shown again
  return new Response(JSON.stringify({ key: rawKey, keyPrefix }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### Pattern 2: API Key Verification Helper

**What:** Shared `verifyApiKey(request)` that every `/api/v1/*` handler calls.
**When to use:** At the top of every `/api/v1/*` route handler before any business logic.

```typescript
// src/lib/apiAuth.ts
import { db } from '../db/index';
import { apiKeys } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface VerifiedKey {
  userId: string;
  keyId: string;
  usageCount: number;
}

export async function verifyApiKey(request: Request): Promise<VerifiedKey | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) return null;
  return { userId: row.userId, keyId: row.id, usageCount: row.usageCount };
}
```

### Pattern 3: Middleware Exemption for /api/v1/*

**What:** Clerk middleware must not touch `/api/v1/*` routes. These routes handle their own auth.
**When to use:** This change to `middleware.ts` must happen in Wave 0 / Task 1, before any `/api/v1/*` route is written.

```typescript
// src/middleware.ts — additions to existing file
const isPublicApiRoute = createRouteMatcher(['/api/v1/(.*)']);

const clerkAuth = clerkMiddleware((auth, context) => {
  if (isWebhookRoute(context.request)) return;
  if (isPublicApiRoute(context.request)) return; // API key auth handled per-route
  const { userId } = auth();
  if (!userId && isProtectedRoute(context.request)) {
    return context.redirect('/login');
  }
});
```

Note: the rate limiter already runs before `clerkAuth` via `sequence()`. The IP-based rate limiter's `shouldRateLimit()` function already gates on `pathname.startsWith('/api/')` — so `/api/v1/*` requests WILL be rate-limited by the IP limiter. The per-key limiter is a second layer on top, applied inside the route handler after key verification.

### Pattern 4: Per-Key Rate Limiting

**What:** A second Upstash `Ratelimit` instance keyed on `keyHash`, with a tighter window than the global IP limiter.
**When to use:** Inside `/api/v1/*` route handlers, after `verifyApiKey()` succeeds.

```typescript
// src/lib/apiRateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let apiKeyLimiter: Ratelimit | null = null;

export function getApiKeyRateLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!apiKeyLimiter) {
    apiKeyLimiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(100, '60 s'), // 100 req/min per API key
      prefix: 'qrcraft:api-key-rl',   // separate prefix from IP limiter ('qrcraft:rl')
      analytics: true,
    });
  }
  return apiKeyLimiter;
}
```

```typescript
// Inside POST /api/v1/generate handler
const verified = await verifyApiKey(request);
if (!verified) {
  return new Response(JSON.stringify({ error: 'Invalid or revoked API key' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

const limiter = getApiKeyRateLimiter();
if (limiter) {
  const { success, reset } = await limiter.limit(verified.keyId);
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return new Response(JSON.stringify({ error: 'Rate limit exceeded', retryAfter }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    });
  }
}
```

### Pattern 5: Server-Side QR Generation

**What:** Use `qrcode` npm package for server-side PNG and SVG generation.
**When to use:** Inside `/api/v1/generate` for API responses. Not for the main UI (which still uses `qr-code-styling` client-side).

```typescript
// Source: https://github.com/soldair/node-qrcode README
import QRCode from 'qrcode';

// PNG as base64 data URI (strip prefix for JSON response)
const dataUrl = await QRCode.toDataURL(content, {
  type: 'image/png',
  width: 400,
  margin: 1,
  errorCorrectionLevel: 'M',
  color: { dark: '#000000', light: '#ffffff' },
});
// dataUrl = "data:image/png;base64,iVBOR..."
const base64Png = dataUrl.split(',')[1]; // strip the "data:image/png;base64," prefix

// SVG as string
const svgString = await QRCode.toString(content, { type: 'svg' });

// Response JSON
return new Response(JSON.stringify({
  format: 'png', // or 'svg'
  data: base64Png,  // or svgString
  contentType: 'image/png', // or 'image/svg+xml'
}), { status: 200, headers: { 'Content-Type': 'application/json' } });
```

**Important:** `qrcode.toBuffer()` returns a raw PNG Buffer — useful if you need to write to a file or Vercel Blob. `toDataURL()` is cleaner for a JSON API response (returns base64 string directly). Both are DOM-free and work in Vercel Node runtime.

### Anti-Patterns to Avoid

- **Storing raw API key in DB:** Never persist the full key. Store `keyHash` (SHA-256) and `keyPrefix` (first ~12 chars) only. The `keyPrefix` is safe to show in the dashboard list.
- **Using `qr-code-styling` server-side:** This library calls `document.createElement('canvas')` — it crashes on Vercel Node runtime. Use `qrcode` npm for server-side generation.
- **Forgetting `export const prerender = false`:** All files in `src/pages/api/v1/` must have this. Static mode silently breaks them in production while dev server masks the issue.
- **Using IDOR-vulnerable queries:** Always include `userId` (from the verified API key, not from the request body) in Drizzle WHERE clauses. Never trust `id` alone.
- **Checking `revokedAt` in application code but not indexing:** Add a DB index on `keyHash` for fast lookups on every request.
- **Using bcrypt for key hashing:** Bcrypt is appropriate for passwords (low entropy). API keys are already 256 bits of entropy — SHA-256 is fast, deterministic, and sufficient. Bcrypt adds ~100ms per hash with no security benefit for high-entropy inputs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-side QR PNG generation | Canvas-based renderer, custom PNG encoder | `qrcode` npm 1.5.4 | Pure JS via pngjs; handles all QR encoding modes; widely deployed in serverless |
| Per-key rate limiting state | In-memory Map, custom Redis counter | `@upstash/ratelimit` (already installed) | Already in the project; module-level singleton persists across warm invocations; Redis state survives cold starts |
| Cryptographically secure key generation | UUID, Math.random(), nanoid | `crypto.randomBytes(32).toString('hex')` | Node built-in; 256 bits of entropy; no dependency; industry standard for API keys |
| SHA-256 hashing | Custom hash function | `crypto.createHash('sha256').update(key).digest('hex')` | Node built-in; constant-time when used correctly |

**Key insight:** The crypto module is sufficient for both key generation and hashing. The rate limiting infrastructure already exists in the project and only needs a new instance with a different prefix and identifier.

---

## Common Pitfalls

### Pitfall 1: `qr-code-styling` Used Server-Side
**What goes wrong:** Developer imports `qr-code-styling` inside `/api/v1/generate.ts`. Build succeeds, but Vercel deployment crashes with `ReferenceError: document is not defined` at runtime.
**Why it happens:** `qr-code-styling` calls `document.createElement('canvas')` internally. This works in the browser and in the existing client-side islands, but not in a Node.js serverless function.
**How to avoid:** Use `qrcode` npm for all server-side generation. Keep `qr-code-styling` client-side only.
**Warning signs:** `import ... from 'qr-code-styling'` inside any file in `src/pages/api/`.

### Pitfall 2: Missing `export const prerender = false`
**What goes wrong:** `POST /api/v1/generate` returns empty responses or 404s in production. Works fine in `npm run dev`.
**Why it happens:** `astro.config.mjs` is `output: 'static'`. API routes are called at build time in static mode, not at request time. Dev server simulates SSR regardless.
**How to avoid:** Every file in `src/pages/api/v1/` must have `export const prerender = false` as the first line.
**Warning signs:** Route works in `npm run dev` but returns wrong data after `astro build` + deployment.

### Pitfall 3: Raw API Key Stored or Logged
**What goes wrong:** `rawKey` accidentally logged in Sentry, or stored in Turso as a "backup".
**Why it happens:** Developer adds debugging logs, or adds a `rawKey` column "just for recovery".
**How to avoid:** Never log `rawKey`. Store only `keyHash` and `keyPrefix`. The `rawKey` lives only in the POST response body, shown once.
**Warning signs:** Any Drizzle column named `rawKey`, `apiKey`, `secretKey` that is NOT a hash. Any `console.log` or `captureMessage` that includes the full key.

### Pitfall 4: IP Rate Limiter Also Fires on /api/v1/* (Double 429)
**What goes wrong:** Developer sends a legitimate API request. The IP rate limiter (60 req/60s) already fires before the per-key limiter even runs. A developer hammering the API from a single IP gets IP-throttled, not key-throttled.
**Why it happens:** The existing `shouldRateLimit()` in middleware returns `true` for all `/api/*` routes including `/api/v1/*`. Both the IP limiter and the per-key limiter run.
**How to avoid:** This is actually acceptable behavior — both limits apply. Document it in the API response so developers understand the `Retry-After` comes from the IP limit. Alternatively, exempt `/api/v1/*` from the IP limiter and rely solely on per-key limits. For v1.3, keeping both is safer.
**Warning signs:** A 429 response with `Retry-After` but the per-key limiter was never reached.

### Pitfall 5: Usage Counter Updated Before Response Sent (Race Condition)
**What goes wrong:** On Turso's SQLite backend, a high-traffic key generates concurrent UPDATE queries for `usageCount`. SQLite has no row-level locking for UPDATE — concurrent updates may collide.
**Why it happens:** Each API call does `UPDATE api_keys SET usageCount = usageCount + 1` concurrently.
**How to avoid:** Use `SET usageCount = usageCount + 1` (atomic increment in SQL), not a read-then-write. The SQL increment is atomic at the DB level. Turso's SQLite engine serializes writes; concurrent increments are safe via SQL-level atomics.
**Warning signs:** `usageCount` is read from DB into JS, incremented in JS, then written back (`SET usageCount = ${row.usageCount + 1}`).

### Pitfall 6: IDOR on QR Ownership in API Routes
**What goes wrong:** `GET /api/v1/qr/:id` queries `WHERE id = :id` — no `userId` filter. An API key holder can fetch any user's QR code by guessing IDs.
**Why it happens:** The API key auth returns `userId` — but the developer forgets to add `AND userId = :userId` to the Drizzle query.
**How to avoid:** Always scope Drizzle queries with `and(eq(table.id, id), eq(table.userId, verified.userId))`. Follow the same pattern as the existing `/api/qr/[id].ts` route.
**Warning signs:** Any Drizzle query in `/api/v1/*` that filters only by `id` without a `userId` constraint.

---

## Code Examples

### New Drizzle Schema: `apiKeys` Table

```typescript
// Source: project convention (mirrors subscriptions table pattern in schema.ts)
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),                           // user-facing label
  keyHash: text('key_hash').notNull().unique(),           // SHA-256(rawKey)
  keyPrefix: text('key_prefix').notNull(),                // first 12 chars — display only
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: integer('last_used_at'),                    // unix timestamp
  revokedAt: integer('revoked_at'),                       // null = active
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('api_keys_user_id_idx').on(table.userId),
  index('api_keys_key_hash_idx').on(table.keyHash),       // critical — every request does a hash lookup
]);
```

### POST /api/v1/generate Request/Response Shape

```typescript
// Request body
interface GenerateRequest {
  content: string;                           // The QR payload
  contentType: 'url' | 'text' | 'wifi' | 'vcard';
  format?: 'png' | 'svg';                   // default: 'png'
  size?: number;                             // pixel width, default: 400, max: 1000
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // default: 'M'
}

// Response body (success)
interface GenerateResponse {
  format: 'png' | 'svg';
  data: string;               // base64 string (PNG) or XML string (SVG)
  contentType: 'image/png' | 'image/svg+xml';
}

// Response body (error)
interface ErrorResponse {
  error: string;
  retryAfter?: number;        // present on 429
}
```

### Revoking a Key (Soft Delete Pattern)

```typescript
// src/pages/api/dashboard/api-keys/[id].ts
export const prerender = false;
import { db } from '../../../../db/index';
import { apiKeys } from '../../../../db/schema';
import { and, eq } from 'drizzle-orm';

export const DELETE: APIRoute = async ({ locals, params }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Soft delete: set revokedAt timestamp. Do NOT hard delete — preserves audit trail.
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: Math.floor(Date.now() / 1000) })
    .where(and(eq(apiKeys.id, params.id!), eq(apiKeys.userId, userId)));

  if (!result.rowsAffected) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| OAuth2 full flow (client_credentials + JWT) | Opaque API keys with SHA-256 hash | Project decision (STATE.md) | Simpler implementation; instant revocation; no JWT signing secret to manage; matches Stripe/GitHub pattern |
| bcrypt for key hashing | SHA-256 for key hashing | Industry shift for high-entropy inputs | SHA-256 is deterministic, fast (<1ms), and sufficient for 256-bit keys; bcrypt is for low-entropy passwords |
| Global IP rate limiting only | IP + per-key rate limiting (two Upstash instances) | This phase | Prevents one API key from monopolizing the rate limit budget of the whole IP |

**Deprecated/outdated in this project context:**
- JWT-based API auth (`jsonwebtoken`, `bcryptjs`): The ARCHITECTURE.md drafted this approach but STATE.md explicitly overrides it with opaque keys. Do not install `jsonwebtoken` or `bcryptjs` for this phase.
- Server-side `qr-code-styling`: DOM-dependent; cannot be used in Vercel Node runtime.

---

## Open Questions

1. **Per-tier API key limits (how many keys can a user create?)**
   - What we know: No limit is specified in requirements. Stripe allows up to 100 keys. GitHub allows unlimited.
   - What's unclear: Should Free/Starter users be prevented from creating API keys at all?
   - Recommendation: Gate API key creation at Pro tier only (consistent with "developer" positioning of the feature). Cap at 10 keys per user to keep DB lookups bounded. Planner should confirm tier gating.

2. **Rate limit window per key: what is the right limit?**
   - What we know: The IP limiter is 60 req/60s. The per-key limiter needs a separate window.
   - What's unclear: Is 100 req/60s per key reasonable for v1.3? Should it scale with tier?
   - Recommendation: Start at 100 req/60s for all API keys (Pro-only feature). Add tier-based scaling in a future phase.

3. **Scope of /api/v1/* in this phase (generate only, or full CRUD?)**
   - What we know: Requirements API-01–API-04 specify only `POST /api/v1/generate` plus key management. No GET/list/delete endpoints are in scope.
   - What's unclear: The ARCHITECTURE.md outlined a full CRUD REST API. That is broader than the requirements.
   - Recommendation: Implement only `POST /api/v1/generate` for this phase. Full CRUD REST API (`/api/v1/qr`, `/api/v1/qr/[id]`) can be a separate phase. Keep this phase focused on the 4 requirements.

4. **`lastUsedAt` update: fire-and-forget or await?**
   - What we know: Updating `lastUsedAt` on each request adds a DB write to the critical path.
   - What's unclear: Whether Vercel Pro's `waitUntil` (Fluid Compute) is safe to use here.
   - Recommendation: Use `waitUntil` from `@astrojs/vercel` if available, otherwise await the update. The added latency is small (~5ms for a Turso HTTP write) and acceptable.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@upstash/ratelimit` | Per-key rate limiting (API-03) | ✓ | ^2.0.8 (installed) | null fallback already implemented in `rateLimit.ts` |
| `@upstash/redis` | Rate limiter backing store | ✓ | ^1.37.0 (installed) | Same null fallback |
| `UPSTASH_REDIS_REST_URL` | Both rate limiters | Set in Vercel env (Phase 17) | — | Limiter returns null; local dev passes through |
| `qrcode` npm | Server-side QR generation (API-01, API-04) | ✗ | Not installed | Must install: `npm install qrcode && npm install -D @types/qrcode` |
| Turso DB | `apiKeys` table | ✓ | Running (Phase 17+) | — |
| Drizzle Kit | Schema migration | ✓ | 0.31.9 (installed) | — |
| Node.js `crypto` | Key generation + hashing | ✓ | Node 24 built-in | — |

**Missing dependencies with no fallback:**
- `qrcode` npm — must be installed before `src/pages/api/v1/generate.ts` can be written.

**Missing dependencies with fallback:**
- None blocking. Upstash env vars use the existing null-fallback pattern from `rateLimit.ts`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npm run test:smoke` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| API-01 | POST /api/v1/generate with valid Bearer key returns 200 + base64 PNG | integration (Playwright API) | `playwright test tests/api/generate.spec.ts -x` | ❌ Wave 0 |
| API-01 | POST /api/v1/generate without Authorization header returns 401 | integration | same file | ❌ Wave 0 |
| API-01 | POST /api/v1/generate with revoked key returns 401 | integration | same file | ❌ Wave 0 |
| API-02 | Dashboard API keys page loads (Clerk auth required) | smoke (Playwright) | `npm run test:smoke` | ❌ Wave 0 |
| API-03 | POST /api/v1/generate beyond 100 req/60s returns 429 with Retry-After | integration | `playwright test tests/api/generate.spec.ts` | ❌ Wave 0 |
| API-04 | format=svg returns SVG XML string in response | integration | same file | ❌ Wave 0 |

Note: Playwright is used for both browser smoke tests and API-level integration tests (via `request` fixture). No separate Jest/Vitest setup exists in the project.

### Sampling Rate

- **Per task commit:** `npm run test:smoke` (< 30s)
- **Per wave merge:** `npm run test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/api/generate.spec.ts` — covers API-01, API-03, API-04 (Playwright API request fixture)
- [ ] `tests/api/api-keys.spec.ts` — covers API-02 create/revoke flow (Playwright browser test)

*(Existing test infrastructure: Playwright with `@smoke` tag convention. No missing framework install needed.)*

---

## Project Constraints (from CLAUDE.md)

No `CLAUDE.md` file exists in this project's root. Constraints are sourced from `STATE.md` decisions, `.planning/research/`, and architecture documents.

**Locked decisions that constrain this phase:**

1. **Opaque API keys, not JWTs.** STATE.md: "API keys stored as SHA-256 hash only; raw key shown to user once and never persisted." Do not install `jsonwebtoken` or `bcryptjs`.

2. **Rate limiting must be live before REST API ships.** Phase 17 completed this. Upstash `@upstash/ratelimit` + `@upstash/redis` are installed and configured.

3. **`output: 'static'` in `astro.config.mjs`.** Every file in `src/pages/api/v1/` must include `export const prerender = false`.

4. **Clerk middleware exemption required.** `/api/v1/(.*)` must be added to the `isPublicApiRoute` matcher in `middleware.ts`. This is the first change in the phase.

5. **`qr-code-styling` is DOM-dependent.** Cannot be used server-side. Use `qrcode` npm for `/api/v1/generate`.

6. **Drizzle migration pattern.** Schema additions go in `src/db/schema.ts`; run `drizzle-kit generate` + `drizzle-kit migrate` to produce and apply a new SQL migration. See `drizzle/` directory for existing migration files.

7. **Turso concurrent writes.** Use SQL-level atomic increment (`SET usageCount = usageCount + 1`) rather than read-then-write for `usageCount` updates.

---

## Sources

### Primary (HIGH confidence)

- Node.js `crypto` built-in — verified in Node 24 (project runtime): `randomBytes`, `createHash`
- `qrcode` npm 1.5.4 — `npm view qrcode version` confirmed; pngjs dependency confirmed (no canvas, no DOM)
- `@upstash/ratelimit` — [Upstash docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/features) — per-identifier `limit(identifier)` pattern, multiple instance pattern with separate prefixes confirmed
- Existing `src/middleware.ts` — read directly; `sequence(rateLimitMiddleware, clerkAuth)` pattern confirmed; `createRouteMatcher` for exemptions available
- Existing `src/db/schema.ts` — read directly; Drizzle table definition patterns, `$defaultFn`, index patterns confirmed
- `astro.config.mjs` — read directly; `output: 'static'` confirmed; `export const prerender = false` requirement confirmed
- Existing `src/pages/api/qr/[id].ts` — read directly; IDOR prevention pattern (`and(eq(table.id, id), eq(table.userId, userId))`) confirmed

### Secondary (MEDIUM confidence)

- [Scalekit: API key vs JWT M2M comparison](https://www.scalekit.com/blog/apikey-jwt-comparison) — confirmed opaque key + SHA-256 is the industry pattern (Stripe, GitHub, Vercel all use this)
- [WorkOS: API Keys vs M2M](https://workos.com/blog/api-keys-vs-m2m-applications) — confirms instant revocation as the primary advantage of opaque keys over JWTs
- WebSearch: `qrcode` pngjs dependency confirmed (no canvas); `toBuffer` and `toDataURL` confirmed DOM-free on Node.js

### Tertiary (LOW confidence / needs validation)

- Per-key rate limit window (100 req/60s) — chosen as a reasonable starting point; no official guidance exists. Validate against actual developer usage patterns.
- `waitUntil` availability for fire-and-forget `lastUsedAt` updates — Vercel Fluid Compute docs say it's available on Pro; confirm `@astrojs/vercel` adapter exposes it in Astro context.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `qrcode` verified, `crypto` built-in verified, Upstash instances confirmed working in codebase
- Architecture: HIGH — middleware exemption pattern is standard Clerk; verifyApiKey helper follows existing route patterns; schema follows established Drizzle conventions
- Pitfalls: HIGH (prerender, IDOR, qr-code-styling server-side, raw key storage) — all derived from verified codebase inspection and documented Vercel constraints

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable stack; Upstash API and qrcode npm are not fast-moving)
