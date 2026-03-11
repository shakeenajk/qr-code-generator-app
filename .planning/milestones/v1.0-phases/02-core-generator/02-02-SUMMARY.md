---
phase: 02-core-generator
plan: "02"
subsystem: ui
tags: [react, typescript, qr-code, vcard, wifi, debounce]

# Dependency graph
requires:
  - phase: 02-core-generator plan 01
    provides: qr-code-styling installed, Wave 0 test stubs for QRGeneratorIsland

provides:
  - useDebounce hook (generic debounce with useState + useEffect)
  - encodeWifi pure function (WIFI: format with ZXing backslash escaping)
  - encodeVCard pure function (vCard 3.0 with CRLF line endings per RFC 6350)
  - isContentEmpty helper for ghost placeholder logic
  - QRPreview component (forwardRef, 256x256, ghost overlay, pulse animation)
  - UrlTab component (URL input with soft validation)
  - TextTab component (textarea for plain text)
  - WifiTab component (SSID, password show/hide, security dropdown)
  - VCardTab component (Name required, Phone, Email, Organization)

affects: [02-core-generator plan 03 (QRGeneratorIsland assembly)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Encoding centralized in lib/qrEncoding.ts — tab components receive state, encoding happens in island"
    - "forwardRef pattern for qr-code-styling.append() DOM target"
    - "Ghost placeholder uses absolute overlay + opacity toggle, never conditional render"
    - "name= attributes on form inputs for Playwright test selectors"

key-files:
  created:
    - src/hooks/useDebounce.ts
    - src/lib/qrEncoding.ts
    - src/components/QRPreview.tsx
    - src/components/tabs/UrlTab.tsx
    - src/components/tabs/TextTab.tsx
    - src/components/tabs/WifiTab.tsx
    - src/components/tabs/VCardTab.tsx
  modified: []

key-decisions:
  - "Encoding in lib, not tabs: encodeWifi and encodeVCard called in island — tabs are dumb controlled components"
  - "Ghost placeholder always in DOM: opacity-0/opacity-100 toggle prevents layout shift and qr-code-styling remount"
  - "CRLF line endings in vCard: RFC 6350 compliance for maximum scanner compatibility"
  - "Backslash-escape chars in WiFi: ZXing spec requires escaping \\, ;, ,, \", : in SSID and password"

patterns-established:
  - "Controlled tab components: each tab accepts value + onChange props, no internal state except UI (showPassword)"
  - "forwardRef for library DOM access: QRPreview forwards ref so qr-code-styling can append SVG/canvas"
  - "Test selector attributes: name='ssid', name='password', name='name' added for Playwright test stubs"

requirements-completed: [CONT-01, CONT-02, CONT-03, CONT-04, PREV-01, PREV-02, PREV-03]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 2 Plan 02: Primitive Components and Encoding Utilities Summary

**7 TypeScript/React primitive files — useDebounce hook, WiFi/vCard encoding with format-spec compliance, QRPreview with ghost overlay, and 4 controlled tab components — all building cleanly for Wave 3 island assembly**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-10T13:03:16Z
- **Completed:** 2026-03-10T13:08:00Z
- **Tasks:** 7
- **Files modified:** 7 created, 0 modified

## Accomplishments
- Pure encoding functions for WiFi (ZXing backslash-escaped WIFI: format) and vCard 3.0 (CRLF per RFC 6350)
- QRPreview component with forwardRef, 256x256 fixed size, ghost SVG overlay using opacity toggle (never unmounted)
- 4 controlled tab components (Url, Text, Wifi, VCard) with correct test selector attributes
- Generic useDebounce hook for debounced QR updates without button press

## Task Commits

Each task was committed atomically:

1. **Task 2-02-01: Create useDebounce hook** - `6644a41` (feat)
2. **Task 2-02-02: Create qrEncoding utility functions** - `f5c1178` (feat)
3. **Task 2-02-03: Create QRPreview component** - `ad912d9` (feat)
4. **Task 2-02-04: Create UrlTab component** - `7f602c6` (feat)
5. **Task 2-02-05: Create TextTab component** - `5ede692` (feat)
6. **Task 2-02-06: Create WifiTab component** - `eba1886` (feat)
7. **Task 2-02-07: Create VCardTab component** - `9d51ab0` (feat)

## Files Created/Modified
- `src/hooks/useDebounce.ts` - Generic debounce hook using useState + useEffect
- `src/lib/qrEncoding.ts` - Pure encoding functions: encodeWifi, encodeVCard, isContentEmpty + WifiState/VCardState interfaces
- `src/components/QRPreview.tsx` - forwardRef preview container with ghost SVG placeholder overlay and pulse animation
- `src/components/tabs/UrlTab.tsx` - URL text input with soft validation warning (never blocks QR generation)
- `src/components/tabs/TextTab.tsx` - Textarea for plain text (no validation needed)
- `src/components/tabs/WifiTab.tsx` - SSID, security dropdown, password show/hide toggle with name= attributes
- `src/components/tabs/VCardTab.tsx` - Name/Phone/Email/Organization fields with name= attributes

## Decisions Made
- Encoding centralized in `src/lib/qrEncoding.ts`, not in tab components — tabs are dumb controlled components; island owns encoding logic
- Ghost placeholder uses absolute overlay with opacity toggle (not conditional render) to avoid layout shift and qr-code-styling remount issues
- CRLF line endings in vCard output for RFC 6350 compliance and maximum QR scanner compatibility
- `name=` attributes on SSID, password, and name inputs are test selector requirements per Wave 0 test stubs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. All 7 files created in sequence, each verified clean with `npm run build` before commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All primitive components ready for QRGeneratorIsland assembly (Plan 02-03)
- Interfaces exported from qrEncoding.ts (WifiState, VCardState) for island state typing
- previewRef can be passed down to QRPreview for qr-code-styling.append()
- Tab components are controlled — island owns all state and passes value + onChange

---
*Phase: 02-core-generator*
*Completed: 2026-03-10*
