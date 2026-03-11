---
phase: 05-complete-dark-mode
plan: 01
subsystem: testing
tags: [playwright, dark-mode, tdd, smoke-tests, tailwind-v4]

# Dependency graph
requires:
  - phase: 04-export-and-launch
    provides: Dark Mode smoke tests for body/header/QR preview (export.spec.ts)
provides:
  - Failing smoke test contract for section#features dark background (BRAND-04)
  - Failing smoke test contract for section#faq dark background (BRAND-04)
affects:
  - 05-02-PLAN.md (implements dark: classes to make these tests green)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD Wave 0: write failing selector/assertion contracts before implementing dark: classes"
    - "Tailwind v4 OKLCH detection: use not.toMatch(/oklch\\(0\\.98/) to catch gray-50 light-mode bg"

key-files:
  created: []
  modified:
    - tests/export.spec.ts

key-decisions:
  - "Tailwind v4 outputs OKLCH color values (e.g. oklch(0.985 0.002 247.839)) for gray-50, not rgb(249, 250, 251) — assertion updated to use not.toMatch regex"
  - "Negative assertion pattern for dark mode stubs: check NOT white AND NOT gray-50 (both RGB and OKLCH) so tests fail until dark: classes applied"

patterns-established:
  - "OKLCH guard pattern: expect(bg).not.toMatch(/oklch\\(0\\.98/) catches Tailwind v4 near-white backgrounds"

requirements-completed: [BRAND-04]

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 5 Plan 01: Dark Mode TDD Stubs Summary

**Two failing Playwright @smoke stubs for Features and FAQ section dark backgrounds, with OKLCH-aware assertions for Tailwind v4 compatibility**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-11T13:13:00Z
- **Completed:** 2026-03-11T13:16:30Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `@smoke features section has dark background in dark mode` — RED (BRAND-04)
- Added `@smoke faq section has dark background in dark mode` — RED (BRAND-04)
- Discovered Tailwind v4 OKLCH color output and updated assertions accordingly
- All 16 pre-existing smoke tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add two failing dark mode smoke stubs to export.spec.ts** - `2a2c40d` (test)

**Plan metadata:** (docs commit follows)

_Note: TDD tasks may have multiple commits (test → feat → refactor)_

## Files Created/Modified
- `tests/export.spec.ts` - Added two @smoke test stubs for Features and FAQ dark mode backgrounds inside existing `test.describe('Dark Mode @smoke', ...)` block

## Decisions Made
- Tailwind v4 uses OKLCH color space for gray-50 (`oklch(0.985 0.002 247.839)`) instead of `rgb(249, 250, 251)`. The plan's original negative assertion `not.toBe('rgb(249, 250, 251)')` would miss this. Added `not.toMatch(/oklch\(0\.98/)` to detect the Tailwind v4 light-mode gray value and correctly fail the test until dark: classes are applied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated Features assertion to handle Tailwind v4 OKLCH color output**
- **Found during:** Task 1 (running tests to verify RED state)
- **Issue:** Tailwind v4 computes `bg-gray-50` as `oklch(0.985 0.002 247.839)` rather than `rgb(249, 250, 251)`. The plan's `not.toBe('rgb(249, 250, 251)')` assertion passed trivially, meaning the Features test reported GREEN instead of RED — defeating the TDD stub's purpose.
- **Fix:** Added `expect(bg).not.toMatch(/oklch\(0\.98/)` as a third assertion to catch the OKLCH gray-50 value. The FAQ test was unaffected (its bg is `rgb(255, 255, 255)` = white, caught by the first assertion).
- **Files modified:** tests/export.spec.ts
- **Verification:** Re-ran smoke suite — 2 failed (features + faq dark mode), 16 passed.
- **Committed in:** 2a2c40d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in assertion pattern)
**Impact on plan:** Essential fix — without it the Features stub would have reported GREEN, falsely indicating dark mode was already implemented. OKLCH pattern now documented for use in subsequent plans.

## Issues Encountered
- Tailwind v4's OKLCH color output is not documented in the plan's interface block. Plan assumed RGB values inherited from legacy Tailwind. Discovered during initial RED verification run.

## Next Phase Readiness
- TDD Wave 0 complete: selector/assertion contract established for Features and FAQ sections
- Plan 05-02 can now implement `dark:bg-slate-900` / `dark:bg-[#0f172a]` classes to make these tests GREEN
- OKLCH pattern documented in patterns-established for Plan 05-02 awareness

## Self-Check: PASSED
- tests/export.spec.ts: FOUND
- .planning/phases/05-complete-dark-mode/05-01-SUMMARY.md: FOUND
- Commit 2a2c40d: FOUND

---
*Phase: 05-complete-dark-mode*
*Completed: 2026-03-11*
