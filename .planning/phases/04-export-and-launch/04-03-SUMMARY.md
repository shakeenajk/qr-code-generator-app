---
phase: 04-export-and-launch
plan: 03
subsystem: ui
tags: [dark-mode, tailwind, astro, react, playwright]

# Dependency graph
requires:
  - phase: 04-01
    provides: smoke test suite with BRAND-04 dark mode tests

provides:
  - dark:bg-[#0f172a] dark:text-slate-100 on Layout.astro body
  - dark:bg-slate-900 dark:border-slate-700 on Header.astro; dark:text-white on brand span
  - dark:bg-[#0f172a] on Hero.astro section; dark:bg-slate-800 dark:border-slate-700 on generator root
  - dark:bg-slate-900 dark:border-slate-700 on Footer.astro; dark:text-slate-400 on text/links
  - dark: classes on QRGeneratorIsland tab bar, inactive tabs, customize section, h2
  - dark: classes on all form inputs in UrlTab, TextTab, WifiTab, VCardTab
  - dark: classes on ColorSection, ShapeSection, LogoSection chrome
  - QRPreview.tsx intentionally untouched — bg-white preserved per locked decision

affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind v4 dark: prefix uses prefers-color-scheme media — zero config, just add dark: classes"
    - "QR preview locked decision: DO NOT add dark: to QRPreview.tsx bg-white container"
    - "Form input dark pattern: dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:placeholder-slate-400"

key-files:
  created: []
  modified:
    - src/layouts/Layout.astro
    - src/components/Header.astro
    - src/components/Hero.astro
    - src/components/Footer.astro
    - src/components/QRGeneratorIsland.tsx
    - src/components/customize/ColorSection.tsx
    - src/components/customize/LogoSection.tsx
    - src/components/customize/ShapeSection.tsx
    - tests/export.spec.ts

key-decisions:
  - "QRPreview.tsx untouched — QR code must stay on white background per locked decision"
  - "ColorSection/ShapeSection/LogoSection dark mode added beyond plan scope — discretionary for form readability"
  - "Playwright BRAND-04 preview test checks parentElement bg (not SVG element which reports transparent)"
  - "Clipboard test skipped on non-Chromium — grantPermissions is Chromium-only Playwright feature"

patterns-established:
  - "All 9 BRAND-04 dark mode smoke tests pass across Chromium, Firefox, WebKit"

requirements-completed: [BRAND-04]

# Metrics
duration: 4min
completed: 2026-03-11
---

# Phase 4 Plan 03: Dark Mode Summary

**Full-site Tailwind v4 dark mode — OS dark mode triggers dark variants across all chrome; QR preview container stays white per locked decision**

## Performance

- **Duration:** 4 min
- **Completed:** 2026-03-11
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Layout.astro body: `dark:bg-[#0f172a] dark:text-slate-100`
- Header.astro: header `dark:bg-slate-900 dark:border-slate-700`, brand `dark:text-white`
- Hero.astro: section `dark:bg-[#0f172a]`, generator panel `dark:bg-slate-800 dark:border-slate-700`
- Footer.astro: `dark:bg-slate-900 dark:border-slate-700`, text/links `dark:text-slate-400`
- QRGeneratorIsland: tab bar, inactive tabs, customize section, h2 all have dark variants
- All four tab form inputs (UrlTab, TextTab, WifiTab, VCardTab) have dark input styling
- ColorSection, ShapeSection, LogoSection chrome darkened (discretionary for readability)
- QRPreview.tsx intentionally untouched — bg-white locked
- All 9 BRAND-04 smoke tests pass on Chromium, Firefox, WebKit

## Task Commits

1. **Task 1: Astro layout shell dark mode** - `74f0d79` (feat)
2. **Task 2: QRGeneratorIsland + form inputs dark mode** - `62284fd` (feat)
3. **Test fix: BRAND-04 preview/clipboard test accuracy** - `23ddcf7` (fix)

## Files Modified
- `src/layouts/Layout.astro` — body dark background/text
- `src/components/Header.astro` — header dark bg/border, brand text
- `src/components/Hero.astro` — section and generator panel dark variants
- `src/components/Footer.astro` — footer dark bg/border, text/links
- `src/components/QRGeneratorIsland.tsx` — tab bar, customize section dark chrome
- `src/components/customize/ColorSection.tsx` — headings, labels, inputs dark
- `src/components/customize/LogoSection.tsx` — heading, drop zone dark
- `src/components/customize/ShapeSection.tsx` — heading, sublabels, shape buttons dark
- `tests/export.spec.ts` — BRAND-04 test accuracy fixes

## Decisions Made
- Extended dark mode to ColorSection/ShapeSection/LogoSection beyond plan scope — form readability required it
- Playwright clipboard test conditionally skipped on Firefox/WebKit (grantPermissions Chromium-only)
- BRAND-04 preview check targets parentElement (SVG element reports transparent, parent div has bg-white)

## Deviations from Plan
- **Extended scope:** Added dark: to customize section components (ColorSection, ShapeSection, LogoSection) — plan noted "Claude's discretion for secondary surface tokens." Required for readable dark mode UI.

## Issues Encountered
- None blocking. All BRAND-04 tests pass.

---
*Phase: 04-export-and-launch*
*Completed: 2026-03-11*
