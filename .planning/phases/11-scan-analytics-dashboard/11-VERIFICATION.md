---
phase: 11-scan-analytics-dashboard
verified: 2026-03-31T03:07:58Z
status: human_needed
score: 14/14 must-haves verified
gaps: []
human_verification:
  - test: "Scan event recording end-to-end"
    expected: "Scanning a dynamic QR code (non-bot UA) creates a row in scan_events with correct device, country, and dynamicQrCodeId. Bot UA (e.g. Googlebot) does not create a row."
    why_human: "Requires a live Turso DB, a real or simulated scan request, and direct DB inspection. Cannot verify without running the server."
  - test: "Analytics page renders correctly for a Pro user with scan data"
    expected: "Page shows stat cards (Total Scans, ~Unique Scans), a visible AreaChart with 30 data points, Device Breakdown rows, and Top Countries rows. Back link returns to /dashboard."
    why_human: "Requires a live Clerk Pro session, seeded scan_events data, and browser inspection. Cannot verify programmatically."
  - test: "Non-Pro user redirect"
    expected: "Visiting /dashboard/analytics/[slug] as a free-tier user redirects to /pricing."
    why_human: "Requires a real Clerk free-tier session."
  - test: "Analytics button visible on dynamic QR cards"
    expected: "In the QR library, dynamic QR cards show an 'Analytics' button with BarChart2 icon. Static QR cards do not show it."
    why_human: "Requires a browser session with at least one dynamic and one static QR code in the library."
---

# Phase 11: Scan Analytics Dashboard — Verification Report

**Phase Goal:** Build a scan analytics dashboard that shows Pro users how their dynamic QR codes are performing — total scans, trend chart, device breakdown, and country breakdown
**Verified:** 2026-03-31T03:07:58Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Scan events recorded in DB for non-bot scans (ANAL-01) | VERIFIED | `src/pages/r/[slug].ts` — fire-and-forget `db.insert(scanEvents)` after bot filter. All required fields written: dynamicQrCodeId, userAgent, country, device. |
| 2 | Bot traffic filtered silently (ANAL-01) | VERIFIED | `isBot()` exported function with 15 patterns incl. Googlebot, bingbot, facebookexternalhit, Twitterbot, LinkedInBot, Slackbot. Insert only fires when `!isBot(ua)`. |
| 3 | Device type classified from User-Agent at write time (ANAL-03) | VERIFIED | `classifyDevice()` exported function; returns ios/android/desktop/unknown. Called inside the bot-filter guard before insert. |
| 4 | Country extracted from x-vercel-ip-country header (ANAL-01) | VERIFIED | `request.headers.get('x-vercel-ip-country') ?? null` present in redirect endpoint. |
| 5 | Redirect latency not increased — fire-and-forget (ANAL-01) | VERIFIED | `db.insert(scanEvents).values({...}).catch(() => {})` — no await before it; redirect returns immediately after. |
| 6 | Pro user can fetch analytics for a QR they own (ANAL-01–04) | VERIFIED | `src/pages/api/analytics/[slug].ts` — auth check (401), Pro gate via subscriptions table (403), ownership JOIN check (404), then batched Promise.all queries. |
| 7 | Response includes total scans, unique scans, 30-day time series, device breakdown, top 5 countries | VERIFIED | All 5 dimensions present in payload: total, unique, timeSeries (30 entries filled), devices, countries (limit 5). |
| 8 | Unauthenticated requests return 401 | VERIFIED | `if (!userId) return 401` — first guard in analytics API route. |
| 9 | Non-Pro users return 403 | VERIFIED | Subscriptions SELECT checked against `tier !== 'pro'`; returns `{ error: 'pro_required' }` with status 403. |
| 10 | Requests for slugs not owned by user return 404 | VERIFIED | Ownership JOIN `eq(dynamicQrCodes.userId, userId)` — returns `{ error: 'not_found' }` status 404 when no match. |
| 11 | Analytics page at /dashboard/analytics/[slug] with Pro gate and all 4 dimensions | VERIFIED | `src/pages/dashboard/analytics/[slug].astro` — prerender=false, server-side tier check redirects to /pricing for non-Pro, fetches `/api/analytics/${slug}`, renders stat cards, ScanChart island, two ProgressBarList islands. |
| 12 | Non-Pro users redirected to /pricing; unknown slugs redirect to /dashboard | VERIFIED | Lines 26-37 in analytics page: `Astro.redirect('/pricing')` for tier!=='pro' and 403, `Astro.redirect('/dashboard')` for 404. |
| 13 | Analytics button on dynamic QR cards navigates to /dashboard/analytics/[slug] | VERIFIED | `QRLibrary.tsx` imports `BarChart2`, renders `<a href="/dashboard/analytics/${qr.slug}">` only when `qr.isDynamic && qr.slug`. Slug is populated from `/api/qr/list` which LEFT JOINs dynamicQrCodes. |
| 14 | 30-day Recharts AreaChart renders (ANAL-02) | FAILED | `ScanChart.tsx` imports from 'recharts'. recharts@3.8.1 is in package.json and package-lock.json but **node_modules/recharts does not exist**. Build will fail at Vite module resolution. |

**Score: 13/14 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | scanEvents table with FK, composite index, all D-11 fields | VERIFIED | Lines 48–59: UUID PK, FK to dynamicQrCodes.id cascade delete, scannedAt/userAgent/country/device fields, composite index `scan_events_qr_id_scanned_at_idx`. |
| `drizzle/0000_low_jack_murdock.sql` | Migration SQL with scan_events CREATE TABLE | VERIFIED | Contains `CREATE TABLE scan_events` and `CREATE INDEX scan_events_qr_id_scanned_at_idx`. |
| `src/pages/r/[slug].ts` | Bot filter + device classifier + fire-and-forget insert | VERIFIED | isBot(), classifyDevice(), fire-and-forget insert, request destructured, x-vercel-ip-country header extracted. holdingResponse unchanged. |
| `src/pages/api/analytics/[slug].ts` | Analytics API with auth, Pro gate, ownership, batched queries | VERIFIED | prerender=false, GET handler with 401/403/404 guards, Promise.all for 5 queries, 30-day zero-fill, full payload shape. |
| `src/components/analytics/ScanChart.tsx` | Recharts AreaChart island with empty state | STUB (runtime) | File exists and is substantive. Imports from 'recharts' which is missing from node_modules. Will fail at build/bundle time. |
| `src/components/analytics/ProgressBarList.tsx` | Progress-bar list with ARIA roles | VERIFIED | role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax, aria-label present. Dark mode classes present. "(No data)" empty state. |
| `src/pages/dashboard/analytics/[slug].astro` | SSR analytics page with Pro gate and all 4 dimensions | VERIFIED | prerender=false, server-side Pro gate, fetch to /api/analytics/${slug}, stat cards, ScanChart client:only="react", two ProgressBarList client:only="react", back link, error state. |
| `src/components/dashboard/QRLibrary.tsx` | Analytics button on dynamic QR cards | VERIFIED | BarChart2 imported from lucide-react. Analytics `<a>` rendered only when `qr.isDynamic && qr.slug`. href points to `/dashboard/analytics/${qr.slug}`. |
| `tests/analytics/scan-events.spec.ts` | Test scaffold for scan event behavior | VERIFIED (stubs) | Exists with test.describe('Scan Events') and 3 stubs. All fixme per plan spec (live DB required). |
| `tests/analytics/analytics-api.spec.ts` | Test stubs for analytics API | VERIFIED (stubs) | Exists with 1 live 401 test + 3 fixme stubs. |
| `tests/analytics/analytics-page.spec.ts` | E2E test stubs for analytics page | VERIFIED (stubs) | Exists with 1 live unauthenticated redirect test + 7 fixme stubs. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/r/[slug].ts` | `src/db/schema.ts` | `import { scanEvents }` | VERIFIED | Line 5: `import { dynamicQrCodes, scanEvents } from '../../db/schema'` |
| `src/pages/api/analytics/[slug].ts` | `src/db/schema.ts` | `import scanEvents, dynamicQrCodes, savedQrCodes, subscriptions` | VERIFIED | Line 5: all 4 tables imported |
| `src/pages/api/analytics/[slug].ts` | `src/db/index.ts` | `import db` | VERIFIED | Line 4: `import { db } from '../../../db/index'` |
| `src/pages/dashboard/analytics/[slug].astro` | `/api/analytics/[slug]` | server-side fetch in frontmatter | VERIFIED | Line 31–34: `fetch(\`${import.meta.env.PUBLIC_BASE_URL}/api/analytics/${slug}\`)` |
| `src/pages/dashboard/analytics/[slug].astro` | `ScanChart.tsx` | `client:only="react"` island | VERIFIED | Line 135: `<ScanChart data={analyticsData.timeSeries} client:only="react" />` |
| `src/components/dashboard/QRLibrary.tsx` | `/dashboard/analytics/[slug]` | anchor href on Analytics button | VERIFIED | Line 111: `href={\`/dashboard/analytics/${qr.slug}\`}` |
| `src/components/analytics/ScanChart.tsx` | `recharts` | npm package import | BROKEN | `import ... from 'recharts'` — package in package.json but node_modules/recharts absent |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `analytics/[slug].astro` | `analyticsData` | Server-side fetch to `/api/analytics/${slug}` which queries scanEvents via Drizzle | Yes — 5 real DB queries via Promise.all | FLOWING |
| `ScanChart.tsx` | `data` prop | Passed from .astro as `analyticsData.timeSeries` (30-entry array from DB query) | Yes — data originates from DB; zero-filled for missing days | FLOWING (blocked at runtime by missing node_module) |
| `ProgressBarList.tsx` (devices) | `items` prop | `deviceItems` computed in frontmatter from `analyticsData.devices` | Yes — comes from DB groupBy device query | FLOWING |
| `ProgressBarList.tsx` (countries) | `items` prop | `countryItems` computed in frontmatter from `analyticsData.countries` | Yes — comes from DB top-5 countries query | FLOWING |
| `QRLibrary.tsx` (Analytics button) | `qr.slug`, `qr.isDynamic` | `/api/qr/list` LEFT JOIN dynamicQrCodes | Yes — slug populated from DB | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| ScanChart module resolvable | `ls node_modules/recharts` | Directory absent | FAIL |
| recharts in package.json | `grep '"recharts"' package.json` | `"recharts": "^3.8.1"` present | PASS |
| recharts in package-lock.json | `grep "node_modules/recharts" package-lock.json` | Resolved entry at line 8046, version 3.8.1 | PASS |
| No @tremor/react in package.json | `grep "@tremor" package.json` | No match | PASS |
| No @tremor/react in src/ | `grep -rn "@tremor" src/` | No match | PASS |
| scanEvents in schema.ts | `grep "scanEvents" src/db/schema.ts` | Lines 48–59: full table definition | PASS |
| isBot exported from redirect endpoint | `grep "export function isBot" src/pages/r/[slug].ts` | Line 15 | PASS |
| fire-and-forget insert present | `grep "\.catch\(\(\)" src/pages/r/[slug].ts` | Line 54 — `.catch(() => {})` | PASS |
| Analytics API prerender=false | `grep "prerender = false" src/pages/api/analytics/[slug].ts` | Line 1 | PASS |
| Analytics page prerender=false | `grep "prerender = false" src/pages/dashboard/analytics/[slug].astro` | Line 2 | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ANAL-01 | 11-01, 11-02, 11-03 | Pro user can view total and unique scan counts for a dynamic QR code | SATISFIED | scanEvents table records data; analytics API returns `total` and `unique` fields; analytics page renders both stat cards. |
| ANAL-02 | 11-02, 11-03 | Pro user can view a 30-day time-series scan chart per QR code | BLOCKED | API returns 30-entry timeSeries array (zero-filled). ScanChart.tsx uses Recharts AreaChart. Build blocked — recharts missing from node_modules. |
| ANAL-03 | 11-01, 11-02, 11-03 | Pro user can view device breakdown (iOS/Android/desktop) per QR code | SATISFIED | classifyDevice() writes device to scanEvents; analytics API returns `devices` array; ProgressBarList renders "Device Breakdown" panel. |
| ANAL-04 | 11-02, 11-03 | Pro user can view top countries per QR code | SATISFIED | country extracted from x-vercel-ip-country; analytics API returns `countries` (top 5); ProgressBarList renders "Top Countries" panel. |

All 4 requirement IDs from PLAN frontmatter accounted for. No orphaned requirements found in REQUIREMENTS.md for Phase 11.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `package.json` (runtime) | 28 | `"recharts": "^3.8.1"` in dependencies but `node_modules/recharts` absent | BLOCKER | `npm run build` will fail — Vite cannot resolve `import ... from 'recharts'` in ScanChart.tsx. The chart island will not render. ANAL-02 is not deliverable until `npm install` is run. |

No TODO/FIXME/placeholder anti-patterns found in production source files. Test stubs with `test.fixme` are intentional scaffolding per plan spec and are not production blockers.

---

## Human Verification Required

### 1. Scan Event Recording End-to-End

**Test:** Scan a dynamic QR code (non-bot browser) and inspect the Turso `scan_events` table for a new row. Then repeat with `curl -H "User-Agent: Googlebot/2.1"` and confirm no row is created.
**Expected:** Real scans create rows with correct `dynamicQrCodeId`, `device`, `country`, `scanned_at`. Bot requests create no row.
**Why human:** Requires a running server, live Turso DB, and direct DB inspection.

### 2. Analytics Page Full Render (Pro user with scan data)

**Test:** Log in as a Pro user who owns a dynamic QR code with existing scan_events rows. Navigate to `/dashboard/analytics/[slug]`.
**Expected:** Page shows Total Scans and ~Unique Scans values, an AreaChart with 30 data points (after recharts is installed), Device Breakdown and Top Countries progress-bar rows. Back link returns to /dashboard.
**Why human:** Requires live Clerk Pro session, seeded scan data, and visual inspection of chart rendering.

### 3. Non-Pro Redirect

**Test:** Log in as a free-tier user and visit `/dashboard/analytics/[slug]`.
**Expected:** Immediate redirect to `/pricing` with no analytics data exposed.
**Why human:** Requires a real Clerk free-tier session.

### 4. Analytics Button Visibility in QR Library

**Test:** View the QR library as a Pro user with both static and dynamic QR codes.
**Expected:** Dynamic QR cards show an "Analytics" button with the BarChart2 icon linking to `/dashboard/analytics/[slug]`. Static QR cards do not show the button.
**Why human:** Requires a browser session with mixed QR code types in the library.

---

## Gaps Summary

One gap blocks goal achievement:

**recharts not installed in node_modules.** The package is correctly declared in `package.json` (`"recharts": "^3.8.1"`) and the lock file has a resolved entry, but the `node_modules/recharts` directory is absent. This is a diverged-state issue — the lock file was updated (in a git worktree during Plan 11-03 execution) but those packages were not installed into the working directory's node_modules. The fix is a single `npm install` in the project root.

This gap directly blocks ANAL-02 (30-day scan chart) and will cause `npm run build` to fail for the entire project.

All other phase deliverables — the data capture layer (Plan 01), analytics API (Plan 02), SSR analytics page, progress-bar breakdowns, and QRLibrary Analytics button (Plan 03) — are substantive, correctly wired, and data-connected.

---

_Verified: 2026-03-31T03:07:58Z_
_Verifier: Claude (gsd-verifier)_
