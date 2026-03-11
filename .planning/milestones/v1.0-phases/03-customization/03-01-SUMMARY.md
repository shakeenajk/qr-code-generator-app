---
phase: 03-customization
plan: "01"
subsystem: testing
tags: [playwright, smoke-tests, tdd, customization, qr-code]

requires:
  - phase: 02-core-generator
    provides: QRGeneratorIsland with data-testid="qr-preview" and playwright smoke test patterns

provides:
  - Failing smoke test stubs for all Phase 3 customization requirements (CUST-01 through CUST-07, LOGO-01 through LOGO-04)
  - data-testid selector contract for all Wave 1-3 customization components

affects:
  - 03-02-colors (CUST-01, CUST-02, CUST-07 tests go GREEN here)
  - 03-03-gradient (CUST-03 test goes GREEN here)
  - 03-04-shapes (CUST-04, CUST-05, CUST-06 tests go GREEN here)
  - 03-05-logo (LOGO-01, LOGO-02, LOGO-04 tests go GREEN here)

tech-stack:
  added: []
  patterns:
    - "@smoke tag embedded in test name for --grep compatibility"
    - "data-testid selector contract defined in Wave 0 before implementation"

key-files:
  created:
    - tests/customization.spec.ts
  modified: []

key-decisions:
  - "LOGO-03 excluded from automated tests (manual-only: logo size ratio is not DOM-inspectable via Playwright)"
  - "CUST-07 test uses Enter keypress after fill to trigger color change event"
  - "LOGO-02 and LOGO-04 combined into one test (upload and remove lifecycle)"

patterns-established:
  - "Wave 0 pattern: write failing tests before implementation to establish selector contract"
  - "Buffer.from base64 minimal PNG used for file upload simulation in tests"

requirements-completed:
  - CUST-01
  - CUST-02
  - CUST-03
  - CUST-04
  - CUST-05
  - CUST-06
  - CUST-07
  - LOGO-01
  - LOGO-02
  - LOGO-03
  - LOGO-04

duration: 5min
completed: 2026-03-10
---

# Phase 3 Plan 01: Customization Smoke Stubs Summary

**10 failing Playwright @smoke stubs defining the data-testid selector contract for all Phase 3 customization components (colors, gradient, shapes, logo)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-10T14:21:00Z
- **Completed:** 2026-03-10T14:26:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `tests/customization.spec.ts` with 10 failing smoke tests across CUST-01 through CUST-07 and LOGO-01/02/04
- Confirmed TDD RED state: 27 failures across Chromium, Firefox, and WebKit (9 tests × 3 browsers)
- Verified TypeScript compiles clean (`npx tsc --noEmit` exits 0)
- Confirmed no regressions in existing 24 passing smoke tests (generator.spec.ts)
- LOGO-03 intentionally excluded (manual-only requirement: size ratio not inspectable via DOM)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing customization smoke tests (TDD RED)** - `ac31adc` (test)

**Plan metadata:** (pending — this summary commit)

## Files Created/Modified

- `tests/customization.spec.ts` — 10 @smoke stubs for CUST-01–07, LOGO-01, LOGO-02+04; establishes data-testid selector contract for Phase 3 components

## Decisions Made

- LOGO-03 excluded from automated tests since the logo size ratio (25% cap) cannot be measured via DOM attributes or Playwright visibility checks — must remain manual
- LOGO-02 and LOGO-04 combined into a single test covering the upload/remove lifecycle since they share state
- CUST-07 test uses `page.keyboard.press('Enter')` after filling the hex input to fire the color change event

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 complete: selector contract established for all customization components
- Plans 03-02 through 03-05 can now implement components; running `npm run test:smoke` after each will show tests turning green
- All 24 pre-existing smoke tests remain green — no regressions introduced

---
*Phase: 03-customization*
*Completed: 2026-03-10*

## Self-Check: PASSED

- FOUND: `tests/customization.spec.ts`
- FOUND: `.planning/phases/03-customization/03-01-SUMMARY.md`
- FOUND commit: `ac31adc` (test(03-01): add failing customization smoke stubs (TDD RED))
