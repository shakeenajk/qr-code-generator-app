---
phase: 23-internationalization
plan: 01
subsystem: i18n
tags: [i18n, seo, hreflang, astro-i18n, translations, language-switcher]
dependency_graph:
  requires: []
  provides: [i18n-config, translation-dictionaries, hreflang-layout, language-switcher]
  affects: [Layout.astro, Header.astro, astro.config.mjs, sitemap]
tech_stack:
  added: []
  patterns: [astro-native-i18n, typescript-dictionaries, useTranslations-factory, getAbsoluteLocaleUrl, getRelativeLocaleUrl, cookie-locale-persistence]
key_files:
  created:
    - src/i18n/ui.ts
    - src/i18n/utils.ts
    - src/components/LanguageSwitcher.astro
  modified:
    - astro.config.mjs
    - src/layouts/Layout.astro
    - src/components/Header.astro
    - src/pages/index.astro
    - src/pages/pricing.astro
    - src/pages/use-cases/index.astro
decisions:
  - "Astro native i18n routing + TypeScript dictionaries — no Paraglide (requires output:server)"
  - "prefixDefaultLocale:false — English URLs stay /pricing not /en/pricing"
  - "showHreflang prop on Layout — opt-in hreflang for marketing pages, not all pages"
  - "LanguageSwitcher cookie persistence — URL is primary state; cookie is supplementary"
metrics:
  duration: 6m
  completed: 2026-04-03
  tasks_completed: 2
  files_changed: 9
---

# Phase 23 Plan 01: i18n Infrastructure Summary

**One-liner:** Astro native i18n routing with TypeScript dictionaries (84 keys × 4 locales), hreflang tags in Layout, and LanguageSwitcher component with cookie persistence in Header.

## What Was Built

1. **astro.config.mjs** — Added `i18n` block with `defaultLocale: 'en'`, `locales: ['en','es','fr','de']`, `prefixDefaultLocale: false`. Updated `sitemap()` call with its own `i18n` config block for `xhtml:link` alternate generation (sitemap does not auto-detect from top-level i18n config).

2. **src/i18n/ui.ts** — Translation dictionaries for en/es/fr/de with 84 keys per locale, covering: `meta.*`, `nav.*`, `hero.*`, `features.*`, `howto.*`, `pricingpromo.*`, `usecases.*`, `faq.*`, `footer.*`, `pricing.*`, `common.*`. Exports `languages`, `defaultLang`, `ui`, `UiKeys` type.

3. **src/i18n/utils.ts** — Three utility exports: `getLangFromUrl(url: URL)`, `useTranslations(lang)` (typed factory with English fallback), `getLocalizedHref(path, lang)` (no prefix for default locale).

4. **src/layouts/Layout.astro** — Added `lang` prop (default `'en'`), `showHreflang` prop (default `false`), 5 hreflang link tags (en/es/fr/de + x-default) rendered when `showHreflang=true`. Dynamic `html[lang]` attribute. Imports `getAbsoluteLocaleUrl` from `astro:i18n`.

5. **src/components/LanguageSwitcher.astro** — New component: 4 language links (EN/ES/FR/DE) using `getRelativeLocaleUrl`, `aria-current` on active locale, inline script writes `locale={code}` cookie on click (path=/, max-age=1yr, SameSite=Lax).

6. **src/components/Header.astro** — Added `lang` prop threading, `useTranslations(lang)` for nav text (Pricing, Use Cases, Sign Up, Sign In), `getLocalizedHref` for locale-aware paths, `LanguageSwitcher` embedded in nav.

7. **Marketing pages** — `showHreflang={true}` added to `index.astro`, `pricing.astro`, `use-cases/index.astro`.

## Decisions Made

- **Astro native i18n over Paraglide** — Paraglide 2.x requires `output: "server"`; this project uses `output: "static"`. Native Astro dictionaries are the correct choice.
- **`prefixDefaultLocale: false`** — English URLs unchanged (`/pricing` not `/en/pricing`); `redirectToDefaultLocale` left unset (not true — infinite redirect loop risk).
- **`showHreflang` opt-in prop** — Hreflang only on marketing pages; dashboard/auth pages excluded.
- **Sitemap i18n separate from top-level i18n** — `@astrojs/sitemap` does not auto-detect from `i18n.locales`; requires its own `i18n` config block inside `sitemap()`.
- **Cookie persistence as supplement** — URL is the primary locale persistence mechanism via `getRelativeLocaleUrl`. Cookie supplements for returning users.

## Verification

- `npx astro check` — 17 pre-existing errors in billing components (unrelated to this plan); 0 new errors from i18n changes.
- `npx astro build` — Build succeeded, all pages prerendered.
- Built `/index.html` contains `<link rel="alternate" hreflang="es">`, `<link rel="alternate" hreflang="x-default">`.
- Header contains LanguageSwitcher with 4 language links (EN/ES/FR/DE).
- LanguageSwitcher uses `getRelativeLocaleUrl` for locale-prefixed URLs.

## Deviations from Plan

None — plan executed exactly as written. The only discovery was 17 pre-existing TypeScript errors in billing components (pre-existing, out of scope per scope boundary rules; logged here for awareness).

## Known Stubs

None — all translation keys are fully populated with natural-sounding translations for all 4 locales. No placeholder text or empty values.

## Self-Check

Verified:
- [ ] `src/i18n/ui.ts` — FOUND
- [ ] `src/i18n/utils.ts` — FOUND
- [ ] `src/components/LanguageSwitcher.astro` — FOUND
- [ ] `astro.config.mjs` has i18n block — VERIFIED (line 13-19)
- [ ] Layout.astro has hreflang tags — VERIFIED (in built /index.html)
- [ ] Commits: 5ccb565 (Task 1), c68aeb1 (Task 2) — FOUND

## Self-Check: PASSED
