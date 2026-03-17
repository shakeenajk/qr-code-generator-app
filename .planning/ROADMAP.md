# Roadmap: QRCraft

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-03-11)
- 🚧 **v1.1 Monetization** — Phases 7–11 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-03-11</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-03-09
- [x] Phase 2: Core Generator (3/3 plans) — completed 2026-03-10
- [x] Phase 3: Customization (5/5 plans) — completed 2026-03-10
- [x] Phase 4: Export and Launch (4/4 plans) — completed 2026-03-10
- [x] Phase 5: Complete Dark Mode (3/3 plans) — completed 2026-03-11
- [x] Phase 6: Fix Ghost Placeholder + Lighthouse Attestation (3/3 plans) — completed 2026-03-11

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Monetization (In Progress)

**Milestone Goal:** Add user accounts, Stripe-powered freemium subscriptions, a saved QR library, dynamic QR codes with a server-side redirect layer, scan analytics, and Pro-only customization gates — while keeping the anonymous static generator completely ungated.

- [x] **Phase 7: SSR Foundation + Auth** — Vercel adapter, Clerk auth, Turso DB schema, middleware, sign-up/sign-in/sign-out (completed 2026-03-16)
- [x] **Phase 8: Stripe Billing** — Checkout (monthly + annual), Customer Portal, idempotent webhook with all 6 lifecycle events (completed 2026-03-17)
- [ ] **Phase 9: Saved QR Library + Pro Gates** — QR CRUD, dashboard library view, Pro gates on logo/shapes, anonymous flow unchanged
- [ ] **Phase 10: Dynamic QR Redirect Service** — Edge function at /r/[slug], editable destination, active/paused toggle, free tier limit
- [ ] **Phase 11: Scan Analytics Dashboard** — Analytics API, total/unique scans, 30-day chart, device breakdown, top countries, bot filtering

## Phase Details

### Phase 7: SSR Foundation + Auth
**Goal**: Users can create accounts and sign in, and the app is wired for server-side rendering without breaking the static homepage
**Depends on**: Nothing (first v1.1 phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. User can sign up with email and password and land on /dashboard
  2. User can sign in with Google or GitHub via OAuth in addition to email/password
  3. User session persists across browser refresh — navigating back to /dashboard stays logged in
  4. User can sign out from any page and is redirected to home
  5. Unauthenticated visit to /dashboard redirects to /login; homepage response shows x-vercel-cache: HIT (static, not SSR)
**Plans**: 5 plans

Plans:
- [x] 07-01-PLAN.md — Test scaffolds + playwright config update for SSR dev server
- [x] 07-02-PLAN.md — Install packages, configure astro.config.mjs, wire Clerk middleware
- [x] 07-03-PLAN.md — Create /login and /signup pages, rewrite auth-aware Header + UserMenu
- [x] 07-04-PLAN.md — Build dashboard shell (DashboardLayout, Sidebar, MobileTabBar, /dashboard page)
- [x] 07-05-PLAN.md — Automated smoke tests + human verification checkpoint

### Phase 8: Stripe Billing
**Goal**: Users can upgrade to Pro and manage or cancel their subscription; Pro status is driven by webhooks, not client-side redirects
**Depends on**: Phase 7
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05
**Success Criteria** (what must be TRUE):
  1. User can start Stripe Checkout for a monthly Pro plan and be marked Pro in the app after the webhook fires
  2. User can start Stripe Checkout for an annual Pro plan at a discounted rate
  3. User can open Stripe Customer Portal to change plan, update payment, or cancel — without contacting support
  4. Pro status updates in the app within seconds of checkout completing, driven by the webhook (not the Checkout redirect)
  5. All 6 subscription lifecycle events (checkout, update, delete, payment success, payment failure, trial end) update subscription state correctly; duplicate events are safely ignored (stripe_events dedup table)
**Plans**: 6 plans

Plans:
- [ ] 08-01-PLAN.md — Install packages, DB schema (subscriptions + stripe_events), Stripe + billing singletons, test scaffolds
- [ ] 08-02-PLAN.md — Stripe webhook handler (all 6 lifecycle events, dedup), middleware webhook exclusion
- [ ] 08-03-PLAN.md — Checkout session API, Customer Portal session API, subscription status API
- [ ] 08-04-PLAN.md — Dashboard billing UI (upgrade CTA panel, tier badge, payment failure banner, post-checkout polling)
- [ ] 08-05-PLAN.md — Public /pricing page with 3-tier comparison + monthly/annual toggle, hero Pro mention
- [ ] 08-06-PLAN.md — Automated smoke suite + human verification checkpoint

### Phase 9: Saved QR Library + Pro Gates
**Goal**: Pro users have a persistent named QR library they can create, edit, and delete; Pro-only customization features are server-side gated; anonymous users remain completely ungated
**Depends on**: Phase 8
**Requirements**: LIB-01, LIB-02, LIB-03, LIB-04, GATE-01, GATE-02, GATE-03
**Success Criteria** (what must be TRUE):
  1. Pro user can save a generated QR code with a custom name and see it appear in their dashboard library
  2. Pro user can reopen a saved QR code, edit its settings, and save the updated version
  3. Pro user can delete a saved QR code and it is removed from their library
  4. Authenticated non-Pro user who attempts to use logo upload or advanced dot shapes sees a Pro upgrade prompt; the API rejects the operation server-side regardless of client state
  5. Anonymous user on the homepage can use all static generation features (including logo upload and all dot shapes) without any account prompt
**Plans**: TBD

### Phase 10: Dynamic QR Redirect Service
**Goal**: Pro users can create dynamic QR codes whose destination URL is editable post-print; scanning the QR code redirects with low latency via an edge function
**Depends on**: Phase 9
**Requirements**: DYN-01, DYN-02, DYN-03, DYN-04, DYN-05
**Success Criteria** (what must be TRUE):
  1. Pro user can create a dynamic QR code that encodes a short /r/[slug] redirect URL
  2. Pro user can change the destination URL of a dynamic QR code and the next scan redirects to the new destination without reprinting
  3. Scanning a dynamic QR code resolves to the destination via a Vercel edge function (export const runtime = 'edge'); redirect P99 latency is under 100ms globally
  4. Pro user can toggle a dynamic QR code to paused; scanning a paused code shows a holding page rather than the destination
  5. Free authenticated user attempting to create a 4th dynamic QR code is blocked with an upgrade prompt (limit: 3)
**Plans**: TBD

### Phase 11: Scan Analytics Dashboard
**Goal**: Pro users can view meaningful scan analytics per dynamic QR code — totals, time-series, device breakdown, and geography — with bot traffic filtered out of displayed counts
**Depends on**: Phase 10
**Requirements**: ANAL-01, ANAL-02, ANAL-03, ANAL-04
**Success Criteria** (what must be TRUE):
  1. Pro user can view total scan count and unique scan count for each dynamic QR code in their library
  2. Pro user can view a 30-day time-series chart showing daily scan volume for a selected QR code
  3. Pro user can view device breakdown (iOS / Android / desktop) for a selected QR code
  4. Pro user can view top countries by scan count for a selected QR code
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-03-09 |
| 2. Core Generator | v1.0 | 3/3 | Complete | 2026-03-10 |
| 3. Customization | v1.0 | 5/5 | Complete | 2026-03-10 |
| 4. Export and Launch | v1.0 | 4/4 | Complete | 2026-03-10 |
| 5. Complete Dark Mode | v1.0 | 3/3 | Complete | 2026-03-11 |
| 6. Fix Ghost Placeholder + Lighthouse | v1.0 | 3/3 | Complete | 2026-03-11 |
| 7. SSR Foundation + Auth | v1.1 | 5/5 | Complete | 2026-03-16 |
| 8. Stripe Billing | 6/6 | Complete   | 2026-03-17 | - |
| 9. Saved QR Library + Pro Gates | v1.1 | 0/TBD | Not started | - |
| 10. Dynamic QR Redirect Service | v1.1 | 0/TBD | Not started | - |
| 11. Scan Analytics Dashboard | v1.1 | 0/TBD | Not started | - |
