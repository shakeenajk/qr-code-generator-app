---
phase: 08-stripe-billing
plan: 02
subsystem: billing-webhook
tags: [stripe, webhook, drizzle-orm, clerk, middleware, idempotency]

# Dependency graph
requires:
  - phase: 08-01
    provides: "subscriptions table, stripeEvents table, db singleton, stripe singleton, tierFromPriceId helper"
provides:
  - "POST /api/webhooks/stripe — Stripe webhook handler (single authoritative write path for subscription state)"
  - "Stripe signature verification (400 on missing or invalid signature)"
  - "Idempotent event processing via stripeEvents deduplication table"
  - "All 6 subscription lifecycle events handled: checkout, updated, deleted, invoice.paid, invoice.payment_failed, trial_will_end"
  - "Middleware exclusion for /api/webhooks/* from Clerk auth"
affects: [08-03, 08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Webhook handler uses request.text() for raw body — required for stripe.webhooks.constructEvent()"
    - "Deduplication via db.insert(stripeEvents) unique constraint — silent catch on duplicate"
    - "current_period_end lives on SubscriptionItem (not Subscription) in Stripe API 2026-02-25"
    - "onConflictDoUpdate with sql`excluded.*` references for upsert in SQLite/Turso"
    - "Middleware isWebhookRoute exclusion — documents intent, prevents future auth regressions"

key-files:
  created:
    - src/pages/api/webhooks/stripe.ts
  modified:
    - src/middleware.ts

key-decisions:
  - "current_period_end is on SubscriptionItem (sub.items.data[0].current_period_end) not Subscription in API 2026-02-25"
  - "handleSubscriptionUpdated uses onConflictDoUpdate on stripeSubscriptionId (not userId) — allows out-of-order events before checkout.session.completed"
  - "Return 200 after processing (not before) — Astro SSR is sync; no 30s timeout concern like Express"

patterns-established:
  - "Pattern: Webhook dedup via stripeEvents unique constraint — catch on insert, return early"
  - "Pattern: All subscription writes use upsert (onConflictDoUpdate) for idempotency under out-of-order delivery"

requirements-completed: [BILL-04, BILL-05]

# Metrics
duration: 2min
completed: 2026-03-16
---

# Phase 8 Plan 02: Stripe Webhook Handler Summary

**POST /api/webhooks/stripe with signature verification, idempotent deduplication, and all 6 lifecycle event handlers; middleware updated to exclude webhook routes from Clerk auth**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-16T23:55:57Z
- **Completed:** 2026-03-16T23:58:17Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Updated middleware to add `isWebhookRoute` exclusion for `/api/webhooks/(.*)` — Stripe's unauthenticated POSTs bypass Clerk auth
- Created webhook handler at `src/pages/api/webhooks/stripe.ts` with `export const prerender = false`
- Signature verification: 400 on missing header, 400 on invalid signature via `stripe.webhooks.constructEvent()`
- Idempotency: `db.insert(stripeEvents).values({ eventId })` with unique constraint — catch on duplicate, return early
- `handleCheckoutCompleted`: retrieves full subscription, resolves tier via `tierFromPriceId`, upserts by `userId`
- `handleSubscriptionUpdated`: upserts by `stripeSubscriptionId` — independent upsert handles out-of-order events
- `handleSubscriptionDeleted`: updates to `tier=free`, `status=canceled`
- `handleInvoicePaid` / `handlePaymentFailed`: status-only update by `stripeCustomerId`
- `handleTrialWillEnd`: log only
- Smoke test green: `POST /api/webhooks/stripe returns 400 when stripe-signature header is missing`

## Task Commits

Each task was committed atomically:

1. **Task 1: Update middleware to exclude webhook routes from Clerk auth** - `1b7c57d` (feat)
2. **Task 2: Build Stripe webhook handler with deduplication and all 6 lifecycle events** - `3648fdf` (feat)

## Files Created/Modified

- `src/pages/api/webhooks/stripe.ts` — POST handler with signature verification, dedup, 6 event handlers
- `src/middleware.ts` — Added `isWebhookRoute` exclusion before Clerk auth check

## Decisions Made

- `current_period_end` is on `SubscriptionItem` (not `Subscription`) in Stripe API 2026-02-25 — must use `sub.items.data[0].current_period_end`
- `handleSubscriptionUpdated` conflicts on `stripeSubscriptionId` not `userId` — allows safe upsert when checkout.session.completed arrives late
- Processing happens before returning 200 (not after) — Astro SSR is synchronous, no Express-style 30s timeout risk

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `current_period_end` field location changed in Stripe API 2026-02-25**
- **Found during:** Task 2 — TypeScript compilation
- **Issue:** Research doc and plan referenced `subscription.current_period_end` but Stripe SDK v20 (API 2026-02-25) moved this field to `SubscriptionItem` (`subscription.items.data[0].current_period_end`)
- **Fix:** Updated both `handleCheckoutCompleted` and `handleSubscriptionUpdated` to read `item.current_period_end` from the first subscription item
- **Files modified:** `src/pages/api/webhooks/stripe.ts`
- **Commit:** `3648fdf`

## Issues Encountered

None beyond the auto-fixed TypeScript error above.

## Next Phase Readiness

- Webhook handler is the authoritative subscription write path — plans 03-06 can rely on subscription state being accurate in DB
- Deduplication is operational — Stripe retries will not cause double-writes
- Middleware exclusion documented and committed — no regressions on protected routes

---
*Phase: 08-stripe-billing*
*Completed: 2026-03-16*
