---
phase: 12-foundation-improvements
plan: "02"
subsystem: frontend-copy
tags: [copy, header, pricing, hero, faq, conversion]
dependency_graph:
  requires: []
  provides: [accurate-tier-copy, pricing-nav-link, signup-cta-header]
  affects: [Header.astro, Hero.astro, pricing.astro, faq.ts]
tech_stack:
  added: []
  patterns: [surgical-content-edit, astro-component-edit]
key_files:
  created: []
  modified:
    - src/components/Header.astro
    - src/components/Hero.astro
    - src/pages/pricing.astro
decisions:
  - "Pricing nav link uses text style (not accent color) — nav link, not CTA"
  - "FAQ 'unlimited scalability' for SVG is accurate — no change needed"
  - "Replaced Starter 'No ads' item entirely with '10 dynamic QR codes' instead of keeping both"
metrics:
  duration: 96s
  completed: "2026-03-31"
  tasks_completed: 3
  files_modified: 3
---

# Phase 12 Plan 02: Copy Accuracy and Header Conversion Fixes Summary

Header, Hero, and Pricing page updated with accurate freemium copy, a Pricing nav link, and Sign Up CTA — correcting misleading claims and surfacing key conversion entry points.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add Pricing nav link and Sign Up button to Header | aa8f97d | src/components/Header.astro |
| 2 | Fix Hero copy and FAQ accuracy | 7790117 | src/components/Hero.astro |
| 3 | Fix pricing page tier limits and remove No ads | c67403a | src/pages/pricing.astro |

## What Was Built

**Header (Header.astro):**
- Added "Pricing" text nav link (`href="/pricing"`) between logo and auth buttons using text-link style (`text-gray-700 hover:text-gray-900 dark:text-slate-300`)
- Added "Sign Up" outlined-blue button (`href="/signup"`) before the existing "Sign In" button in the signed-out Clerk Show block
- Sign Up uses outlined variant: `border border-[#2563EB] text-[#2563EB]` with dark mode equivalents
- Sign In retains its filled `bg-[#2563EB] text-white` style unchanged

**Hero (Hero.astro):**
- Replaced "No signup, no limits — download as PNG or SVG instantly." with "No signup required — download as PNG or SVG instantly."
- Surrounding `<p>` tag and all classes unchanged

**FAQ (faq.ts):**
- Verified: no unqualified "unlimited" or "no limits" claims found
- One "unlimited scalability" occurrence in SVG format description — accurate technical claim, not a freemium misrepresentation

**Pricing (pricing.astro):**
- Pro card: "Unlimited QR codes" replaced with "250 QR codes" (TIER-02)
- Pro card: New "100 dynamic QR codes" list item added after the 250 QR codes item (TIER-01)
- Starter card: "No ads" list item replaced with "10 dynamic QR codes" (TIER-01, TIER-04)
- Checkout script (`startCheckout`) and all card layout/styling unchanged

## Decisions Made

1. **Pricing link style:** Text link (`text-gray-700`) not accent-colored — it is a navigation item, not a CTA. Per UI-SPEC design contract.
2. **FAQ "unlimited scalability":** The one "unlimited" occurrence in faq.ts refers to SVG vector scalability (not QR code quantity). Accurate and not misleading — no change applied.
3. **Starter "No ads" replacement:** Rather than removing the item and leaving a gap, the "No ads" item was replaced with "10 dynamic QR codes" — this simultaneously satisfies TIER-04 (remove No ads) and TIER-01 (add dynamic QR count for Starter).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all copy is wired to real product constraints.

## Self-Check: PASSED

Files verified:
- src/components/Header.astro — contains `href="/signup"`, `href="/pricing"`, "Sign Up", "border border-[#2563EB]", "bg-[#2563EB]"
- src/components/Hero.astro — contains "No signup required", no "no limits"
- src/pages/pricing.astro — contains "250 QR codes", "100 dynamic QR codes", "10 dynamic QR codes", no "Unlimited QR codes", no "No ads"

Commits verified:
- aa8f97d: Header changes
- 7790117: Hero + FAQ changes
- c67403a: Pricing changes
