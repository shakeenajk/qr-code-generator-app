---
phase: 08-stripe-billing
verified: 2026-03-17T00:00:00Z
status: passed
score: 5/5 requirements verified
gaps: []
human_verification:
  - test: "Annual plan Stripe Checkout"
    expected: "Selecting 'Annual' toggle and clicking 'Upgrade to Pro' or 'Get Pro' sends PUBLIC_STRIPE_PRICE_PRO_ANNUAL to /api/checkout/create and creates an annual Stripe Checkout session"
    why_human: "Requires live Stripe test keys + browser interaction; the code wiring is verified but the runtime env var value and Stripe response are not automatable without Stripe CLI"
  - test: "Stripe Customer Portal opens correctly"
    expected: "Clicking 'Manage subscription' on a paid-tier dashboard opens the Stripe Customer Portal"
    why_human: "Requires Stripe Dashboard portal config saved and an active test subscription; portal.spec.ts was never created as an automated test"
  - test: "Post-webhook Pro tier reflection"
    expected: "After checkout.session.completed fires, /api/subscription/status returns tier='pro' and dashboard shows 'Manage subscription' + purple Pro badge"
    why_human: "Requires Stripe CLI webhook forwarding in a browser session; confirmed by human in plan 06 but not automatable"
---

# Phase 8: Stripe Billing Verification Report

**Phase Goal:** Users can upgrade to Pro and manage or cancel their subscription; Pro status is driven by webhooks, not client-side redirects
**Verified:** 2026-03-17
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can start Stripe Checkout for a monthly Pro plan and be marked Pro after the webhook fires | VERIFIED | `/api/checkout/create` POSTs with `PUBLIC_STRIPE_PRICE_PRO_MONTHLY`; webhook handler upserts subscription row via `handleCheckoutCompleted`; `tierFromPriceId` resolves to `'pro'` |
| 2 | User can start Stripe Checkout for an annual Pro plan at a discounted rate | VERIFIED | Both UpgradeCTAPanel and pricing page read `PUBLIC_STRIPE_PRICE_PRO_ANNUAL` when cadence toggle is set to 'annual'; `tierFromPriceId` maps the annual price ID to `'pro'` |
| 3 | User can open Stripe Customer Portal to change plan, update payment, or cancel | VERIFIED | `/api/portal/create` calls `stripe.billingPortal.sessions.create`; 401 guard + 404 guard for no subscription; UpgradeCTAPanel "Manage subscription" button POSTs to portal endpoint |
| 4 | Pro status updates within seconds of checkout, driven by webhook (not redirect) | VERIFIED | Webhook writes subscription state; `SubscriptionPolling.tsx` polls `/api/subscription/status` every 500ms up to 10 attempts; `success_url` redirect to `?upgraded=true` triggers polling, not direct tier grant |
| 5 | All 6 lifecycle events update subscription state correctly; duplicate events safely ignored | VERIFIED | Webhook handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.trial_will_end`; dedup via `db.insert(stripeEvents)` unique constraint catch |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Plan | Status | Evidence |
|----------|------|--------|----------|
| `src/db/schema.ts` | 08-01 | VERIFIED | Exports `subscriptions` + `stripeEvents`; correct column types including `integer mode: boolean` for `cancelAtPeriodEnd`; `$defaultFn` unix timestamps |
| `src/db/index.ts` | 08-01 | VERIFIED | Imports from `drizzle-orm/libsql/web` (Vercel Edge compatible, not default Node-only import); exports `db` with schema |
| `src/lib/stripe.ts` | 08-01 | VERIFIED | Single export `stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY)`; no duplicate instances |
| `src/lib/billing.ts` | 08-01 | VERIFIED | Exports `Tier` type + `tierFromPriceId`; `PRICE_TIER_MAP` covers all 4 price env vars (starter monthly/annual, pro monthly/annual); defaults to `'free'` |
| `src/pages/api/webhooks/stripe.ts` | 08-02 | VERIFIED | `export const prerender = false`; 400 on missing signature; all 6 event handlers; dedup via `stripeEvents` insert; upsert via `onConflictDoUpdate` |
| `src/middleware.ts` | 08-02 | VERIFIED | `isWebhookRoute` exclusion before Clerk auth; `/dashboard(.*)` still protected |
| `src/pages/api/checkout/create.ts` | 08-03 | VERIFIED | 401 guard; DB lookup prevents duplicate Stripe customers; `clerkUserId` in both `metadata` and `subscription_data.metadata`; `success_url` includes `?upgraded=true` |
| `src/pages/api/portal/create.ts` | 08-03 | VERIFIED | 401 guard; 404 if no `stripeCustomerId` in DB; `billingPortal.sessions.create` with `return_url` to dashboard |
| `src/pages/api/subscription/status.ts` | 08-03 | VERIFIED | 401 guard; returns `{ tier, status, paymentFailed }` shape; defaults to `tier='free'` when no row |
| `src/components/billing/UpgradeCTAPanel.astro` | 08-04 | VERIFIED | Monthly/annual toggle; free tier shows upgrade CTA; paid tier shows "Manage subscription" button; both paths POST to correct endpoints |
| `src/components/billing/TierBadge.tsx` | 08-04 | VERIFIED | Returns null for free; blue pill for starter; purple pill for pro; pure component (tier as prop) |
| `src/components/billing/SubscriptionPolling.tsx` | 08-04 | VERIFIED | Activates on `?upgraded` in URL; 500ms interval, 10 attempts; `data-testid="activating-indicator"`; `replaceState` cleans URL; shows success toast |
| `src/components/billing/PaymentFailureBanner.astro` | 08-04 | VERIFIED | Renders only when `show=true`; "Update payment" button POSTs to `/api/portal/create`; dismiss button hides banner |
| `src/components/dashboard/Sidebar.astro` | 08-04 | VERIFIED | Imports `UpgradeCTAPanel`; `tier` prop with default `'free'`; `flex-1` spacer pushes CTA to sidebar bottom |
| `src/components/dashboard/DashboardLayout.astro` | 08-04 | VERIFIED | Accepts `tier` prop; threads it to `<Sidebar tier={tier} />` |
| `src/components/UserMenu.tsx` | 08-04 | VERIFIED | `useEffect` fetches `/api/subscription/status` on mount; imports and renders `<TierBadge tier={tier} />` next to display name |
| `src/pages/dashboard/index.astro` | 08-04 | VERIFIED | Server-side fetch of subscription status with cookie passthrough; passes `tier` + `paymentFailed`; `<SubscriptionPolling client:only="react" />`; `<PaymentFailureBanner show={paymentFailed} />` |
| `src/pages/pricing.astro` | 08-05 | VERIFIED | Static page (no `prerender=false`); `data-testid="billing-toggle"`; 3 tier cards (Free/Starter/Pro); Pro card highlighted with `ring-2 ring-blue-500` + "Most Popular" badge; monthly/annual toggle swaps `.monthly-price`/`.annual-price` visibility; CTA buttons POST to `/api/checkout/create` with correct price ID |
| `src/components/Hero.astro` | 08-05 | VERIFIED | `<p>Free forever · <a href="/pricing">Pro from $3.99/mo</a> — dynamic QR codes &amp; analytics</p>` added between subtitle and generator root |
| `tests/billing/` (5 files) | 08-01/06 | VERIFIED | 5 spec files exist: webhook, checkout, dashboard-billing, polling, pricing; `@smoke` tests cover 401 guards + page load assertions; `test.fixme` used for Stripe CLI-dependent flows |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|----------|
| `src/db/index.ts` | `src/db/schema.ts` | `import * as schema` | WIRED | Line 2: `import * as schema from './schema'` |
| `src/lib/billing.ts` | `STRIPE_PRICE_*` env vars | `import.meta.env.STRIPE_PRICE_*` | WIRED | Lines 4–7: all 4 price vars in `PRICE_TIER_MAP` |
| `src/pages/api/webhooks/stripe.ts` | `src/db/schema.ts` | `onConflictDoUpdate` | WIRED | Lines 107, 140: upsert on `subscriptions.userId` and `subscriptions.stripeSubscriptionId` |
| `src/pages/api/webhooks/stripe.ts` | `stripeEvents` (dedup) | `db.insert(stripeEvents)` | WIRED | Lines 47–52: insert with unique constraint catch |
| `src/middleware.ts` | `/api/webhooks/stripe` | `isWebhookRoute` exclusion | WIRED | Lines 5, 9: `createRouteMatcher(['/api/webhooks/(.*)'])` + early return |
| `src/pages/api/checkout/create.ts` | `subscriptions.stripeCustomerId` | DB lookup before customer creation | WIRED | Lines 37–41: `db.query.subscriptions.findFirst` checked before `stripe.customers.create` |
| `src/pages/api/checkout/create.ts` | Stripe Checkout | `metadata.clerkUserId` | WIRED | Lines 60–63: `metadata: { clerkUserId: userId }` + `subscription_data.metadata: { clerkUserId: userId }` |
| `src/pages/api/subscription/status.ts` | `subscriptions.userId` | DB query | WIRED | Lines 14–16: `db.query.subscriptions.findFirst({ where: eq(subscriptions.userId, userId) })` |
| `src/components/dashboard/Sidebar.astro` | `UpgradeCTAPanel.astro` | Astro import + tier prop | WIRED | Lines 3, 50: `import UpgradeCTAPanel` + `<UpgradeCTAPanel tier={tier} />` |
| `UpgradeCTAPanel.astro` | `/api/checkout/create` | Inline JS fetch | WIRED | Line 79: `fetch('/api/checkout/create', ...)` |
| `src/pages/dashboard/index.astro` | `/api/subscription/status` | Server-side fetch | WIRED | Lines 15–20: `await fetch(.../api/subscription/status, { headers: { cookie } })` |
| `SubscriptionPolling.tsx` | `/api/subscription/status` | Client-side polling on `?upgraded` | WIRED | Lines 8, 19: `window.location.search.includes('upgraded')` + `fetch('/api/subscription/status')` |
| `src/pages/pricing.astro` | `/api/checkout/create` | CTA button onclick JS | WIRED | Lines 247–259: `fetch('/api/checkout/create', ...)` with `PRICES[tier][cadence]` |
| `src/components/Hero.astro` | `/pricing` | `<a href="/pricing">` | WIRED | Line 16: `<a href="/pricing" class="...">Pro from $3.99/mo</a>` |

---

## Requirements Coverage

| Requirement | Plans | Description | Status | Evidence |
|-------------|-------|-------------|--------|----------|
| BILL-01 | 08-01, 08-03, 08-04, 08-05 | User can upgrade to Pro via Stripe Checkout (monthly plan) | SATISFIED | `/api/checkout/create` with monthly priceId; UpgradeCTAPanel monthly path; pricing page monthly CTA |
| BILL-02 | 08-01, 08-03, 08-04, 08-05 | User can upgrade to Pro via Stripe Checkout (annual plan at a discount) | SATISFIED | `PUBLIC_STRIPE_PRICE_PRO_ANNUAL` wired in both UpgradeCTAPanel and pricing page; cadence toggle sends annual priceId |
| BILL-03 | 08-01, 08-03, 08-04, 08-05 | User can manage or cancel subscription via Stripe Customer Portal | SATISFIED | `/api/portal/create` creates portal session; UpgradeCTAPanel "Manage subscription" + PaymentFailureBanner "Update payment" both call portal endpoint |
| BILL-04 | 08-01, 08-02, 08-03, 08-04 | Pro status reflected after checkout — webhook-driven, not redirect-driven | SATISFIED | Webhook writes DB; `success_url=?upgraded=true` triggers client polling; Pro status comes from DB query, not redirect parameter |
| BILL-05 | 08-01, 08-02 | Subscription lifecycle events handled (checkout, update, cancel, payment failure, trial end) | SATISFIED | All 6 handlers in webhook: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.trial_will_end`; dedup via `stripeEvents` table |

All 5 BILL requirements satisfied. No orphaned requirements found.

---

## Anti-Patterns Found

No blockers or warnings found.

| File | Pattern | Severity | Notes |
|------|---------|----------|-------|
| `tests/billing/` | All fixme-dependent flows use `test.fixme` not `test.skip` | Info | Intentional — visible in test reports; correct project convention |

**Note on 08-06 SUMMARY overclaim:** The summary lists `tests/billing/portal.spec.ts` and `tests/billing/status.spec.ts` as modified files. These files do not exist and never appeared in git history. The commit `81f5693` (the only 08-06 code commit) only touched `tests/billing/pricing.spec.ts`. This is a documentation error in the SUMMARY — no code gap. Portal and status endpoint 401 coverage is present in other spec files, and the human verification step in plan 06 confirmed end-to-end portal + subscription status flows.

---

## Human Verification Required

### 1. Annual Plan Checkout Flow

**Test:** Switch toggle to "Annual" on either `/pricing` or dashboard sidebar CTA, click "Get Pro" / "Upgrade to Pro"
**Expected:** Stripe Checkout page shows annual pricing ($79/yr); after payment, webhook fires with annual price ID; `tierFromPriceId` resolves to 'pro'; DB subscription row shows annual `stripePriceId`
**Why human:** Requires Stripe test keys + browser; the code wiring is confirmed but runtime env var value and Stripe session behavior are not automatable without Stripe CLI

### 2. Stripe Customer Portal Access

**Test:** As a paid user, click "Manage subscription" in dashboard sidebar
**Expected:** Redirected to Stripe Customer Portal; can view/change plan, update payment method, cancel
**Why human:** Requires Stripe Customer Portal configured in Stripe Dashboard + active test subscription; no `portal.spec.ts` with an automated smoke test was created

### 3. Post-Webhook Tier Promotion

**Test:** Complete test checkout with card 4242 4242 4242 4242; watch `stripe listen` terminal
**Expected:** `checkout.session.completed` → 200; `customer.subscription.updated` → 200; dashboard shows "Manage subscription" + purple "Pro" badge within 5 seconds
**Why human:** Requires Stripe CLI (`stripe listen`) + browser session; confirmed by human in plan 06 but cannot be re-verified programmatically

---

## Gaps Summary

No gaps. All 5 phase goal success criteria are met by substantive, wired implementations. The codebase fully delivers the stated goal: users can upgrade to Pro via Stripe Checkout (monthly and annual), manage or cancel via Customer Portal, and Pro status is written exclusively by idempotent webhooks covering all 6 lifecycle events.

The only note is that `portal.spec.ts` and `status.spec.ts` were listed in the 08-06 SUMMARY as modified files but were never created. This is a summary documentation error with no codebase impact — portal and status endpoint behavior is covered by human verification and by the existing smoke tests (401 guards are verified in the checkout and dashboard-billing spec files).

---

_Verified: 2026-03-17_
_Verifier: Claude (gsd-verifier)_
