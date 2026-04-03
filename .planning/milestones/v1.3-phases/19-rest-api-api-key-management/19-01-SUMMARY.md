---
phase: 19-rest-api-api-key-management
plan: "01"
subsystem: api-key-infrastructure
tags: [api-keys, drizzle, middleware, rate-limiting, auth]
dependency_graph:
  requires: [phase-17-observability (upstash redis), phase-18-bulk-qr]
  provides: [apiKeys-table, verifyApiKey-helper, getApiKeyRateLimiter-helper, dashboard-key-crud-routes]
  affects: [src/db/schema.ts, src/middleware.ts, src/lib/apiAuth.ts, src/lib/apiRateLimit.ts, src/pages/api/dashboard/]
tech_stack:
  added: [qrcode@1.5.4, "@types/qrcode@1.5.6"]
  patterns: [opaque-api-keys, sha256-hashing, soft-delete, idor-prevention, module-level-singleton-rate-limiter]
key_files:
  created:
    - src/lib/apiAuth.ts
    - src/lib/apiRateLimit.ts
    - src/pages/api/dashboard/api-keys.ts
    - src/pages/api/dashboard/api-keys/[id].ts
    - drizzle/0002_busy_living_mummy.sql
  modified:
    - src/db/schema.ts
    - src/middleware.ts
    - package.json
decisions:
  - "SHA-256 hash for API key storage — keys are 256-bit entropy (SHA-256 sufficient; bcrypt overkill)"
  - "Opaque API keys not JWTs — instant revocation, no signing secret, matches Stripe/GitHub/Vercel pattern"
  - "Pro-only API key creation with max 10 active keys per account"
  - "Soft-delete revocation (revokedAt timestamp) — preserves audit trail"
  - "Both IP rate limiter and per-key rate limiter apply to /api/v1/* — dual-layer is acceptable for v1.3"
  - "drizzle-kit migrate not run locally — Turso credentials unavailable; migration applied on deployment"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 5
  files_modified: 3
---

# Phase 19 Plan 01: API Key Infrastructure Summary

**One-liner:** Opaque API key infrastructure with SHA-256 hashing, Clerk middleware exemption for /api/v1/*, per-key Upstash rate limiter, and dashboard CRUD routes for Pro-tier key management.

## What Was Built

### Task 1: Schema + middleware + helpers (commit: 9644a49)

**apiKeys table** added to `src/db/schema.ts` with all required columns:
- `id`, `userId`, `name`, `keyHash` (SHA-256, unique), `keyPrefix` (12 chars, display-safe)
- `usageCount` (default 0), `lastUsedAt`, `revokedAt` (null = active), `createdAt`
- Indexes: `api_keys_user_id_idx` on userId, `api_keys_key_hash_idx` on keyHash (critical for per-request lookups)

**Drizzle migration** generated as `drizzle/0002_busy_living_mummy.sql`. Migration not applied locally (no Turso credentials) — will be applied on next production deployment.

**Middleware exemption** in `src/middleware.ts`:
- Added `isPublicApiRoute` matcher for `/api/v1/(.*)`
- `clerkAuth` returns early for API routes — Clerk never touches `/api/v1/*`
- IP rate limiter still applies (both layers run by design per research Pitfall 4)

**verifyApiKey()** helper in `src/lib/apiAuth.ts`:
- Extracts Bearer token from Authorization header
- Hashes with SHA-256, queries apiKeys WHERE keyHash = ? AND revokedAt IS NULL
- Returns `{ userId, keyId, usageCount }` or null

**getApiKeyRateLimiter()** in `src/lib/apiRateLimit.ts`:
- Module-level singleton, mirrors existing rateLimit.ts pattern exactly
- `Ratelimit.slidingWindow(100, '60 s')` — 100 req/min per key
- Prefix `qrcraft:api-key-rl` (distinct from IP limiter's `qrcraft:rl`)
- Null fallback when Upstash env vars missing

**qrcode + @types/qrcode** installed — needed by Plan 02 for server-side QR generation.

### Task 2: Dashboard API key CRUD routes (commit: 6881283)

**GET /api/dashboard/api-keys** — list user's keys:
- Clerk auth required (401 if not authenticated)
- Returns id, name, keyPrefix, usageCount, lastUsedAt, revokedAt, createdAt — keyHash never exposed

**POST /api/dashboard/api-keys** — create new key:
- Clerk auth required (401)
- Pro tier check via subscriptions table (403 if not pro)
- Active key count check — max 10 (400 if exceeded)
- Name validation: 1–50 chars (400 if invalid)
- Generates `qrc_` + 64 hex chars (256-bit entropy)
- Returns raw key exactly once in response; stores only keyHash + keyPrefix

**DELETE /api/dashboard/api-keys/[id]** — revoke key:
- Clerk auth required (401)
- Soft delete: sets `revokedAt = Math.floor(Date.now() / 1000)`
- Always scoped by userId (IDOR prevention: `AND userId = ?`)
- Returns 404 if key not found or belongs to another user

## Verification

- `grep "apiKeys" src/db/schema.ts` — PASS
- `grep "isPublicApiRoute" src/middleware.ts` — PASS
- `grep "verifyApiKey" src/lib/apiAuth.ts` — PASS
- `grep "qrcraft:api-key-rl" src/lib/apiRateLimit.ts` — PASS
- `ls drizzle/*.sql | tail -1` — `drizzle/0002_busy_living_mummy.sql` PASS
- `npm run build` — PASS (both tasks)
- `grep -r "keyHash" src/pages/api/dashboard/` — keyHash only in POST (insertion), never in GET response — PASS

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all routes are fully implemented. Dashboard UI (ApiKeyManagerIsland) is scoped to Plan 03.

## Self-Check: PASSED

All created files confirmed on disk. Both task commits (9644a49, 6881283) verified in git log.
