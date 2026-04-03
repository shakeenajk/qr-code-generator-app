---
phase: 20-advanced-analytics
verified: 2026-03-31T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: false
---

# Phase 20: Advanced Analytics Verification Report

**Phase Goal:** Users can interrogate scan data across any date range, export it as CSV, and see UTM parameter breakdowns alongside device and country charts
**Verified:** 2026-03-31
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All truths are derived from the four ROADMAP Success Criteria plus the must_haves declared in the two PLAN frontmatters.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | scanEvents table has utmSource, utmMedium, utmCampaign text columns | VERIFIED | `src/db/schema.ts` lines 86-88: `utmSource: text('utm_source')`, `utmMedium: text('utm_medium')`, `utmCampaign: text('utm_campaign')` |
| 2 | Redirect handler extracts UTM params from destination URL and stores them in scanEvents | VERIFIED | `src/pages/r/[slug].ts` lines 51-70: try/catch URL parse, `searchParams.get('utm_source') \|\| null`, fields passed to `db.insert(scanEvents).values(...)` |
| 3 | Analytics API accepts from/to query params and filters scan data by date range | VERIFIED | `src/pages/api/analytics/[slug].ts` lines 46-87: parses `fromParam`/`toParam`, validates as finite numbers, returns 400 on invalid, applies `gte`/`lte` to all queries via `dateRangeFilter` |
| 4 | User can select a custom date range and see all analytics update for that range | VERIFIED | `DateRangePicker.tsx`: five preset buttons + two native date inputs, calls `onRangeChange(from, to)`; `AnalyticsDashboard.tsx`: `useEffect` re-fetches on `from`/`to` state change |
| 5 | User can click Export CSV and download scan data with UTM columns | VERIFIED | `AnalyticsDashboard.tsx` lines 116-135: `handleExportCsv` fetches `/api/analytics/${slug}/export?from=${from}&to=${to}`, creates blob URL, triggers download; `export.ts` returns `text/csv` with `Content-Disposition: attachment` and all six columns |
| 6 | Analytics page shows UTM breakdown chart for source, medium, and campaign | VERIFIED | `UtmBreakdown.tsx`: three-column grid with inline progress bars for each dimension, empty state message when no UTM data; wired in `AnalyticsDashboard.tsx` line 262: `<UtmBreakdown utm={data.utm} />` |
| 7 | Analytics page uses AnalyticsDashboard React island instead of server-rendered data | VERIFIED | `src/pages/dashboard/analytics/[slug].astro` line 61-65: `<AnalyticsDashboard slug={dynamicQr.qrSlug} name={dynamicQr.name} client:only="react" />`; all server-side data fetching removed |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Provided By | Lines | Status | Notes |
|----------|------------|-------|--------|-------|
| `src/db/schema.ts` | UTM columns on scanEvents | — | VERIFIED | Lines 86-88: three nullable text columns present |
| `src/pages/r/[slug].ts` | UTM extraction at scan time | — | VERIFIED | Lines 51-70: extract + insert with null fallback on parse error |
| `src/pages/api/analytics/[slug].ts` | Date-range-aware analytics + UTM aggregation | — | VERIFIED | Lines 46-87 (date range), 161-183 (UTM queries), 213-217 (utm in payload) |
| `src/components/analytics/DateRangePicker.tsx` | Date range selection UI with preset ranges | 107 (min: 30) | VERIFIED | Five presets, custom date inputs, calls `onRangeChange` |
| `src/components/analytics/AnalyticsDashboard.tsx` | Client-side analytics container with date range fetch | 265 (min: 50) | VERIFIED | Fetches on mount and on range change, full dashboard render |
| `src/components/analytics/UtmBreakdown.tsx` | UTM source/medium/campaign breakdown display | 87 (min: 20) | VERIFIED | Three-column grid, empty state, inline progress bars |
| `src/pages/dashboard/analytics/[slug].astro` | Updated analytics page wiring AnalyticsDashboard island | — | VERIFIED | Contains `AnalyticsDashboard` with `client:only="react"` |
| `src/pages/api/analytics/[slug]/export.ts` | CSV export endpoint | 120 | VERIFIED | Pro-gated, ownership-checked, returns `text/csv` with `Content-Disposition: attachment` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/r/[slug].ts` | `src/db/schema.ts` | insert with UTM fields | VERIFIED | Lines 63-71: `db.insert(scanEvents).values({ ..., utmSource, utmMedium, utmCampaign })` |
| `src/pages/api/analytics/[slug].ts` | `src/db/schema.ts` | groupBy UTM columns | VERIFIED | Lines 162-183: three separate `groupBy(scanEvents.utmSource/utmMedium/utmCampaign)` queries |
| `AnalyticsDashboard.tsx` | `/api/analytics/[slug]` | fetch with from/to query params | VERIFIED | Line 94: `` fetch(`/api/analytics/${slug}?from=${fromSec}&to=${toSec}`) `` — pattern in PLAN used literal string; actual template literal contains both params |
| `AnalyticsDashboard.tsx` | `DateRangePicker.tsx` | onRangeChange callback | VERIFIED | Line 4 (import), line 199: `<DateRangePicker onRangeChange={handleRangeChange} />` |
| `AnalyticsDashboard.tsx` | `UtmBreakdown.tsx` | passes utm data as props | VERIFIED | Line 5 (import), line 262: `<UtmBreakdown utm={data.utm} />` — `data.utm` is populated from API response |

Note: The PLAN key link patterns for `fetch.*api/analytics.*from=.*to=` failed as a single-line regex because the template literal separates params (`from=${fromSec}&to=${toSec}`). The actual wiring is verified present.

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `AnalyticsDashboard.tsx` | `data` (AnalyticsData state) | `fetch /api/analytics/${slug}?from=&to=` → `setData(json)` | Yes — API runs 8 live Drizzle queries against `scan_events` table | FLOWING |
| `src/pages/api/analytics/[slug].ts` | `utmSourceRows`, `utmMediumRows`, `utmCampaignRows` | Drizzle `groupBy(scanEvents.utmSource/Medium/Campaign)` with `isNotNull` filter | Yes — real DB aggregation, no static return | FLOWING |
| `src/pages/api/analytics/[slug]/export.ts` | `rows` | Drizzle select of `scannedAt, device, country, utmSource, utmMedium, utmCampaign` with date range filter | Yes — raw scan events from DB, `LIMIT 10000` | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — analytics dashboard requires a running server + authenticated Pro user session with live scan data. All code paths are verified statically above.

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| ANALYTICS-01 | 20-01-PLAN, 20-02-PLAN | User can select a custom date range for scan analytics | SATISFIED | DateRangePicker presets + custom inputs → AnalyticsDashboard re-fetches with updated `from`/`to`; API applies `gte`/`lte` filter to all queries |
| ANALYTICS-02 | 20-02-PLAN | User can export scan data as CSV (date, device, country, UTM parameters) | SATISFIED | `export.ts` returns `text/csv` with header `Date,Device,Country,UTM Source,UTM Medium,UTM Campaign`; `handleExportCsv` triggers blob download |
| ANALYTICS-03 | 20-01-PLAN | Dynamic QR scans capture UTM parameters from the redirect URL | SATISFIED | `r/[slug].ts` extracts `utm_source/medium/campaign` from destination URL searchParams before inserting scan event; malformed URLs guarded by try/catch |
| ANALYTICS-04 | 20-02-PLAN | Analytics dashboard shows UTM breakdown chart alongside device and country charts | SATISFIED | `UtmBreakdown.tsx` renders three-column grid with progress bars; wired at line 262 of `AnalyticsDashboard.tsx` after device and country sections |

All four requirements from REQUIREMENTS.md are satisfied. All four are claimed in plan frontmatters. No orphaned requirements.

---

### Anti-Patterns Found

No TODO, FIXME, PLACEHOLDER, or "coming soon" patterns found in any phase file. No empty return stubs. No disconnected state.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | — |

---

### Human Verification Required

#### 1. Date Range Filter Live Update

**Test:** Open analytics page for a dynamic QR code that has scan history. Click "Last 7 days" — verify stat cards, chart, device and country panels all update to reflect only the last 7 days of data.
**Expected:** Numbers change from "Last 30 days" baseline; chart shows 7 data points.
**Why human:** Requires authenticated Pro session + live scan data in DB.

#### 2. CSV Download Content

**Test:** Click "Export CSV" on the analytics page.
**Expected:** Browser downloads a `.csv` file. Opening it shows: header row `Date,Device,Country,UTM Source,UTM Medium,UTM Campaign`; each data row has an ISO date string in the first column; rows match the selected date range.
**Why human:** File download and content inspection require a browser session.

#### 3. UTM Parameter Capture End-to-End

**Test:** Create a dynamic QR code with destination URL `https://example.com?utm_source=test&utm_medium=qr&utm_campaign=launch`. Scan the QR code. Open the analytics dashboard.
**Expected:** UTM Breakdown section shows "test" under UTM Source, "qr" under UTM Medium, "launch" under UTM Campaign.
**Why human:** Requires an actual scan event to be recorded; verifies DB write and UI read are consistent.

#### 4. UTM Empty State

**Test:** Open analytics for a dynamic QR code whose destination URL has no UTM parameters.
**Expected:** UTM Breakdown section shows "No UTM data yet. Add UTM parameters to your destination URLs to track campaign performance."
**Why human:** Requires a live QR code with no UTM data in the selected date range.

---

### Gaps Summary

No gaps found. All seven observable truths are verified at all four levels (exists, substantive, wired, data flowing). All four ANALYTICS requirements are satisfied. No anti-patterns detected.

---

_Verified: 2026-03-31_
_Verifier: Claude (gsd-verifier)_
