---
phase: 20-advanced-analytics
plan: "02"
subsystem: analytics-ui
tags: [analytics, date-range, csv-export, utm, react-island]
dependency_graph:
  requires: ["20-01"]
  provides: ["analytics-date-range-ui", "csv-export-endpoint", "utm-breakdown-ui"]
  affects: ["src/pages/dashboard/analytics/[slug].astro"]
tech_stack:
  added: []
  patterns:
    - client:only React island replacing server-rendered analytics page
    - CSV generation with native JS (no library)
    - Fetch-with-download blob pattern for client-side file download
key_files:
  created:
    - src/components/analytics/DateRangePicker.tsx
    - src/components/analytics/UtmBreakdown.tsx
    - src/components/analytics/AnalyticsDashboard.tsx
    - src/pages/api/analytics/[slug]/export.ts
  modified:
    - src/pages/dashboard/analytics/[slug].astro
decisions:
  - "Analytics page refactored from server-rendered to client:only React island — enables reactive date range updates without page reloads"
  - "CSV export uses native JS (no library) — header row + per-row ISO date conversion + comma/quote escaping; capped at 10,000 rows"
  - "AnalyticsDashboard inlines COUNTRY_NAMES map (copied from old [slug].astro) — avoids shared module complication for now"
  - "Export CSV button positioned inside chart panel (right-aligned) — keeps export contextually near the time series it covers"
metrics:
  duration: "3m"
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_changed: 5
---

# Phase 20 Plan 02: Analytics UI — Date Range Picker, CSV Export, UTM Breakdown Summary

Interactive analytics dashboard with date range picker, CSV export, and UTM breakdown charts — replacing server-rendered data fetching with a reactive React island.

## What Was Built

### Task 1: DateRangePicker, UtmBreakdown, AnalyticsDashboard components
- **DateRangePicker** (`src/components/analytics/DateRangePicker.tsx`): Preset buttons (Last 7d / 30d / 90d / 12 months / All time) + custom start/end `<input type="date">` fields. "Last 30 days" selected by default. Calls `onRangeChange(from, to)` with Unix seconds.
- **UtmBreakdown** (`src/components/analytics/UtmBreakdown.tsx`): Three-column grid (UTM Source, Medium, Campaign) using inline progress bars. Max-within-dimension scaling so the largest bar = 100%. Empty state message when no UTM data exists.
- **AnalyticsDashboard** (`src/components/analytics/AnalyticsDashboard.tsx`): Main React island — fetches `/api/analytics/${slug}?from=${from}&to=${to}` on mount and on every range change. Loading skeleton, error retry, stat cards, ScanChart, device/country ProgressBarList, UtmBreakdown, and Export CSV button all wired together.

### Task 2: CSV export endpoint and analytics page refactor
- **Export endpoint** (`src/pages/api/analytics/[slug]/export.ts`): Pro-gated, ownership-checked. Queries raw scan events (scannedAt, device, country, utmSource, utmMedium, utmCampaign) filtered by date range. Returns `text/csv` with `Content-Disposition: attachment`. Header: `Date,Device,Country,UTM Source,UTM Medium,UTM Campaign`. Capped at 10,000 rows.
- **Analytics page** (`src/pages/dashboard/analytics/[slug].astro`): Stripped all server-side data fetching (Promise.all with 5 queries, toPct, COUNTRY_NAMES, ScanChart/ProgressBarList imports). Kept auth check, Pro gate, ownership check. Replaced rendering section with `<AnalyticsDashboard client:only="react" />`.

## Decisions Made

1. **client:only island for analytics page** — replaces server-rendered data; enables reactive re-fetch when date range changes without Astro page reload.
2. **CSV generation with native JS** — no library needed; escapes commas/quotes correctly; 10,000 row cap prevents memory pressure.
3. **AnalyticsDashboard owns COUNTRY_NAMES** — copied from old Astro page; no shared module needed for a single consumer.
4. **Export CSV button in chart panel header** — contextually correct; users naturally want to export the data they're looking at.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired end-to-end through the API.

## Self-Check: PASSED
