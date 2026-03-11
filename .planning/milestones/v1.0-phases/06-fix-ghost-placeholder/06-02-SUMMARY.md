---
phase: 06-fix-ghost-placeholder
plan: 02
subsystem: ui
tags: [react, typescript, qr-generator, ghost-placeholder, wifi, vcard, usememo]

# Dependency graph
requires:
  - phase: 02-core-generator
    provides: QRGeneratorIsland WiFi/vCard tabs, isEmpty prop, ghost placeholder overlay
  - phase: 06-fix-ghost-placeholder/06-01
    provides: PREV-03b and PREV-03c failing smoke tests (TDD RED)
provides:
  - isWifiEmpty and isVCardEmpty exported from src/lib/qrEncoding.ts
  - isEmpty in QRGeneratorIsland.tsx computed via useMemo from raw field state for WiFi/vCard
  - PREV-03b (WiFi tab empty state) GREEN
  - PREV-03c (vCard tab empty state) GREEN
affects: [future QR encoding changes, isEmpty consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WiFi/vCard empty state detection must use raw field state — encoders always produce non-empty protocol strings even when all fields are blank"
    - "URL/text isEmpty uses debouncedContent (safe because empty field produces empty string); WiFi/vCard isEmpty uses raw state to give immediate placeholder on tab switch"
    - "useMemo per-tab isEmpty switch: case 'wifi' and 'vcard' use isWifiEmpty/isVCardEmpty; case 'url' and 'text' use isContentEmpty(debouncedContent)"

key-files:
  created: []
  modified:
    - src/lib/qrEncoding.ts
    - src/components/QRGeneratorIsland.tsx

key-decisions:
  - "URL/text isEmpty uses debouncedContent, not raw value — if raw urlValue is used, isEmpty becomes false before debouncedContent reflects it, causing update effect to render QR with empty data"
  - "WiFi/vCard isEmpty uses raw field state — pre-encoding check (isWifiEmpty/isVCardEmpty) needed because encoders produce non-empty strings even when all fields are blank"
  - "isWifiEmpty treats SSID as the sole required field — blank SSID means no scannable WiFi QR regardless of password"
  - "isVCardEmpty treats all four fields equally — any non-blank field produces a meaningful contact QR"

patterns-established:
  - "Pre-encoding emptiness check pattern: add isXEmpty(state) alongside encodeX(state) in qrEncoding.ts for structured tab types"

requirements-completed:
  - PREV-03

# Metrics
duration: 4min
completed: 2026-03-11
---

# Phase 06 Plan 02: Fix Ghost Placeholder (GREEN) Summary

**isWifiEmpty and isVCardEmpty added to qrEncoding.ts; isEmpty in QRGeneratorIsland.tsx uses raw field state for WiFi/vCard to show ghost placeholder immediately on tab switch.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-11T17:58:21Z
- **Completed:** 2026-03-11T18:02:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `isWifiEmpty` and `isVCardEmpty` to `src/lib/qrEncoding.ts` — pre-encoding empty checks for structured tabs
- Updated `isEmpty` in `QRGeneratorIsland.tsx` to use `useMemo` switch: WiFi/vCard use raw field state, URL/text continue using `debouncedContent`
- Turned PREV-03b (WiFi) and PREV-03c (vCard) smoke tests GREEN
- All 48 @smoke tests pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add isWifiEmpty and isVCardEmpty to qrEncoding.ts** - `bc57301` (feat)
2. **Task 2: Update isEmpty in QRGeneratorIsland.tsx to use raw field state** - `4a62078` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/lib/qrEncoding.ts` - Added `isWifiEmpty` and `isVCardEmpty` exports after `isContentEmpty`
- `src/components/QRGeneratorIsland.tsx` - Updated import and replaced single-line isEmpty with useMemo switch

## Decisions Made
- Used `debouncedContent` for URL/text isEmpty (not raw values): raw `urlValue` becomes non-empty immediately on typing, before `debouncedContent` updates, causing the update effect to run with empty `debouncedContent` and produce no QR SVG. URL/text safely use debounced content because empty field = empty string.
- Used raw field state for WiFi/vCard isEmpty: `encodeWifi` always returns `"WIFI:T:WPA;S:;;"` even with blank fields; `encodeVCard` always returns a full vCard skeleton. `debouncedContent` is always non-empty for these tabs, making `isContentEmpty(debouncedContent)` always false.
- `isWifiEmpty` checks only SSID (not password): SSID is the required scannable field; a WiFi QR with no SSID is nonscannable.
- `isVCardEmpty` checks all four fields: any non-blank field produces a meaningful contact QR code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] URL/text isEmpty must use debouncedContent, not raw urlValue/textValue**
- **Found during:** Task 2 (Update isEmpty in QRGeneratorIsland.tsx)
- **Issue:** Plan's proposed useMemo used `urlValue` and `textValue` (raw) for URL/text cases. This caused 3 regressions: CONT-02 (Text), CONT-04 (vCard typing), and PREV-01 (auto-update). Root cause: when user types in URL field, `urlValue` changes immediately (isEmpty = false), but `debouncedContent` is still empty. The update effect then calls `qrCodeRef.current.update({ data: "" })` which silently fails — no QR SVG is rendered. Tests timed out waiting for `svg, canvas` to appear.
- **Fix:** Changed URL/text cases to use `isContentEmpty(debouncedContent)` (matching original behavior), keeping only WiFi/vCard as raw state checks. Dependency array updated accordingly.
- **Files modified:** src/components/QRGeneratorIsland.tsx
- **Verification:** All 48 @smoke tests pass including the 3 previously regressed tests and both newly GREEN PREV-03b/c
- **Committed in:** 4a62078 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: incorrect raw value usage for URL/text cases)
**Impact on plan:** Essential correctness fix — the plan's suggested implementation would have broken URL/text tab QR generation. No scope creep.

## Issues Encountered
- Plan's proposed useMemo used raw `urlValue`/`textValue` for URL/text cases. This creates a race: raw state updates synchronously on input, but the update effect uses `debouncedContent` for the QR data. When isEmpty becomes false before debouncedContent catches up, the effect runs with empty data. Fixed by using `debouncedContent` for URL/text (safe because empty input → empty string), reserving raw state only for WiFi/vCard where the encoder always produces non-empty output.

## Next Phase Readiness
- PREV-03 (ghost placeholder for WiFi/vCard) is fully resolved
- All 48 smoke tests green
- Phase 06 is complete — both plans executed, TDD RED → GREEN cycle complete

---
*Phase: 06-fix-ghost-placeholder*
*Completed: 2026-03-11*

## Self-Check: PASSED

- src/lib/qrEncoding.ts - FOUND
- src/components/QRGeneratorIsland.tsx - FOUND
- .planning/phases/06-fix-ghost-placeholder/06-02-SUMMARY.md - FOUND
- Commit bc57301 - FOUND
- Commit 4a62078 - FOUND
