---
phase: 11-scan-analytics-dashboard
plan: "01"
subsystem: analytics-data-capture
tags: [analytics, drizzle, schema, redirect, bot-filter, device-classify]
dependency_graph:
  requires: [10-dynamic-qr-redirect-service]
  provides: [scan_events DB table, bot filter, device classifier, fire-and-forget event write]
  affects: [src/pages/r/[slug].ts, src/db/schema.ts]
tech_stack:
  added: []
  patterns: [fire-and-forget async insert, UA regex bot filter, Vercel ip-country header, Drizzle FK cascade delete]
key_files:
  created:
    - drizzle/0000_low_jack_murdock.sql
    - drizzle/meta/0000_snapshot.json
    - drizzle/meta/_journal.json
    - tests/analytics/scan-events.spec.ts
  modified:
    - src/db/schema.ts
    - src/pages/r/[slug].ts
decisions:
  - "Bot UA patterns list follows D-09: 15 patterns covering major crawlers; filter at write time before DB insert"
  - "fire-and-forget insert uses .catch(() => {}) to silently swallow analytics failures; redirect latency unaffected"
  - "classifyDevice exported (not private) for future unit testability"
  - "isBot exported (not private) for future unit testability"
  - "drizzle-kit migrate failed on missing env vars (expected in local dev); migration SQL generated successfully"
metrics:
  duration: "109s"
  completed: "2026-03-30"
  tasks: 2
  files: 6
---

# Phase 11 Plan 01: Scan Events Data Capture Layer Summary

**One-liner:** scanEvents Drizzle table with FK + composite index, redirect endpoint patched with 15-pattern bot filter and fire-and-forget device/country event write.

## What Was Built

Task 1 added the `scanEvents` table to `src/db/schema.ts` following existing table conventions: UUID text PK, FK to `dynamicQrCodes.id` with cascade delete, integer Unix timestamp, nullable userAgent/country/device text fields, and a composite index `scan_events_qr_id_scanned_at_idx` on `(dynamicQrCodeId, scannedAt)`. Drizzle Kit generated migration SQL at `drizzle/0000_low_jack_murdock.sql`.

Task 2 modified the `/r/[slug].ts` redirect endpoint to:
- Export `isBot(ua)` with 15 bot UA patterns (Googlebot, bingbot, AhrefsBot, facebookexternalhit, Twitterbot, LinkedInBot, Slackbot, WhatsApp, DuckDuckBot, YandexBot, Baiduspider, Applebot, SemrushBot, MJ12bot, Bytespider)
- Export `classifyDevice(ua)` returning `'ios' | 'android' | 'desktop' | 'unknown'`
- Update SELECT projection to include `id: dynamicQrCodes.id` (required for FK)
- Add fire-and-forget `db.insert(scanEvents).values({...}).catch(() => {})` before redirect return
- Extract `x-vercel-ip-country` header for country field
- Add `request` to the APIRoute destructuring

Test scaffold at `tests/analytics/scan-events.spec.ts` created with three `test.fixme` stubs.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `tests/analytics/scan-events.spec.ts`: All three tests are `test.fixme` stubs requiring live DB seed data or manual verification. These are intentional placeholders per the plan spec (wave 1 scaffold pattern established in Phase 07). Full test coverage deferred to plan 11-02 and the verification phase.

## Self-Check: PASSED
