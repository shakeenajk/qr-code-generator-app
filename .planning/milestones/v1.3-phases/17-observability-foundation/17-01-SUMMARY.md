---
phase: 17-observability-foundation
plan: "01"
subsystem: observability
tags: [sentry, error-tracking, source-maps, astro]
dependency_graph:
  requires: []
  provides: [sentry-integration, sentry-source-maps, sentry-debug-endpoint]
  affects: [astro.config.mjs, package.json]
tech_stack:
  added: ["@sentry/astro@10.47.0"]
  patterns: [sentry-astro-integration, vercel-deploy-sha-release-naming]
key_files:
  created:
    - sentry.client.config.ts
    - sentry.server.config.ts
    - src/pages/api/debug/sentry.ts
  modified:
    - astro.config.mjs
    - package.json
    - .env.example
decisions:
  - "@sentry/astro integration added to astro.config.mjs with sourceMapsUploadOptions tied to VERCEL_GIT_COMMIT_SHA for deploy-mapped source maps"
  - "Debug endpoint /api/debug/sentry gated behind SENTRY_DEBUG_ENABLED in production — safe to ship without enabling"
  - "Sentry SDK silently no-ops when PUBLIC_SENTRY_DSN is undefined — build and local dev unaffected until DSN is configured"
metrics:
  duration: "5 minutes"
  completed_date: "2026-04-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 3
---

# Phase 17 Plan 01: Sentry Observability Foundation Summary

**One-liner:** @sentry/astro installed with source map upload, VERCEL_GIT_COMMIT_SHA-linked releases, and a gated debug endpoint for post-deploy verification.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Install @sentry/astro and configure integration with source maps | 39b4287 | Done |
| 2 | Create debug endpoint to verify Sentry error capture | 46976fd | Done |

## What Was Built

### Task 1: Sentry SDK Installation and Configuration
- Installed `@sentry/astro@10.47.0`
- Added `sentry()` integration to `astro.config.mjs` with `sourceMapsUploadOptions`
- Release name uses `process.env.VERCEL_GIT_COMMIT_SHA ?? 'local-dev'` — Vite plugin runs at build time in Node, so `process.env` is correct (not `import.meta.env`)
- Created `sentry.client.config.ts` with `browserTracingIntegration`, 10% sample rate, no replays
- Created `sentry.server.config.ts` with 10% sample rate
- Both configs use `PUBLIC_SENTRY_DSN` which is undefined until user creates Sentry project (SDK silently no-ops)
- Added `PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` to `.env.example`

### Task 2: Debug Endpoint
- Created `src/pages/api/debug/sentry.ts` at `/api/debug/sentry`
- Follows `export const prerender = false` convention (mandatory for all API routes)
- Throws known error: "Sentry debug test — this error should appear in Sentry dashboard"
- Gated: returns 404 in production unless `SENTRY_DEBUG_ENABLED` is set

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The Sentry integration is fully functional; it no-ops gracefully until the user supplies real DSN/auth token values.

## User Setup Required

To activate Sentry error tracking:
1. Create a Sentry project at sentry.io (type: JavaScript/Astro)
2. Copy the DSN to `PUBLIC_SENTRY_DSN` in Vercel environment variables
3. Generate an auth token at sentry.io → Settings → Auth Tokens, add to `SENTRY_AUTH_TOKEN` in Vercel (build-time only)
4. Redeploy — source maps will upload on next build and errors will appear in Sentry
5. Optionally set `SENTRY_DEBUG_ENABLED=true` temporarily to verify capture via `/api/debug/sentry`

## Self-Check: PASSED

- `sentry.client.config.ts` — FOUND
- `sentry.server.config.ts` — FOUND
- `src/pages/api/debug/sentry.ts` — FOUND
- Commit 39b4287 — FOUND
- Commit 46976fd — FOUND
- `npm run build` — PASSED
