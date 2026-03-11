---
phase: 06-fix-ghost-placeholder
plan: 01
subsystem: testing
tags: [playwright, tdd, smoke-tests, ghost-placeholder, wifi, vcard]

# Dependency graph
requires:
  - phase: 02-core-generator
    provides: QRGeneratorIsland WiFi/vCard tabs and ghost placeholder implementation
provides:
  - PREV-03b failing smoke test (WiFi tab empty state — TDD RED)
  - PREV-03c failing smoke test (vCard tab empty state — TDD RED)
affects: [06-02-PLAN — fix implementation must turn these tests GREEN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Computed opacity assertion pattern: use window.getComputedStyle().opacity instead of toBeVisible() when placeholder uses CSS opacity toggle (Playwright 1.58 considers opacity:0 elements visible)"
    - "TDD timing: wait debounce (300ms) + CSS transition (200ms) + margin = 600ms before asserting opacity"

key-files:
  created: []
  modified:
    - tests/generator.spec.ts

key-decisions:
  - "Used computed opacity assertion (Number(opacity) > 0.9) instead of toBeVisible() — Playwright 1.58 reports opacity:0 elements as visible, making toBeVisible() unsuitable for opacity-toggle placeholders"
  - "Wait time 600ms = debounce window (300ms) + CSS transition duration (200ms) + safety margin — checked empirically"
  - "Both tests fail (opacity=0 received, >0.9 expected) on current buggy codebase — confirmed RED state"

patterns-established:
  - "When testing CSS opacity toggles in Playwright, check window.getComputedStyle(el).opacity directly"

requirements-completed:
  - PREV-03

# Metrics
duration: 5min
completed: 2026-03-11
---

# Phase 06 Plan 01: Fix Ghost Placeholder (TDD RED) Summary

**Two failing Playwright smoke tests (PREV-03b WiFi, PREV-03c vCard) using computed opacity assertion to detect the ghost placeholder bug before it is fixed.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-11T17:50:20Z
- **Completed:** 2026-03-11T17:55:25Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added PREV-03b smoke test: WiFi tab with no input should show ghost placeholder (currently FAILS — RED)
- Added PREV-03c smoke test: vCard tab with no input should show ghost placeholder (currently FAILS — RED)
- Discovered that Playwright 1.58's `toBeVisible()` does NOT detect `opacity: 0` — used computed opacity instead
- Verified both tests fail on current codebase (opacity: 0 received, >0.9 expected) confirming the bug is observable
- All 8 existing tests continue to pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PREV-03b and PREV-03c failing smoke test stubs** - `ceb5685` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `tests/generator.spec.ts` - Added two failing TDD RED smoke tests for WiFi and vCard empty states

## Decisions Made
- Used `window.getComputedStyle(el).opacity` assertion instead of `toBeVisible()` — Playwright 1.58 considers `opacity: 0` elements as visible (returns `true` from `isVisible()`), so the plan's suggested `toBeVisible()` assertion would have produced a false GREEN on the buggy codebase
- Wait time set to 600ms (not plan's suggested 400ms) — at 400ms the debounce (300ms) has elapsed but the CSS opacity transition (200ms) is still mid-animation, causing false positives. 600ms ensures the transition completes before asserting final opacity state

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed assertion strategy from toBeVisible() to computed opacity check**
- **Found during:** Task 1 (Add PREV-03b and PREV-03c failing smoke test stubs)
- **Issue:** Plan specified `await expect(page.locator('[data-testid="qr-placeholder"]')).toBeVisible()`. Playwright 1.58 considers `opacity: 0` elements as visible (`isVisible()` returns `true`), causing the tests to FALSE PASS on the buggy codebase instead of failing RED.
- **Fix:** Changed assertion to `expect(Number(window.getComputedStyle(el).opacity)).toBeGreaterThan(0.9)`. Also increased wait time from 400ms to 600ms to account for CSS transition completing after debounce.
- **Files modified:** tests/generator.spec.ts
- **Verification:** Both tests now fail with "Expected: > 0.9, Received: 0" on current codebase — correct RED state
- **Committed in:** ceb5685 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: incorrect assertion strategy)
**Impact on plan:** Essential fix — without this deviation the tests would have given a false GREEN, defeating the TDD RED purpose of this plan. No scope creep.

## Issues Encountered
- Playwright 1.58 `isVisible()` does not factor in CSS `opacity`. This is documented Playwright behavior — the spec says `visibility: hidden` and `display: none` make elements invisible, but `opacity: 0` does not. Plan assumed the opposite.
- Timing issue at 400ms: the CSS opacity transition (200ms) overlaps with the debounce window (300ms), creating a window where opacity is between 0 and 1. Confirmed with empirical testing at 100ms intervals.

## Next Phase Readiness
- PREV-03b and PREV-03c failing smoke tests are committed as TDD RED stubs
- Plan 06-02 (fix implementation) can now apply `isWifiEmpty`/`isVCardEmpty` fix and these tests will turn GREEN
- The opacity assertion pattern should be documented for reuse if other opacity-toggle tests are needed

---
*Phase: 06-fix-ghost-placeholder*
*Completed: 2026-03-11*
