---
phase: 10
plan: "05"
subsystem: testing
tags: [smoke-tests, playwright, dynamic-qr, verification]
dependency_graph:
  requires: [10-03, 10-04]
  provides: [DYN-01, DYN-02, DYN-03, DYN-04, DYN-05]
  affects: [phase-11]
tech_stack:
  added: []
  patterns: [playwright-request-api, test-fixme-for-session-bound-tests]
key_files:
  created: []
  modified:
    - tests/dynamic/redirect.spec.ts
    - tests/dynamic/create-api.spec.ts
    - tests/dynamic/update-api.spec.ts
    - tests/dynamic/pause-api.spec.ts
    - playwright.config.ts
decisions:
  - "Playwright port changed from 4321 to 4323 to avoid conflict with another project's dev server running on 4321"
  - "Session-dependent tests remain test.fixme per Phase 07 convention — cannot automate Clerk sessions in CI"
metrics:
  duration: "256s"
  completed_date: "2026-03-30"
  tasks_completed: 1
  tasks_pending_checkpoint: 1
  files_modified: 5
---

# Phase 10 Plan 05: Smoke Tests + Human Verification Summary

Activated Wave 0 test.fixme stubs into real smoke tests for the dynamic QR redirect service. All unauthenticated 401 checks and invalid-slug holding page checks now pass. Session-dependent tests remain test.fixme per project convention.

## Status

**Task 1: COMPLETE** — 15 smoke tests pass, 24 fixme stubs visible in report.
**Task 2: AWAITING HUMAN VERIFICATION** — Checkpoint reached, waiting for user sign-off on all 5 DYN requirements.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Activate smoke tests | b01afe6 | tests/dynamic/*.spec.ts, playwright.config.ts |

## Smoke Test Results

```
15 passed, 24 skipped (fixme), 0 failed
```

Tests activated (run without Clerk session):
- `GET /r/nonexistent-slug` returns 404 with holding page — PASS
- Holding page contains QRCraft logo text, `<h1>`, `<main>` — PASS
- `POST /api/qr/save` with `isDynamic:true` unauthenticated returns 401 — PASS
- `PATCH /api/qr/[id]` unauthenticated (destinationUrl) returns 401 — PASS
- `PATCH /api/qr/[id]` unauthenticated (isPaused) returns 401 — PASS

Tests remaining as fixme (require real Clerk session):
- 307 redirect for active slug
- 200 holding page for paused slug
- Free user within limit creates dynamic QR
- Free user at limit gets 403 dynamic_limit_reached
- Owner destination update, IDOR protection
- Authenticated pause/activate toggle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Fix] Playwright port conflict**
- **Found during:** Task 1 test run
- **Issue:** Port 4321 was occupied by a different project's dev server (Johns Music Studio), causing Playwright to hit the wrong server and all SSR routes to return 404
- **Fix:** Updated `playwright.config.ts` to use port 4323 — fresh dev server starts cleanly with correct env vars
- **Files modified:** `playwright.config.ts`
- **Commit:** b01afe6

## Known Stubs

None — all activated tests assert real behavior.

## Human Verification Checklist (Task 2)

The following items require manual testing in the browser at http://localhost:4323:

1. Create a dynamic QR (DYN-01): Go to generator, URL tab, enter URL, enable toggle, save, verify in dashboard
2. Verify dashboard card (DYN-02, DYN-04): Dynamic badge, destination URL, green Active status
3. Edit destination URL (DYN-02): Click pencil, change URL, save, verify toast
4. Pause/activate toggle (DYN-04): Pause, verify amber status, activate, verify green status
5. Test redirect (DYN-03): Visit /r/[slug], verify 307 redirect
6. Test redirect latency (DYN-03): Visit /r/[slug] in DevTools Network tab, verify under 2s
7. Test invalid slug (DYN-03): Visit /r/doesnotexist, verify holding page with dark mode
8. Test free tier limit (DYN-05): Create 3, try 4th, verify lock + upgrade toast
9. Verify non-URL tab: Switch tabs, verify toggle greyed out
10. Edit-mode restoration: Edit existing dynamic QR, verify toggle restored to enabled

## Self-Check: PASSED

- [x] Commit b01afe6 exists: `git log --oneline | grep b01afe6`
- [x] All 4 test files modified and committed
- [x] playwright.config.ts updated and committed
- [x] 15 smoke tests pass on port 4323
