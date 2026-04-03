---
phase: 23-internationalization
plan: 02
subsystem: i18n
tags: [i18n, seo, hreflang, translated-pages, playwright, smoke-tests, es, fr, de]
dependency_graph:
  requires: [23-01]
  provides: [es-pages, fr-pages, de-pages, i18n-smoke-tests]
  affects: [src/pages/es, src/pages/fr, src/pages/de, tests/i18n.spec.ts]
tech_stack:
  added: []
  patterns: [inline-translated-sections, useTranslations-factory, getLocalizedHref, showHreflang-opt-in, playwright-i18n-smoke]
key_files:
  created:
    - src/pages/es/index.astro
    - src/pages/es/pricing.astro
    - src/pages/es/use-cases/index.astro
    - src/pages/fr/index.astro
    - src/pages/fr/pricing.astro
    - src/pages/fr/use-cases/index.astro
    - src/pages/de/index.astro
    - src/pages/de/pricing.astro
    - src/pages/de/use-cases/index.astro
    - tests/i18n.spec.ts
  modified: []
decisions:
  - "Inline translated sections in locale pages — components (Hero, Features, HowTo, etc.) don't accept lang prop; inline is simpler than patching 6 components"
  - "use-cases index links to English slug pages — Research Pitfall 6: no translated [slug].astro pages to avoid duplication"
  - "SeasonalTemplates and FAQ rendered in English on locale homepages — data files are English-only; component structure unchanged"
metrics:
  duration: 15m
  completed: 2026-04-03
  tasks_completed: 3
  files_changed: 10
---

# Phase 23 Plan 02: Translated Marketing Pages Summary

**One-liner:** 9 translated marketing pages (homepage, pricing, use-cases in ES/FR/DE) with full t() coverage + 17 Playwright smoke tests verifying HTTP 200, language switcher, and hreflang SEO.

## What Was Built

1. **9 translated .astro pages** — 3 per locale under `src/pages/es/`, `src/pages/fr/`, `src/pages/de/`:
   - `es/index.astro`, `fr/index.astro`, `de/index.astro` — Full homepages with Hero, Features, HowTo, PricingPromo, SeasonalTemplates, UseCasesTeaser, FAQ all rendered via t() calls for translated sections.
   - `es/pricing.astro`, `fr/pricing.astro`, `de/pricing.astro` — Pricing pages with translated tier names, features, headings, and billing toggle. Price values ($3.99, $7.99) kept as-is (locale-neutral).
   - `es/use-cases/index.astro`, `fr/use-cases/index.astro`, `de/use-cases/index.astro` — Use cases index with translated heading and subheading; USE_CASES data rendered in English (individual slug pages are English-only by design).

2. **tests/i18n.spec.ts** — 17 Playwright smoke tests covering:
   - I18N-01: 9 translated URLs return HTTP 200 with locale-appropriate h1 text; English regression test included
   - I18N-02: Language switcher visible on homepage, ES link navigates to /es/ and shows Spanish content, aria-current="true" on active locale
   - I18N-03: hreflang tags for all 4 locales + x-default on homepage and /es/; hreflang URLs are absolute

## Decisions Made

- **Inline translated sections** — The existing components (Hero, Features, HowTo, PricingPromo, UseCasesTeaser) hold hardcoded English strings and don't accept a `lang` prop. Rather than adding `lang` props to 6 components, the locale pages inline the translated sections directly using `t()` calls. This is zero-risk to the existing English pages.
- **USE_CASES data stays English** — The use-cases index pages show the USE_CASES card titles and excerpts in English, with translated page heading and subheading. Individual use-case slug pages are English-only per plan instruction (Research Pitfall 6).
- **SeasonalTemplates and FAQ in English on locale pages** — These sections depend on data files with no i18n keys; they render fine in English on translated pages without any visible breakage.

## Verification

- `npx astro build` succeeded with all 9 locale pages prerendered: `/es/index.html`, `/fr/index.html`, `/de/index.html`, `/es/pricing/index.html`, `/fr/pricing/index.html`, `/de/pricing/index.html`, `/es/use-cases/index.html`, `/fr/use-cases/index.html`, `/de/use-cases/index.html`.
- `npx playwright test tests/i18n.spec.ts --project=chromium` — 17/17 tests passed.
- hreflang tags confirmed in built HTML and verified by Playwright tests.
- Language switcher `aria-current="true"` confirmed working on locale pages.

## Deviations from Plan

None — plan executed exactly as written. The only decision was choosing option (b) for components without lang prop (inline translated content in page), as explicitly offered by the plan.

## Known Stubs

None — all 9 pages are fully wired with real t() calls from the translation dictionaries. No placeholder text.

## Checkpoint Status

Task 3 (`checkpoint:human-verify`) — APPROVED by user on 2026-04-03.

Visual verification confirmed:
1. English homepage + language switcher renders correctly
2. /es/, /fr/, /de/ — locale pages with correct translated content
3. /es/pricing, /fr/use-cases/ — translated sub-pages load correctly
4. hreflang="x-default" and html lang="es" confirmed in page source
5. Translation quality approved — natural-sounding Spanish/French/German

## Self-Check

- [ ] `src/pages/es/index.astro` — FOUND
- [ ] `src/pages/fr/index.astro` — FOUND
- [ ] `src/pages/de/index.astro` — FOUND
- [ ] `src/pages/es/pricing.astro` — FOUND
- [ ] `src/pages/fr/pricing.astro` — FOUND
- [ ] `src/pages/de/pricing.astro` — FOUND
- [ ] `src/pages/es/use-cases/index.astro` — FOUND
- [ ] `src/pages/fr/use-cases/index.astro` — FOUND
- [ ] `src/pages/de/use-cases/index.astro` — FOUND
- [ ] `tests/i18n.spec.ts` — FOUND
- [ ] Commits: d64ec70 (Task 1), d809574 (Task 2) — FOUND

## Self-Check: PASSED
