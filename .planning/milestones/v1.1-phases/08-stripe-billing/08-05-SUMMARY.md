---
phase: 08-stripe-billing
plan: 05
subsystem: pricing-ui
tags: [pricing, checkout, stripe, astro, dark-mode]
dependency_graph:
  requires: [08-03]
  provides: [public-pricing-page, hero-pro-mention]
  affects: [src/pages/pricing.astro, src/components/Hero.astro]
tech_stack:
  added: []
  patterns: [vanilla-js-toggle, PUBLIC_env_vars, static-astro-page]
key_files:
  created:
    - src/pages/pricing.astro
  modified:
    - src/components/Hero.astro
decisions:
  - "Pricing page is fully static (no prerender=false) — public SEO page needs no auth and benefits from CDN caching"
  - "Vanilla JS used for billing toggle and checkout — no React island needed on pricing page"
  - "401 from /api/checkout/create redirects to /login?redirect=/pricing to preserve billing intent after sign-in"
  - "data-testid=billing-toggle wraps the entire toggle group (not individual buttons) — matches test selector"
metrics:
  duration: 176s
  completed: "2026-03-16"
  tasks: 2
  files: 2
---

# Phase 8 Plan 05: Public Pricing Page + Hero Mention Summary

Public /pricing page with 3-column tier comparison and monthly/annual billing toggle, plus Hero Pro mention linking to /pricing.

## What Was Built

### Task 1: Public /pricing page (commit 3b8e294)

Created `src/pages/pricing.astro` — a fully static, public Astro page with:

- SEO title "Pricing — QRCraft" and meta description
- Monthly/annual billing toggle (vanilla JS) with `data-testid="billing-toggle"` wrapper
- 3-column responsive grid (1-col mobile, 3-col md+): Free, Starter, Pro
- Free card: $0 forever, links to `/` (no checkout)
- Starter card: $3.99/mo or $39/yr, `<button id="starter-cta">` triggers JS checkout
- Pro card: $7.99/mo or $79/yr, highlighted with `ring-2 ring-blue-500` + "Most Popular" badge, `<button id="pro-cta">` triggers JS checkout
- Toggle swaps `.monthly-price` / `.annual-price` / `.annual-savings` visibility via class toggling
- Checkout JS POSTs `{ priceId }` to `/api/checkout/create` using `PUBLIC_STRIPE_PRICE_*` env vars
- 401 from checkout API → redirects to `/login?redirect=/pricing`
- Full dark mode via `dark:` Tailwind variants throughout

### Task 2: Hero Pro mention (commit c21a021)

Updated `src/components/Hero.astro`:

- Added one-line `<p class="text-sm ...">Free forever · <a href="/pricing">Pro from $3.99/mo</a> — dynamic QR codes &amp; analytics</p>`
- Inserted between the main description paragraph and the generator mount point
- `mb-10` moved from description `<p>` to new line's `mb-6`; description gets `mb-4`
- Keeps visually subtle (text-sm, secondary color) so generator remains primary focus

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `src/pages/pricing.astro` created
- [x] `src/components/Hero.astro` updated
- [x] `npx tsc --noEmit` passes with no errors
- [x] Both commits exist: 3b8e294, c21a021
