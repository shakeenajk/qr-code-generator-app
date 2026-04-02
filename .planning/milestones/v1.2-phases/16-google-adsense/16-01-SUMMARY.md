---
phase: 16-google-adsense
plan: 01
subsystem: infra
tags: [adsense, lighthouse, performance, ads.txt, lhci]

# Dependency graph
requires:
  - phase: 13-seo-and-homepage-content
    provides: SEO pages live and indexed — prerequisite for AdSense account approval
provides:
  - Lighthouse CI config with mobile performance >= 0.9 assertion gate
  - public/ads.txt with Google AdSense inventory authorization (placeholder publisher ID)
  - CLS prevention CSS rule for unfilled AdSense slots in global.css
  - Pre-AdSense Lighthouse baseline: 100/100 mobile performance (3-run median)
  - @ctrl/react-adsense and @lhci/cli packages installed
affects: [16-02]

# Tech tracking
tech-stack:
  added:
    - "@ctrl/react-adsense 2.1.0 — React ins wrapper for AdSense ad units"
    - "@lhci/cli 0.15.1 — Lighthouse CI baseline and regression gate"
  patterns:
    - "Lighthouse CI config with 3-run mobile measurement and >= 0.9 performance assertion"
    - "ads.txt at public/ root for Vercel static hosting — served at domain root automatically"
    - "CLS prevention via ins.adsbygoogle[data-ad-status=unfilled] { display: none !important }"
    - "LHCI reports in .lighthouseci/ added to .gitignore — generated output, not source"

key-files:
  created:
    - .lighthouserc.json
    - public/ads.txt
  modified:
    - package.json
    - package-lock.json
    - src/styles/global.css
    - .gitignore

key-decisions:
  - "Lighthouse baseline captured against dist/client static dir (not live dev server) — clean build avoids dev-mode overhead"
  - "ads.txt uses placeholder pub-XXXXXXXXXXXXXXXX — to be replaced when AdSense account is approved and publisher ID provided"
  - ".lighthouseci/ added to .gitignore — CI reports are generated artifacts, not source files"

patterns-established:
  - "Pattern: LHCI baseline before AdSense code — run lhci autorun --collect.staticDistDir=./dist/client"
  - "Pattern: ads.txt at public/ads.txt in Astro project — Vercel serves public/ as domain root"

requirements-completed:
  - ADS-01

# Metrics
duration: 3min
completed: 2026-04-01
---

# Phase 16 Plan 01: Google AdSense — Infrastructure & Baseline Summary

**Lighthouse CI config with >= 90 performance gate, ads.txt authorization file, and CLS prevention CSS — all established before any AdSense component code, with baseline 100/100 mobile performance captured**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T14:47:18Z
- **Completed:** 2026-04-01T14:50:47Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Installed `@ctrl/react-adsense` (ad component wrapper) and `@lhci/cli` (Lighthouse CI regression gate)
- Created `.lighthouserc.json` with 3-run mobile Lighthouse measurement, min score 0.9 assertion gate
- Created `public/ads.txt` with Google AdSense inventory authorization (placeholder publisher ID for human replacement)
- Added CLS prevention rule to `global.css` — unfilled AdSense slots hidden to prevent layout shift
- Captured pre-AdSense Lighthouse baseline: **100/100 (1.0)** on all 3 runs — assertion gate passed clean

## Lighthouse Baseline Results (Pre-AdSense)

| Run | Mobile Performance | Gate (>= 0.9) |
|-----|-------------------|---------------|
| Run 1 | 1.0 (100/100) | PASS |
| Run 2 | 1.0 (100/100) | PASS |
| Run 3 | 1.0 (100/100) | PASS |
| **Median** | **1.0 (100/100)** | **PASS** |

Assertion results: `[]` (zero failures). Performance safety net established for Plan 02 comparison.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create Lighthouse CI config + ads.txt** - `97a2065` (chore)
2. **Task 2: Capture Lighthouse CI baseline (pre-AdSense)** - `cfaa15f` (chore)

## Files Created/Modified
- `.lighthouserc.json` — Lighthouse CI config, mobile, 3 runs, performance >= 0.9 assertion
- `public/ads.txt` — Google AdSense inventory authorization (placeholder pub-XXXXXXXXXXXXXXXX)
- `src/styles/global.css` — Added CLS prevention rule for unfilled AdSense slots
- `package.json` — Added @ctrl/react-adsense (dep) and @lhci/cli (devDep)
- `package-lock.json` — Updated lockfile
- `.gitignore` — Added .lighthouseci/ (generated LHCI reports excluded from source)

## Decisions Made
- Lighthouse baseline captured against `dist/client` static directory using `--collect.staticDistDir` — avoids dev-server overhead and measures the actual shipped build
- `ads.txt` uses placeholder `pub-XXXXXXXXXXXXXXXX` — to be replaced by human when AdSense account is approved and publisher ID is available
- `.lighthouseci/` added to `.gitignore` — generated HTML/JSON reports are ephemeral artifacts, not source files that belong in version control

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added .lighthouseci/ to .gitignore**
- **Found during:** Task 2 (Lighthouse CI baseline capture)
- **Issue:** LHCI run generates HTML and JSON report files in `.lighthouseci/` — these are generated output artifacts that should not be committed to source control
- **Fix:** Added `.lighthouseci/` entry to `.gitignore`
- **Files modified:** `.gitignore`
- **Verification:** `git status` confirms `.lighthouseci/` is untracked and correctly ignored
- **Committed in:** `cfaa15f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — gitignore for generated reports)
**Impact on plan:** Necessary housekeeping. No scope creep.

## Issues Encountered
None — build succeeded cleanly, LHCI ran on first attempt with `--collect.staticDistDir=./dist/client`.

## User Setup Required

**External services require manual configuration before Plan 02 can serve real ads:**

1. **Apply for Google AdSense account** at https://adsense.google.com — use domain `qr-code-generator-app.com`
2. **Get Publisher ID** from AdSense Dashboard -> Account -> Publisher ID (format: `ca-pub-XXXXXXXXXXXXXXXX`)
3. **Update `public/ads.txt`** — replace `pub-XXXXXXXXXXXXXXXX` with your real publisher ID
4. **Create horizontal display ad unit** in AdSense Dashboard -> Ads -> By ad unit -> Display ads
5. **Get Slot ID** from the created ad unit
6. **Set environment variables** (local `.env` and Vercel dashboard):
   ```
   PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
   PUBLIC_ADSENSE_SLOT=1234567890
   ```

Note: The code in Plan 02 (AdUnit component) can be implemented before AdSense account approval — real ads only serve post-approval. The placeholder publisher ID in ads.txt is intentional.

## Next Phase Readiness
- Performance safety net in place: LHCI config established, baseline documented at 100/100
- Static infrastructure files created: `ads.txt` and CLS CSS rule
- Package dependencies installed: `@ctrl/react-adsense` and `@lhci/cli`
- Plan 02 can proceed with `AdUnit` component implementation
- Concern: User must update `public/ads.txt` with real publisher ID and provide env vars before production ad serving works

---
*Phase: 16-google-adsense*
*Completed: 2026-04-01*
