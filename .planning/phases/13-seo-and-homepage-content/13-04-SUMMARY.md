---
phase: 13-seo-and-homepage-content
plan: "04"
subsystem: ui
tags: [playwright, screenshots, seo, howto, png, tsx]

# Dependency graph
requires:
  - phase: 13-03
    provides: "HowTo.astro with /screenshots/step-1.png, step-2.png, step-3.png img src references"
provides:
  - "scripts/generate-screenshots.ts — Playwright script capturing 3 step PNGs at 800x512"
  - "public/screenshots/step-1.png — URL input tab screenshot for HowTo Step 1"
  - "public/screenshots/step-2.png — customization panel screenshot for HowTo Step 2"
  - "public/screenshots/step-3.png — download area screenshot for HowTo Step 3"
  - "npm run screenshots script — tsx-powered shortcut to regenerate screenshots"
affects:
  - HowTo.astro (img tags now resolve to real committed PNGs, no 404s)

# Tech tracking
tech-stack:
  added:
    - "tsx ^4.21.0 (devDependency) — run TypeScript scripts directly without compiling"
  patterns:
    - "Screenshot generation script in scripts/ directory, run via npm run screenshots"
    - "Public assets captured by Playwright committed directly to public/ for static build"

key-files:
  created:
    - scripts/generate-screenshots.ts
    - public/screenshots/step-1.png
    - public/screenshots/step-2.png
    - public/screenshots/step-3.png
  modified:
    - package.json

key-decisions:
  - "Committed screenshots as static assets (not generated at build time) — Playwright not available in Vercel build environment"
  - "Used CLIP constant 800x512 for all three screenshots — matches HowTo.astro img width/height attributes to prevent CLS"
  - "Dev server started locally to capture screenshots — networkidle wait ensures React island hydration before capture"

patterns-established:
  - "Screenshot scripts in scripts/ directory, run with tsx via npm scripts"
  - "PNG assets for UI documentation committed to public/ at fixed dimensions matching img attributes"

requirements-completed: [HOME-02, SEO-01]

# Metrics
duration: 42min
completed: 2026-03-31
---

# Phase 13 Plan 04: Screenshots and Search Console Summary

**Playwright screenshot generation script + 3 committed 800x512 PNGs for HowTo section; Search Console verification and sitemap submission pending human action**

## Performance

- **Duration:** 42 min
- **Started:** 2026-03-31T11:04:47Z
- **Completed:** 2026-03-31T11:46:21Z
- **Tasks:** 2 of 3 complete (Task 3 is a human-verify checkpoint)
- **Files modified:** 5

## Accomplishments
- Created `scripts/generate-screenshots.ts` — Playwright script capturing homepage at 3 states, clipped to 800x512
- Installed tsx devDependency and added `npm run screenshots` script to package.json
- Ran script against live dev server, captured all 3 PNGs (41KB each), committed to public/screenshots/
- Verified build succeeds: screenshots copy to dist/client/screenshots/ and .vercel/output/static/screenshots/
- Verified built index.html contains: SoftwareApplication JSON-LD, sitemap-index.xml link, HowTo JSON-LD

## Task Commits

Each task was committed atomically:

1. **Task 1: Create screenshot generation script** - `574a682` (feat)
2. **Task 2: Run script and commit screenshots** - `38462c4` (feat)
3. **Task 3: Visual verification + Search Console** - awaiting human checkpoint

**Plan metadata:** TBD (docs commit after checkpoint)

## Files Created/Modified
- `scripts/generate-screenshots.ts` - Playwright script; captures 3 step PNGs from live dev server at BASE_URL
- `public/screenshots/step-1.png` - 41KB PNG; URL input tab, 800x512 clip
- `public/screenshots/step-2.png` - 41KB PNG; customization panel state, 800x512 clip
- `public/screenshots/step-3.png` - 41KB PNG; download/export area, 800x512 clip
- `package.json` - added "screenshots" script and tsx devDependency

## Decisions Made
- Committed screenshots as static assets (not generated at build time) — Playwright is not available in the Vercel build environment, so screenshots must be pre-generated and committed
- Used CLIP constant `{ x: 0, y: 0, width: 800, height: 512 }` matching HowTo.astro `width="800" height="512"` attributes to prevent Cumulative Layout Shift
- Merged main (plans 01-03 work) into worktree branch before executing — plans 01-03 had been committed to main but not yet present in this worktree's branch

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged main into worktree before executing Task 1**
- **Found during:** Pre-execution check
- **Issue:** Worktree branch `worktree-agent-aeeb1286` was based on commit `a5ab9c1` (pre-phase 13). HowTo.astro and other plan 01-03 files were on main but not in this worktree's working tree.
- **Fix:** Ran `git merge main --no-commit --no-ff` (clean merge, no conflicts), then committed as `merge(13): bring in plans 01-03 work`
- **Files modified:** All plan 01-03 artifacts (HowTo.astro, PricingPromo.astro, UseCasesTeaser.astro, use-cases pages, SEO data files, planning docs)
- **Verification:** `ls src/components/HowTo.astro` confirmed file present after merge
- **Committed in:** `23cbf02` (merge commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing dependency from prior plans)
**Impact on plan:** Necessary prerequisite resolution. No scope creep.

## Known Stubs
None — screenshots are real Playwright-captured PNGs of the live application. HowTo.astro img tags resolve to committed assets.

## Issues Encountered
None beyond the worktree merge prerequisite above.

## User Setup Required (Task 3 Checkpoint)

**Google Search Console verification and sitemap submission require manual action.** Steps:

1. Run `npm run dev` and verify all homepage sections and use cases pages visually (see Task 3 checklist in PLAN.md)
2. Visit https://search.google.com/search-console — log in and confirm ownership of qr-code-generator-app.com is verified
3. In Sitemaps section: submit `https://qr-code-generator-app.com/sitemap-index.xml`
4. Confirm sitemap shows status "Success"

## Next Phase Readiness
- All Phase 13 automated work complete: SEO foundation, use cases pages, homepage sections, screenshots
- Site is ready for visual verification and Search Console submission
- After Search Console is verified and sitemap submitted, Phase 13 (SEO and Homepage Content milestone) is complete

---
*Phase: 13-seo-and-homepage-content*
*Completed: 2026-03-31*
