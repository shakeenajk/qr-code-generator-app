---
phase: 09-saved-qr-library-pro-gates
verified: 2026-03-17T08:00:00Z
status: human_needed
score: 14/14 automated must-haves verified
re_verification: false
human_verification:
  - test: "Pro user full save-to-library flow"
    expected: "Generate QR, click Save, name modal opens, on save success toast appears and dashboard shows new card with thumbnail, name, date"
    why_human: "Requires live Pro Clerk session and Turso round-trip; cannot be automated without real credentials"
  - test: "Authenticated non-Pro sees disabled save button and lock overlays"
    expected: "Greyed-out Save to Library button with lock icon visible; classy/classy-rounded dot tiles show lock overlay; logo section shows locked state UI"
    why_human: "Requires real non-Pro Clerk session (GATE-01, GATE-02 full verification)"
  - test: "Edit flow — Pro user opens saved QR from dashboard"
    expected: "Clicking Edit on dashboard card navigates to /?edit=[id]; edit banner shows name; state slices populate; Save Changes calls PUT and navigates back to /dashboard"
    why_human: "Requires real Pro Clerk session and live saved record"
  - test: "Delete flow — inline confirmation and state removal"
    expected: "Clicking Delete shows inline confirmation; clicking Yes, delete removes card from view and shows toast"
    why_human: "Requires real Pro Clerk session and live saved record"
---

# Phase 9: Saved QR Library + Pro Gates Verification Report

**Phase Goal:** Authenticated Pro users can save, edit, and delete named QR codes; free/anonymous users see appropriate gates; dashboard shows the live library.
**Verified:** 2026-03-17
**Status:** human_needed — all automated checks pass; 4 UX flows require human testing with real Clerk sessions
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Test stubs exist for all 5 spec files marked test.fixme (Plan 01 wave-0 delivery) | SUPERSEDED | Stubs were created then correctly activated in Plan 05 — now real tests |
| 2 | POST /api/qr/save returns 401 for unauthenticated requests | VERIFIED | `save.ts` line 10-12: `locals.auth()` check, returns 401; automated test in `save-api.spec.ts` (real assertion, not fixme) |
| 3 | POST /api/qr/save returns 403 for authenticated non-Pro users | VERIFIED (partial) | `save.ts` line 20-25: tier check returns 403 JSON `{error:'Pro required'}`; automated 401 test passing; non-Pro 403 test remains fixme by intentional design — requires real non-Pro Clerk session |
| 4 | GET /api/qr/list returns 401 for unauthenticated requests | VERIFIED | `list.ts` line 9-11: auth check, 401; real smoke test passing |
| 5 | PUT /api/qr/[id] returns 401 for unauthenticated requests | VERIFIED | `[id].ts` line 9-11: auth check, 401; real smoke test passing |
| 6 | DELETE /api/qr/[id] returns 401 for unauthenticated requests | VERIFIED | `[id].ts` line 75-77: auth check, 401; real smoke test passing |
| 7 | IDOR prevention: PUT/DELETE use compound WHERE (id + userId) | VERIFIED | `[id].ts` line 58: `and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId))`; line 90: same pattern for DELETE |
| 8 | savedQrCodes schema table exists in schema.ts with UUID PK | VERIFIED | `schema.ts` lines 22-33: `savedQrCodes` table with `crypto.randomUUID()` PK, all required columns present |
| 9 | Dashboard shows QRLibrary instead of Phase 7 placeholder | VERIFIED | `dashboard/index.astro` line 42: `<QRLibrary client:only="react" />`; no dashed-border placeholder div; "QR Library — replaces Phase 7 placeholder" comment at line 41 |
| 10 | QRLibrary fetches from GET /api/qr/list and renders cards | VERIFIED | `QRLibrary.tsx` lines 127-135: `fetch('/api/qr/list')` on mount with real data flow to `setQrCodes`; grid and list card rendering with thumbnail, name, date, content |
| 11 | Anonymous user sees no Save to Library button and no gate lock overlays | VERIFIED | `QRGeneratorIsland.tsx` lines 377-378: `isPro` and `isNonProSignedIn` both false when `userTier === null`; save button not rendered; ShapeSection/LogoSection unlock when `userTier === null`; automated smoke test GATE-03 passing |
| 12 | Pro gate overlays on classy/classy-rounded for signed-in non-Pro users | VERIFIED | `ShapeSection.tsx` line 171-175: `isProLocked` returns true for classy/classy-rounded when `userTier !== null && userTier !== 'pro'`; lock overlay rendered lines 221-229; automated smoke test GATE-02 passing (anonymous path) |
| 13 | Logo upload shows locked state for signed-in non-Pro users | VERIFIED | `LogoSection.tsx` line 21: `isLocked` logic; locked UI div rendered lines 53-69 with `data-testid="logo-locked"`; drop-zone only shown when `!isLocked` (line 72); automated smoke test GATE-01 passing (anonymous path) |
| 14 | Edit mode via /?edit=[id] fetches saved QR and populates state | VERIFIED | `QRGeneratorIsland.tsx` lines 146-217: `editId` from URL param, `fetch('/api/qr/${editId}')`, state hydration for all slices; amber edit banner lines 385-409 |

**Score:** 14/14 automated truths verified

---

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `tests/library/save-api.spec.ts` | VERIFIED | 19 lines; real 401 test + intentional fixme for non-Pro 403; WIRED to `/api/qr/save` via `request.post` |
| `tests/library/list-api.spec.ts` | VERIFIED | 8 lines; real 401 test; WIRED to `/api/qr/list` via `request.get` |
| `tests/library/update-api.spec.ts` | VERIFIED | 10 lines; real 401 test; WIRED to `/api/qr/fake-id` via `request.put` |
| `tests/library/delete-api.spec.ts` | VERIFIED | 8 lines; real 401 test; WIRED to `/api/qr/fake-id` via `request.delete` |
| `tests/gates/pro-gates.spec.ts` | VERIFIED | 47 lines; 3 real tests for GATE-01/02/03 anonymous path; WIRED to homepage DOM via page.goto + getByTestId |
| `src/db/schema.ts` | VERIFIED | `savedQrCodes` export present line 22; UUID PK via `crypto.randomUUID()`; all 10 required columns |
| `src/pages/api/qr/save.ts` | VERIFIED | 90 lines; `export const prerender = false`; real POST handler; tier check; IDOR-safe insert; belt-and-suspenders logoData + dotType re-check |
| `src/pages/api/qr/list.ts` | VERIFIED | 36 lines; `export const prerender = false`; explicit SELECT excluding `logoData`; LIMIT 50; `orderBy(desc(createdAt))` |
| `src/pages/api/qr/[id].ts` | VERIFIED | 103 lines; `export const prerender = false`; PUT + DELETE with compound ownership WHERE; 404 for wrong-user rows |
| `src/components/SaveQRModal.tsx` | VERIFIED | 112 lines; controlled name input; Escape handler; backdrop close; dark mode; disabled during save |
| `src/components/QRGeneratorIsland.tsx` | VERIFIED | 552 lines; Clerk nanostores auth; tier fetch; save handler with thumbnail; edit-mode fetch + state hydration; edit banner; save button in 3 states; `userTier` prop threading |
| `src/components/customize/ShapeSection.tsx` | VERIFIED | 279 lines; `userTier` prop; `isProLocked` helper; lock overlay on classy tiles; click interception via toast |
| `src/components/customize/LogoSection.tsx` | VERIFIED | 142 lines; `userTier` prop; `isLocked` helper; locked state UI with `data-testid="logo-locked"`; drop-zone with `data-testid="logo-dropzone"` |
| `src/components/dashboard/QRLibrary.tsx` | VERIFIED | 302 lines; fetch on mount; grid/list toggle with localStorage persistence; empty state; inline delete confirmation; Edit navigates to `/?edit=[id]` |
| `src/pages/dashboard/index.astro` | VERIFIED | `QRLibrary client:only="react"` mounted; `Toaster client:only="react"` at page level; no placeholder div |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `save-api.spec.ts` | `/api/qr/save` | `request.post('/api/qr/save', ...)` | WIRED | Line 5: real POST with body; `expect(response.status()).toBe(401)` |
| `pro-gates.spec.ts` | `QRGeneratorIsland.tsx` | `page.goto('/') + getByTestId` | WIRED | GATE-03: `getByTestId('save-to-library')` not visible; GATE-02: `getByTestId('dot-shape-classy')` visible; GATE-01: `getByTestId('logo-dropzone')` visible |
| `save.ts` | `schema.ts` | `db.insert(savedQrCodes)` | WIRED | Line 75: `db.insert(savedQrCodes).values({...})` |
| `[id].ts` | `schema.ts` | `and(eq(savedQrCodes.id, id), eq(savedQrCodes.userId, userId))` | WIRED | Line 58 (PUT) and line 90 (DELETE): compound WHERE confirmed |
| `QRGeneratorIsland.tsx` | `/api/subscription/status` | `fetch` on mount when signed in | WIRED | Line 159: `fetch('/api/subscription/status')` inside `useEffect([isLoaded, isSignedIn])` |
| `QRGeneratorIsland.tsx` | `/api/qr/save` | POST from save handler | WIRED | Line 260: `fetch('/api/qr/save', { method: 'POST', ... })` |
| `QRGeneratorIsland.tsx` | `/api/qr/[id]` | PUT from edit save handler | WIRED | Line 298: `fetch('/api/qr/${editId}', { method: 'PUT', ... })` |
| `ShapeSection.tsx` | `QRGeneratorIsland.tsx` | `userTier` prop | WIRED | `QRGeneratorIsland.tsx` line 487: `<ShapeSection ... userTier={userTier} />`; ShapeSection prop interface line 14 |
| `QRLibrary.tsx` | `/api/qr/list` | `fetch` on mount | WIRED | Line 128: `fetch('/api/qr/list')` in `useEffect([], [])` |
| `QRLibrary.tsx` | `/api/qr/[id]` | DELETE call in `handleDeleteConfirm` | WIRED | Line 156: `fetch('/api/qr/${id}', { method: 'DELETE' })` |
| `dashboard/index.astro` | `QRLibrary.tsx` | `client:only="react"` island mount | WIRED | Line 42: `<QRLibrary client:only="react" />` |

---

## Requirements Coverage

| Requirement | Description | Source Plans | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LIB-01 | Pro user can save a generated QR code with a custom name | 01, 02, 03, 05 | VERIFIED | `save.ts` POST endpoint; `SaveQRModal.tsx`; `QRGeneratorIsland.tsx` save handler + thumbnail generation; smoke test `save-api.spec.ts` (401 real, 403 fixme by design) |
| LIB-02 | Pro user can view all saved QR codes in a dashboard | 02, 04, 05 | VERIFIED | `GET /api/qr/list` with explicit SELECT, LIMIT 50; `QRLibrary.tsx` grid/list views with thumbnail/name/date; `dashboard/index.astro` wired |
| LIB-03 | Pro user can reopen and edit a saved QR code | 02, 03, 04, 05 | VERIFIED | `GET + PUT /api/qr/[id]`; edit-mode `useMemo` URL param; state hydration effect; edit banner with Save Changes + Cancel; `QRLibrary.tsx` Edit button navigates to `/?edit=[id]` |
| LIB-04 | Pro user can delete a saved QR code | 02, 04, 05 | VERIFIED | `DELETE /api/qr/[id]` with ownership check; `QRLibrary.tsx` `handleDeleteConfirm` with inline confirmation; toast on success; card removed from state |
| GATE-01 | Logo upload requires Pro (anonymous users remain ungated) | 02, 03, 05 | VERIFIED (partial human) | `LogoSection.tsx` `isLocked` logic; `data-testid="logo-locked"` and `data-testid="logo-dropzone"` in DOM; automated smoke test for anonymous path passing; non-Pro signed-in path requires human |
| GATE-02 | Advanced dot shapes require Pro (anonymous users remain ungated) | 02, 03, 05 | VERIFIED (partial human) | `ShapeSection.tsx` `isProLocked` helper; lock overlay + click interception via toast; `data-testid="dot-shape-classy"` visible + no Pro-feature aria-label for anonymous; automated smoke test passing; non-Pro signed-in path requires human |
| GATE-03 | Anonymous users can use all static QR features without an account | 03, 05 | VERIFIED | `userTier === null` = unlocked throughout; save button not rendered; automated smoke test: `save-to-library` and `save-to-library-locked` both not visible for anonymous |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `SaveQRModal.tsx` | 34 | `return null` | Info | Expected — modal returns null when closed; not a stub |
| `QRGeneratorIsland.tsx` | 233, 241 | `return null` | Info | Expected — `generateThumbnail()` returns null on error; not a stub; caller handles gracefully |
| `save-api.spec.ts` | 16-18 | `test.fixme` (non-Pro 403) | Info | Intentional per plan 09-05 design: requires live Clerk non-Pro session; explicit comment documents reason |

No blocker anti-patterns. No TODO/FIXME/placeholder stubs in production code.

---

## Clerk Import Deviation (Documented)

Plan 09-03 specified `useUser` from `@clerk/shared/react`, but the actual implementation uses `$userStore` / `$isLoadedStore` from `@clerk/astro/client` (Astro's nanostore pattern). This was an auto-fix applied in commit `6925139` during Plan 09-05 because `useUser` from `@clerk/shared/react` caused the island to crash in the test environment due to missing `ClerkProvider` context. The nanostore pattern is the correct Astro integration approach (consistent with Phase 7's established pattern). This is a correct implementation choice, not a gap.

---

## Human Verification Required

### 1. Pro User Save-to-Library Flow

**Test:** Sign in as a Pro user, visit the homepage, generate a QR code (enter a URL), click the active "Save to Library" button.
**Expected:** Name modal opens with URL pre-filled as default name. Edit to "My Test QR", click Save. Toast "Saved to library" appears. Navigate to /dashboard — card appears with name, thumbnail image, date, and truncated URL.
**Why human:** Requires live Pro Clerk session + Turso database round-trip. Cannot automate without real credentials.

### 2. Authenticated Non-Pro Gate Verification

**Test:** Sign in with a free/starter Clerk account, visit the homepage.
**Expected:** A greyed-out "Save to Library" button with a lock icon is visible; clicking it shows an upgrade toast. Scrolling to dot shapes shows classy and classy-rounded tiles with a semi-transparent lock overlay; clicking a locked tile shows "Upgrade to Pro" toast (not shape selection). Logo section shows locked state: Lock icon + "Pro feature" text + "Upgrade to Pro" link (no drop-zone).
**Why human:** Requires live non-Pro Clerk session to trigger `userTier = 'free'` path. The automated test for non-Pro 403 is intentionally kept as `test.fixme` (no session in CI).

### 3. Edit Flow End-to-End

**Test:** From the dashboard, click Edit on a saved QR card. Verify navigation to `/?edit=[id]`. Confirm amber edit banner shows "Editing: [QR Name]". Change the URL content. Click "Save Changes". Confirm toast "Changes saved" appears and browser navigates to /dashboard after ~1 second. Verify the updated card reflects the change.
**Why human:** Requires live Pro Clerk session and a pre-existing saved record. Edit flow involves multiple client-side fetches that cannot be intercepted cleanly in Playwright without real auth.

### 4. Delete Flow End-to-End

**Test:** From the dashboard, click Delete on a saved QR card. Confirm inline confirmation ("Are you sure?" + "Yes, delete" + "Cancel") replaces the Edit/Delete buttons on that card only. Click "Yes, delete". Confirm toast "QR code deleted" appears and the card disappears from the library.
**Why human:** Requires live Pro Clerk session and a pre-existing saved record.

---

## Gaps Summary

No automated gaps. All 14 testable truths are verified via code inspection and Playwright smoke tests. The four human verification items are UX flows requiring live Clerk authentication that cannot be automated in the test environment. The smoke suite reports 172 passed / 44 skipped (fixme by design) / 0 failed as documented in the 09-05 SUMMARY.

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
