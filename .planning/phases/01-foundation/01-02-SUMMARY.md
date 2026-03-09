---
phase: 01-foundation
plan: 02
subsystem: testing
tags: [playwright, smoke-tests, tdd, typescript]

# Dependency graph
requires:
  - phase: 01-foundation plan 01
    provides: Playwright installed and configured with testDir ./tests and webServer on port 4321
provides:
  - tests/foundation.spec.ts with 11 Playwright smoke tests covering BRAND-01 through SEO-08
  - @smoke tag on all tests enabling --grep @smoke filtered runs
  - Automated acceptance criteria for all Phase 1 BRAND and SEO requirements
affects: [02-seo-layout, 03-qr-generator, 04-export-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED phase: tests written before implementation — all 11 will fail until Plan 03/04 ships"
    - "Test tags: @smoke in test name enables --grep @smoke to select all smoke tests"
    - "FAQ tests (SEO-04 schema + SEO-05 visible section) must stay in sync with same data source"

key-files:
  created:
    - tests/foundation.spec.ts
  modified: []

key-decisions:
  - "Tests are intentionally failing (TDD RED) — that is the desired state at this point in the plan"
  - "Used @smoke in test name (not .tag()) for maximum compatibility with --grep filtering"
  - "FAQ visible section test uses locator('section').filter({ hasText: /FAQ|frequently asked|questions/i }) for resilience"

patterns-established:
  - "Smoke test naming: '<requirement keyword> @smoke' maps directly to VALIDATION.md grep patterns"
  - "Schema tests: use allTextContents() + Array.find() to handle multiple ld+json blocks"

requirements-completed: [BRAND-01, BRAND-02, BRAND-03, SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07, SEO-08]

# Metrics
duration: 1min
completed: 2026-03-09
---

# Phase 1 Plan 02: Playwright Smoke Test Suite Summary

**11 Playwright @smoke tests covering every Phase 1 BRAND and SEO requirement, written TDD RED before implementation exists**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-09T07:59:31Z
- **Completed:** 2026-03-09T08:00:25Z
- **Tasks:** 1
- **Files modified:** 1 created

## Accomplishments
- All 11 smoke tests written and listed by `npx playwright test --list` without errors
- Tests cover all BRAND (01-03) and SEO (01-08) requirements one-to-one
- Test names match the grep patterns specified in VALIDATION.md (logo, brand colors, mobile, meta tags, open graph, webapplication schema, faqpage schema, faq section, sitemap, robots, semantic html)
- Tests are in TDD RED state — expected to fail against the minimal scaffold until Plans 03/04 implement the layout

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Playwright smoke test suite for all Phase 1 requirements** - `90da1db` (test)

**Plan metadata:** *(to be recorded)*

## Files Created/Modified
- `tests/foundation.spec.ts` - 11 Playwright smoke tests, one per Phase 1 BRAND/SEO requirement, all tagged @smoke

## Decisions Made
- Tests are intentionally failing at this point — this is the TDD RED phase; implementation follows in Plans 03/04
- Used @smoke embedded in test name string (not `.tag()`) for compatibility with `--grep @smoke` CLI flag

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Smoke test suite is complete and ready to drive implementation in Plans 03/04/05
- `npx playwright test --project=chromium --grep @smoke` is the verification command for each task commit in Plans 03-05
- All 11 tests expected to pass after Plan 03 (layout/SEO) and Plan 04 (QR generator) are implemented

## Self-Check: PASSED

- tests/foundation.spec.ts: FOUND
- Commit 90da1db: FOUND (Task 1)
- `npx playwright test --list | grep @smoke | grep chromium` count: 11

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
