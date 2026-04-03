---
phase: 21-campaign-scheduling
plan: 02
subsystem: ui
tags: [react, tailwind, dashboard, scheduling, countdown, lucide-react]

# Dependency graph
requires:
  - phase: 21-campaign-scheduling plan 01
    provides: PATCH /api/qr/[id] schedule fields, list API returns scheduledEnableAt/scheduledPauseAt
provides:
  - Campaign scheduling UI in QR library dashboard (status badges, countdown, date pickers)
  - getScheduleStatus helper for derived status (scheduled/active/paused/expired)
  - useCountdown hook for live countdown display
  - Schedule editor UI with datetime-local inputs and save/clear actions
affects: [future scheduling features, dashboard, QRLibrary]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "getScheduleStatus helper derives display status from epoch timestamps — single source of truth"
    - "useCountdown hook with setInterval(60000) updates countdown every minute without excessive re-renders"
    - "Optimistic state update on schedule save — UI reflects change before API response confirmed"

key-files:
  created: []
  modified:
    - src/components/dashboard/QRLibrary.tsx

key-decisions:
  - "Status badge colors: Scheduled=purple, Active=green, Paused=amber, Expired=gray — consistent with design system"
  - "Countdown granularity: days+hours when >1d, hours+minutes when <1d, minutes when <1h — avoids noisy second-level updates"
  - "datetime-local inputs convert to Unix epoch via Math.floor(new Date(inputValue).getTime() / 1000) — local timezone automatically handled by browser"

patterns-established:
  - "useCountdown(targetEpoch): string — reusable hook pattern for any future countdown needs"
  - "Schedule editor toggles via schedulingQrId state — single open editor at a time"

requirements-completed: [CAMPAIGN-01, CAMPAIGN-02]

# Metrics
duration: checkpoint
completed: 2026-03-31
---

# Phase 21 Plan 02: Campaign Scheduling UI Summary

**Dashboard QR cards extended with purple/green/amber/gray schedule badges, live countdown timers, and datetime-local schedule editor wired to PATCH /api/qr/[id]**

## Performance

- **Duration:** checkpoint (user verification)
- **Started:** 2026-03-31
- **Completed:** 2026-03-31
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 1

## Accomplishments

- Extended SavedQR interface with scheduledEnableAt and scheduledPauseAt fields
- Added getScheduleStatus helper deriving Scheduled/Active/Paused/Expired state from epoch timestamps
- Added useCountdown hook updating every 60 seconds with d/h/m granularity
- Replaced simple isPaused badge with rich status badges colored by state (purple, green, amber, gray)
- Added Schedule button (Calendar icon) expanding an inline date picker per card
- Save Schedule PATCHes the API with Unix epoch values and optimistically updates card state
- Clear Schedule nullifies both fields and returns card to normal Active/Paused display
- Human verification approved: schedule UI confirmed working in browser

## Task Commits

Each task was committed atomically:

1. **Task 1: Schedule UI, status badges, and countdown in QRLibrary** - `9faaa5e` (feat)
2. **Task 2: Verify schedule UI in browser** - checkpoint approved by user

## Files Created/Modified

- `src/components/dashboard/QRLibrary.tsx` - Extended with schedule fields, status badges, countdown hook, schedule editor UI, save/clear schedule actions

## Decisions Made

- Status badge colors follow established design system: Scheduled=purple, Active=green, Paused=amber, Expired=gray/muted
- Countdown granularity caps at minutes to avoid constant re-renders (setInterval every 60s)
- datetime-local inputs rely on browser's native local timezone conversion — no manual offset math needed
- Single schedulingQrId state ensures only one schedule editor is open at a time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Campaign scheduling UI is complete end-to-end (schema + API from Plan 01, UI from Plan 02)
- Phase 21 campaign scheduling is fully delivered
- Ready for Phase 22 (white-label / templates) or any downstream phase

---
*Phase: 21-campaign-scheduling*
*Completed: 2026-03-31*
