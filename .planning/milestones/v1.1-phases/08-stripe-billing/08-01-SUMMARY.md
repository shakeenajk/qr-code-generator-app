---
phase: 08-stripe-billing
plan: 01
subsystem: database
tags: [stripe, drizzle-orm, turso, libsql, playwright, billing]

# Dependency graph
requires:
  - phase: 07-ssr-foundation
    provides: "Astro SSR setup, Clerk auth middleware, authenticated routes"
provides:
  - "subscriptions table schema (userId, tier, status, Stripe IDs, periods)"
  - "stripeEvents table schema for idempotency"
  - "db Drizzle singleton via libsql/web (Vercel Edge compatible)"
  - "stripe Stripe singleton from src/lib/stripe.ts"
  - "tierFromPriceId helper mapping price IDs to tier strings"
  - "5 billing test stubs in RED state for future implementation"
affects: [08-02, 08-03, 08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: [stripe@20.4.1, drizzle-orm@0.45.1, "@libsql/client@0.17.0"]
  patterns:
    - "Drizzle singleton uses drizzle-orm/libsql/web import (not default) for Vercel Edge compatibility"
    - "Stripe client initialized once in src/lib/stripe.ts — no duplicate instances"
    - "PRICE_TIER_MAP pattern for mapping Stripe price IDs to internal tier strings"
    - "test.fixme for tests requiring Stripe CLI or authenticated sessions"

key-files:
  created:
    - src/db/schema.ts
    - src/db/index.ts
    - src/lib/stripe.ts
    - src/lib/billing.ts
    - tests/billing/pricing.spec.ts
    - tests/billing/checkout.spec.ts
    - tests/billing/dashboard-billing.spec.ts
    - tests/billing/polling.spec.ts
    - tests/billing/webhook.spec.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use drizzle-orm/libsql/web (not drizzle-orm/libsql) — default import fails on Vercel Edge"
  - "integer mode: boolean for cancelAtPeriodEnd — SQLite stores booleans as 0/1"
  - "PRICE_TIER_MAP built at module init from import.meta.env — avoids repeated env lookups"

patterns-established:
  - "Pattern 1: DB singletons exported from src/db/index.ts and src/lib/stripe.ts"
  - "Pattern 2: Tier resolution centralized in billing.ts — no tier logic scattered across routes"
  - "Pattern 3: test.fixme (not .skip) for pending billing tests — visible in reports"

requirements-completed: [BILL-01, BILL-02, BILL-03, BILL-04, BILL-05]

# Metrics
duration: 9min
completed: 2026-03-16
---

# Phase 8 Plan 01: Stripe Billing Foundation Summary

**Turso DB schema (subscriptions + stripe_events), Drizzle/Stripe singletons, tierFromPriceId helper, and 5 Playwright billing test stubs in RED state**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-16T23:42:57Z
- **Completed:** 2026-03-16T23:51:42Z
- **Tasks:** 2
- **Files modified:** 9 (4 source + 5 tests + package.json + package-lock.json)

## Accomplishments

- Installed stripe@20.4.1, drizzle-orm@0.45.1, @libsql/client@0.17.0
- Created subscriptions and stripeEvents table schemas with correct types and defaults
- Established Drizzle db singleton using the /web import path required for Vercel Edge
- Created stripe singleton and tierFromPriceId helper centralizing billing logic
- Scaffolded 5 test stub files in tests/billing/ — all @smoke tests run, expected to fail until endpoints exist

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages and create DB schema + singletons** - `cdc6135` (feat)
2. **Task 2: Create billing test stubs (Wave 0 RED state)** - `884a2c5` (test)

**Plan metadata:** (docs commit — created below)

## Files Created/Modified

- `src/db/schema.ts` - subscriptions and stripeEvents table definitions via drizzle-orm/sqlite-core
- `src/db/index.ts` - Drizzle db singleton using drizzle-orm/libsql/web + schema import
- `src/lib/stripe.ts` - Stripe client singleton initialized from STRIPE_SECRET_KEY env var
- `src/lib/billing.ts` - PRICE_TIER_MAP, tierFromPriceId function, Tier type export
- `tests/billing/pricing.spec.ts` - Pricing page load and toggle tests (RED)
- `tests/billing/checkout.spec.ts` - Checkout API 401 test + fixme stubs
- `tests/billing/dashboard-billing.spec.ts` - Dashboard redirect + fixme stubs
- `tests/billing/polling.spec.ts` - Post-checkout polling fixme stubs
- `tests/billing/webhook.spec.ts` - Webhook 400 test + fixme stub
- `package.json` - Added stripe, drizzle-orm, @libsql/client dependencies

## Decisions Made

- Used `drizzle-orm/libsql/web` import — default `/libsql` is Node-only and fails on Vercel
- Used `integer mode: boolean` for cancelAtPeriodEnd since SQLite stores booleans as integers
- PRICE_TIER_MAP initialized at module level from import.meta.env to avoid per-call env lookups

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- All source contracts defined — subsequent plans can import from src/db/ and src/lib/ without creating these files
- Test stubs ready to be unfixme'd as each endpoint is implemented in plans 02-06
- Turso DB tables still need to be created via migration (drizzle-kit push or manual SQL) — this is handled in plan 08-02

---
*Phase: 08-stripe-billing*
*Completed: 2026-03-16*
