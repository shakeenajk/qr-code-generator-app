---
status: partial
phase: 11-scan-analytics-dashboard
source: [11-VERIFICATION.md]
started: 2026-03-31T03:15:00Z
updated: 2026-03-31T03:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Scan event recording end-to-end
expected: Scanning a dynamic QR code (non-bot UA) creates a row in scan_events with correct device, country, and dynamicQrCodeId. Bot UA (e.g. Googlebot) does not create a row.
result: [pending]

### 2. Analytics page renders correctly for a Pro user with scan data
expected: Page shows stat cards (Total Scans, ~Unique Scans), a visible AreaChart with 30 data points, Device Breakdown rows, and Top Countries rows. Back link returns to /dashboard.
result: [pending]

### 3. Non-Pro user redirect
expected: Visiting /dashboard/analytics/[slug] as a free-tier user redirects to /pricing.
result: [pending]

### 4. Analytics button visible on dynamic QR cards
expected: In the QR library, dynamic QR cards show an 'Analytics' button with BarChart2 icon. Static QR cards do not show it.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
