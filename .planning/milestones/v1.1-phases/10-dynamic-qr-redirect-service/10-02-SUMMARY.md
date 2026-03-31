---
phase: 10-dynamic-qr-redirect-service
plan: "02"
subsystem: api
tags: [drizzle-orm, nanoid, turso, libsql, dynamic-qr, slug-generation]

# Dependency graph
requires:
  - phase: 10-01
    provides: dynamicQrCodes schema table and redirect endpoint
provides:
  - POST /api/qr/save with isDynamic:true — creates both savedQrCodes and dynamicQrCodes rows, returns slug
  - Tier limit enforcement — free/starter users capped at 3 dynamic QRs (dynamic_limit_reached 403)
  - PATCH /api/qr/[id] — updates destinationUrl and/or isPaused for dynamic QRs with IDOR prevention
  - DELETE /api/qr/[id] — explicitly cascades dynamicQrCodes deletion before savedQrCodes
  - GET /api/qr/list — LEFT JOIN with dynamicQrCodes returning slug, destinationUrl, isPaused, isDynamic
affects:
  - 10-03 (dashboard UI consumes list endpoint with isDynamic field)
  - 10-04 (generator UI sends isDynamic + destinationUrl to save endpoint)
  - 10-05 (scan analytics uses dynamicQrCode row)

# Tech tracking
tech-stack:
  added: [nanoid@3 (already installed, now explicitly used)]
  patterns:
    - Dynamic QR creation forks inside existing POST save route based on isDynamic flag
    - Slug collision retry loop (3 attempts) before 500 error
    - Explicit child-row DELETE before parent-row DELETE as Turso FK cascade safety belt
    - LEFT JOIN pattern in list endpoint for optional related-table fields with computed isDynamic boolean

key-files:
  created: []
  modified:
    - src/pages/api/qr/save.ts
    - src/pages/api/qr/[id].ts
    - src/pages/api/qr/list.ts

key-decisions:
  - "Free/starter users can create dynamic QRs (up to 3); Pro gate is count-based, not tier-based for dynamic QRs"
  - "Slug collision retry uses up-to-3-attempt loop rather than infinite loop — 500 on all three collisions"
  - "Explicit DELETE of dynamicQrCodes before savedQrCodes in DELETE handler as Turso FK cascade safety belt"
  - "isDynamic is a computed field in list response (slug !== null) rather than stored column"

patterns-established:
  - "Fork-inside-existing-route pattern: isDynamic flag routes to separate code path within POST /api/qr/save"
  - "Compound WHERE (savedQrCodeId + userId) on dynamicQrCodes for IDOR prevention in PATCH"

requirements-completed: [DYN-01, DYN-02, DYN-04, DYN-05]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 10 Plan 02: Dynamic QR API Extensions Summary

**Dynamic QR CRUD API: save with nanoid slug generation + 3-QR free-tier limit, PATCH for destination/pause, cascade-safe DELETE, and list LEFT JOIN returning isDynamic metadata**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-30T12:34:50Z
- **Completed:** 2026-03-30T12:36:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- POST /api/qr/save now accepts isDynamic + destinationUrl, generates 8-char nanoid slug with collision retry, inserts both rows, returns { id, slug }
- Free/starter users capped at 3 dynamic QRs via dynamicQrCodes count query; returns distinct error code `dynamic_limit_reached` for client-side upgrade toast
- PATCH /api/qr/[id] added for dynamic QR destination URL editing and pause toggling with compound WHERE IDOR prevention
- DELETE handler explicitly removes dynamicQrCodes row before savedQrCodes as safety belt for Turso's HTTP-mode FK cascade behavior
- GET /api/qr/list upgraded with LEFT JOIN on dynamicQrCodes, returning slug, destinationUrl, isPaused, and computed isDynamic boolean per row

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend save.ts for dynamic QR creation with slug generation and tier limit** - `2381a68` (feat)
2. **Task 2: Extend [id].ts with PATCH + cascade DELETE, list.ts with leftJoin** - `1f1bed8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/api/qr/save.ts` - Extended with isDynamic path: validation, tier limit, slug generation, dual-table insert
- `src/pages/api/qr/[id].ts` - Added PATCH handler for dynamic QR fields; DELETE now cascades dynamicQrCodes explicitly
- `src/pages/api/qr/list.ts` - LEFT JOIN with dynamicQrCodes, computed isDynamic field in response

## Decisions Made
- Free/starter users CAN create dynamic QRs (up to 3); static QR saves remain Pro-only. This distinction is important — dynamic QRs are the differentiating feature, so gating them purely by count rather than tier keeps the upgrade path clear.
- Slug collision retry with 3 attempts returns 500 on all collisions. With nanoid(8) and URL-safe alphabet (64 chars), collision probability is astronomically low; 3 attempts is a practical ceiling.
- Explicit dynamicQrCodes DELETE before savedQrCodes in DELETE handler, because Turso's HTTP driver behavior with FK cascade is uncertain (Phase 10 Research open question #3).
- isDynamic computed from `slug !== null` in list response rather than adding a stored column — avoids schema change and stays in sync automatically.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three API routes (save, [id], list) are ready for consumption by the dashboard and generator UI
- Plan 10-03 (dashboard UI) can now render isDynamic badges and destination URL editing
- Plan 10-04 (generator UI) can wire isDynamic + destinationUrl into the save call
- Plan 10-05 (scan analytics) can reference dynamicQrCode rows via savedQrCodeId

## Self-Check: PASSED

- FOUND: src/pages/api/qr/save.ts
- FOUND: src/pages/api/qr/[id].ts
- FOUND: src/pages/api/qr/list.ts
- FOUND: .planning/phases/10-dynamic-qr-redirect-service/10-02-SUMMARY.md
- FOUND: commit 2381a68 (Task 1)
- FOUND: commit 1f1bed8 (Task 2)

---
*Phase: 10-dynamic-qr-redirect-service*
*Completed: 2026-03-30*
