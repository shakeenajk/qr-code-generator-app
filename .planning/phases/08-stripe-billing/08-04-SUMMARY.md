---
phase: 08-stripe-billing
plan: 04
subsystem: billing-ui
tags: [stripe, billing, dashboard, react, astro, tailwind, dark-mode]

# Dependency graph
requires:
  - phase: 08-03
    provides: "POST /api/checkout/create, POST /api/portal/create, GET /api/subscription/status"
provides:
  - "src/components/billing/UpgradeCTAPanel.astro — monthly/annual toggle CTA or manage subscription link"
  - "src/components/billing/TierBadge.tsx — colored pill badge for Starter/Pro tiers"
  - "src/components/billing/SubscriptionPolling.tsx — post-checkout polling with activating indicator and success toast"
  - "src/components/billing/PaymentFailureBanner.astro — dismissible warning for past_due subscriptions"
  - "Dashboard sidebar wired with UpgradeCTAPanel (tier-driven)"
  - "UserMenu shows TierBadge fetched from /api/subscription/status"
affects: [08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SubscriptionPolling uses client:only='react' — needed for browser-only APIs (window.location)"
    - "Astro inline <script> IIFE pattern for vanilla JS in .astro files (UpgradeCTAPanel, PaymentFailureBanner)"
    - "Server-side subscription fetch in dashboard/index.astro with cookie passthrough for Clerk session"
    - "DashboardLayout tier prop threaded from index.astro → DashboardLayout → Sidebar → UpgradeCTAPanel"

key-files:
  created:
    - src/components/billing/UpgradeCTAPanel.astro
    - src/components/billing/TierBadge.tsx
    - src/components/billing/PaymentFailureBanner.astro
    - src/components/billing/SubscriptionPolling.tsx
  modified:
    - src/components/dashboard/Sidebar.astro
    - src/components/UserMenu.tsx
    - src/pages/dashboard/index.astro
    - src/components/dashboard/DashboardLayout.astro

key-decisions:
  - "SubscriptionPolling uses client:only='react' (not client:load) — component uses window.location directly and must be browser-only"
  - "UserMenu fetches subscription tier on mount (client-side) — sidebar gets tier server-side; two separate fetch paths for different rendering contexts"
  - "DashboardLayout.astro threads tier prop through to Sidebar rather than having Sidebar fetch independently — avoids duplicate server fetches"

# Metrics
duration: 147s
completed: 2026-03-17
---

# Phase 8 Plan 04: Dashboard Billing UI Summary

**Four billing components (UpgradeCTAPanel with monthly/annual toggle, TierBadge colored pill, SubscriptionPolling with 500ms post-checkout poller, PaymentFailureBanner) wired into Sidebar, UserMenu, and dashboard index with server-side tier propagation**

## Performance

- **Duration:** ~2.5 min
- **Started:** 2026-03-17T00:22:45Z
- **Completed:** 2026-03-17T00:25:12Z
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 4

## Accomplishments

- `UpgradeCTAPanel.astro`: Free tier renders upgrade panel with monthly/annual toggle — toggle switches between `PUBLIC_STRIPE_PRICE_PRO_MONTHLY` and `PUBLIC_STRIPE_PRICE_PRO_ANNUAL` before POSTing to `/api/checkout/create`. Paid tiers render "Manage subscription" button that redirects to Stripe Customer Portal.
- `TierBadge.tsx`: Pure React component — returns `null` for free, blue pill for Starter, purple pill for Pro. Designed to be passed tier as prop (no internal fetch).
- `PaymentFailureBanner.astro`: Dismissible full-width warning banner with "Update payment" button (redirects to portal). Renders only when `show={true}`.
- `SubscriptionPolling.tsx`: Activates only when `window.location.search` contains `upgraded`. Polls every 500ms up to 10 attempts. Shows `data-testid="activating-indicator"` overlay. On success: cleans URL with `replaceState`, shows fixed-position green success toast (auto-dismiss 5s). On timeout: silently cleans URL.
- `Sidebar.astro`: Imports UpgradeCTAPanel, uses `flex-1` spacer to push it to the bottom of the sidebar.
- `DashboardLayout.astro`: Accepts `tier` prop, passes through to Sidebar.
- `UserMenu.tsx`: Fetches `/api/subscription/status` on mount, renders `<TierBadge tier={tier} />` next to display name.
- `dashboard/index.astro`: Fetches subscription status server-side with cookie passthrough; passes `tier` and `paymentFailed` to layout/components. Adds `<SubscriptionPolling client:only="react" />`.

## Task Commits

1. **Task 1: Create billing components** — `d761ef8` (feat)
2. **Task 2: Wire billing UI into dashboard** — `78aebdd` (feat)

## Files Created/Modified

**Created:**
- `src/components/billing/UpgradeCTAPanel.astro` — CTA panel with monthly/annual toggle or manage link
- `src/components/billing/TierBadge.tsx` — colored tier pill (blue=Starter, purple=Pro, null=Free)
- `src/components/billing/PaymentFailureBanner.astro` — dismissible payment failure warning
- `src/components/billing/SubscriptionPolling.tsx` — post-checkout polling with activating indicator + toast

**Modified:**
- `src/components/dashboard/Sidebar.astro` — added `tier` prop, imported UpgradeCTAPanel at sidebar bottom
- `src/components/UserMenu.tsx` — added tier state + useEffect fetch + TierBadge render
- `src/pages/dashboard/index.astro` — server-side subscription fetch, PaymentFailureBanner, SubscriptionPolling
- `src/components/dashboard/DashboardLayout.astro` — added `tier` prop, passed to Sidebar

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx tsc --noEmit` — clean (0 errors)
- `npx playwright test tests/billing/dashboard-billing.spec.ts --grep @smoke` — 3 passed, 6 skipped (fixme stubs)
- `npx playwright test tests/billing/polling.spec.ts --grep @smoke` — 6 skipped (fixme stubs, as expected)

## Self-Check: PASSED
