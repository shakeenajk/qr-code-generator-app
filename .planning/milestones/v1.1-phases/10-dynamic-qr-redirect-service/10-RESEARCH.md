# Phase 10: Dynamic QR Redirect Service - Research

**Researched:** 2026-03-29
**Domain:** Astro 5 serverless endpoint as redirect handler, Drizzle ORM schema extension, nanoid slug generation, dashboard React component extensions
**Confidence:** HIGH

## Summary

Phase 10 introduces the dynamic QR redirect layer: a server-rendered Astro endpoint at `/r/[slug]` that looks up a slug in Turso/libSQL and issues a 307 redirect (or renders a holding page). The QR code printed by the user encodes the fixed `/r/{slug}` URL; only the destination behind that slug changes.

The implementation has four distinct layers: (1) DB schema — a new `dynamicQrCodes` table linked by FK to `savedQrCodes`; (2) the redirect endpoint — an Astro SSR page at `src/pages/r/[slug].ts` using `@libsql/client/web` for HTTP-based DB access from Vercel's serverless runtime; (3) new API routes for CRUD operations on dynamic QR metadata; and (4) UI extensions to QRGeneratorIsland and QRLibrary for toggle, badge, inline destination edit, and pause/activate controls.

A critical finding: `export const runtime = 'edge'` is NOT a supported per-route mechanism in Astro 5 with the current `@astrojs/vercel` adapter. The redirect endpoint runs as a **Vercel Serverless Function**, not a Vercel Edge Function. Latency comes from Turso's HTTP API (which is edge-distributed) rather than the compute tier. The project's existing `@libsql/client/web` pattern (already confirmed working in Phase 8) is the correct approach for DB access from this serverless context.

**Primary recommendation:** Implement the redirect as `src/pages/r/[slug].ts` with `export const prerender = false` and `@libsql/client/web`. Use a dedicated `dynamicQrCodes` table (separate from `savedQrCodes`) for schema cleanliness and Phase 11 analytics FK readiness. Slug: nanoid 8 chars (URL-safe alphabet, already installed as a transitive dependency at v3.3.11).

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Dynamic QR toggle in URL content section of QRGeneratorIsland, visible only on URL tab.
- **D-02:** Non-URL tab: toggle greyed out with tooltip "Dynamic QR only works with URL content." No auto-switching.
- **D-03:** Enabling toggle causes QR to encode `/r/{slug}` on `qr-code-generator-app.com`. Destination URL field stays visible.
- **D-04:** Slug always auto-generated (nanoid, ~8 chars). No user-customizable slugs. Slug generated at save time, stored immutably.
- **D-05:** Dynamic QRs saved via existing Phase 9 "Save to Library" flow. No separate creation modal or dashboard button.
- **D-06:** Dynamic QRs appear in same "My QR Codes" grid. "Dynamic" badge on card.
- **D-07:** Dynamic QR cards show: current destination URL, active/paused status indicator.
- **D-08:** Destination URL editable inline on card. Pencil icon activates edit. Save button + Cancel. Toast "Destination updated".
- **D-09:** Active/paused state is direct toggle on card, no confirmation modal. Toast on toggle.
- **D-10:** Card actions: inline destination edit, pause/activate toggle, "Edit QR" (reopens generator), Delete.
- **D-11:** Free/Starter users: 3 dynamic QRs (freemium trial). Pro: unlimited.
- **D-12:** Free/Starter user hitting limit sees upgrade prompt on 4th creation attempt.
- **D-13:** Existing dynamic QRs on free accounts keep working — gate create/edit, not read.
- **D-14:** "Dynamic QR" toggle shows Pro lock indicator only when user has already hit their limit.
- **D-15:** Paused QR scan: branded holding page — "This QR code is temporarily paused. The owner has disabled this link."
- **D-16:** Invalid slug: branded holding page — "This QR code is no longer active."
- **D-17:** Holding page: minimal, mobile-first, QRCraft logo, no nav/footer.

### Claude's Discretion

- Schema design: extend `savedQrCodes` with `is_dynamic`, `slug`, `destination_url`, `is_paused` columns OR create a separate `dynamicQrCodes` table.
- Exact nanoid length and character set.
- Edge function implementation: `export const runtime = 'edge'` in Astro endpoint at `src/pages/r/[slug].ts` with `@libsql/client/web`.
- Holding page route: `/r/[slug]` vs separate `/paused` page vs inline HTML response.
- Slug collision check on generation (probability analysis + retry logic).

### Deferred Ideas (OUT OF SCOPE)

- Custom short domains (e.g., `go.brand.com`)
- User-customizable slugs
- QR code expiry dates (DYN-V2-01)
- Scan-limit threshold alerts (DYN-V2-03)
- Scan analytics (Phase 11)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DYN-01 | Pro user can create a dynamic QR code that encodes a short redirect URL | Schema design, save API extension, generator toggle, nanoid slug generation |
| DYN-02 | Pro user can change the destination URL without reprinting | PATCH/PUT route for `destinationUrl` on `dynamicQrCodes`, inline editor in QRLibrary |
| DYN-03 | Scanning a dynamic QR code redirects to current destination via edge function (low latency) | `src/pages/r/[slug].ts` with `export const prerender = false`, `@libsql/client/web`, 307 redirect |
| DYN-04 | Pro user can toggle a dynamic QR code active or paused | `isPaused` column, PATCH route, PauseToggle component, holding page for paused/invalid |
| DYN-05 | Free authenticated user limited to 3 dynamic QR codes | COUNT query on `dynamicQrCodes` by userId, tier gate in create route, upgrade toast |
</phase_requirements>

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@libsql/client/web` | 0.17.0 (installed) | HTTP-mode DB client for Turso in serverless runtime | Already established in Phase 8; `/web` export avoids Node.js-only transports |
| `drizzle-orm` | 0.45.1 (installed) | ORM for schema definition + typed queries | Already in use; `sqliteTable` + Drizzle Kit for migrations |
| `drizzle-kit` | 0.31.9 (installed) | Schema migration generation and push | Already configured in `drizzle.config.ts` |
| `nanoid` (v3.3.11) | 3.3.11 (installed, transitive) | Slug generation | Already present as transitive dep; v3 ESM-compatible; `customAlphabet` available |
| `sonner` | 2.0.7 (installed) | Toast notifications | Already established in Phase 9 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | installed | Icons (Pause, Play, Info, Lock) | All new toggle/action icons in Phase 10 UI |
| `@astrojs/vercel` | 9.0.5 (installed) | Vercel adapter — SSR serverless functions | `/r/[slug].ts` requires `export const prerender = false` to hit this adapter |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `dynamicQrCodes` table | Extend `savedQrCodes` with `is_dynamic`, `slug`, `destination_url`, `is_paused` | Separate table is cleaner: Phase 11 analytics needs a FK target; slug UNIQUE index is simpler on a dedicated table; list queries don't need to LEFT JOIN or filter on `is_dynamic`; **recommendation: separate table** |
| nanoid 8-char slug | 6-char slug | 8-char gives 64^8 ≈ 2.8 × 10^14 space, collision probability < 2 × 10^-5 at 100k QRs — 6-char gives 7% collision risk at 100k; use 8 |
| Serverless function for `/r/[slug]` | Vercel Edge Function via `export const runtime = 'edge'` | Per-route `runtime = 'edge'` is NOT supported in Astro 5 + `@astrojs/vercel` 9.x; serverless with `@libsql/client/web` is the confirmed working pattern |

**Installation:** No new packages needed. `nanoid` v3.3.11 is already installed as a transitive dependency. Add it as a direct dependency for explicit version control:

```bash
npm install nanoid@3
```

**Version verification (performed 2026-03-29):**
- `nanoid`: 3.3.11 installed (transitive), v5.1.7 latest on npm — v3 is used intentionally (project is ESM, v3 works fine; v5 has minor API changes but no compelling reason to upgrade mid-project)
- `@libsql/client`: 0.17.0 installed, confirms `/web` export exists at `lib-esm/web.js`
- `drizzle-orm`: 0.45.1 installed

---

## Architecture Patterns

### Recommended Project Structure for Phase 10

```
src/
├── pages/
│   ├── r/
│   │   └── [slug].ts          # NEW: redirect endpoint (prerender=false, @libsql/client/web)
│   ├── api/
│   │   └── qr/
│   │       ├── save.ts        # MODIFY: add isDynamic + slug + destinationUrl handling
│   │       ├── [id].ts        # MODIFY: add destination PATCH + pause toggle PATCH
│   │       ├── list.ts        # MODIFY: join dynamicQrCodes data when listing
│   │       └── dynamic/
│   │           └── [id].ts    # NEW: PATCH destination, PATCH isPaused — or add to [id].ts
│   ├── dashboard/
│   │   └── index.astro        # MODIFY: pass dynamicQr metadata to QRLibrary
│   └── holding.astro          # OPTIONAL: separate holding page, or render inline from [slug].ts
├── db/
│   └── schema.ts              # MODIFY: add dynamicQrCodes table
├── components/
│   ├── QRGeneratorIsland.tsx  # MODIFY: add isDynamic state, toggle, slug-encoding logic
│   ├── tabs/
│   │   └── UrlTab.tsx         # MODIFY: accept isDynamic + onToggle props
│   └── dashboard/
│       └── QRLibrary.tsx      # MODIFY: extend card with DynamicBadge, InlineDestEditor, PauseToggle
```

### Pattern 1: Separate `dynamicQrCodes` Table (Recommended)

**What:** Create a new table `dynamic_qr_codes` with `savedQrCodeId` FK, `slug` (unique), `destinationUrl`, `isPaused`, `userId` (denormalized for count queries without join).

**When to use:** This phase and Phase 11. The dedicated table keeps the `savedQrCodes` list query clean (no nullable dynamic columns) and gives Phase 11 a clear FK target for `scan_events`.

**Schema:**
```typescript
// Source: drizzle-orm/sqlite-core pattern verified from existing schema.ts
import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const dynamicQrCodes = sqliteTable('dynamic_qr_codes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  savedQrCodeId: text('saved_qr_code_id').notNull().references(() => savedQrCodes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),          // denormalized for count-without-join
  slug: text('slug').notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  isPaused: integer('is_paused', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => ({
  slugIdx: uniqueIndex('dynamic_qr_codes_slug_idx').on(table.slug),
  userIdIdx: index('dynamic_qr_codes_user_id_idx').on(table.userId),
}));
```

Note: `index` (non-unique) is importable from `drizzle-orm/sqlite-core`.

### Pattern 2: Redirect Endpoint

**What:** Astro SSR endpoint at `src/pages/r/[slug].ts`. Looks up slug in DB; issues 307 redirect or returns holding page HTML.

**When to use:** DYN-03 — this is the single route that QR codes point to.

**Key constraint:** `export const runtime = 'edge'` does NOT work with Astro 5 + `@astrojs/vercel` 9.x per-route. The endpoint runs as a Vercel Serverless Function. Use `@libsql/client/web` (HTTP transport) — already the established project pattern (`src/db/index.ts` uses `drizzle-orm/libsql/web`).

**Approach A (recommended): Inline HTML for holding page**
Return the holding page HTML directly from the endpoint response. Avoids a redirect loop to a separate `/holding` page. The endpoint does ONE DB read then responds.

**Approach B: Redirect to `/holding?reason=paused`**
Adds an extra HTTP round-trip on each paused scan. Not recommended.

**Example structure:**
```typescript
// src/pages/r/[slug].ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { db } from '../../db/index';
import { dynamicQrCodes } from '../../db/schema';
import { eq } from 'drizzle-orm';

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  if (!slug) return holdingResponse('invalid');

  const [row] = await db
    .select({ destinationUrl: dynamicQrCodes.destinationUrl, isPaused: dynamicQrCodes.isPaused })
    .from(dynamicQrCodes)
    .where(eq(dynamicQrCodes.slug, slug))
    .limit(1);

  if (!row) return holdingResponse('invalid');
  if (row.isPaused) return holdingResponse('paused');

  return new Response(null, {
    status: 307,
    headers: { Location: row.destinationUrl },
  });
};

function holdingResponse(reason: 'paused' | 'invalid'): Response {
  // Returns minimal HTML holding page (see Holding Page pattern below)
}
```

### Pattern 3: Slug Generation with Collision Retry

**What:** Generate an 8-char URL-safe slug at save time; retry once if collision detected.

**Collision math (verified):**
- 64-char URL-safe alphabet (A-Z, a-z, 0-9, -, _): 64^8 ≈ 2.8 × 10^14 combinations
- At 1,000 QRs: collision probability ≈ 1.8 × 10^-9 (effectively zero)
- At 100,000 QRs: collision probability ≈ 1.8 × 10^-5 (one-in-55,000)
- Conclusion: retry on duplicate-key violation is sufficient; no pre-check needed

```typescript
// Source: nanoid v3 API — confirmed from installed package
import { nanoid } from 'nanoid';

async function generateUniqueSlug(db: typeof import('../../db/index').db): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = nanoid(8);  // URL-safe alphabet, 8 chars
    const existing = await db.select({ id: dynamicQrCodes.id })
      .from(dynamicQrCodes)
      .where(eq(dynamicQrCodes.slug, slug))
      .limit(1);
    if (!existing.length) return slug;
  }
  throw new Error('Slug generation failed after 3 attempts');
}
```

Alternative: wrap DB insert in try/catch for UNIQUE constraint violation (SQLite error code SQLITE_CONSTRAINT_UNIQUE) — avoids the pre-check SELECT. Either approach is acceptable at this scale.

### Pattern 4: Tier Limit Check for DYN-05

**What:** Count existing dynamic QRs for the user before creating a new one. Free/Starter capped at 3.

```typescript
import { count } from 'drizzle-orm';

// In the create/save route:
const tier = sub?.tier ?? 'free';
const isProTier = tier === 'pro';

if (!isProTier) {
  const [{ value: dynCount }] = await db
    .select({ value: count() })
    .from(dynamicQrCodes)
    .where(eq(dynamicQrCodes.userId, userId));
  if (dynCount >= 3) {
    return new Response(JSON.stringify({ error: 'dynamic_limit_reached' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

The generator reads a distinct error code (`dynamic_limit_reached`) to show the upgrade toast vs generic 403.

### Pattern 5: Dynamic QR Toggle in QRGeneratorIsland

**What:** Add `isDynamic` boolean state to QRGeneratorIsland. When enabled and `activeTab === 'url'`, the QR encodes `https://qr-code-generator-app.com/r/{tempSlug}` instead of the raw URL. The actual slug is generated server-side at save time — the generator uses a placeholder slug for the live preview.

**Key design decision:** The QR preview in the generator can show a placeholder redirect URL (e.g., `https://qr-code-generator-app.com/r/xxxxxxxx`) while the user configures. The real slug is created by the save API.

**contentData shape for dynamic QRs:**
```typescript
// When isDynamic is true and activeTab is 'url':
contentData = {
  url: urlValue,         // destination URL
  isDynamic: true,       // flag so edit-mode can restore toggle state
  slug: savedSlug,       // returned by save API, stored in contentData after save
}
```

Note: `slug` field in contentData is only populated after first save. On edit-mode load, the generator reads `contentData.isDynamic` to restore the toggle, and `contentData.slug` to know the redirect URL.

### Pattern 6: QRLibrary Card Extensions

**What:** Extend the existing `SavedQR` interface and card rendering to support dynamic QR metadata. Dynamic cards fetch their extra data from the list API (which joins `dynamicQrCodes`).

**List API extension:** `GET /api/qr/list` should include dynamic QR fields in the response when a QR is dynamic:
```typescript
interface SavedQR {
  // ... existing fields ...
  isDynamic?: boolean;
  slug?: string;
  destinationUrl?: string;
  isPaused?: boolean;
}
```

### Anti-Patterns to Avoid

- **Using `export const runtime = 'edge'` in Astro 5:** Not supported per-route with `@astrojs/vercel` 9.x. The endpoint runs serverless. Attempting this export is silently ignored or causes build errors.
- **Using `drizzle-orm/libsql` (not `/web`) in the redirect endpoint:** The non-web import uses Node.js-specific transports (WebSocket). In Vercel's serverless runtime, `@libsql/client/web` (HTTP) is required — already confirmed working in this project.
- **Pre-checking slug uniqueness with a SELECT then INSERT (TOCTOU race):** Prefer try/catch on INSERT unique constraint violation, or use the retry loop pattern above.
- **Storing slug in `savedQrCodes.contentData` JSON instead of a dedicated table:** Slugs need to be queryable for redirect lookups. A dedicated table with a proper index is required.
- **Using `nanoid` v5 without checking:** v5 API is slightly different (`customAlphabet` returns async in some environments). v3 is already installed and works synchronously — stick with v3.
- **Extending `savedQrCodes` for dynamic fields:** Creates nullable columns on all static QR rows, complicates list queries, and makes Phase 11 FK relationships messy. Use a separate table.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Slug generation | Custom random string logic | `nanoid(8)` from already-installed nanoid v3 | Handles URL-safe alphabet, cryptographic randomness, correct character distribution |
| Unique constraint enforcement | Manual collision detection in every insert | UNIQUE column + try/catch on insert, or retry loop | Database enforces uniqueness atomically; hand-rolled checks have TOCTOU races |
| Redirect response | Custom response builder | `new Response(null, { status: 307, headers: { Location: url } })` | Standard HTTP; Astro's `APIRoute` return is just a `Response` |
| Toast notifications | Custom notification system | `sonner` (already set up) | Already installed and working from Phase 9; consistent UX |
| Inline edit state | Complex form library | Local React `useState` + controlled input | Simple enough; matches existing Phase 9 patterns |

**Key insight:** This phase has no exotic dependencies. Everything needed is already installed. The risk is in wiring, not in library selection.

---

## Common Pitfalls

### Pitfall 1: `export const runtime = 'edge'` Does Not Work Per-Route in Astro 5

**What goes wrong:** Developer adds `export const runtime = 'edge'` to `src/pages/r/[slug].ts` expecting it to deploy as a Vercel Edge Function. The endpoint either ignores the export or produces a build error.

**Why it happens:** Astro 5 + `@astrojs/vercel` 9.x dropped per-route edge configuration. Edge mode is only available via `edgeMiddleware: true` in `astro.config.mjs`, which the project cannot use because Clerk is incompatible with Vercel Edge runtime (existing constraint from Phase 7: "No edgeMiddleware on vercel() adapter — Clerk is incompatible with Vercel Edge runtime").

**How to avoid:** Use `export const prerender = false` only. The endpoint runs as a serverless function. Turso's HTTP API (`@libsql/client/web`) is edge-distributed globally, so redirect latency is dominated by Turso's response time (~10-30ms), not the serverless compute location.

**Warning signs:** Build error mentioning `runtime` export, or documentation describing per-route runtime config for older Astro versions.

### Pitfall 2: Using `@libsql/client` (not `/web`) in the Redirect Endpoint

**What goes wrong:** Import `from '@libsql/client'` instead of `from '@libsql/client/web'`. Build succeeds locally but fails on Vercel with a WebSocket or Node.js native module error.

**Why it happens:** The default `@libsql/client` export uses WebSocket or SQLite-native transports. Vercel's serverless runtime has limited Node.js API support. The `/web` export uses HTTP fetch exclusively.

**How to avoid:** The project already uses `drizzle-orm/libsql/web` in `src/db/index.ts`. The redirect endpoint reuses `src/db/index.ts` — no separate client instantiation needed.

**Warning signs:** Vercel deployment error mentioning `ws://` or `libsql-node-sqlite3`.

### Pitfall 3: Slug in contentData JSON Is Not Queryable

**What goes wrong:** Storing `slug` inside `savedQrCodes.contentData` (a TEXT JSON blob) means the redirect endpoint cannot do `WHERE slug = ?` — it would require a full table scan with JSON extraction.

**Why it happens:** contentData is an opaque JSON string; SQLite cannot index into it efficiently without generated column syntax.

**How to avoid:** `slug` and `destinationUrl` live in the `dynamicQrCodes` table with proper indexed columns. `contentData` stores `isDynamic: true` and `slug` only for the generator's edit-mode hydration — the redirect path never reads contentData.

### Pitfall 4: QR Preview Encodes an Invalid URL Before Slug Exists

**What goes wrong:** The generator preview tries to encode the redirect URL but the slug doesn't exist yet (it's created at save time), resulting in QR codes that point to non-existent slugs if the user screenshots the preview instead of downloading after save.

**Why it happens:** Slug is assigned server-side. The preview runs client-side before any API call.

**How to avoid:** Use a visible placeholder in the preview: `https://qr-code-generator-app.com/r/--------` (or any 8-char placeholder). The real slug is returned by the save API and must be stored in contentData. Add a UX note: "Scan this QR code after saving to confirm it works." The downloadable QR is only correct after the save API assigns the real slug and the generator re-encodes with it. This means the save flow for dynamic QRs needs to: (1) call save API, (2) receive `{ id, slug }`, (3) update the QR preview with the real slug URL, (4) then offer download. Alternatively, provide the download from the library card only (the standard flow already redirects to the dashboard after save).

### Pitfall 5: Free-User Count Gate Bypassed via Direct Save API Call

**What goes wrong:** The generator's client-side toggle checks the count before showing the upgrade prompt, but the actual limit enforcement must be server-side. A user could bypass the UI and POST directly to the save API with `isDynamic: true`.

**Why it happens:** Client-side checks are UX only.

**How to avoid:** The count check (3-QR limit for free/Starter) must be enforced in the server-side save route — not only in the generator component.

### Pitfall 6: Delete of `savedQrCodes` Row Leaves Orphaned `dynamicQrCodes` Row

**What goes wrong:** User deletes a QR from the library. The `savedQrCodes` row is deleted, but the corresponding `dynamicQrCodes` row remains. The slug continues to redirect until the orphaned row is manually cleaned up.

**Why it happens:** Missing `ON DELETE CASCADE` on the FK.

**How to avoid:** Define the FK with `{ onDelete: 'cascade' }` in the Drizzle schema (shown in the schema example above). Turso/SQLite supports cascade deletes when `PRAGMA foreign_keys = ON` is set. Verify foreign key enforcement is enabled — libSQL enables it by default in HTTP mode.

### Pitfall 7: `nanoid` v5 Import Incompatibility

**What goes wrong:** Developer imports from `nanoid` and gets v5 behavior (or a dependency resolution pulls v5 if explicitly installed), causing API differences.

**Why it happens:** nanoid v5 (current npm latest: 5.1.7) has breaking changes vs v3. If `npm install nanoid` is run without a version pin, v5 installs.

**How to avoid:** Install with explicit version pin: `npm install nanoid@3`. The existing transitive install is already v3.3.11. Import `{ nanoid } from 'nanoid'` — same syntax in v3.

---

## Code Examples

### Holding Page HTML Response (inline from redirect endpoint)

```typescript
// Source: MDN HTML response pattern + project UI-SPEC colors
function holdingResponse(reason: 'paused' | 'invalid'): Response {
  const heading = reason === 'paused'
    ? 'This QR code is temporarily paused.'
    : 'This QR code is no longer active.';
  const body = reason === 'paused'
    ? 'The owner has disabled this link.'
    : 'The link you scanned is no longer available.';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QRCraft</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #111; }
    @media (prefers-color-scheme: dark) { body { background: #0f172a; color: #f8fafc; } }
    .page { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 1.5rem 2rem; text-align: center; }
    h1 { font-size: 1.75rem; font-weight: 600; margin: 0 0 0.75rem; max-width: 22rem; }
    p { font-size: 0.875rem; color: #6b7280; margin: 0; max-width: 20rem; }
    @media (prefers-color-scheme: dark) { p { color: #94a3b8; } }
    .logo { margin-bottom: 2rem; font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; }
  </style>
</head>
<body>
  <main class="page">
    <div class="logo">QRCraft</div>
    <h1>${heading}</h1>
    <p>${body}</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: reason === 'paused' ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
```

### Drizzle Count Query for Tier Gate

```typescript
// Source: drizzle-orm docs — count() aggregate
import { count, eq } from 'drizzle-orm';

const [{ value: dynCount }] = await db
  .select({ value: count() })
  .from(dynamicQrCodes)
  .where(eq(dynamicQrCodes.userId, userId));
```

### Drizzle Migration Push Command

```bash
# Source: drizzle.config.ts — confirmed dialect: 'turso'
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx drizzle-kit push
```

### Redirect Response (307 Temporary Redirect)

```typescript
// 307 preserves HTTP method (GET stays GET on redirect)
return new Response(null, {
  status: 307,
  headers: { Location: row.destinationUrl },
});
```

Note on status code: 307 (Temporary Redirect) is correct because the destination may change. Do not use 301 (Permanent Redirect) — browsers and proxies cache 301s, which would prevent destination updates from taking effect.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-route `runtime = 'edge'` in Astro + Vercel adapter | `edgeMiddleware: true` at adapter level only | Astro 4 → 5 transition | Per-route edge is not available; serverless is the only option for individual routes |
| `import vercel from '@astrojs/vercel/serverless'` | `import vercel from '@astrojs/vercel'` | `@astrojs/vercel` v9 | Single package, no `/serverless` subpath needed |
| `drizzle-orm/libsql` | `drizzle-orm/libsql/web` | Phase 8 project decision | Required for Vercel serverless runtime compatibility |

**Deprecated/outdated:**
- `@astrojs/vercel/serverless` import path: replaced by `@astrojs/vercel` in v9 (already correct in this project)
- Per-route `export const runtime = 'edge'`: not supported in Astro 5 with current adapter

---

## Open Questions

1. **Should the save flow re-encode the QR preview with the real slug after receiving it from the API?**
   - What we know: The generator preview uses a placeholder slug. After save, the API returns `{ id, slug }`. The current save flow toasts and redirects to the dashboard without re-rendering.
   - What's unclear: Do we need to offer a "Download" button in the generator post-save (showing the real-slug QR)? Or is the library card the canonical download point?
   - Recommendation: For v1.1, treat the library card as the canonical download point for dynamic QRs. The generator's "Save Dynamic QR" button saves and toasts "Saved to library — scan from your library to verify." Document this UX decision explicitly in the plan.

2. **Holding page: inline HTML vs separate Astro page (`/holding`)?**
   - What we know: Inline HTML avoids a redirect and is simpler. A separate Astro page at `/holding.astro` gives full Tailwind/dark-mode support with prerendering.
   - What's unclear: How important is Tailwind consistency on the holding page (it's a very simple page).
   - Recommendation: Inline HTML with hardcoded CSS (as shown in code example above). The holding page is simple enough that Tailwind is not needed, and inline HTML avoids an extra round-trip.

3. **Foreign key enforcement in Turso libSQL HTTP mode?**
   - What we know: SQLite requires `PRAGMA foreign_keys = ON` per connection for cascades. libSQL in HTTP mode may or may not set this by default.
   - What's unclear: Whether `@libsql/client/web` 0.17.0 enables FK enforcement by default.
   - Recommendation: Add a startup check or explicitly run `PRAGMA foreign_keys = ON` via a raw query if cascade delete is needed. Alternatively, handle cascade manually in the delete route (`DELETE FROM dynamic_qr_codes WHERE saved_qr_code_id = ?` before `DELETE FROM saved_qr_codes WHERE id = ?`). Manual cascade is safer and explicit.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Turso DB (remote) | Redirect endpoint, all CRUD routes | ✓ | live (Phase 8 verified) | — |
| `@libsql/client/web` | DB access in serverless | ✓ | 0.17.0 (installed) | — |
| `nanoid` | Slug generation | ✓ | 3.3.11 (transitive, available) | `crypto.randomUUID()` truncated — not recommended |
| `drizzle-kit` | DB migration push | ✓ | 0.31.9 (installed) | — |
| Vercel adapter | Serverless endpoint deploy | ✓ | 9.0.5 (installed) | — |
| Clerk auth | Tier checking in API routes | ✓ | @clerk/astro 3.0.4 (installed) | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npx playwright test --grep @smoke` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DYN-01 | Unauthenticated POST `/api/qr/save` with `isDynamic:true` returns 401 | smoke API | `npx playwright test tests/dynamic/ --grep @smoke` | ❌ Wave 0 |
| DYN-01 | Free user within limit (0–2) can create dynamic QR via save API | smoke API | `npx playwright test tests/dynamic/create-api.spec.ts --grep @smoke` | ❌ Wave 0 |
| DYN-02 | PATCH `/api/qr/dynamic/[id]` updates destinationUrl (authenticated owner) | smoke API | `npx playwright test tests/dynamic/update-api.spec.ts --grep @smoke` | ❌ Wave 0 |
| DYN-02 | PATCH destinationUrl wrong-user returns 404 (IDOR prevention) | smoke API | same file | ❌ Wave 0 |
| DYN-03 | GET `/r/[valid-active-slug]` returns 307 with Location header | smoke API | `npx playwright test tests/dynamic/redirect.spec.ts --grep @smoke` | ❌ Wave 0 |
| DYN-03 | GET `/r/[invalid-slug]` returns 404 with holding page HTML | smoke API | same file | ❌ Wave 0 |
| DYN-04 | GET `/r/[paused-slug]` returns 200 holding page (not redirect) | smoke API | same file | ❌ Wave 0 |
| DYN-04 | PATCH isPaused=true updates status | smoke API | `npx playwright test tests/dynamic/pause-api.spec.ts --grep @smoke` | ❌ Wave 0 |
| DYN-05 | 4th dynamic QR creation by free user returns 403 with `dynamic_limit_reached` | smoke API | `npx playwright test tests/dynamic/create-api.spec.ts --grep @smoke` | ❌ Wave 0 |
| DYN-05 | Toggle lock shown in generator when free user at limit (3 existing) | manual | N/A — requires real Clerk session | manual-only |

### Sampling Rate

- **Per task commit:** `npx playwright test --grep @smoke`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dynamic/create-api.spec.ts` — DYN-01, DYN-05 (unauthenticated 401, limit 403)
- [ ] `tests/dynamic/redirect.spec.ts` — DYN-03, DYN-04 (307 redirect, holding page for paused/invalid)
- [ ] `tests/dynamic/update-api.spec.ts` — DYN-02 (destination update, IDOR prevention)
- [ ] `tests/dynamic/pause-api.spec.ts` — DYN-04 (pause toggle API)

Note: Tests requiring real Clerk sessions (pro user can create unlimited, free user generator toggle lock) follow the established project pattern: `test.fixme` stubs with comment "Requires real Clerk session — manually verify at checkpoint."

---

## Sources

### Primary (HIGH confidence)

- Codebase audit (`src/db/index.ts`, `src/db/schema.ts`, `src/pages/api/qr/`, `package.json`) — confirmed @libsql/client 0.17.0, nanoid 3.3.11, drizzle-orm 0.45.1, existing patterns
- `node_modules/@libsql/client/package.json` — confirmed `/web` export exists at `lib-esm/web.js`
- `node_modules/nanoid/package.json` — confirmed v3.3.11 installed, `customAlphabet` available
- Vercel docs (`https://vercel.com/docs/frameworks/frontend/astro.md`) — confirmed edge per-route NOT supported; serverless is the path

### Secondary (MEDIUM confidence)

- WebSearch: "astro vercel adapter edge function per-route" — corroborated that per-route edge was dropped; GitHub issue #8362 confirms not supported in Astro 3+

### Tertiary (LOW confidence)

- Foreign key cascade behavior in libSQL HTTP mode — not directly verified from official docs; treated as uncertain (see Open Questions #3)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from installed node_modules + package.json
- Architecture: HIGH — patterns derived from existing codebase code (schema.ts, API routes), well-established
- Edge function constraint: HIGH — verified from Vercel official docs + existing Phase 7 project decision
- Pitfalls: HIGH — most derived from existing codebase decisions and verified constraints
- FK cascade behavior: LOW — not verified for libSQL HTTP mode; flagged as open question

**Research date:** 2026-03-29
**Valid until:** 2026-04-29 (30 days — stack is stable)
