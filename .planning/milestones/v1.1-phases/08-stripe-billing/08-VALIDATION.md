---
phase: 8
slug: stripe-billing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.58.2 |
| **Config file** | `playwright.config.ts` (root) |
| **Quick run command** | `npx playwright test tests/billing/ --grep @smoke` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds (smoke); ~2 minutes (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/billing/ --grep @smoke`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 0 | BILL-01 | smoke | `npx playwright test tests/billing/pricing.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-01-02 | 01 | 0 | BILL-01 | smoke | `npx playwright test tests/billing/checkout.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-01-03 | 01 | 0 | BILL-02 | fixme | `test.fixme` — requires Stripe test keys | ❌ W0 | ⬜ pending |
| 8-01-04 | 01 | 0 | BILL-03 | smoke | `npx playwright test tests/billing/dashboard-billing.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-01-05 | 01 | 0 | BILL-04 | smoke | `npx playwright test tests/billing/polling.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-01-06 | 01 | 0 | BILL-05 | smoke | `npx playwright test tests/billing/webhook.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-02-01 | 02 | 1 | BILL-05 | smoke | `npx playwright test tests/billing/webhook.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-02-02 | 02 | 1 | BILL-04 | fixme | `test.fixme` — requires Stripe CLI in test | ❌ W0 | ⬜ pending |
| 8-03-01 | 03 | 2 | BILL-01 | smoke | `npx playwright test tests/billing/checkout.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-03-02 | 03 | 2 | BILL-02 | smoke | `npx playwright test tests/billing/checkout.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-03-03 | 03 | 2 | BILL-03 | smoke | `npx playwright test tests/billing/dashboard-billing.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-04-01 | 04 | 3 | BILL-01 | smoke | `npx playwright test tests/billing/pricing.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-04-02 | 04 | 3 | BILL-03 | smoke | `npx playwright test tests/billing/dashboard-billing.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |
| 8-04-03 | 04 | 3 | BILL-04 | smoke | `npx playwright test tests/billing/polling.spec.ts --grep @smoke` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/billing/pricing.spec.ts` — stubs for BILL-01 (pricing page loads)
- [ ] `tests/billing/checkout.spec.ts` — stubs for BILL-01, BILL-02 (checkout API smoke)
- [ ] `tests/billing/dashboard-billing.spec.ts` — stubs for BILL-03 (manage subscription link)
- [ ] `tests/billing/polling.spec.ts` — stubs for BILL-04 (post-checkout polling UI)
- [ ] `tests/billing/webhook.spec.ts` — stubs for BILL-05 (webhook 400 on bad sig)
- [ ] `src/db/schema.ts` — Drizzle schema for subscriptions + stripe_events tables
- [ ] `src/db/index.ts` — Drizzle client singleton (`drizzle-orm/libsql/web`)
- [ ] `src/lib/stripe.ts` — Stripe client singleton
- [ ] `src/lib/billing.ts` — `tierFromPriceId()` helper
- [ ] Package install: `npm install stripe@^20.4.1` (+ drizzle-orm + @libsql/client if not present)
- [ ] Stripe Dashboard manual steps: create 4 products/prices, configure Customer Portal, create webhook endpoint

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Complete checkout flow with Stripe test card | BILL-01, BILL-02 | Requires Stripe CLI (`stripe listen`) running locally and interactive browser session | Use Stripe test card `4242 4242 4242 4242`, complete checkout, verify `?upgraded=true` redirect and tier update in DB |
| Customer Portal: cancel, update payment, switch plan | BILL-03 | Requires existing Stripe subscription and configured portal | Log in as paid user, click "Manage subscription", verify portal loads and changes reflect in DB via webhook |
| Webhook signature verification with real `stripe listen` | BILL-04, BILL-05 | Requires Stripe CLI `stripe listen --forward-to localhost:4321/api/webhooks/stripe` | Trigger test events via `stripe trigger checkout.session.completed`, verify DB updates |
| Payment failure banner on `past_due` status | BILL-05 | Requires setting subscription to past_due in Stripe test mode | Use Stripe test card `4000 0000 0000 0341` to trigger failure; verify banner appears in dashboard |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
