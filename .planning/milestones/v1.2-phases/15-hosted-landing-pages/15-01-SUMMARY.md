---
phase: 15-hosted-landing-pages
plan: 01
subsystem: api, database
tags: [drizzle, turso, vercel-blob, sqlite, landing-pages, crud, tier-limits]

# Dependency graph
requires:
  - phase: 11-analytics
    provides: "dynamicQrCodes table and IDOR-pattern from qr/[id].ts"
  - phase: 8-saved-qr-library
    provides: "savedQrCodes table, tier limit checks, nanoid slug generation"
provides:
  - "landingPages table with 20 columns, 3 indexes, FK to savedQrCodes"
  - "SQL migration drizzle/0001_lively_stranger.sql (not pushed)"
  - "POST /api/landing/upload — Vercel Blob client-upload token exchange"
  - "POST /api/landing/create — creates 3 linked rows with totalQr enforcement"
  - "GET/PUT/DELETE /api/landing/[id] — full CRUD with IDOR prevention and Blob cleanup"
affects:
  - 15-02-PLAN
  - 15-03-PLAN
  - 15-04-PLAN

# Tech tracking
tech-stack:
  added:
    - "@vercel/blob ^2.3.2 — Vercel Blob SDK for file storage"
  patterns:
    - "Three-row linked insert: savedQrCodes -> dynamicQrCodes + landingPages"
    - "Partial-update file URL contract: absent fields skipped, only present changed fields trigger del()"
    - "IDOR prevention: always AND userId in WHERE for every operation"
    - "Blob cleanup: fire del() after DB update/delete, non-fatal on failure"

key-files:
  created:
    - src/pages/api/landing/upload.ts
    - src/pages/api/landing/create.ts
    - src/pages/api/landing/[id].ts
    - drizzle/0001_lively_stranger.sql
  modified:
    - src/db/schema.ts
    - package.json

key-decisions:
  - "Partial-update contract for file URL fields: absent from PUT body = no change, present = potentially trigger del(oldUrl)"
  - "totalQr-only limit on landing page create (not dynamicQr) per D-11 — landing pages are a QR subtype"
  - "Three linked rows pattern: savedQrCodes + dynamicQrCodes + landingPages created atomically in create.ts"
  - "destinationUrl set to /p/[landingSlug] for dynamic redirect pointing at landing page"
  - "Blob cleanup is non-fatal: del() errors logged but don't fail the HTTP response (DB already committed)"

patterns-established:
  - "Three-row landing page create: savedQrCodes -> dynamicQrCodes -> landingPages (in order, no transaction)"
  - "File URL partial-update: iterate FILE_URL_FIELDS const, check `field in body` before comparing"
  - "IDOR prevention: and(eq(landingPages.id, id), eq(landingPages.userId, userId)) on every query"

requirements-completed: [CONT-01, CONT-02, CONT-03]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 15 Plan 01: Hosted Landing Pages — Data Layer Summary

**Vercel Blob upload endpoint, landingPages DB table (20 cols, 3 indexes), and full CRUD API with totalQr enforcement, partial-update file URL semantics, and Blob cleanup on edit/delete**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-31T00:00:00Z
- **Completed:** 2026-03-31T00:15:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Installed `@vercel/blob` and added `landingPages` table to Drizzle schema with all 20 columns, 2 user indexes, and FK to `savedQrCodes` with cascade delete
- Generated migration SQL `drizzle/0001_lively_stranger.sql` (ready for manual Turso push)
- Created `/api/landing/upload` for Vercel Blob client-upload token exchange with tier-based file size limits (10MB free/starter, 25MB pro)
- Created `/api/landing/create` that inserts 3 linked rows (savedQrCodes + dynamicQrCodes + landingPages) and enforces totalQr limit only
- Created `/api/landing/[id]` with GET/PUT/DELETE — IDOR prevention on all operations, partial-update file URL contract on PUT, Blob file cleanup on PUT (changed files) and DELETE

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @vercel/blob, add landingPages schema, generate migration** - `b8e6291` (feat)
2. **Task 2: Create upload, create, and CRUD API routes for landing pages** - `adbffa0` (feat)

## Files Created/Modified

- `src/db/schema.ts` — Added `landingPages` table with 20 columns, 2 indexes, FK to savedQrCodes
- `drizzle/0001_lively_stranger.sql` — Migration SQL for landing_pages table (not yet pushed to Turso)
- `drizzle/meta/_journal.json` — Updated migration journal
- `drizzle/meta/0001_snapshot.json` — Migration snapshot
- `package.json` — Added `@vercel/blob ^2.3.2`
- `src/pages/api/landing/upload.ts` — Blob client-upload token exchange, tier-based maxBytes
- `src/pages/api/landing/create.ts` — Three-row insert with totalQr enforcement and dual slug generation
- `src/pages/api/landing/[id].ts` — GET/PUT/DELETE with IDOR prevention, partial-update, Blob cleanup

## Decisions Made

- **Partial-update contract for file URL fields:** When PUT body does NOT include a file URL field (e.g. `coverImageUrl`), the field is left unchanged in the DB and the old Blob URL is NOT deleted. Only when the field IS present in the body AND the value differs from stored does `del(oldUrl)` fire. This enables the edit form to send only changed fields.
- **totalQr-only limit:** Landing pages count against totalQr (not dynamicQr) per D-11 — they are a QR code subtype, not a separate entity class.
- **Non-fatal Blob cleanup:** `del()` errors are logged but do not fail the HTTP response. The DB operation is already committed; a dangling Blob file is recoverable, a 500 response is not.

## Deviations from Plan

None — plan executed exactly as written. The `[id].ts` update logic uses `field in body` check as specified in the plan's partial-update contract. TypeScript compiled cleanly with zero errors.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before this plan's APIs will work:**

1. **Vercel Blob Store:** Create a Blob Store in Vercel Dashboard -> Project -> Storage, copy the `BLOB_READ_WRITE_TOKEN`, and add it to Project Settings -> Environment Variables.

2. **Turso Migration:** Apply the generated migration to the Turso database:
   ```
   turso db shell <db-name> < drizzle/0001_lively_stranger.sql
   ```
   Or use the Turso web console to run the SQL manually.

## Known Stubs

None — this plan creates pure API/DB infrastructure with no UI rendering.

## Next Phase Readiness

- All three API routes are ready for consumption by 15-02 (QR generator form update) and 15-03 (public landing page renderer)
- `landingPages` table schema is finalized — downstream plans can reference columns directly
- Migration SQL is generated and waiting for manual Turso push before any landing page data can be stored
- Blocker: `BLOB_READ_WRITE_TOKEN` env var must be set before upload endpoint is functional

---
*Phase: 15-hosted-landing-pages*
*Completed: 2026-03-31*
