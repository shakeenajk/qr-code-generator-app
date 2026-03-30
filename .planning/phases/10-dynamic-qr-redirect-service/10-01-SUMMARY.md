---
phase: 10-dynamic-qr-redirect-service
plan: "01"
subsystem: backend
tags: [dynamic-qr, redirect, schema, drizzle, turso, playwright]
dependency_graph:
  requires: [09-saved-qr-library-pro-gates]
  provides: [dynamicQrCodes-schema, redirect-endpoint]
  affects: [src/db/schema.ts, src/pages/r/[slug].ts, tests/dynamic/]
tech_stack:
  added: []
  patterns: [drizzle-sqliteTable-with-index, astro-api-route-prerender-false, inline-html-holding-page]
key_files:
  created:
    - src/pages/r/[slug].ts
    - tests/dynamic/redirect.spec.ts
    - tests/dynamic/create-api.spec.ts
    - tests/dynamic/update-api.spec.ts
    - tests/dynamic/pause-api.spec.ts
  modified:
    - src/db/schema.ts
decisions:
  - Separate dynamicQrCodes table (not extending savedQrCodes) for Phase 11 analytics FK readiness
  - 307 Temporary Redirect (not 301) so destination updates take effect immediately
  - No edge runtime — Vercel serverless + Turso HTTP API provides equivalent low latency
  - userId denormalized in dynamicQrCodes for efficient count queries without JOIN (DYN-05 tier limit)
metrics:
  duration: 125s
  completed: "2026-03-29"
  tasks_completed: 2
  files_changed: 6
---

# Phase 10 Plan 01: DB Schema + Redirect Endpoint Summary

**One-liner:** `dynamicQrCodes` Drizzle table with slug/FK/isPaused pushed to Turso, plus `/r/[slug]` serverless endpoint returning 307/holding-page, with Wave 0 test.fixme scaffolds.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add dynamicQrCodes table + Wave 0 test scaffolds | f3b9b84 | src/db/schema.ts, tests/dynamic/*.spec.ts (4 files) |
| 2 | Create /r/[slug] redirect endpoint with inline holding page | e28c078 | src/pages/r/[slug].ts |

## What Was Built

### dynamicQrCodes Table (src/db/schema.ts)

New table added to existing Drizzle schema:

- `id`: UUID primary key (crypto.randomUUID())
- `savedQrCodeId`: FK to savedQrCodes.id with `onDelete: 'cascade'` — orphan prevention
- `userId`: denormalized for count queries (DYN-05 tier limit without JOIN)
- `slug`: UNIQUE constraint — collision handled by retry in API layer
- `isPaused`: integer boolean mode (same pattern as cancelAtPeriodEnd)
- `createdAt` / `updatedAt`: unix epoch integers
- Index on `userId` for count query performance

Schema pushed to Turso via `npx drizzle-kit push` — confirmed applied.

### Redirect Endpoint (src/pages/r/[slug].ts)

Serverless Astro API route implementing three cases:

1. **Active slug** — `307 Temporary Redirect` to `destinationUrl`
2. **Paused slug** — `200` with inline branded holding page
3. **Invalid/missing slug** — `404` with inline branded holding page

The holding page is fully self-contained HTML (no external requests), mobile-first with `min-height: 100svh`, dark mode via `prefers-color-scheme: dark` media query, QRCraft text logo, `<html lang="en">`, `<main>` landmark, `<h1>` heading — per D-15, D-16, D-17.

No `export const runtime = 'edge'` — confirmed not supported in Astro 5 + @astrojs/vercel 9.x. Turso's HTTP API edge distribution satisfies DYN-03 latency requirement.

### Wave 0 Test Scaffolds (tests/dynamic/)

Four files with `test.fixme` stubs covering all Phase 10 test scenarios:
- `redirect.spec.ts` — 3 stubs (active/invalid/paused)
- `create-api.spec.ts` — 3 stubs (401 unauth, free within limit, free over limit)
- `update-api.spec.ts` — 2 stubs (owner success, IDOR protection)
- `pause-api.spec.ts` — 2 stubs (pause, reactivate)

All parseable by Playwright (`Total: 30 tests in 4 files` across 3 browsers).

## Decisions Made

1. **Separate dynamicQrCodes table** (not extending savedQrCodes): Cleaner FK target for Phase 11 scan analytics; slug UNIQUE index simpler on dedicated table; list queries don't need `is_dynamic` filter.

2. **307 not 301**: Temporary redirect preserves ability to update destination. 301 is cached by browsers and would break destination updates.

3. **No edge runtime**: `export const runtime = 'edge'` is not supported per-route in Astro 5 + @astrojs/vercel 9.x. Serverless function with `@libsql/client/web` is the confirmed working pattern (already established in Phase 8).

4. **userId denormalized**: Stored directly in dynamicQrCodes to enable efficient COUNT queries for the DYN-05 free-tier limit check without requiring a JOIN to savedQrCodes.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no UI components with placeholder data wired in this plan.

## Self-Check: PASSED

- `src/db/schema.ts` exports `dynamicQrCodes` — FOUND
- `src/pages/r/[slug].ts` exists with `prerender = false` and `GET` handler — FOUND
- No `export const runtime = 'edge'` — CONFIRMED
- All 4 test files in `tests/dynamic/` — FOUND
- TypeScript compiles cleanly (`npx tsc --noEmit` — no output) — PASSED
- Playwright lists all test scaffolds — 30 tests in 4 files — PASSED
- Commits f3b9b84, e28c078 — FOUND
