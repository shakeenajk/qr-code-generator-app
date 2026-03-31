---
phase: 11-scan-analytics-dashboard
plan: 02
subsystem: api
tags: [recharts, analytics, drizzle-orm, sqlite, typescript, astro, clerk]

# Dependency graph
requires:
  - phase: 11-01
    provides: scanEvents table in schema.ts and scan event writes in redirect endpoint
  - phase: 07-ssr-foundation-auth
    provides: Clerk auth locals.auth() pattern for API routes
  - phase: 09-saved-qr-library-pro-gates
    provides: subscriptions table, savedQrCodes table, dynamicQrCodes table, db/index.ts

provides:
  - GET /api/analytics/[slug] endpoint with auth (401), Pro gate (403), ownership check (404)
  - Batched analytics queries for all 4 dimensions: total scans, unique scans, 30-day time series, device breakdown, top 5 countries
  - recharts@3.8.1 installed as production dependency
  - Test stubs for analytics API behavior

affects: [11-03]

# Tech tracking
tech-stack:
  added: [recharts@3.8.1]
  patterns:
    - Select API (not query relational API) for Pro gate check — consistent with codebase
    - Promise.all batching for multiple DB queries in single request (D-15)
    - D-16 unique approximation — distinct day+device+country combos via SQL
    - Array.from length 30 to fill missing days in time series with zero values
    - IDOR prevention via ownership JOIN (dynamicQrCodes.userId === userId)

key-files:
  created:
    - src/pages/api/analytics/[slug].ts
    - tests/analytics/analytics-api.spec.ts
  modified:
    - package.json

key-decisions:
  - "Use select API for Pro gate (not db.query.subscriptions.findFirst) — same pattern as other API routes"
  - "recharts@3.8.1 chosen over @tremor/react — Tremor requires Tailwind v3 config file, incompatible with project's Tailwind v4 CSS-first setup"
  - "D-16 unique approximation: count(distinct day+device+country) as proxy for unique visitors — avoids tracking real IPs"

patterns-established:
  - "Analytics API pattern: auth check → Pro gate → ownership check → batched queries → fill sparse data"
  - "Time series fill pattern: use Map lookup + Array.from(length: 30) to ensure all 30 days present"

requirements-completed: [ANAL-01, ANAL-02, ANAL-03, ANAL-04]

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 11 Plan 02: Analytics API Route Summary

**GET /api/analytics/[slug] with auth+Pro gate+ownership+batched queries for all 4 analytics dimensions (totals, unique, 30-day time series, device breakdown, top 5 countries)**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-30T00:00:00Z
- **Completed:** 2026-03-30T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Installed recharts@3.8.1 as production dependency (replacing incompatible @tremor/react)
- Created analytics API endpoint with full auth stack: 401 (unauthenticated), 403 (non-Pro), 404 (wrong owner)
- Implemented batched Promise.all queries covering all 4 analytics dimensions per D-15
- D-16 unique approximation via SQLite GROUP BY distinct (day+device+country) composite
- 30-day time series with zero-fill for days with no scans using Map + Array.from(length: 30)
- Test stubs created with 1 live 401 test and 3 fixme stubs for Pro-gated scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Install recharts dependency** - `1d197b2` (chore)
2. **Task 2: Create analytics API route with batched queries and test stubs** - `c9d7ddc` (feat)

## Files Created/Modified
- `src/pages/api/analytics/[slug].ts` - Analytics API endpoint: GET with auth, Pro gate, ownership, batched queries for all 4 dimensions
- `tests/analytics/analytics-api.spec.ts` - Test stubs: 1 live 401 test + 3 fixme stubs for Pro scenarios
- `package.json` - Added recharts@^3.8.1 to dependencies

## Decisions Made
- Used select API (not `db.query.subscriptions.findFirst`) for Pro gate check — consistent with surrounding codebase and avoids needing Drizzle relational config explicitly invoked
- recharts@3.8.1 over @tremor/react — Tremor npm package requires Tailwind v3 CSS config file; project uses Tailwind v4 CSS-first, making Tremor architecturally incompatible (confirmed in 11-RESEARCH.md)
- Unique count uses D-16 approximation: `count(distinct cast(scannedAt/86400) || device || country)` — privacy-safe proxy for unique visitors without IP tracking

## Deviations from Plan

None - plan executed exactly as written. The plan's fallback note for `db.query` vs `db.select` was applied (select API used, which is the correct choice for this codebase).

## Issues Encountered
- Worktree was behind main branch (pre-11-01). Merged main via `git merge main` to get scanEvents schema, scan event writes, and all prior phase changes. No conflicts.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Analytics API is ready for Plan 03 (analytics page UI)
- Plan 03 can call `GET /api/analytics/[slug]` and consume `{ name, slug, total, unique, timeSeries, devices, countries }` response
- recharts is installed and ready for chart components
- No blockers for Plan 03

## Self-Check: PASSED

- `src/pages/api/analytics/[slug].ts` — FOUND
- `tests/analytics/analytics-api.spec.ts` — FOUND
- `.planning/phases/11-scan-analytics-dashboard/11-02-SUMMARY.md` — FOUND
- Commit `1d197b2` (recharts install) — FOUND
- Commit `c9d7ddc` (analytics API + test stubs) — FOUND

---
*Phase: 11-scan-analytics-dashboard*
*Completed: 2026-03-30*
