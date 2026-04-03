---
phase: 22-seasonal-template-packs
plan: "01"
subsystem: templates
tags: [seasonal, templates, homepage, astro]
dependency_graph:
  requires: []
  provides: [seasonal-template-presets, homepage-seasonal-section]
  affects: [src/types/frames.ts, src/data/templateData.ts, src/components/SeasonalTemplates.astro, src/pages/index.astro]
tech_stack:
  added: []
  patterns: [calendar-month-mapping, astro-component-section]
key_files:
  created:
    - src/components/SeasonalTemplates.astro
  modified:
    - src/types/frames.ts
    - src/data/templateData.ts
    - src/pages/index.astro
decisions:
  - "TemplatePreset category union extended inline rather than using a separate SeasonalCategory type — keeps types co-located and simpler"
  - "Calendar month mapping hardcoded as Record<number, string[]> in Astro frontmatter — SSR build-time evaluation, zero JS shipped to client"
  - "Color swatch preview (bgColor outer + dotColor inner div) chosen over SVG QR thumbnail for the homepage section — lighter markup, sufficient visual distinction"
metrics:
  duration: 8m
  completed_date: "2026-04-03"
  tasks: 2
  files: 4
requirements_satisfied:
  - TEMPLATE-01
  - TEMPLATE-02
---

# Phase 22 Plan 01: Seasonal Template Packs Summary

**One-liner:** 22 seasonal/holiday template presets across 7 categories (Christmas, Halloween, Valentine's Day, Easter, Black Friday, Summer, Back to School) added to the template system, plus a calendar-aware homepage section that surfaces the relevant templates each month.

## What Was Built

### Task 1: Seasonal template presets (src/types/frames.ts + src/data/templateData.ts)

- Expanded `TemplatePreset.category` union type from 4 to 11 entries
- Expanded `TEMPLATE_CATEGORIES` constant from 4 to 11 entries
- Added 22 new presets to `TEMPLATES` array (total: 38 presets)
  - Christmas: 4 presets (Festive Red, Holiday Green, Christmas Gold, Classic Christmas)
  - Halloween: 3 presets (Pumpkin Patch, Spooky Night, Midnight Black)
  - Valentine's Day: 3 presets (Sweet Pink, Love Letter, Rose Garden)
  - Easter: 3 presets (Pastel Spring, Spring Garden, Sunny Easter)
  - Black Friday: 3 presets (Midnight Deal, Gold Rush, Hot Sale)
  - Summer: 3 presets (Ocean Breeze, Sunset Glow, Tropical)
  - Back to School: 3 presets (Scholar Blue, Chalkboard, Pencil Yellow)
- TemplateSection.tsx renders all 11 categories automatically (no changes needed — it maps over TEMPLATE_CATEGORIES)

### Task 2: Homepage seasonal section (src/components/SeasonalTemplates.astro + src/pages/index.astro)

- New `SeasonalTemplates.astro` component with month-to-category mapping
- Month 1: Valentine's Day, Month 2: Valentine's Day, Months 3-4: Easter + Back to School, Month 5: Summer, Months 6-7: Summer, Month 8: Summer + Back to School, Month 9: Back to School, Month 10: Halloween, Month 11: Black Friday + Christmas, Month 12: Christmas
- Section title and subtitle adapt to the current calendar month
- Template cards: bgColor outer swatch, dotColor inner square, name label, link to `/#qr-generator`
- Responsive grid: 2 cols (mobile) → 3 cols (sm) → 4 cols (lg)
- Dark mode compliant, matching existing homepage section patterns
- Placed between `<PricingPromo />` and `<UseCasesTeaser />` in index.astro

## Verification

- `npx tsc --noEmit` — passed, no TypeScript errors
- `npm run build` — passed, build completed in ~17s

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | f0f6567 | feat(22-01): add 22 seasonal template presets across 7 holiday categories |
| Task 2 | 6275244 | feat(22-01): add SeasonalTemplates homepage section with calendar-based filtering |

## Known Stubs

None. All template data is fully wired. The SeasonalTemplates component reads live data from `templateData.ts` and filters by the real current month.

## Self-Check: PASSED

- src/types/frames.ts — FOUND (verified TemplatePreset category union has 11 entries)
- src/data/templateData.ts — FOUND (38 template presets, 11 categories)
- src/components/SeasonalTemplates.astro — FOUND (created, 113 lines)
- src/pages/index.astro — FOUND (SeasonalTemplates imported and placed)
- Commit f0f6567 — verified in git log
- Commit 6275244 — verified in git log
