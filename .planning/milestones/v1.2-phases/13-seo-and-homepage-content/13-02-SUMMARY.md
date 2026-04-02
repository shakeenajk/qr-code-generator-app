---
phase: 13-seo-and-homepage-content
plan: "02"
subsystem: seo-pages
tags: [seo, use-cases, astro-seo, json-ld, breadcrumb, static-pages]
dependency_graph:
  requires:
    - 13-01  # astro-seo installed, useCases.ts created, Layout.astro slot ready
  provides:
    - /use-cases/ hub page with 6 article cards
    - /use-cases/[slug]/ static article pages for all 6 use cases
    - BreadcrumbList JSON-LD on hub and article pages
  affects:
    - sitemap (6 new static routes added automatically)
    - SEO coverage (long-tail keywords for restaurant menu, business card, etc.)
tech_stack:
  added: []
  patterns:
    - astro-seo SEO component via slot="head" on static pages
    - getStaticPaths mapping USE_CASES to 6 static article routes
    - BreadcrumbList JSON-LD injected via head slot
key_files:
  created:
    - src/pages/use-cases/index.astro
    - src/pages/use-cases/[slug].astro
  modified: []
decisions:
  - Cherry-picked plan 01 commits (astro-seo install, useCases.ts) into this worktree before building — plan 02 depends on plan 01 artifacts that hadn't been merged to this branch yet
  - Installed astro-seo in node_modules (was in package.json from plan 01 but not yet npm-installed in shared node_modules)
metrics:
  duration: "~3 minutes"
  completed: "2026-03-31T08:29:39Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 13 Plan 02: Use Cases Hub and Article Pages Summary

**One-liner:** Static /use-cases/ hub (6 article cards) and /use-cases/[slug]/ article pages with astro-seo meta, BreadcrumbList JSON-LD, and bottom CTA — all sourced from USE_CASES data.

## What Was Built

### Task 1 — /use-cases/ Hub Page (`616eea7`)

Created `src/pages/use-cases/index.astro`:

- 2-column responsive card grid linking to all 6 USE_CASES slugs
- astro-seo `<SEO>` component injected via `slot="head"`: title, description, canonical, OG
- BreadcrumbList JSON-LD schema (Home → Use Cases) via head slot
- Dark mode classes throughout: `dark:bg-slate-800`, `dark:text-white`, `dark:border-slate-700`
- Hover/focus interaction states per UI-SPEC: `hover:border-[#2563EB]`, `focus-visible:ring-2`

### Task 2 — /use-cases/[slug]/ Article Pages (`30ac3d2`)

Created `src/pages/use-cases/[slug].astro`:

- `getStaticPaths` generates 6 static routes from USE_CASES
- 3-level BreadcrumbList JSON-LD (Home → Use Cases → article title) per page
- Breadcrumb `<nav>` with `aria-label="Breadcrumb"` and `aria-current="page"` on active crumb
- Article body: H1 + intro paragraph + H2 sections + paragraph body from `useCase.body`
- Bottom CTA card: "Ready to create your QR code?" → `/#qr-generator-root`
- `active:bg-blue-800` on CTA button per UI-SPEC interaction states

## Verification

- `npm run build` — complete, no errors
- `dist/client/use-cases/` — contains `index.html` + 6 subdirs: `restaurant-menu`, `business-cards`, `product-packaging`, `event-invitations`, `wifi-sharing`, `social-media`
- `BreadcrumbList` present in both hub and article HTML output
- Sitemap updated automatically to include all 7 new routes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Cherry-picked Plan 01 commits into worktree**
- **Found during:** Task 1 setup
- **Issue:** This worktree branch (`worktree-agent-aaadb569`) started at `a5ab9c1` (pre-phase-13). Plan 01 had committed `astro-seo` install, `SoftwareApplication` schema fix, sitemap link, and `src/data/useCases.ts` to its own worktree branch — none of those changes were present here.
- **Fix:** Cherry-picked 3 commits from `worktree-agent-a519d0b9`: `68f69bf`, `ea64898`, `36b32cc`
- **Commits:** `a5caf15`, `a337723`, `4313311`

**2. [Rule 3 - Blocking] Installed astro-seo in node_modules**
- **Found during:** Task 1 build
- **Issue:** `astro-seo` was in `package.json` (added by plan 01's cherry-picked commit) but not installed in the shared `node_modules` directory — Vite threw "Rollup failed to resolve import astro-seo"
- **Fix:** `npm install astro-seo@^1.1.0` in main repo directory
- **Commit:** n/a (node_modules not committed)

## Known Stubs

None — all 6 article cards link to real article pages, all body content is sourced from USE_CASES static data.

## Self-Check: PASSED
