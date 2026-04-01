---
phase: 15-hosted-landing-pages
plan: 03
subsystem: pages, api
tags: [astro, ssr, og-tags, drizzle, landing-pages, pdf, appstore, edge-cache]

# Dependency graph
requires:
  - plan: 15-01
    provides: "landingPages table schema with all 20 columns, FK to savedQrCodes"
  - plan: 15-02
    provides: "PdfTab and AppStoreTab generator UI (not directly required but in same phase)"
provides:
  - "Public SSR /p/[slug] landing page rendering both PDF and App Store types"
  - "OG meta tags (og:title, og:description, og:image) in server-rendered head for social crawlers"
  - "Edge cache via Cache-Control: public, s-maxage=300, stale-while-revalidate=60"
  - "Updated /api/qr/list with landingPageId, landingPageSlug, landingPageTitle, landingPageType"
  - "isLandingPage boolean flag in list API response"
affects:
  - 15-04-PLAN  # Dashboard card display depends on list API landingPage fields

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Standalone SSR Astro page (no Layout.astro wrapper) for branded landing pages"
    - "OG tags in .astro frontmatter area rendered server-side before hydration"
    - "Drizzle LEFT JOIN chain: savedQrCodes -> dynamicQrCodes -> landingPages"
    - "Inline SVG icons for social platform share buttons"
    - "Responsive two-column PDF layout via CSS Grid with media query"

key-files:
  created:
    - src/pages/p/[slug].astro
  modified:
    - src/pages/api/qr/list.ts

key-decisions:
  - "Standalone page (no Layout.astro) — landing pages are branded customer experiences, not app chrome"
  - "Both store buttons always rendered per D-05 — disabled via opacity-50 pointer-events-none if URL missing"
  - "Social sharing using native share URLs (no third-party SDK) — zero JS dependency"
  - "Inline CSS styles in Astro file (no Tailwind on standalone page) — avoids Tailwind stylesheet dependency"
  - "PDF viewer uses <iframe> per plan spec (no PDF.js) — simpler, browser-native, sufficient for preview"

# Metrics
duration: ~10min
completed: 2026-03-31
---

# Phase 15 Plan 03: Public Landing Pages and List API Summary

**Public SSR /p/[slug] page serving PDF and App Store landing pages with OG meta tags and edge caching, plus list API extended with landingPage metadata for dashboard display**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-01T01:19:40Z
- **Completed:** 2026-04-01T01:21:40Z
- **Tasks:** 2/2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created `src/pages/p/[slug].astro` — public SSR page with no auth requirement, queries `landingPages` by slug from Drizzle, redirects to /404 if not found
- PDF layout: full-width cover hero (with SVG fallback), two-column grid (iframe viewer + sidebar), download button with SVG icon, social sharing buttons (Facebook, Twitter, LinkedIn) using native share URLs with inline SVG brand icons
- App Store layout: centered app icon (with gray fallback), title/company/description, two store buttons always rendered side-by-side (both disabled with opacity-50/pointer-events-none if URL missing), screenshot/trailer support (img or video element)
- OG meta tags (og:title, og:description, og:image, og:type, og:url) server-rendered in `<head>` for social crawlers
- Cache-Control header set to `public, s-maxage=300, stale-while-revalidate=60` for Vercel edge caching
- Updated `src/pages/api/qr/list.ts` to add LEFT JOIN on `landingPages` — 4 new fields (landingPageId, landingPageSlug, landingPageTitle, landingPageType) and `isLandingPage` boolean in response
- Build passes cleanly with no TypeScript errors

## Task Commits

1. **Task 1: Create /p/[slug].astro SSR landing page** - `a214e0a` (feat)
2. **Task 2: Update /api/qr/list to include landing page metadata** - `8fafd11` (feat)

## Files Created/Modified

- `src/pages/p/[slug].astro` — Public SSR landing page, 289 lines, no auth, PDF + App Store layouts
- `src/pages/api/qr/list.ts` — Added landingPages import, 4 select fields, LEFT JOIN, isLandingPage flag

## Decisions Made

- **Standalone page (no Layout.astro):** Landing pages are customer-facing branded experiences, not part of the app chrome. No navigation header, no shared layout dependencies.
- **Both store buttons always rendered:** Per decision D-05 — OS auto-redirect creates a poor experience for 50% of users. Both buttons shown; missing URL renders disabled button (opacity-50, pointer-events-none) not a hidden button.
- **Social sharing using native share URLs:** Facebook sharer, Twitter intent, LinkedIn share-offsite. Zero JavaScript SDK dependency — fully server-rendered anchor tags.
- **Inline CSS styles:** The standalone page doesn't load the global Tailwind stylesheet via `<link>`, so CSS is inlined to avoid FOUC and stylesheet dependency. This is consistent with the existing `/r/[slug].ts` holdingResponse HTML pattern.
- **iframe for PDF viewer:** Browser-native, no library required. Sufficient for first-page preview. Plan spec explicitly specified iframe approach.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met. Build passes.

## Known Stubs

None. The `/p/[slug]` page renders real data from the database. The social sharing buttons, PDF viewer, and store buttons all use real field values from the `landingPages` table. The `isLandingPage` flag in the list API response is a real boolean derived from the LEFT JOIN result (null vs non-null landingPageId).

## Self-Check: PASSED

- `src/pages/p/[slug].astro` exists: FOUND
- `src/pages/api/qr/list.ts` modified with landingPages: FOUND
- Commit a214e0a exists: FOUND
- Commit 8fafd11 exists: FOUND
- `npm run build`: PASSED (Complete in 5.69s, no errors)
