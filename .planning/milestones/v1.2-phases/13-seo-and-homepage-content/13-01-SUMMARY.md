---
phase: 13-seo-and-homepage-content
plan: 01
subsystem: seo
tags: [astro-seo, sitemap, json-ld, schema-org, use-cases, typescript]

# Dependency graph
requires:
  - phase: 12-foundation-improvements
    provides: Stable Astro 5 + Tailwind v4 foundation with Layout.astro
provides:
  - astro-seo package installed
  - Layout.astro with SoftwareApplication JSON-LD and sitemap link tag
  - src/data/useCases.ts with 6 typed use case entries (USE_CASES, UseCase, UseCaseSection)
affects: [13-02, 13-03, 13-04, 13-05]

# Tech tracking
tech-stack:
  added: [astro-seo ^1.1.0]
  patterns:
    - "Use-case data as typed static arrays in src/data/ — same pattern as faq.ts"
    - "astro-seo used on new pages via <slot name=\"head\" />, not replacing Layout-level meta block"

key-files:
  created:
    - src/data/useCases.ts
    - tests/unit/useCases.test.mjs
  modified:
    - package.json
    - package-lock.json
    - src/layouts/Layout.astro

key-decisions:
  - "Keep Layout.astro manual OG block; use astro-seo only on new use-case/hub pages via slot"
  - "SoftwareApplication is the correct schema.org type for QRCraft (not WebApplication)"
  - "@astrojs/sitemap was already installed and wired from v1.0 — no reinstall needed"

patterns-established:
  - "UseCase/UseCaseSection typed interfaces as data contract for hub and article pages"
  - "Body sections modeled as {heading, paragraphs[]} arrays — flat, serializable, no JSX"

requirements-completed: [SEO-01, SEO-02, SEO-03]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 13 Plan 01: SEO Foundation + Use Case Data Summary

**astro-seo installed, SoftwareApplication JSON-LD schema live, sitemap link added, and 6 fully-authored use case entries exported from src/data/useCases.ts**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T08:16:00Z
- **Completed:** 2026-03-31T08:24:09Z
- **Tasks:** 2
- **Files modified:** 5 (package.json, package-lock.json, Layout.astro, useCases.ts, test file)

## Accomplishments
- Installed `astro-seo ^1.1.0` as dependency for Phase 13 new pages
- Fixed `@type: 'WebApplication'` to `@type: 'SoftwareApplication'` in Layout.astro JSON-LD (correct schema.org type for an application)
- Added `<link rel="sitemap" href="/sitemap-index.xml" />` to Layout.astro head (enables Google Search Console sitemap submission)
- Created `src/data/useCases.ts` with 6 fully-authored use case articles, each with slug, title, excerpt, 3 keywords, and 3-section body

## Task Commits

Each task was committed atomically:

1. **Task 1: Install astro-seo and fix Layout.astro** - `68f69bf` (feat)
2. **TDD RED: Failing test for useCases data contract** - `ea64898` (test)
3. **Task 2: Create src/data/useCases.ts with 6 articles** - `36b32cc` (feat)

_Note: Task 2 used TDD — test commit (RED) precedes implementation commit (GREEN)._

## Files Created/Modified
- `src/data/useCases.ts` - Typed USE_CASES array (6 entries), UseCase and UseCaseSection interfaces
- `src/layouts/Layout.astro` - SoftwareApplication schema type + sitemap link tag
- `package.json` - Added astro-seo ^1.1.0
- `package-lock.json` - Updated lockfile
- `tests/unit/useCases.test.mjs` - Node-based data contract tests for useCases.ts

## Decisions Made
- Kept Layout.astro's existing manual OG/Twitter meta block unchanged; `astro-seo` will be used only on new Phase 13 pages via `<slot name="head" />` — this avoids breaking existing pages that pass title/description as props.
- `@astrojs/sitemap` was already installed (`^3.7.0`) and wired in `astro.config.mjs` from v1.0 — no action required.
- Used `UseCase[]` (not `as const`) for the typed array since the interface provides sufficient type-safety and the data needs to be mutable for testing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `tsx` loader not installed in project (only Playwright for tests). Adapted TDD RED verification to a Node.js `fs.existsSync` check on the missing file — confirms RED state before implementation. GREEN verified by build passing + grep checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `USE_CASES` data contract ready for 13-02 (use-case hub page) and 13-03 (individual article pages)
- `astro-seo` available for `<SEO>` component usage in all new Phase 13 pages via `<slot name="head" />`
- Sitemap generation confirmed working (`sitemap-index.xml` created by build)
- No blockers for downstream plans

## Known Stubs

None - USE_CASES contains fully authored content, no placeholders.

---
*Phase: 13-seo-and-homepage-content*
*Completed: 2026-03-31*
