---
phase: 07-ssr-foundation-auth
plan: 01
subsystem: testing
tags: [playwright, tdd, auth, ssr, wave-0]
dependency_graph:
  requires: []
  provides: [auth-test-scaffolds, playwright-ssr-config]
  affects: [07-02, 07-03, 07-04, 07-05]
tech_stack:
  added: []
  patterns: [stub-tests, smoke-tags, tdd-red-phase]
key_files:
  created:
    - tests/auth/signup.spec.ts
    - tests/auth/signin.spec.ts
    - tests/auth/session.spec.ts
    - tests/auth/signout.spec.ts
    - tests/auth/redirect.spec.ts
  modified:
    - playwright.config.ts
decisions:
  - "Use astro dev (not preview) as webServer for Playwright — preview cannot serve SSR routes with prerender=false"
  - "All auth smoke tests tagged @smoke for grep-based CI filtering"
  - "Stub tests use test.fixme so they are visibly pending, not silently skipped"
metrics:
  duration: 2 min
  completed_date: "2026-03-16T19:06:26Z"
  tasks_completed: 2
  files_changed: 6
---

# Phase 7 Plan 01: Auth Test Scaffolds (Wave 0) Summary

Wave 0 Playwright test scaffolds for AUTH-01 through AUTH-05 with astro dev SSR server configuration.

## What Was Built

Updated `playwright.config.ts` to use `npm run dev` instead of `npm run preview` — required because SSR routes (`/login`, `/signup`, `/dashboard`) with `prerender = false` are not served by `astro preview`. Increased timeout from 30s to 60s to accommodate dev server startup.

Created 5 stub test files under `tests/auth/`:

| File | Requirements | Smoke Tests | Fixme Stubs |
|------|-------------|-------------|-------------|
| signup.spec.ts | AUTH-01 | 1 (page load) | 1 (full sign-up flow) |
| signin.spec.ts | AUTH-02, AUTH-03 | 2 (page load, OAuth present) | 3 (credentials, Google, GitHub) |
| session.spec.ts | AUTH-04 | 1 (unauth redirect) | 1 (session persistence) |
| signout.spec.ts | AUTH-05 | 1 (homepage load) | 1 (sign-out flow) |
| redirect.spec.ts | Middleware | 2 (redirect + homepage) | 0 |

## Decisions Made

1. **Use astro dev for webServer** — `astro preview` serves the static build only; SSR routes require the dev server which handles both static and dynamic routes.
2. **test.fixme for stubs** — Marks tests as "expected to fail" and shows them as pending in reports, unlike `.skip` which hides them entirely.
3. **@smoke tag pattern** — Consistent with existing test suite (foundation.spec.ts, etc.) for `--grep @smoke` filtering in CI.

## Verification

```
npx playwright test --list | grep "auth/"   # shows 13 entries per browser = 39 total
npx playwright test tests/auth/redirect.spec.ts --grep "@smoke" --list
# Total: 6 tests in 1 file (2 smoke × 3 browsers)
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- FOUND: tests/auth/signup.spec.ts
- FOUND: tests/auth/signin.spec.ts
- FOUND: tests/auth/session.spec.ts
- FOUND: tests/auth/signout.spec.ts
- FOUND: tests/auth/redirect.spec.ts

Commits verified:
- 065a734: chore(07-01): update playwright webServer to astro dev for SSR route support
- 87f525c: test(07-01): add Wave 0 auth test scaffolds for AUTH-01 through AUTH-05
