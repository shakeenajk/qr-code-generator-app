---
phase: 17-observability-foundation
plan: "02"
subsystem: infrastructure
tags: [rate-limiting, middleware, upstash, redis, api-security]
dependency_graph:
  requires: []
  provides: [rate-limiting-middleware, upstash-ratelimit-module]
  affects: [src/middleware.ts, all-api-routes]
tech_stack:
  added: ["@upstash/ratelimit@2.0.8", "@upstash/redis@1.37.0"]
  patterns: [sliding-window-rate-limit, middleware-sequence-chain, module-level-singleton]
key_files:
  created:
    - src/lib/rateLimit.ts
  modified:
    - src/middleware.ts
    - package.json
    - package-lock.json
    - .env.example
decisions:
  - "Sliding window (60 req/60s) chosen over fixed window for smoother burst behavior"
  - "Module-level lazy singleton for ratelimit instance — state in Redis not memory"
  - "Returns null gracefully when UPSTASH env vars absent — dev mode works without Upstash"
  - "/r/ redirect path explicitly exempt — end-user QR scans must never return 429"
  - "sequence() middleware chain puts rate limiting before Clerk auth"
metrics:
  duration: "~5m"
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 5
---

# Phase 17 Plan 02: Rate Limiting — Upstash Sliding Window Summary

**One-liner:** IP-based sliding window rate limiting (60 req/60s) via Upstash Redis wired into Astro middleware, with /r/ redirect path explicitly exempt.

## What Was Built

Rate limiting infrastructure for all public API routes using Upstash's Redis-backed sliding window algorithm. The implementation is integrated into Astro's middleware chain using `sequence()`, running before Clerk auth on every request. QR scan redirects (`/r/[slug]`) are explicitly exempt and will never return 429.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install @upstash/ratelimit + @upstash/redis, create src/lib/rateLimit.ts | 1235faf |
| 2 | Wire rate limiter into middleware with /r/ exemption and 429 + Retry-After | ece947d |

## Key Files

**Created:**
- `/Users/ranjit/Documents/Development/qr-generator/src/lib/rateLimit.ts` — Upstash rate limiter singleton with sliding window config and graceful null fallback

**Modified:**
- `/Users/ranjit/Documents/Development/qr-generator/src/middleware.ts` — sequence() chain: rateLimitMiddleware → clerkAuth; shouldRateLimit() exempts /r/ and webhooks

## Decisions Made

1. **Sliding window algorithm** — Chosen over fixed window because it smooths burst behavior at window boundaries (prevents 2x burst at window flip).
2. **60 requests per 60 seconds** — Generous enough for normal browsing/automation scripts, aggressive enough to catch abuse.
3. **Module-level lazy singleton** — `getRateLimiter()` creates the Ratelimit instance once per serverless warm instance; state lives in Redis across cold starts.
4. **Null fallback pattern** — Returns `null` when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are absent; middleware passes through silently. Local dev works without Upstash credentials.
5. **/r/ exemption is structural** — `shouldRateLimit()` checks path prefix before any Redis call, so redirect latency is zero-impact.
6. **sequence() middleware chaining** — Rate limiting runs before Clerk auth; if rate-limited, we skip unnecessary auth work.

## Rate Limit Headers

All API responses include standard rate limit headers:
- `X-RateLimit-Limit` — total requests allowed per window
- `X-RateLimit-Remaining` — requests remaining in current window
- `X-RateLimit-Reset` — Unix timestamp when window resets (ms)

429 responses additionally include:
- `Retry-After` — seconds until rate limit resets (per RFC 6585)
- JSON body: `{ error: "Too many requests", retryAfter: N }`

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — rate limiter is fully wired. When `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set in Vercel environment, rate limiting activates automatically.

## Next Steps (for operator)

1. Create Upstash Redis database at console.upstash.com
2. Copy REST URL and token into Vercel environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy — rate limiting activates automatically on next deploy

## Self-Check: PASSED

- src/lib/rateLimit.ts exists: FOUND
- src/middleware.ts updated with shouldRateLimit, sequence, Retry-After: FOUND
- Task 1 commit 1235faf: FOUND
- Task 2 commit ece947d: FOUND
- npm run build: PASSED (3 × "Completed" stages)
