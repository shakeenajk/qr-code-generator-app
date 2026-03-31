---
phase: 09-saved-qr-library-pro-gates
plan: "02"
subsystem: api, database
tags: [drizzle, turso, libsql, astro, clerk, api-routes, crud]

# Dependency graph
requires:
  - phase: 09-01
    provides: Wave 0 test stubs (fixme) for all library API routes
  - phase: 08
    provides: subscriptions table + Drizzle DB setup
provides:
  - saved_qr_codes Turso table (text UUID PK, userId, name, contentType, contentData, styleData, logoData nullable, thumbnailData nullable)
  - POST /api/qr/save — Pro-gated create with dual-layer auth + tier enforcement
  - GET /api/qr/list — authenticated list excluding logoData, LIMIT 50
  - PUT /api/qr/[id] — ownership-verified update (IDOR safe)
  - DELETE /api/qr/[id] — ownership-verified delete (IDOR safe)
affects:
  - 09-03 (test implementation writes against these endpoints)
  - 09-04 (UI components call these endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IDOR prevention via compound WHERE: and(eq(table.id, id), eq(table.userId, userId))"
    - "Explicit column SELECT in list endpoint — excludes large fields (logoData) by design"
    - "Belt-and-suspenders Pro gate: tier check at route entry AND re-checked per field (logoData, dotType)"
    - "Drizzle result.rowsAffected for update/delete ownership verification (returns 404 not 403)"

key-files:
  created:
    - src/pages/api/qr/save.ts
    - src/pages/api/qr/list.ts
    - src/pages/api/qr/[id].ts
  modified:
    - src/db/schema.ts

key-decisions:
  - "IDOR prevention: PUT/DELETE use compound WHERE (id + userId) — 404 not 403 for wrong-user rows (avoids leaking existence)"
  - "GET /api/qr/list uses explicit column SELECT to exclude logoData — prevents large payload for list view"
  - "save.ts re-checks Pro tier against logoData presence and dotType value after initial tier gate (belt-and-suspenders)"
  - "savedQrCodes.id uses crypto.randomUUID() text PK — unguessable URLs prevent enumeration attacks"

patterns-established:
  - "IDOR-safe update pattern: and(eq(table.id, params.id), eq(table.userId, userId)) — check rowsAffected for 404"
  - "Payload-aware SELECT: list endpoints explicitly name columns, omitting large binary fields"

requirements-completed: [LIB-01, LIB-02, LIB-03, LIB-04, GATE-01, GATE-02]

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 9 Plan 02: Saved QR Library Summary

**Drizzle saved_qr_codes table (UUID PK) pushed to Turso + four CRUD API routes with Pro gating, auth enforcement, and compound-WHERE IDOR prevention**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-17T02:27:27Z
- **Completed:** 2026-03-17T02:31:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `savedQrCodes` Drizzle schema table with text UUID PK and all required columns; pushed to Turso via drizzle-kit push
- Created POST /api/qr/save with dual Pro enforcement (tier check + per-field logoData/dotType re-check)
- Created GET /api/qr/list with explicit column SELECT excluding logoData, LIMIT 50, ordered by createdAt desc
- Created PUT + DELETE /api/qr/[id] with compound ownership WHERE clause (IDOR prevention) returning 404 for wrong-user rows

## Task Commits

Each task was committed atomically:

1. **Task 1: Add savedQrCodes schema table + run migration** - `f800062` (feat)
2. **Task 2: Create QR CRUD API routes** - `fa6f92e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/db/schema.ts` — Added savedQrCodes table definition with UUID PK and all required columns
- `src/pages/api/qr/save.ts` — POST handler: 401 (unauth), 403 (non-Pro or Pro-feature violation), 201 (success)
- `src/pages/api/qr/list.ts` — GET handler: 401 (unauth), 200 with LIMIT 50 list excluding logoData
- `src/pages/api/qr/[id].ts` — PUT + DELETE handlers with compound ownership WHERE, 401/404/200

## Decisions Made
- IDOR prevention: PUT/DELETE use compound WHERE `and(eq(id, params.id), eq(userId, userId))` — 404 (not 403) for wrong-user rows avoids existence leaking
- GET list explicitly names SELECT columns to exclude logoData from list payload (size concern per research)
- save.ts re-checks Pro tier for logoData presence and classy/classy-rounded dotType after the initial tier check (belt-and-suspenders server gate)
- savedQrCodes.id uses crypto.randomUUID() text PK — integers in URLs are guessable enumeration vectors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `drizzle-kit push --dry-run` flag not supported in this version of drizzle-kit; confirmed migration applied successfully via the successful `[✓] Changes applied` output from `drizzle-kit push`

## User Setup Required
None - no external service configuration required. (Turso credentials already configured in .env.local from Phase 8.)

## Next Phase Readiness
- All four API endpoints exist and are ready for integration testing
- Plan 09-03 can now implement the `test.fixme` stubs (all endpoints now fully operational)
- Plan 09-04 can build UI components that call these routes
- No blockers

## Self-Check: PASSED

- FOUND: src/db/schema.ts
- FOUND: src/pages/api/qr/save.ts
- FOUND: src/pages/api/qr/list.ts
- FOUND: src/pages/api/qr/[id].ts
- FOUND: .planning/phases/09-saved-qr-library-pro-gates/09-02-SUMMARY.md
- FOUND commit f800062: feat(09-02): add savedQrCodes schema table and push to Turso
- FOUND commit fa6f92e: feat(09-02): create CRUD API routes for saved QR library

---
*Phase: 09-saved-qr-library-pro-gates*
*Completed: 2026-03-17*
