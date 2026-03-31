# Phase 9: Saved QR Library + Pro Gates — Research

**Researched:** 2026-03-16
**Domain:** Drizzle ORM / Turso schema migration · Astro API routes · React state serialization · client-side auth gates · toast UX
**Confidence:** HIGH (findings grounded in live codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Gate conflict resolved:** logo upload AND advanced dot shapes ARE gated for authenticated non-Pro users. Phase 8 CONTEXT note ("logo stays free forever") is superseded.
- **Logo upload:** requires Pro or higher tier for signed-in users; anonymous users stay ungated.
- **Advanced dot shapes:** `classy` and `classy-rounded` only are Pro-gated. `square`, `dots`, `rounded`, `extra-rounded` stay free for everyone.
- **Corner frames/pupils:** NOT gated — free for all users.
- **API enforcement:** authenticated non-Pro user sending save request with classy shape or logo attached → API returns 403 with clear error message; client shows inline upgrade prompt.
- **Anonymous users:** can use every static generation feature including logo upload and all dot shapes — ungated permanently.
- **Save UX:** "Save to Library" button near export buttons; opens small modal with name input pre-filled from QR content; on success → toast + stay on generator; no navigation.
- **Signed-in non-Pro:** Save button visible but disabled (greyed out), Pro lock icon + tooltip, click opens upgrade prompt.
- **Anonymous:** Save button not shown.
- **Library display:** `/dashboard` My QR Codes section — grid by default, toggle to list; per-card: QR thumbnail, name, date, truncated content preview; actions: Edit + Delete (with confirmation).
- **Empty state:** illustration + "No QR codes yet" + "Go to Generator" CTA; replaces Phase 7 dashed-border placeholder wholesale.
- **Edit flow:** clicking Edit navigates to `/` with all settings pre-populated; state via URL params or sessionStorage (Claude's discretion); edit-mode banner at top — "Editing: [QR Name]" with "Save Changes" (updates DB record in-place) and "Cancel" (return to dashboard, discard).
- **"Save Changes"** updates the existing DB record (same ID, updated settings + `updated_at`) — does NOT create a new entry.
- **Standard "Save to Library"** button while in edit mode creates a NEW record (distinct from Save Changes).

### Claude's Discretion

- Exact mechanism for passing saved QR state to the generator for edit mode (URL params vs sessionStorage vs query string)
- Database schema for `saved_qr_codes` table (fields: id, user_id, name, content_type, content_data, style_data JSON, thumbnail_data, created_at, updated_at)
- Thumbnail generation approach (render QR to PNG data URL at save time and store, or regenerate on display)
- Exact Tailwind styling for Save modal, Edit banner, library cards, grid/list toggle
- Pagination vs infinite scroll for the library (if user has many saved QRs)
- Confirmation UX for delete (inline confirm vs modal)

### Deferred Ideas (OUT OF SCOPE)

- QR count limits enforcement — not in Phase 9 scope; gates are feature-based not quantity-based
- Folder/tag organization of saved QRs — v2 (ORG-V2-01)
- Download PNG directly from library card — Phase 9 has Edit + Delete only
- "Save as copy" explicit button in edit mode — v2
- Inline rename of QR name from dashboard — deferred; rename happens by opening edit mode
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LIB-01 | Pro user can save a generated QR code to their library with a custom name | `savedQrCodes` schema addition + `POST /api/qr/save` route + Save modal in QRGeneratorIsland |
| LIB-02 | Pro user can view all saved QR codes in a dashboard | `GET /api/qr/list` + `QRLibrary` React component replacing dashboard empty state |
| LIB-03 | Pro user can reopen and edit a saved QR code | Edit button → navigate to `/` with state; QRGeneratorIsland reads `?edit=[id]` param + shows edit banner; `PUT /api/qr/[id]` for save-changes |
| LIB-04 | Pro user can delete a saved QR code from their library | `DELETE /api/qr/[id]` + per-card Delete action with confirmation UI |
| GATE-01 | Logo upload in QR generator requires Pro for authenticated users; anonymous ungated | `LogoSection.tsx` receives `userTier` prop; renders locked state for authenticated free/starter; anonymous path renders existing drop-zone unchanged |
| GATE-02 | Advanced dot shapes require Pro for authenticated users; anonymous ungated | `ShapeSection.tsx` receives `userTier` prop; classy + classy-rounded tiles get Pro lock overlay; API enforces on save |
| GATE-03 | Anonymous users can use all static QR generation features without account | Confirmed: homepage `index.astro` is fully static (no `prerender = false`); no Clerk hooks on anonymous path; gates only activate when user is signed in |
</phase_requirements>

---

## Summary

Phase 9 builds on the complete Phase 7–8 foundation: Clerk auth, Turso/Drizzle database, and dashboard shell are all in place. The work falls into three distinct tracks: (1) database — add one new table, run a migration; (2) CRUD API routes — four endpoints following the exact pattern already established by `subscription/status.ts` and `checkout/create.ts`; (3) UI — modify `QRGeneratorIsland.tsx` to support auth-aware props (gate display, save button, edit-mode banner) and build a `QRLibrary` React component for the dashboard.

The biggest architectural decision is how `QRGeneratorIsland` receives auth context. The homepage is a fully-static page (`output: 'static'`, no SSR). Props cannot be passed server-side; the component must fetch its own auth state on the client. The existing `useUser`/`useClerk` pattern (imported from `@clerk/shared/react`) is the correct approach and is already established in Phase 7 components.

The "anonymous path stays ungated" constraint maps cleanly to this architecture: when Clerk reports no user, gate-awareness props default to "anonymous mode" — zero UI locks, no save button shown. Pro-gated features only render locked state when `isSignedIn === true && tier !== 'pro'`.

**Primary recommendation:** Keep QRGeneratorIsland a single component with optional `userTier` and `editId` props; fetch tier inside the island via a lightweight `/api/subscription/status` call on mount (already exists). This avoids prop-drilling from a static page and respects the `client:visible` hydration boundary already in place.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 (already installed) | ORM — table definition + migrations | Project standard; already used for `subscriptions` table |
| drizzle-kit | 0.31.9 (already installed) | Migration CLI (`drizzle-kit push`) | Matches drizzle.config.ts dialect: turso |
| @clerk/shared/react | (transitive via @clerk/astro ^3.0.4) | `useUser`, `useAuth` hooks in React islands | Established in Phase 7; `@clerk/astro/react` does NOT export these hooks |
| Astro API routes | (Astro ^5.17.1) | `POST/GET/PUT/DELETE /api/qr/*` | All existing API routes follow this pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | ^2.x (to install) | Toast notifications | Phase 9 establishes the project toast pattern; project has zero toasts today — `showToast` in SubscriptionPolling.tsx is vanilla DOM manipulation, not reusable |
| lucide-astro | ^0.556.0 (already installed) | Lock icon, grid/list toggle icons | Already used throughout; use Lucide for all new icons |

**Note on toast library:** The CONTEXT.md names `react-hot-toast` or `sonner` as candidates. `sonner` is recommended — it is a React component, works cleanly with `client:only="react"` islands, supports dark mode via `theme="system"`, and has zero config. `react-hot-toast` v2 has known React 19 compatibility issues (peer dep warnings). Sonner supports React 19 natively.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sonner toast | vanilla DOM (existing showToast pattern) | Vanilla approach works but is not reusable across islands; extracting it to a shared utility adds complexity for marginal gain |
| URL params for edit state | sessionStorage | URL params are bookmarkable and survive page refresh; sessionStorage does not survive new tab; URL params preferred |
| Fetch tier inside island | Pass tier as prop from static page | Static page has no server context; cannot access Clerk session to compute tier; client fetch is the only option |

**Installation:**
```bash
npm install sonner
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   ├── api/
│   │   └── qr/
│   │       ├── save.ts          # POST — create saved QR (LIB-01)
│   │       ├── list.ts          # GET  — list user's saved QRs (LIB-02)
│   │       └── [id].ts          # PUT + DELETE (LIB-03, LIB-04)
│   └── dashboard/
│       └── index.astro          # Replace empty state with <QRLibrary>
├── components/
│   ├── QRGeneratorIsland.tsx    # Add save button, edit-mode banner, gate awareness
│   ├── SaveQRModal.tsx          # New: name input modal (client:only="react")
│   ├── dashboard/
│   │   └── QRLibrary.tsx        # New: grid/list + card + empty state (client:only="react")
│   └── customize/
│       ├── ShapeSection.tsx     # Add Pro lock overlay on classy/classy-rounded
│       └── LogoSection.tsx      # Add Pro lock state for authenticated non-Pro
└── db/
    └── schema.ts                # Add savedQrCodes table
```

### Pattern 1: Database Schema — savedQrCodes Table

**What:** Add one new table to `src/db/schema.ts` following existing integer-timestamp and text conventions.
**When to use:** One migration at the start of the phase (Wave 0 / first task).

```typescript
// Source: existing src/db/schema.ts conventions
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const savedQrCodes = sqliteTable('saved_qr_codes', {
  id:           text('id').primaryKey(),            // nanoid or crypto.randomUUID()
  userId:       text('user_id').notNull(),
  name:         text('name').notNull(),
  contentType:  text('content_type').notNull(),     // 'url' | 'text' | 'wifi' | 'vcard'
  contentData:  text('content_data').notNull(),     // raw string (encoded wifi/vcard)
  styleData:    text('style_data').notNull(),       // JSON: colorOptions + shapeOptions
  logoData:     text('logo_data'),                  // base64 PNG data URL or null
  thumbnailData:text('thumbnail_data'),             // base64 PNG data URL or null
  createdAt:    integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt:    integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
});
```

**ID choice:** Use `crypto.randomUUID()` (built-in Web API, no dependency). Do NOT use auto-increment integer — the ID appears in the URL `?edit=[id]` and should not be guessable/sequential.

**styleData JSON shape:** Serialize the full `colorOptions` + `shapeOptions` state objects from `QRGeneratorIsland.tsx`. These are already plain-object types (`ColorSectionState`, `ShapeSectionState`), so `JSON.stringify` + `JSON.parse` is safe with no custom serialization.

**logoData vs thumbnailData separation:** Store the original uploaded logo (base64 data URL) separately from the rendered thumbnail. The thumbnail is generated at save time via `qrCodeRef.current.getRawData('png')` — same approach as the existing Copy button in `ExportButtons.tsx`. Logo data is restored to `LogoSection` state on edit load; thumbnail is displayed in the library card.

**Migration command:**
```bash
npx drizzle-kit push
```
This is the same command already established for Phase 8 schema migrations.

### Pattern 2: API Route Structure

**What:** Four API routes under `src/pages/api/qr/` following established project conventions.
**Key constraints from project decisions:**
- All routes need `export const prerender = false`
- Auth via `locals.auth()` from Clerk middleware
- DB access via `import { db } from '../../../db/index'` (drizzle-orm/libsql/web)
- Tier check via `db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) })`

```typescript
// POST /api/qr/save — LIB-01 + GATE-01 + GATE-02 enforcement
// Source: pattern from src/pages/api/checkout/create.ts
export const prerender = false;
import type { APIRoute } from 'astro';
import { db } from '../../../db/index';
import { savedQrCodes, subscriptions } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async ({ request, locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  // Tier check
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) });
  const tier = sub?.tier ?? 'free';
  if (tier !== 'pro') return new Response(JSON.stringify({ error: 'Pro required' }), { status: 403, headers: { 'Content-Type': 'application/json' } });

  const body = await request.json();
  // GATE enforcement: if classy/classy-rounded shape or logoData present and tier !== 'pro' → already caught above
  // ...insert into savedQrCodes...
};
```

```typescript
// GET /api/qr/list — LIB-02
export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const rows = await db.select().from(savedQrCodes).where(eq(savedQrCodes.userId, userId)).orderBy(desc(savedQrCodes.createdAt));
  return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
```

```typescript
// src/pages/api/qr/[id].ts — PUT (LIB-03) + DELETE (LIB-04)
// Dynamic segment: context.params.id
```

### Pattern 3: Auth-Aware Generator Island

**What:** `QRGeneratorIsland.tsx` fetches user tier on mount and conditionally renders gate UI and save button.
**Key constraint:** Homepage is `output: 'static'` — no SSR; tier must be fetched client-side.

```typescript
// Inside QRGeneratorIsland.tsx — fetch tier on mount
import { useUser } from '@clerk/shared/react';  // established Phase 7 pattern

// In component body:
const { isSignedIn, isLoaded } = useUser();
const [userTier, setUserTier] = useState<'free' | 'starter' | 'pro' | null>(null);

useEffect(() => {
  if (!isLoaded) return;
  if (!isSignedIn) { setUserTier(null); return; } // anonymous — no gates
  fetch('/api/subscription/status')
    .then(r => r.json())
    .then(d => setUserTier(d.tier))
    .catch(() => setUserTier('free'));
}, [isLoaded, isSignedIn]);
```

**Edit mode detection:** Read `?edit=[id]` from URL on mount.
```typescript
const editId = useMemo(() => new URLSearchParams(window.location.search).get('edit'), []);
```
On mount, if `editId` is set, fetch `GET /api/qr/[editId]` and hydrate all state slices.

### Pattern 4: Pro Lock Overlay on Shape Tiles

**What:** `ShapeSection.tsx` receives `userTier` prop and renders a padlock overlay on classy/classy-rounded.
**Locked behavior:** Button not disabled (still clickable), but click triggers an upgrade prompt instead of selecting the shape. This matches the project's established gate pattern.

```typescript
// In ShapeSection.tsx DOT_SHAPES map:
const isProLocked = (type: DotType) =>
  (type === 'classy' || type === 'classy-rounded') &&
  userTier !== null &&      // signed in
  userTier !== 'pro';       // not pro

// Render: add relative wrapper + padlock SVG overlay when isProLocked(type)
```

### Pattern 5: Toast with Sonner

**What:** Establish reusable toast for "Saved to library" and future use.
**Integration:** Mount `<Toaster>` once inside `QRGeneratorIsland` (or as a sibling island). Call `toast('Saved to library')` after successful save.

```typescript
// Source: sonner official docs
import { Toaster, toast } from 'sonner';

// In component JSX (once, near root):
<Toaster theme="system" position="bottom-right" />

// On successful save:
toast('Saved to library');

// On error:
toast.error('Failed to save — please try again');
```

### Anti-Patterns to Avoid

- **Do NOT add `prerender = false` to index.astro.** The homepage must remain fully static for CDN caching and to preserve anonymous user performance. Tier is fetched client-side post-hydration only.
- **Do NOT store logo as blob in Turso.** Turso has a 10MB row size limit. Base64 data URLs for typical logos (PNG < 200KB) are fine; warn if file exceeds ~150KB before saving.
- **Do NOT use integer IDs for saved_qr_codes.** The ID is exposed in the URL (`?edit=[id]`); sequential integers are guessable. Use `crypto.randomUUID()`.
- **Do NOT use `eq(savedQrCodes.userId, userId) &&` without it** — always filter by userId on every read/write operation. Never trust the client-sent ID alone (IDOR vulnerability).
- **Do NOT try to pass Astro `tier` prop into a static island.** Static pages build at compile time; Clerk session is runtime-only. Use client-side fetch instead.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom DOM-injection like existing `showToast` in SubscriptionPolling.tsx | `sonner` | showToast is not reusable, no dismiss, no error styling, no dark mode |
| QR thumbnail generation | Custom canvas rendering code | `qrCodeRef.current.getRawData('png')` | Already exists in ExportButtons.tsx; same API |
| Auth state in React | Custom fetch + localStorage cache | `useUser()` from `@clerk/shared/react` | Clerk SDK handles session refresh, loading states, hydration edge cases |
| UUID generation | Custom random string | `crypto.randomUUID()` | Built-in Web API, no dependency, universally available in modern browsers + Node |
| Tier check in API routes | Re-implementing tier logic | Reuse `sub?.tier ?? 'free'` pattern from `status.ts` | Centralized; billing.ts has `tierFromPriceId` for price→tier; DB row has `tier` column directly |

---

## Common Pitfalls

### Pitfall 1: IDOR on QR CRUD Routes
**What goes wrong:** `PUT /api/qr/[id]` or `DELETE /api/qr/[id]` trusts client-provided ID without verifying ownership — user A can delete user B's QR.
**Why it happens:** Easy to forget ownership check when the ID is the primary lookup.
**How to avoid:** Every mutating query MUST include `AND user_id = userId` in the WHERE clause. Use Drizzle's `and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId))`. If the row is not found (0 rows affected), return 404 — do NOT return 403 (that confirms the record exists).
**Warning signs:** API route queries `savedQrCodes` by `id` alone without `userId` filter.

### Pitfall 2: Stale Tier in Generator Island
**What goes wrong:** User upgrades to Pro in another tab; generator island still shows locked gates because it fetched tier once on mount.
**Why it happens:** Single fetch on mount, no re-fetch trigger.
**How to avoid:** This is acceptable for Phase 9. Document the behavior as "refresh page to see updated tier." The `SubscriptionPolling` component on `/dashboard` already handles post-upgrade state sync. A full refetch on tab focus (using `visibilitychange` event) is a v2 polish item.
**Warning signs:** User reports gates still locked after upgrade — expected; tell them to refresh.

### Pitfall 3: Logo Data URL Size
**What goes wrong:** User uploads a large PNG logo (1MB+); `logoData` stored in Turso becomes a huge text blob; `GET /api/qr/list` returns MB of base64 on every dashboard load.
**Why it happens:** Logo is stored as raw base64 data URL; list endpoint returns all columns.
**How to avoid:** (a) Validate file size client-side before save (reject > 150KB with friendly error); (b) `GET /api/qr/list` should NOT return `logo_data` — only return `thumbnail_data` and metadata. Return `logo_data` only on `GET /api/qr/[id]` (single-record edit load).
**Warning signs:** Dashboard page load is slow or response payload is huge.

### Pitfall 4: Edit State Not Fully Round-Tripped
**What goes wrong:** User saves a QR with gradient colors; reopens edit — gradient fields are missing because `styleData` was serialized without the full `ColorSectionState` shape.
**Why it happens:** Partial serialization of state (e.g. only saving `dotColor`, not `gradientEnabled`, `gradientStop1`, `gradientStop2`).
**How to avoid:** Save the COMPLETE state object — all fields of `ColorSectionState`, `ShapeSectionState`. Define a typed `SavedQRStyle` interface and validate the shape on both save and restore. Use `JSON.parse` + type assertion with a fallback to defaults if any field is missing.
**Warning signs:** Edit mode restores some settings but not others; gradient reverts to solid.

### Pitfall 5: Anonymous Gate Check in Static Context
**What goes wrong:** Gate logic runs before Clerk hydration completes — `isLoaded === false` — and the UI flashes a locked state before showing the open state for anonymous users.
**Why it happens:** `useUser()` returns `isLoaded: false` briefly on mount before Clerk resolves the session.
**How to avoid:** While `!isLoaded`, render all gate UI as unlocked (same as anonymous). Only show lock UI when `isLoaded && isSignedIn && tier !== 'pro'`. The default render state must never show a gate.
**Warning signs:** Locked padlock visible for 200–400ms on homepage for anonymous users before disappearing.

### Pitfall 6: drizzle-kit push vs migrate for Turso
**What goes wrong:** Running `drizzle-kit generate` + `drizzle-kit migrate` instead of `drizzle-kit push` for Turso.
**Why it happens:** Drizzle docs show both patterns; `push` is the Turso-recommended approach for development.
**How to avoid:** Use `npx drizzle-kit push` — matches `drizzle.config.ts` (dialect: turso). This directly applies schema changes to the live Turso database without generating migration files.
**Warning signs:** Migration files appear in a `drizzle/` directory; Turso errors about unknown migration table.

---

## Code Examples

Verified patterns from the live codebase:

### Auth Check in API Route (established pattern)
```typescript
// Source: src/pages/api/subscription/status.ts
export const prerender = false;
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ locals }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  // ...
};
```

### DB Query with Drizzle (established pattern)
```typescript
// Source: src/pages/api/subscription/status.ts
import { db } from '../../../db/index';
import { subscriptions } from '../../../db/schema';
import { eq } from 'drizzle-orm';

const sub = await db.query.subscriptions.findFirst({
  where: eq(subscriptions.userId, userId),
});
const tier = sub?.tier ?? 'free';
```

### useUser Hook in React Island (established pattern)
```typescript
// Source: Phase 7 established pattern — import from @clerk/shared/react
// NOT from @clerk/astro/react (that package does not export hooks)
import { useUser } from '@clerk/shared/react';
const { isSignedIn, isLoaded } = useUser();
```

### QR Thumbnail Generation (from ExportButtons.tsx)
```typescript
// Source: src/components/ExportButtons.tsx — getRawData already used for clipboard
const blob = await qrCodeRef.current?.getRawData('png');
// Convert to base64 data URL for storage:
const reader = new FileReader();
reader.onload = (e) => {
  const thumbnailData = e.target?.result as string; // data:image/png;base64,...
};
reader.readAsDataURL(blob as Blob);
```

### Drizzle Insert with UUID (new pattern for Phase 9)
```typescript
const id = crypto.randomUUID();
await db.insert(savedQrCodes).values({
  id,
  userId,
  name: body.name,
  contentType: body.contentType,
  contentData: body.contentData,
  styleData: JSON.stringify(body.styleData),
  logoData: body.logoData ?? null,
  thumbnailData: body.thumbnailData ?? null,
});
```

### Drizzle Update with Ownership Check (IDOR prevention)
```typescript
import { and, eq } from 'drizzle-orm';
const result = await db.update(savedQrCodes)
  .set({ name: body.name, styleData: JSON.stringify(body.styleData), updatedAt: Math.floor(Date.now() / 1000) })
  .where(and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId)));
// result.rowsAffected === 0 → 404
```

### Edit Mode URL Param (Claude's discretion — URL params recommended)
```typescript
// Read on mount (client-side only — QRGeneratorIsland is client:visible)
const editId = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('edit')
  : null;
// Navigate to edit:
window.location.href = `/?edit=${savedQr.id}`;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `drizzle-kit migrate` | `drizzle-kit push` (for Turso) | Turso dialect introduced | No migration files needed; push applies directly |
| `@clerk/astro/react` hooks | `@clerk/shared/react` hooks | Phase 7 decision | @clerk/astro/react does not export useUser/useClerk |
| Vanilla DOM toast | `sonner` | Phase 9 establishes | Reusable; supports dark mode; React 19 compatible |
| Static prop passing to islands | Client-side fetch from API | Inherent to static homepage | Only viable approach when page is output: 'static' |

**Deprecated/outdated:**
- `drizzle-orm/libsql` (default): Node-only; replaced by `drizzle-orm/libsql/web` — already correct in `src/db/index.ts`
- `@clerk/astro/react` for hooks: does not export `useUser`; use `@clerk/shared/react` instead — established in Phase 7

---

## Open Questions

1. **Logo data URL size enforcement**
   - What we know: Turso has a 10MB row limit; typical logo images as base64 are 30–400KB.
   - What's unclear: The exact validation threshold to warn users (100KB? 200KB?).
   - Recommendation: Reject files > 150KB client-side with a "Logo too large for saving (max 150KB)" message. This is consistent with the existing file type check in `LogoSection.tsx`.

2. **Pagination vs infinite scroll for library**
   - What we know: Phase 9 has no QR count limit, so users could accumulate many saves.
   - What's unclear: Expected P90 count. Users with < 20 saved QRs don't need pagination.
   - Recommendation: Render all records (no pagination) for Phase 9. Add a hard cap of 50 rows in `GET /api/qr/list` (`LIMIT 50`) to prevent abuse. Pagination is a v2 concern.

3. **`?edit=[id]` param interaction with homepage scroll behavior**
   - What we know: `index.astro` uses `client:visible` on `QRGeneratorIsland` — the island hydrates on scroll into view.
   - What's unclear: Will the URL param still be readable if the user navigates from dashboard via `<a href="/?edit=...">` and the island hasn't hydrated yet?
   - Recommendation: `client:visible` is safe — the URL params persist in `window.location.search` until the page is navigated away. The `editId` memo reads `window.location.search` inside the component body which only runs post-hydration. No issue.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npm run test:smoke` (runs `--grep @smoke`) |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LIB-01 | `POST /api/qr/save` returns 401 for unauthenticated | smoke API | `npm run test:smoke -- --grep "Save API"` | ❌ Wave 0 |
| LIB-01 | `POST /api/qr/save` returns 403 for authenticated non-Pro | smoke API | `npm run test:smoke -- --grep "Save API"` | ❌ Wave 0 |
| LIB-02 | `GET /api/qr/list` returns 401 for unauthenticated | smoke API | `npm run test:smoke -- --grep "QR List API"` | ❌ Wave 0 |
| LIB-03 | `PUT /api/qr/[id]` returns 401 for unauthenticated | smoke API | `npm run test:smoke -- --grep "QR Update API"` | ❌ Wave 0 |
| LIB-04 | `DELETE /api/qr/[id]` returns 401 for unauthenticated | smoke API | `npm run test:smoke -- --grep "QR Delete API"` | ❌ Wave 0 |
| GATE-01 | Logo section renders drop-zone (not lock) on homepage for anonymous | smoke UI | `npm run test:smoke -- --grep "Pro gates"` | ❌ Wave 0 |
| GATE-02 | Classy dot shape button is accessible + clickable for anonymous user | smoke UI | `npm run test:smoke -- --grep "Pro gates"` | ❌ Wave 0 |
| GATE-03 | Anonymous user sees no "Save to Library" button | smoke UI | `npm run test:smoke -- --grep "Pro gates"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:smoke`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/library/save-api.spec.ts` — covers LIB-01 (unauthenticated + non-Pro 403 cases)
- [ ] `tests/library/list-api.spec.ts` — covers LIB-02 (unauthenticated)
- [ ] `tests/library/update-api.spec.ts` — covers LIB-03 (unauthenticated)
- [ ] `tests/library/delete-api.spec.ts` — covers LIB-04 (unauthenticated)
- [ ] `tests/gates/pro-gates.spec.ts` — covers GATE-01, GATE-02, GATE-03 (anonymous user anonymous path smoke)

---

## Sources

### Primary (HIGH confidence)
- Live codebase inspection: `src/db/schema.ts`, `src/db/index.ts`, `src/lib/billing.ts`, `src/pages/api/subscription/status.ts`, `src/pages/api/checkout/create.ts`, `src/middleware.ts`
- Live codebase inspection: `src/components/QRGeneratorIsland.tsx`, `src/components/ExportButtons.tsx`, `src/components/customize/ShapeSection.tsx`, `src/components/customize/LogoSection.tsx`
- Live codebase inspection: `src/components/billing/SubscriptionPolling.tsx`, `src/components/billing/UpgradeCTAPanel.astro`
- Live codebase inspection: `src/pages/dashboard/index.astro`, `src/components/dashboard/DashboardLayout.astro`
- Live codebase inspection: `package.json`, `drizzle.config.ts`, `playwright.config.ts`
- Phase 7/8 decisions in `.planning/STATE.md`: import path for Clerk hooks, drizzle/libsql/web import, edgeMiddleware incompatibility

### Secondary (MEDIUM confidence)
- Drizzle ORM docs (Turso dialect) — `drizzle-kit push` as the correct migration command for Turso
- Sonner README — React 19 support confirmed, `theme="system"` for dark mode

### Tertiary (LOW confidence)
- React hot-toast v2 + React 19 compatibility concern — based on known npm peer dep warnings; not verified against latest hot-toast release

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; only sonner is new
- Architecture: HIGH — all patterns verified from live codebase; no speculation
- Pitfalls: HIGH — IDOR and stale-tier patterns are well-known; logo size concern is grounded in Turso limits
- Test map: HIGH — Playwright config verified; test file gaps identified by inspection

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack; Clerk/Drizzle APIs are stable)
