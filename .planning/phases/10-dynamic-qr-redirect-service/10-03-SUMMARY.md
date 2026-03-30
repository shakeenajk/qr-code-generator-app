---
phase: 10-dynamic-qr-redirect-service
plan: "03"
subsystem: frontend
tags: [react, dynamic-qr, toggle, UrlTab, QRGeneratorIsland, SaveQRModal, lucide-react, tailwind]

# Dependency graph
requires:
  - phase: 10-02
    provides: POST /api/qr/save with isDynamic support + GET list with isDynamic field
provides:
  - Dynamic QR toggle UI in UrlTab with all 3 states (normal, greyed-out, locked)
  - isDynamic state management in QRGeneratorIsland with QR preview redirect URL encoding
  - SaveQRModal with isDynamic prop and "Save Dynamic QR" label
  - GET /api/qr/[id] now returns dynamic metadata (slug, destinationUrl, isPaused, isDynamic)
  - Edit-mode restoration of isDynamic toggle and slug from GET response
affects:
  - 10-04 (dashboard UI renders Dynamic badge/destination from same list API)
  - 10-05 (scan analytics uses dynamicQrCode row, unrelated to UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Pill toggle rendered as <button role="switch"> with aria-checked + aria-label for accessibility
    - dynamicLocked computed from fetched count >= 3 for non-pro signed-in users
    - QR preview data forks on isDynamic + activeTab === "url" to encode redirect placeholder URL
    - GET /api/qr/[id] extended with leftJoin to return dynamic metadata without breaking existing callers
    - isDynamic+destinationUrl appended to POST /api/qr/save body only when toggle is on + URL tab active

key-files:
  created: []
  modified:
    - src/components/tabs/UrlTab.tsx
    - src/components/QRGeneratorIsland.tsx
    - src/components/SaveQRModal.tsx
    - src/pages/api/qr/[id].ts

key-decisions:
  - "GET /api/qr/[id] extended with leftJoin on dynamicQrCodes to return isDynamic+slug for edit-mode restoration — cleaner than storing in contentData"
  - "dynamicCount fetched via /api/qr/list on mount for non-pro users; pro users skip the fetch (no limit to enforce)"
  - "canSaveDynamic allows non-Pro signed-in users to see and use the save button when dynamic toggle is on and not at limit"
  - "UrlTab toggle always rendered (all 4 tabs in DOM), but isUrlTab=false causes greyed-out state per D-02"

patterns-established:
  - "isDynamic state drives both QR preview encoding and save body construction — single source of truth"
  - "Edit-mode slug restoration: read from data.isDynamic + data.slug (GET response), not contentData"

requirements-completed: [DYN-01, DYN-05]

# Metrics
duration: ~4min
completed: 2026-03-30
---

# Phase 10 Plan 03: Dynamic QR Toggle + Save Flow Summary

**Dynamic QR toggle in UrlTab with 3 states (normal/greyed/locked), isDynamic state wired through QRGeneratorIsland, SaveQRModal extended with dynamic label, and GET /api/qr/[id] extended with dynamic metadata for edit-mode restoration**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-30T12:43:18Z
- **Completed:** 2026-03-30T12:47:23Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- UrlTab extended with DynamicQRToggle inline: pill toggle (indigo-600 enabled, gray disabled), Lock icon state for limit-hit users (purple-500), greyed-out row (opacity-40) for non-URL tabs, Info icon with hover tooltip
- Full accessibility: `role="switch"`, `aria-checked`, `aria-label`, `aria-disabled`, dark mode coverage
- QRGeneratorIsland manages `isDynamic`, `dynamicCount`, `savedSlug` state; fetches dynamic count on mount for non-pro users
- QR preview encodes `https://qr-code-generator-app.com/r/--------` placeholder (or real slug after save) when dynamic toggle is on and URL tab is active
- handleToggleDynamic intercepts locked/unsigned-in cases with appropriate sonner toasts
- canSaveDynamic logic: non-Pro signed-in users can save when dynamic toggle is on and not at limit
- SaveQRModal receives `isDynamic` prop; heading and save button label change to "Save Dynamic QR"
- handleSave appends `isDynamic: true` + `destinationUrl` to POST body; handles `dynamic_limit_reached` 403 with upgrade toast
- setSavedSlug called after save success; setDynamicCount incremented by 1
- GET /api/qr/[id] extended with leftJoin on dynamicQrCodes: returns isDynamic, slug, destinationUrl, isPaused fields
- Edit-mode hydration reads data.isDynamic + data.slug from GET response to restore toggle and preview

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Dynamic QR toggle to UrlTab with all states** - `2ef5a70` (feat)
2. **Task 2: Wire isDynamic state into QRGeneratorIsland + SaveQRModal** - `66309ea` (feat)
3. **Task 3: Extend save success flow with slug handling + edit mode restoration** - `cfefaac` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/tabs/UrlTab.tsx` - DynamicQRToggle inline component: pill toggle, lock state, greyed state, Info tooltip
- `src/components/QRGeneratorIsland.tsx` - isDynamic state, dynamicCount fetch, handleToggleDynamic, qrData computation, canSaveDynamic, saveButtonLabel
- `src/components/SaveQRModal.tsx` - isDynamic prop, "Save Dynamic QR" heading and button label
- `src/pages/api/qr/[id].ts` - GET handler extended with leftJoin on dynamicQrCodes returning isDynamic + slug + dynamic metadata

## Decisions Made

- GET /api/qr/[id] extended with leftJoin on dynamicQrCodes to return `isDynamic`, `slug`, `destinationUrl`, `isPaused`. This is cleaner than storing dynamic metadata in `contentData` JSON, and consistent with the list endpoint pattern from Plan 02.
- `dynamicCount` is fetched once on mount via `/api/qr/list` for non-pro signed-in users; pro users skip the fetch entirely (no limit to enforce). Fail-open: on fetch error, count defaults to 0 so the toggle is not incorrectly locked.
- `canSaveDynamic` flag allows non-Pro signed-in users to see the active save button when the dynamic toggle is on and they're under the 3-QR limit. Without this, non-Pro users would only see the locked button even when they're eligible to save a dynamic QR.
- UrlTab toggle uses all-4-tabs-in-DOM pattern (CONT-05 compliance): `isUrlTab=false` causes greyed-out state rather than unmounting and remounting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] GET /api/qr/[id] did not return dynamic metadata**

- **Found during:** Task 3 — edit-mode restoration needs isDynamic + slug from the GET response
- **Issue:** The existing GET /api/qr/[id] only queried `savedQrCodes`. No dynamic metadata was returned, so edit-mode restoration couldn't read `data.isDynamic` or `data.slug`.
- **Fix:** Extended GET handler with leftJoin on `dynamicQrCodes`, returning `isDynamic` (computed from slug !== null), `slug`, `destinationUrl`, `isPaused`. Consistent with the list endpoint pattern already established in Plan 02.
- **Files modified:** `src/pages/api/qr/[id].ts`
- **Commit:** `cfefaac`

## Known Stubs

None — toggle is fully wired. QR preview encodes real slug after save. Edit-mode restores from DB-returned slug.

## Self-Check: PASSED

- FOUND: src/components/tabs/UrlTab.tsx
- FOUND: src/components/QRGeneratorIsland.tsx
- FOUND: src/components/SaveQRModal.tsx
- FOUND: src/pages/api/qr/[id].ts
- FOUND: commit 2ef5a70 (Task 1)
- FOUND: commit 66309ea (Task 2)
- FOUND: commit cfefaac (Task 3)

---
*Phase: 10-dynamic-qr-redirect-service*
*Completed: 2026-03-30*
