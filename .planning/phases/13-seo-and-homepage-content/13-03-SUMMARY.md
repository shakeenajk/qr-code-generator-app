---
phase: 13-seo-and-homepage-content
plan: "03"
subsystem: ui
tags: [astro, tailwind, homepage, seo, json-ld, howto-schema]

# Dependency graph
requires:
  - phase: 13-01
    provides: "src/data/useCases.ts with 6 typed use case entries and slug values"
provides:
  - "PricingPromo.astro — conversion section with tier comparison and CTA buttons"
  - "HowTo.astro — 3-step visual guide with screenshot images"
  - "UseCasesTeaser.astro — 6-card clickable use case grid linking to article pages"
  - "index.astro updated with HowTo JSON-LD and all 3 new sections"
affects:
  - 13-04 (use cases hub/article pages that UseCasesTeaser links to)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HowTo JSON-LD injected via slot=head in index.astro, not in the component — keeps schema in <head> and decoupled from component render order"
    - "Static teaser data in component (not imported from useCases.ts) — teaser cards use simplified descriptions different from article excerpts"
    - "section alternating backgrounds: bg-gray-50 / bg-white pattern preserved across new sections"

key-files:
  created:
    - src/components/PricingPromo.astro
    - src/components/HowTo.astro
    - src/components/UseCasesTeaser.astro
  modified:
    - src/pages/index.astro

key-decisions:
  - "HowTo JSON-LD placed in index.astro via slot=head (not in HowTo.astro) — keeps schema in document head, decoupled from component render"
  - "UseCasesTeaser uses inline static teaser data rather than importing USE_CASES — teaser card descriptions are shorter and differ from article excerpts"
  - "Section order: HowTo -> PricingPromo -> UseCasesTeaser between Features and FAQ, with two consecutive gray-50 sections (HowTo + UseCasesTeaser) which is acceptable per UI-SPEC"

patterns-established:
  - "Teaser components use inline static data arrays rather than shared data imports when display format differs from article content"
  - "JSON-LD schemas injected at page level via slot=head for correct head placement"

requirements-completed: [HOME-01, HOME-02, HOME-03, SEO-03]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 13 Plan 03: Homepage Sections Summary

**PricingPromo, HowTo (3-step guide), and UseCasesTeaser (6 clickable cards) components wired into index.astro with HowTo JSON-LD schema in head**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T08:26:48Z
- **Completed:** 2026-03-31T08:28:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created PricingPromo.astro with 4 feature bullets, Free/Starter/Pro tier cards, and dual CTAs (Get started free / Explore Pro)
- Created HowTo.astro with 3-step numbered guide, screenshot images (lazy-loaded, 800x512), and full dark mode support
- Created UseCasesTeaser.astro with 6 clickable card grid where each `<li>` is wrapped in `<a href>` routing to individual use-case article pages
- Updated index.astro to import/render all 3 sections between Features and FAQ, and inject HowTo JSON-LD via slot="head"

## Task Commits

Each task was committed atomically:

1. **Task 1: Create PricingPromo.astro and HowTo.astro** - `b910598` (feat)
2. **Task 2: Create UseCasesTeaser.astro and wire index.astro** - `d3970d8` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/PricingPromo.astro` — Pricing upgrade promo section with tier comparison cards and CTA buttons
- `src/components/HowTo.astro` — 3-step visual how-to guide (JSON-LD in index.astro, not here)
- `src/components/UseCasesTeaser.astro` — 6-card use case grid with clickable anchor-wrapped cards and "View all use cases" link
- `src/pages/index.astro` — Wires all 3 sections, adds HowTo JSON-LD via slot="head", preserves Hero/Features/FAQ

## Decisions Made
- HowTo JSON-LD placed in index.astro via `slot="head"` rather than inside HowTo.astro — keeps schema in `<head>` and decoupled from component render order
- UseCasesTeaser uses inline static `teasers` array rather than importing USE_CASES from useCases.ts — teaser card copy is shorter and specific to homepage grid, different from article excerpts
- Section order places HowTo (bg-gray-50) before PricingPromo (bg-white), resulting in two consecutive gray-50 sections (Features + HowTo) — acceptable per UI-SPEC's placement decision note

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Homepage sections complete: PricingPromo, HowTo, UseCasesTeaser
- UseCasesTeaser links point to /use-cases/[slug]/ routes that don't exist yet — these will be created in plan 13-04
- No blockers for plan 13-04 (use cases hub + article pages)

---
*Phase: 13-seo-and-homepage-content*
*Completed: 2026-03-31*
