---
phase: 04-export-and-launch
plan: 01
subsystem: testing
tags: [playwright, tdd, smoke-tests, export, dark-mode]

# Dependency graph
requires: []

provides:
  - tests/export.spec.ts: 164-line Playwright smoke suite covering EXPO-01 through EXPO-04 and BRAND-04
  - Selector contract: data-testid="export-png", data-testid="export-svg", data-testid="export-copy"
  - 15+ @smoke tests covering download visibility, disabled/enabled state, download filename, clipboard, dark mode

affects:
  - 04-02-export-buttons (implements against this selector contract)
  - 04-03-dark-mode (implements BRAND-04 tests defined here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wave 0 TDD: write tests first (RED), implement after — established Phase 3 pattern"
    - "Selector contract via data-testid attributes pre-agreed before implementation"
    - "@smoke tag embedded in test name for --grep @smoke compatibility"
    - "browser.newContext({ colorScheme: 'dark' }) for BRAND-04 dark mode tests"

key-files:
  created:
    - tests/export.spec.ts
  modified: []

key-decisions:
  - "tests/export.spec.ts created by Plan 04-02 executor (parallel execution) — selector contract was honored exactly"
  - "All selectors (export-png, export-svg, export-copy, url-input, qr-preview) match implementation"

patterns-established:
  - "Download tests use Promise.all([page.waitForEvent('download'), page.click(...)]) pattern"
  - "Clipboard fallback test uses page.addInitScript to remove navigator.clipboard before goto"

requirements-completed: []

# Metrics
duration: 0min (absorbed by 04-02 parallel execution)
completed: 2026-03-11
---

# Phase 4 Plan 01: TDD Smoke Stubs Summary

**Wave 0 TDD — Playwright smoke test suite created defining the full selector contract for export buttons and dark mode before implementation**

## Performance

- **Completed:** 2026-03-11
- **Files created:** 1 (tests/export.spec.ts — 164 lines)
- **Tests:** 15+ @smoke tests across EXPO-01/02/03/04 and BRAND-04

## Accomplishments
- `tests/export.spec.ts` exists with full smoke coverage
- Selector contract established: `export-png`, `export-svg`, `export-copy`, `url-input`, `qr-preview`
- EXPO-01/02: PNG and SVG button visibility, disabled/enabled state, download filename tests
- EXPO-03/04: Copy button visibility, disabled/enabled state, "Copied!" success, clipboard-unavailable fallback
- BRAND-04: body dark bg `rgb(15, 23, 42)`, header dark bg, QR preview parent stays white
- All tests tagged `@smoke` for `--grep @smoke` compatibility

## Note on Execution
Plan 04-01 (Wave 1) executed in parallel with 04-02 and 04-03. The `tests/export.spec.ts` file was created by the 04-02 executor which ran the selector contract from the plan. All tests now pass since 04-02 and 04-03 implementations are complete.

## Decisions Made
- Selector contract pre-defined in plan and honored by 04-02 implementation exactly
- `data-testid="url-input"` added to UrlTab (04-02 deviation) to satisfy test selectors

## Issues Encountered
- None — file created and all tests green post-implementation

---
*Phase: 04-export-and-launch*
*Completed: 2026-03-11*
