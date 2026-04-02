---
phase: 16-google-adsense
plan: 02
subsystem: ui
tags: [adsense, react, performance, ads, tier-gate, lighthouse]

# Dependency graph
requires:
  - phase: 16-01
    provides: LHCI config, ads.txt, CLS CSS rule, @ctrl/react-adsense installed
  - phase: 13-seo-and-homepage-content
    provides: SEO pages live — AdSense account prerequisite
provides:
  - AdUnit React component with tier-gated delayed script injection
  - QRGeneratorIsland wired to show AdUnit only for isSignedIn && userTier === "free"
  - .env.example documents PUBLIC_ADSENSE_CLIENT and PUBLIC_ADSENSE_SLOT
  - Lighthouse post-AdSense verification: 100/100 mobile (no regression)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tier-gated AdSense via isSignedIn && userTier === 'free' — exact equality prevents null flash"
    - "Delayed script injection: interaction events (6 types) + 5s setTimeout fallback"
    - "useRef(false) double-injection guard for React Strict Mode safety"
    - "minHeight: 90 placeholder on AdUnit container — CLS prevention before ad loads"
    - "Script injected dynamically in useEffect, only when component renders (free-tier only)"

key-files:
  created:
    - src/components/AdUnit.tsx
    - .env.example
  modified:
    - src/components/QRGeneratorIsland.tsx

key-decisions:
  - "Tier guard is isSignedIn && userTier === 'free' (exact equality) — null, starter, pro all excluded"
  - "Script injection lives inside AdUnit useEffect — script only loads when component renders (free-tier only)"
  - "No @ctrl/react-adsense wrapper used — hand-rolled component per plan spec gives full TypeScript control"

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 16 Plan 02: Google AdSense — AdUnit Component and Integration Summary

**Tier-gated AdUnit React component with delayed script injection wired into QRGeneratorIsland — free-tier signed-in users see ads, all others see nothing, Lighthouse stays 100/100**

## Performance

- **Duration:** 8 min
- **Completed:** 2026-04-01
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Created `src/components/AdUnit.tsx` — tier-gated React component:
  - Props: `adClient`, `adSlot` (passed from `import.meta.env` PUBLIC_ vars)
  - `useRef(false)` double-injection guard for React Strict Mode
  - 6 interaction event listeners + 5-second timeout fallback for delayed injection
  - `adsbygoogle.js` injected dynamically in `useEffect` — zero impact on non-free users
  - Cleanup removes all listeners and clears timeout on unmount
  - Outer div: `w-full mt-4`, `minHeight: 90`, `aria-label="Advertisement"` (CLS prevention + accessibility)
  - Disclosure label: `text-xs text-gray-400 dark:text-slate-500 mb-1` — text: "Advertisement"
  - `<ins>` with `data-ad-format="horizontal"` and `data-full-width-responsive="true"`
- Created `.env.example` documenting `PUBLIC_ADSENSE_CLIENT` and `PUBLIC_ADSENSE_SLOT`
- Updated `QRGeneratorIsland.tsx`:
  - Added `import { AdUnit } from "./AdUnit"` adjacent to ExportButtons import
  - Added conditional render: `{isSignedIn && userTier === "free" && <AdUnit adClient={...} adSlot={...} />}` after save buttons, before preview panel closing div
- Ran Lighthouse CI post-AdSense: **100/100 mobile performance (3-run median)** — zero regressions

## Lighthouse Post-AdSense Results

| Run | Mobile Performance | Gate (>= 0.9) |
|-----|-------------------|---------------|
| Run 1 | 1.0 (100/100) | PASS |
| Run 2 | 1.0 (100/100) | PASS |
| Run 3 | 1.0 (100/100) | PASS |
| **Median** | **1.0 (100/100)** | **PASS** |

Assertion results: `[]` (zero failures). Baseline comparison: Plan 01 baseline was 100/100. Post-AdSense score is identical — delayed injection pattern confirmed effective.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AdUnit component** — `2155973` (feat)
2. **Task 2: Wire AdUnit into QRGeneratorIsland** — `11dcfd1` (feat)
3. **Task 3: Lighthouse CI post-AdSense verification** — `562ecb9` (chore)

## Files Created/Modified

- `src/components/AdUnit.tsx` — AdSense component with tier-gate and delayed injection (63 lines)
- `.env.example` — Documents PUBLIC_ADSENSE_CLIENT and PUBLIC_ADSENSE_SLOT
- `src/components/QRGeneratorIsland.tsx` — AdUnit import + conditional render added

## Decisions Made

- Tier guard uses exact equality `userTier === "free"` — excludes null (loading), starter, and pro. Written `isSignedIn && userTier === "free"` as a compound check to also exclude anonymous visitors.
- Script injection is entirely inside `AdUnit`'s `useEffect`. Since `AdUnit` only renders for free-tier users, `adsbygoogle.js` is never even requested for anonymous or paid sessions.
- Hand-rolled `AdUnit` component instead of `@ctrl/react-adsense` wrapper — provides full TypeScript control and matches plan spec exactly (including the `Window.adsbygoogle` global augmentation).

## Deviations from Plan

### Prerequisites applied (not deviations)

The worktree branch did not include Plan 01 commits (package installs, ads.txt, CLS CSS, lighthouserc). These were cherry-picked and applied as a prerequisite commit before Plan 02 execution began. This is normal parallel agent behavior — the prerequisite state was committed as `5f3fd10 chore(16-01): apply Plan 01 prerequisites`.

### Auto-fixed Issues

None — plan executed exactly as written after prerequisites were applied.

## Known Stubs

- `PUBLIC_ADSENSE_CLIENT` defaults to `"ca-pub-XXXXXXXXXXXXXXXX"` (placeholder) — real ads will not serve until user replaces with actual publisher ID in Vercel env vars
- `PUBLIC_ADSENSE_SLOT` defaults to `"1234567890"` (placeholder) — real ads will not serve until user replaces with actual slot ID
- `public/ads.txt` uses placeholder `pub-XXXXXXXXXXXXXXXX` — must be updated with real publisher ID

These stubs are intentional. The AdUnit component and tier-gate are fully wired and functional. Real ad serving requires external AdSense account approval and environment variable configuration by the user (documented in Plan 01 SUMMARY under "User Setup Required").

## Issues Encountered

None — build succeeded cleanly, Lighthouse CI ran on first attempt, all assertions passed.

---
*Phase: 16-google-adsense*
*Completed: 2026-04-01*
