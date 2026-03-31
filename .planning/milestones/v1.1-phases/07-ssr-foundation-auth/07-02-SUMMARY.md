---
phase: 07-ssr-foundation-auth
plan: "02"
subsystem: auth
tags: [vercel-adapter, clerk, middleware, ssr, astro-config]
dependency_graph:
  requires:
    - 07-01 (Playwright auth smoke test scaffolding)
  provides:
    - Vercel serverless adapter (on-demand SSR capable)
    - Clerk middleware (dashboard route protection)
    - .env.local template for local dev
  affects:
    - All SSR pages (prerender: false routes now work)
    - /dashboard (protected by clerkMiddleware)
tech_stack:
  added:
    - "@astrojs/vercel@9.0.5 (Astro 5 compatible serverless adapter)"
    - "@clerk/astro (Clerk auth integration for Astro)"
    - "lucide-astro (icon library)"
  patterns:
    - "output: 'static' with per-route prerender=false for selective SSR"
    - "clerkMiddleware + createRouteMatcher for route protection"
    - "Serverless (not edge) middleware for Clerk compatibility"
key_files:
  created:
    - src/middleware.ts
    - .env.local
  modified:
    - astro.config.mjs
    - package.json
    - package-lock.json
decisions:
  - "Use @astrojs/vercel@9.0.5 not 10.x — v10 requires Astro 6, project is on Astro 5"
  - "No edgeMiddleware option on vercel() — Clerk is incompatible with Vercel Edge runtime"
  - "Keep output: 'static' for CDN-cached homepage; auth pages use prerender=false individually"
  - "lucide-astro kept despite deprecation warning — plan explicitly requires it; migration to @lucide/astro is deferred"
metrics:
  duration: "81 seconds"
  completed_date: "2026-03-16"
  tasks_completed: 2
  files_changed: 5
---

# Phase 7 Plan 2: SSR Foundation + Clerk Middleware Summary

Vercel serverless adapter and Clerk middleware wired together. The static homepage stays CDN-prerendered; auth pages can opt into SSR individually with `export const prerender = false`. All `/dashboard` routes are now server-side protected.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install packages + rewrite astro.config.mjs + .env.local template | 3b76245 |
| 2 | Create src/middleware.ts with clerkMiddleware protecting /dashboard | bb56195 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pinned @astrojs/vercel to 9.0.5 instead of latest (10.x)**

- **Found during:** Task 1 — `npm install @astrojs/vercel` failed with ERESOLVE
- **Issue:** `@astrojs/vercel@10.x` requires `astro@^6.0.0` but project is on `astro@^5.17.1`
- **Fix:** Installed `@astrojs/vercel@9.0.5` which declares `peerDependencies: { astro: "^5.0.0" }` — the last Astro 5 compatible release
- **Files modified:** package.json, package-lock.json
- **Commit:** 3b76245

**2. [Informational] lucide-astro deprecation warning**

- **Found during:** Task 1 install
- **Issue:** `lucide-astro` is deprecated in favor of `@lucide/astro`
- **Decision:** Kept as-is per plan spec; deferred migration to avoid unplanned scope expansion
- **Action required:** Future plan should migrate to `@lucide/astro` when icon usage is implemented

## Success Criteria Verification

- [x] `@astrojs/vercel` in package.json dependencies
- [x] `@clerk/astro` in package.json dependencies
- [x] `lucide-astro` in package.json dependencies
- [x] `astro.config.mjs`: `output: 'static'`, `adapter: vercel()`, `clerk()` in integrations
- [x] No `edgeMiddleware` or `middlewareMode` in astro.config.mjs
- [x] Site URL updated to `qr-code-generator-app.com`
- [x] `src/middleware.ts` exports `onRequest` via `clerkMiddleware`
- [x] `createRouteMatcher(['/dashboard(.*)'])` guards dashboard routes
- [x] `.env.local` exists with `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` placeholders

## Self-Check: PASSED

Files created/modified:
- astro.config.mjs — FOUND
- src/middleware.ts — FOUND
- .env.local — FOUND
- package.json — FOUND

Commits:
- 3b76245 — FOUND
- bb56195 — FOUND
