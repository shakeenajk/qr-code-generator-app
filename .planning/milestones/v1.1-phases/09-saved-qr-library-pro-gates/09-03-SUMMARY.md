---
phase: 09-saved-qr-library-pro-gates
plan: "03"
subsystem: ui
tags: [react, clerk, sonner, pro-gates, qr-library, toast, lucide-react]

# Dependency graph
requires:
  - phase: 09-02
    provides: CRUD API routes (POST /api/qr/save, GET /api/qr/[id], PUT /api/qr/[id]) and savedQrCodes schema
  - phase: 07
    provides: Clerk auth pattern — useUser from @clerk/shared/react
  - phase: 08
    provides: /api/subscription/status endpoint for tier resolution
provides:
  - SaveQRModal.tsx — name input modal wired into QRGeneratorIsland save flow
  - QRGeneratorIsland.tsx with auth-awareness, tier-fetched save button, and edit-mode banner
  - ShapeSection.tsx with Pro lock overlay on classy/classy-rounded for signed-in non-Pro users
  - LogoSection.tsx with Pro lock state UI for signed-in non-Pro users
affects:
  - 09-04 (dashboard library UI — depends on save working end-to-end)
  - 09-05 (pro-gates smoke tests — gate stubs become real assertions in this plan)

# Tech tracking
tech-stack:
  added:
    - sonner ^2.0.7 (toast notifications)
  patterns:
    - userTier null = anonymous/loading = always unlocked (no flash of locked state for anonymous users)
    - isProLocked returns false when userTier === null — locks only when explicitly non-pro signed-in user
    - Tier fetched client-side post-hydration via /api/subscription/status — homepage stays static
    - editId read from ?edit= URL param client-side with useMemo — no SSR dependency
    - Thumbnail generated via qrCodeRef.current?.getRawData('png') → FileReader → base64 data URL

key-files:
  created:
    - src/components/SaveQRModal.tsx
  modified:
    - src/components/QRGeneratorIsland.tsx
    - src/components/customize/ShapeSection.tsx
    - src/components/customize/LogoSection.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "userTier null = unlocked — anonymous users and Clerk-loading state never see lock overlays"
  - "isProLocked intercepts click to show sonner toast with /pricing action instead of disabling button element (accessibility)"
  - "LogoSection renders locked state UI wholesale (replaces drop-zone) for non-Pro signed-in; anonymous always gets drop-zone"
  - "Edit mode banner uses amber/yellow color to clearly distinguish editing state from create state"
  - "handleEditSave auto-navigates to /dashboard after 1s delay on success (no separate UI step)"

patterns-established:
  - "Pro gate pattern: userTier !== null && userTier !== 'pro' for lock detection (null = no lock)"
  - "Save flow: generate thumbnail → POST with contentData + styleData + logoData + thumbnailData"
  - "Edit flow: detect ?edit= param → fetch GET /api/qr/[id] → hydrate all state slices → show banner"

requirements-completed:
  - LIB-01
  - LIB-03
  - GATE-01
  - GATE-02
  - GATE-03

# Metrics
duration: 12min
completed: 2026-03-17
---

# Phase 9 Plan 03: Auth-aware QR Island + Pro Gate Overlays Summary

**SaveQRModal + auth-aware QRGeneratorIsland with sonner toasts, tier-fetched save/edit flow, and Pro lock overlays on classy shapes and logo upload**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-17T02:34:28Z
- **Completed:** 2026-03-17T02:46:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created SaveQRModal.tsx with controlled name input (1-60 chars), Escape handler, backdrop close, and dark mode
- Wired full auth-awareness into QRGeneratorIsland: Clerk useUser, tier fetch, save handler with thumbnail, edit-mode fetch with state hydration, and edit-mode banner
- Added sonner Toaster for toast notifications (save success, errors, Pro upgrade prompts)
- ShapeSection receives userTier prop and shows semi-transparent Lock overlay on classy/classy-rounded for signed-in non-Pro users; anonymous always unlocked
- LogoSection receives userTier prop and shows locked state UI (Lock icon + upgrade link) for signed-in non-Pro users; anonymous always sees drop-zone

## Task Commits

Each task was committed atomically:

1. **Task 1: Install sonner, add SaveQRModal, wire save button into QRGeneratorIsland** - `8ae26ab` (feat)
2. **Task 2: Add Pro gate overlays to ShapeSection and LogoSection** - `12b779c` (feat)

**Plan metadata:** (pending — created in final commit)

## Files Created/Modified

- `src/components/SaveQRModal.tsx` — Modal with name input for save flow; Escape/backdrop handlers; dark mode variants
- `src/components/QRGeneratorIsland.tsx` — Auth-aware island: Clerk hooks, tier fetch, edit-mode, save/edit handlers, save button conditional rendering, edit banner, Toaster mount, userTier prop threading
- `src/components/customize/ShapeSection.tsx` — Added userTier prop; isProLocked helper; semi-transparent lock overlay on classy tiles; click interception shows sonner toast
- `src/components/customize/LogoSection.tsx` — Added userTier prop; isLocked detection; locked state UI with Lock icon + /pricing link; existing drop-zone unchanged for anonymous/Pro
- `package.json` — Added sonner ^2.0.7
- `package-lock.json` — Lockfile updated

## Decisions Made

- **userTier null = unlocked**: Anonymous users and users during Clerk loading always see unlocked state — critical for no-flash requirement (GATE-03 must_have truth)
- **Click interception not button disable**: isProLocked tiles intercept click to show toast (with /pricing upgrade action) — button element remains enabled for accessibility
- **LogoSection locked state replaces drop-zone entirely**: When locked, file input is not rendered at all — prevents any keyboard/assistive tech path to upload
- **Thumbnail generation**: Uses getRawData('png') → FileReader → base64 data URL, matching ExportButtons.tsx pattern from context
- **Edit flow auto-navigates to /dashboard**: After successful PUT, 1s delay then navigate — avoids needing a separate "done" step

## Deviations from Plan

None — plan executed exactly as written. TypeScript compiled clean (`npx tsc --noEmit` exit 0) after both tasks.

## Issues Encountered

None — sonner installed cleanly, TypeScript types resolved without issues. Pro gate tests remain `test.fixme` stubs as planned (real assertions added in plan 09-05).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Save flow (POST /api/qr/save) is fully wired client-side — ready for plan 09-04 dashboard library UI
- Edit flow (GET + PUT /api/qr/[id]) is fully wired — edit mode activates from /?edit=[id]
- Pro gate overlays in place — plan 09-05 can switch fixme stubs to real assertions against these selectors:
  - `[data-testid="logo-dropzone"]` — visible for anonymous, hidden for non-Pro signed-in
  - `[data-testid="logo-locked"]` — visible for non-Pro signed-in, hidden for anonymous
  - `[data-testid="dot-shape-classy"]` — clickable for anonymous (no lock), toast for non-Pro
  - `[data-testid="save-to-library"]` — visible for Pro only
  - `[data-testid="save-to-library-locked"]` — visible for non-Pro signed-in only

## Self-Check: PASSED

- SaveQRModal.tsx: FOUND
- QRGeneratorIsland.tsx: FOUND
- ShapeSection.tsx: FOUND
- LogoSection.tsx: FOUND
- 09-03-SUMMARY.md: FOUND
- Commit 8ae26ab: FOUND
- Commit 12b779c: FOUND
- sonner in package.json: FOUND
- useUser from @clerk/shared/react: FOUND
- ShapeSection userTier prop: FOUND
- LogoSection userTier prop: FOUND

---
*Phase: 09-saved-qr-library-pro-gates*
*Completed: 2026-03-17*
