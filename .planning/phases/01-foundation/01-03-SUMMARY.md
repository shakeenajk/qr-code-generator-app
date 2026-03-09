---
phase: 01-foundation
plan: 03
subsystem: seo
tags: [astro, tailwind, json-ld, schema-org, open-graph, seo]

# Dependency graph
requires:
  - phase: 01-foundation/01-01
    provides: Astro + Tailwind v4 scaffold with global.css and site config

provides:
  - src/layouts/Layout.astro — base layout with full head meta, OG tags, and two JSON-LD schemas
  - src/data/faq.ts — shared FAQ data array (single source of truth for schema + visible content)

affects:
  - 01-foundation/01-05 (index.astro will use Layout and render FAQ_ITEMS)
  - all future pages that use Layout.astro

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON-LD set:html pattern: <script type=application/ld+json set:html={JSON.stringify(schema)} /> to prevent Astro escaping"
    - "Single source of truth for FAQ: FAQ_ITEMS array feeds both JSON-LD FAQPage schema and visible component"
    - "Layout owns all head content: canonical, OG, Twitter Card, and both JSON-LD schemas in one file"

key-files:
  created:
    - src/layouts/Layout.astro
    - src/data/faq.ts
  modified: []

key-decisions:
  - "JSON-LD blocks use set:html={JSON.stringify(...)} — not raw interpolation — to prevent Astro quote escaping producing invalid JSON-LD"
  - "FAQ_ITEMS is a single exported array consumed by both FAQPage schema in Layout.astro and the visible FAQ component in Plan 05, preventing schema/content drift"
  - "Layout accepts ogImage? prop defaulting to /og-image.png, resolved to absolute URL via new URL(ogImage, Astro.site)"
  - "Body uses bg-white text-gray-900 per BRAND-02 locked color decisions from CONTEXT.md"

patterns-established:
  - "set:html JSON-LD pattern: all future JSON-LD injections must use set:html to prevent Astro escaping"
  - "Shared data arrays: FAQ_ITEMS pattern for any data that appears in both structured data and visible UI"
  - "Layout.astro is the canonical head owner — no page should add its own OG or JSON-LD outside this layout"

requirements-completed: [SEO-01, SEO-02, SEO-03, SEO-04, SEO-08]

# Metrics
duration: 1min
completed: 2026-03-09
---

# Phase 1 Plan 03: SEO Layout and FAQ Data Summary

**Astro Layout.astro with WebApplication + FAQPage JSON-LD schemas, full OG tags, and shared faq.ts data file as single source of truth**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-09T07:59:33Z
- **Completed:** 2026-03-09T08:00:54Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/data/faq.ts` exporting `FaqItem` interface and `FAQ_ITEMS` array with 6 QR code FAQ entries
- Created `src/layouts/Layout.astro` accepting `title`, `description`, `ogImage?` props with canonical URL construction
- Layout emits complete Open Graph set (8 meta tags), Twitter Card, and two JSON-LD schemas using `set:html` to prevent Astro JSON escaping
- `FAQPage` schema is built directly from `FAQ_ITEMS` — same array the Plan 05 FAQ component will render, preventing schema/content drift

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared FAQ data file** - `824be0a` (feat)
2. **Task 2: Create Layout.astro with all head meta and JSON-LD schemas** - `5e0af74` (feat)

## Files Created/Modified

- `src/data/faq.ts` - Shared FAQ data: FaqItem interface + FAQ_ITEMS array with 6 entries targeting long-tail QR code queries
- `src/layouts/Layout.astro` - Base layout: title, meta description, canonical, OG, Twitter Card, WebApplication JSON-LD, FAQPage JSON-LD, body slot

## Decisions Made

- Used `set:html={JSON.stringify(schema)}` on all JSON-LD script tags — Astro escapes quotes in curly-brace interpolation, which produces invalid JSON-LD that Google rejects
- `FAQ_ITEMS` imported into Layout.astro (not hardcoded) so FAQPage schema and visible FAQ content cannot drift apart
- `ogImageUrl` resolved with `new URL(ogImage, Astro.site)` so OG image is always an absolute URL regardless of input

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `Layout.astro` is ready to be imported by `src/pages/index.astro` in Plan 05
- `FAQ_ITEMS` is ready for the FAQ component in Plan 05 to iterate and render
- Build passes cleanly; no TypeScript or import errors

---
*Phase: 01-foundation*
*Completed: 2026-03-09*
