---
phase: 17-observability-foundation
verified: 2026-03-31T19:06:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Verify Sentry captures a real error in production"
    expected: "After deploying with PUBLIC_SENTRY_DSN set, hitting GET /api/debug/sentry?SENTRY_DEBUG_ENABLED=true causes an error to appear in the Sentry dashboard with TypeScript line numbers (not compiled JS offsets)"
    why_human: "Cannot verify DSN connectivity or Sentry dashboard ingestion programmatically without live credentials"
  - test: "Verify rate limiting fires in production"
    expected: "After deploying with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set, making 61 rapid requests to any /api/ endpoint returns HTTP 429 with a numeric Retry-After header on the 61st request"
    why_human: "Cannot exercise Upstash Redis round-trip without live credentials; graceful null fallback means local dev always passes through"
---

# Phase 17: Observability Foundation Verification Report

**Phase Goal:** Production errors are visible in Sentry and all public endpoints are rate-limited before any new API surface ships
**Verified:** 2026-03-31T19:06:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A production error on any SSR route or API handler appears in Sentry with a readable stack trace | VERIFIED | `@sentry/astro` integration registered in `astro.config.mjs`; `sentry.client.config.ts` and `sentry.server.config.ts` both initialize with `PUBLIC_SENTRY_DSN`; SDK no-ops without DSN (verified: build passes) |
| 2 | Source maps point to TypeScript line numbers, not compiled JS | VERIFIED | `sourceMapsUploadOptions` in `astro.config.mjs` with `authToken: process.env.SENTRY_AUTH_TOKEN` and `release.name: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local-dev'` — maps uploads at build time tied to deploy SHA |
| 3 | Sentry release is tied to the Vercel deploy SHA | VERIFIED | `release.name: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local-dev'` in Sentry plugin config; uses `process.env` (not `import.meta.env`) — correct for Vite build-time plugin |
| 4 | Hitting a public API endpoint more than the allowed rate returns HTTP 429 with a Retry-After header | VERIFIED | `src/middleware.ts` returns `status: 429` with `'Retry-After': String(retryAfterSeconds)` when `limiter.limit(ip).success === false`; JSON body includes `{ error: 'Too many requests', retryAfter: N }` |
| 5 | The /r/[slug] redirect path is exempt from rate limiting and never returns 429 | VERIFIED | `shouldRateLimit()` returns `false` for `pathname.startsWith('/r/')` — runs before any Redis call; behavioral spot-check: 8/8 path cases pass including `/r/abc123` and `/r/xyz` |
| 6 | Rate limiting state survives serverless cold starts (stored in Upstash Redis, not in-memory) | VERIFIED | `src/lib/rateLimit.ts` uses `@upstash/redis` Redis client backed by `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`; module-level lazy singleton — state in Redis, not a local `Map`; returns `null` gracefully when env vars absent |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `astro.config.mjs` | Sentry integration registered with release name config | VERIFIED | Contains `sentry({sourceMapsUploadOptions: {..., release: {name: process.env.VERCEL_GIT_COMMIT_SHA}}})` in integrations array |
| `sentry.client.config.ts` | Browser Sentry init with DSN and browserTracingIntegration | VERIFIED | Root-level file; `Sentry.init` with `PUBLIC_SENTRY_DSN`, `browserTracingIntegration()`, 10% sample rate, replays disabled |
| `sentry.server.config.ts` | Server Sentry init with DSN | VERIFIED | Root-level file; `Sentry.init` with `PUBLIC_SENTRY_DSN`, 10% sample rate |
| `src/pages/api/debug/sentry.ts` | Test endpoint throws known error to verify Sentry capture | VERIFIED | `export const prerender = false`; gated behind `!PROD \|\| SENTRY_DEBUG_ENABLED`; throws `'Sentry debug test — this error should appear in Sentry dashboard'` |
| `src/lib/rateLimit.ts` | Upstash rate limiter instance with sliding window | VERIFIED | `Ratelimit.slidingWindow(60, '60 s')`; uses `@upstash/redis`; module-level singleton; null fallback when env vars absent |
| `src/middleware.ts` | Middleware applying rate limiting to API routes, exempting /r/ and webhooks | VERIFIED | `sequence(rateLimitMiddleware, clerkAuth)`; `shouldRateLimit()` exempts `/r/` and `/api/webhooks/`; 429 + Retry-After + X-RateLimit-* headers on rate-limited and passing responses |
| `src/lib/sentry.ts` | (PLAN artifact — Sentry client/server init) | NOTE | This path was declared in PLAN frontmatter but never created. Sentry init is handled instead by root-level `sentry.client.config.ts` and `sentry.server.config.ts`, which is the standard `@sentry/astro` convention. The PLAN artifact path was incorrect; the intended functionality is fully present. No gap. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `astro.config.mjs` | `@sentry/astro` | integration registration | WIRED | `import sentry from '@sentry/astro'`; `sentry({...})` in integrations array |
| `astro.config.mjs` | `VERCEL_GIT_COMMIT_SHA` | release name in Sentry Vite plugin config | WIRED | `process.env.VERCEL_GIT_COMMIT_SHA ?? 'local-dev'` present at line 22 |
| `src/middleware.ts` | `src/lib/rateLimit.ts` | import and call `getRateLimiter()` | WIRED | `import { getRateLimiter } from './lib/rateLimit'`; called as `const limiter = getRateLimiter()` inside `rateLimitMiddleware` |
| `src/lib/rateLimit.ts` | `@upstash/redis` | Redis client for rate limit state | WIRED | `import { Redis } from '@upstash/redis'`; `new Redis({url, token})` passed into `Ratelimit` constructor |
| `src/middleware.ts` | `/r/` path | path exemption check before rate limiting | WIRED | `shouldRateLimit()` checks `pathname.startsWith('/r/')` before any Redis call; behavioral spot-check confirmed |

### Data-Flow Trace (Level 4)

Not applicable — all phase artifacts are infrastructure/middleware, not components rendering user-visible data. Rate limiter module is a utility; middleware and API endpoint produce headers and responses, not rendered UI.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `/r/` is exempt from rate limiting | `shouldRateLimit('/r/abc123') === false` (node inline) | `false` | PASS |
| `/r/` variant exempt | `shouldRateLimit('/r/xyz') === false` | `false` | PASS |
| Webhook routes exempt | `shouldRateLimit('/api/webhooks/stripe') === false` | `false` | PASS |
| API routes rate-limited | `shouldRateLimit('/api/qr/save') === true` | `true` | PASS |
| Analytics API rate-limited | `shouldRateLimit('/api/analytics/abc') === true` | `true` | PASS |
| Debug endpoint rate-limited | `shouldRateLimit('/api/debug/sentry') === true` | `true` | PASS |
| Root page not rate-limited | `shouldRateLimit('/') === false` | `false` | PASS |
| Dashboard page not rate-limited | `shouldRateLimit('/dashboard') === false` | `false` | PASS |
| Build passes cleanly | `npm run build` | `[build] Complete!` | PASS |

**Spot-check score: 9/9**

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| INFRA-01 | 17-01-PLAN.md | All production errors captured in Sentry with readable stack traces and source maps | SATISFIED | `@sentry/astro@^10.47.0` installed; integration in `astro.config.mjs` with source map upload and VERCEL_GIT_COMMIT_SHA release; init files configure DSN; debug endpoint for post-deploy verification |
| INFRA-02 | 17-02-PLAN.md | All public API endpoints rate-limited via Upstash Redis; /r/[slug] redirect excluded | SATISFIED | `src/middleware.ts` applies rate limiting to `/api/*`; `shouldRateLimit()` explicitly exempts `/r/`; Upstash Redis client in `src/lib/rateLimit.ts`; behavioral spot-checks pass |
| INFRA-03 | 17-02-PLAN.md | Rate limit responses return 429 with Retry-After header | SATISFIED | `src/middleware.ts` line 54–65: `status: 429`, `'Retry-After': String(retryAfterSeconds)`, JSON body `{error, retryAfter}` |

**Requirements orphan check:** REQUIREMENTS.md maps INFRA-01, INFRA-02, INFRA-03 exclusively to Phase 17. All three are accounted for in plan frontmatter and verified. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/rateLimit.ts` | 14 | `return null` | Info | Intentional graceful degradation when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` absent — middleware passes through silently in local dev. This is by design, not a stub. |

No blockers or warnings found. The `return null` path is structurally sound — middleware checks for null and calls `next()` before touching any rate-limit logic.

### Human Verification Required

#### 1. Sentry error capture in production

**Test:** Deploy with `PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN` set in Vercel environment variables. Set `SENTRY_DEBUG_ENABLED=true` temporarily. After deploy, hit `GET /api/debug/sentry`. Check the Sentry dashboard.
**Expected:** The error "Sentry debug test — this error should appear in Sentry dashboard" appears in Sentry within 30 seconds, with a stack trace pointing to TypeScript source lines (not minified JS), and the release tag matches the Vercel deploy SHA.
**Why human:** Cannot verify DSN connectivity, Sentry project existence, or dashboard ingestion programmatically without live credentials. The SDK silently no-ops when DSN is undefined, so local build passing does not prove production capture works.

#### 2. Rate limiting fires in production

**Test:** Deploy with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` set. Make 61 rapid sequential requests (e.g., using `curl` in a loop) to any `/api/` endpoint.
**Expected:** First 60 requests return 200 with `X-RateLimit-Remaining` header counting down. The 61st request returns HTTP 429 with `Retry-After: N` header and JSON body `{"error": "Too many requests", "retryAfter": N}`.
**Why human:** Cannot exercise Upstash Redis round-trip without live credentials. Local dev uses the null-fallback path (pass-through), which is correct but means automated checks cannot simulate actual 429 behavior.

### Gaps Summary

No gaps. All six observable truths are fully verified at the code level. The `src/lib/sentry.ts` artifact listed in the PLAN frontmatter does not exist, but this is a PLAN naming error — the equivalent functionality lives in root-level `sentry.client.config.ts` and `sentry.server.config.ts` as required by `@sentry/astro` convention. The Sentry integration is fully wired and the build passes. Two human verification items remain that require live credentials; these are expected operational steps, not code gaps.

---

_Verified: 2026-03-31T19:06:00Z_
_Verifier: Claude (gsd-verifier)_
