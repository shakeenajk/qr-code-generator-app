---
phase: 08-stripe-billing
plan: 03
subsystem: billing-api
tags: [stripe, checkout, portal, subscription, clerk, drizzle-orm, astro-api-route]

# Dependency graph
requires:
  - phase: 08-01
    provides: "subscriptions table, stripeEvents table, db singleton, stripe singleton"
  - phase: 08-02
    provides: "POST /api/webhooks/stripe — authoritative write path for subscription state"
provides:
  - "POST /api/checkout/create — creates Stripe Checkout session, returns { url } for redirect"
  - "POST /api/portal/create — creates Stripe Customer Portal session, returns { url }"
  - "GET /api/subscription/status — returns { tier, status, paymentFailed } for polling after checkout"
affects: [08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "clerkClient(context) from @clerk/astro/server takes full APIContext (not just locals)"
    - "Check DB for stripeCustomerId before creating Stripe customer — prevents duplicate cus_xxx records"
    - "clerkUserId in both session metadata AND subscription_data.metadata — webhook correlation uses both paths"
    - "Portal endpoint 404 guard: no stripeCustomerId in DB → no portal session"

key-files:
  created:
    - src/pages/api/checkout/create.ts
    - src/pages/api/portal/create.ts
    - src/pages/api/subscription/status.ts
  modified: []

key-decisions:
  - "clerkClient from @clerk/astro/server is a function (context: APIContext) => ClerkClient — not a static client; must pass full APIContext"
  - "POST /api/checkout/create wraps only the Stripe API calls in try/catch — DB query failure will surface as 500 (acceptable)"
  - "Portal endpoint uses 404 (not 400) when no subscription exists — semantically correct (resource not found)"

patterns-established:
  - "Pattern: Billing read endpoints (checkout, portal, status) are thin wrappers over DB lookup + Stripe SDK call"
  - "Pattern: All billing endpoints share same 401 guard: const { userId } = locals.auth(); if (!userId) return 401"

requirements-completed: [BILL-01, BILL-02, BILL-03, BILL-04]

# Metrics
duration: 15min
completed: 2026-03-17
---

# Phase 8 Plan 03: Billing API Endpoints Summary

**Three Astro SSR billing endpoints: Stripe Checkout session creation (with clerkUserId in metadata), Customer Portal session, and subscription status polling — all with 401 auth guards and DB-first customer lookup**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-17T00:01:04Z
- **Completed:** 2026-03-17T00:16:20Z
- **Tasks:** 2
- **Files modified:** 3 (all created)

## Accomplishments

- `POST /api/checkout/create`: 401 guard, DB lookup for existing `stripeCustomerId` (avoids duplicates), Clerk customer creation with email, Checkout session with `clerkUserId` in both `metadata` and `subscription_data.metadata`
- `GET /api/subscription/status`: 401 guard, DB lookup, returns `{ tier, status, paymentFailed }` — supports post-checkout polling pattern
- `POST /api/portal/create`: 401 guard, 404 if no subscription in DB, Stripe billing portal session creation with `return_url` to dashboard
- TypeScript compiles clean; smoke test green (401 for unauthenticated checkout requests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create checkout session endpoint and subscription status endpoint** - `2c10b77` (feat)
2. **Task 2: Create Customer Portal session endpoint** - `7571af3` (feat)

## Files Created/Modified

- `src/pages/api/checkout/create.ts` — POST handler: 401 guard, DB stripeCustomerId lookup, Clerk user fetch, Stripe Checkout session with full metadata
- `src/pages/api/subscription/status.ts` — GET handler: 401 guard, DB subscription query, returns tier/status/paymentFailed
- `src/pages/api/portal/create.ts` — POST handler: 401 guard, 404 for missing subscription, Stripe Customer Portal session

## Decisions Made

- `clerkClient` from `@clerk/astro/server` is `(context: APIContext) => ClerkClient` — must pass full APIContext, not just `locals`. Changed function signature from destructured `{ request, locals }` to `(context: APIContext)` for the checkout endpoint.
- Portal endpoint returns JSON `{ error: 'No active subscription found' }` with status 404 (not plain text) — consistent with other error responses.
- Only Stripe API calls are wrapped in try/catch — DB errors will surface as 500, which is appropriate (unexpected failures should not be silently caught).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `clerkClient` from `@clerk/astro/server` requires full `APIContext`, not just `locals`**
- **Found during:** Task 1 — TypeScript compilation
- **Issue:** Plan said `import { clerkClient } from '@clerk/astro/server'` and called `clerkClient.users.getUser(userId)` treating it as a static client. The actual type is `(context: APIContext) => ClerkClient` — a factory function requiring full context.
- **Fix:** Changed checkout endpoint function signature to `(context: APIContext)` and calls `clerkClient(context).users.getUser(userId)`. `request` and `locals` destructured from `context` inside function body.
- **Files modified:** `src/pages/api/checkout/create.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** `2c10b77` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix. No scope creep.

## Issues Encountered

None beyond the auto-fixed TypeScript error above.

## User Setup Required

**Portal configuration is required before `POST /api/portal/create` can be tested:**
1. Stripe Dashboard → Billing → Customer Portal → Configure
2. Enable: cancel subscription, update payment method, view billing history
3. Save in both test mode and live mode
4. Until saved, endpoint throws "You can't create a portal session in test mode until you save your customer portal settings."

## Next Phase Readiness

- All three billing read/initiate endpoints are operational with proper auth guards
- Checkout session includes `clerkUserId` in both `metadata` and `subscription_data.metadata` — webhook handler (Plan 02) will correctly correlate events
- Status endpoint supports the 5-second polling pattern (Plan 04/05 UI)
- Portal endpoint is ready once Customer Portal is configured in Stripe Dashboard

---
*Phase: 08-stripe-billing*
*Completed: 2026-03-17*
