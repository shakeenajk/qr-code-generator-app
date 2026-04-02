---
phase: 12-foundation-improvements
plan: 01
subsystem: api
tags: [tier-limits, drizzle, typescript, qr-save, freemium]

# Dependency graph
requires: []
provides:
  - "src/lib/tierLimits.ts: TIER_LIMITS constant with Free(5/3), Starter(100/10), Pro(250/100) values"
  - "save.ts enforces per-tier total and dynamic QR limits via TIER_LIMITS for all tiers"
affects: [12-02, 12-03, any feature that gates on QR count limits]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TIER_LIMITS as single source of truth — all limit enforcement imports from src/lib/tierLimits.ts"
    - "TierKey type cast pattern: (sub?.tier ?? 'free') as TierKey"

key-files:
  created:
    - src/lib/tierLimits.ts
    - src/lib/__tests__/tierLimits.test.ts
    - src/lib/__tests__/save-tier-limits.test.ts
  modified:
    - src/pages/api/qr/save.ts

key-decisions:
  - "TIER_LIMITS as named export only (no default export) to enable tree-shaking and explicit imports"
  - "Dynamic QR path also checks total count — dynamic codes consume a savedQrCodes slot, so both limits apply"
  - "Removed tier !== 'pro' guard from dynamic limit — limits.dynamicQr now applies to all tiers including Pro (100)"

patterns-established:
  - "Tier limit check pattern: const tier = (sub?.tier ?? 'free') as TierKey; const limits = TIER_LIMITS[tier];"
  - "totalCount check before insert in both static and dynamic paths"

requirements-completed: [TIER-03]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 12 Plan 01: Tier Limits Foundation Summary

**Centralized tier limits module (TIER_LIMITS) created and save.ts updated to enforce per-tier total and dynamic QR code counts for Free(5/3), Starter(100/10), and Pro(250/100)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T05:52:31Z
- **Completed:** 2026-03-31T05:55:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/lib/tierLimits.ts` as single source of truth for all tier enforcement logic
- Updated `save.ts` to import TIER_LIMITS and enforce per-tier limits for all tiers (not just non-Pro)
- Removed hardcoded magic number `>= 3` for dynamic QR limit; removed blanket "Pro required" gate for static QR saves
- Both dynamic and static paths now enforce `total_limit_reached` and `dynamic_limit_reached` using TIER_LIMITS values

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/lib/tierLimits.ts** - `aade937` (feat)
2. **Task 2: Update save.ts to enforce tier limits from TIER_LIMITS** - `bf6113e` (feat)

## Files Created/Modified

- `src/lib/tierLimits.ts` - Centralized TIER_LIMITS constant with TierKey type and TierLimitValues interface
- `src/lib/__tests__/tierLimits.test.ts` - TDD test file for tierLimits shape and value assertions
- `src/lib/__tests__/save-tier-limits.test.ts` - TDD test file for tier hierarchy and structure validation
- `src/pages/api/qr/save.ts` - Updated to import TIER_LIMITS, enforce per-tier total and dynamic limits

## Decisions Made

- **TIER_LIMITS as named export only** — no default export, enabling explicit imports and tree-shaking
- **Dynamic path also checks totalCount** — since each dynamic QR inserts into savedQrCodes, it consumes a total slot
- **Removed `tier !== 'pro'` guard** on dynamic limit — Pro users now have their own limit (100 dynamic) via TIER_LIMITS

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- `TIER_LIMITS` is ready for import by any plan in phase 12 that enforces limits
- 12-02 and 12-03 can import `{ TIER_LIMITS, type TierKey }` from `../../../lib/tierLimits`
- TypeScript compiles clean across entire project

---
*Phase: 12-foundation-improvements*
*Completed: 2026-03-31*
