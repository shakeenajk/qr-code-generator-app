---
phase: 15-hosted-landing-pages
verified: 2026-03-31T23:30:00Z
status: human_needed
score: 13/13 must-haves verified
re_verification: true
re_verification_meta:
  previous_status: gaps_found
  previous_score: 9/13
  gaps_closed:
    - "Scanning QR code opens /p/[slug] landing page with correct content — src/pages/p/[slug].astro restored via cherry-pick dba5f3a"
    - "PDF landing page shows cover photo, embedded PDF viewer, metadata sidebar, download button, social sharing links — same file"
    - "App Store landing page shows app icon, description, both store buttons (iOS + Google Play) — same file"
    - "Landing page has OG meta tags (og:title, og:description, og:image) in server-rendered head — same file"
    - "QR library list API returns landing page metadata for dashboard cards — src/pages/api/qr/list.ts restored via cherry-pick 66880e5"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end PDF landing page creation and scan"
    expected: "PDF tab form fills out, uploads to Blob, creates QR, QR encodes /r/[dynamicSlug], scanning redirects to /p/[landingSlug], page shows cover photo + PDF iframe + sidebar + social sharing"
    why_human: "Requires BLOB_READ_WRITE_TOKEN env var and Turso migration applied to test file uploads and DB persistence"
  - test: "End-to-end App Store landing page creation and scan"
    expected: "App Store tab fills out, uploads icon to Blob, creates QR, scanning redirects to /p/[slug], page shows app icon + description + both store buttons (iOS as active link, Google Play as active link)"
    why_human: "Same external service dependency as above; visual button states depend on live data"
  - test: "Dashboard QR Library shows landing page cards correctly"
    expected: "PDF QR shows indigo PDF badge + landing page title + View Page link opening /p/[slug] in new tab. App Store QR shows emerald App Store badge. Edit icon navigates to /dashboard/edit-landing/[id] with all fields pre-populated."
    why_human: "Requires live DB data and correct list API response to verify card rendering"
  - test: "Edit and delete flow for landing pages"
    expected: "Edit: title change saves and QR library reflects updated title. Delete: both QR row and /p/[slug] return 404 after deletion, Blob files cleaned up."
    why_human: "Requires live Blob and DB to verify file cleanup and cascade delete"
---

# Phase 15: Hosted Landing Pages Verification Report

**Phase Goal:** Users can generate a QR code that scans to a hosted, branded landing page — either a PDF viewer or an App Store listing — with uploaded cover art, descriptive copy, and sharing links
**Verified:** 2026-03-31T23:30:00Z
**Status:** human_needed — all 13 automated truths verified; 4 items require live Vercel Blob + Turso to test end-to-end
**Re-verification:** Yes — after cherry-picking commits dba5f3a and 66880e5 from Plan 03 worktree branch onto main

---

## Re-verification Summary

Previous verification (2026-03-31T22:00:00Z) found 5 gaps, all rooted in the same cause: commits `a214e0a` (slug page) and `8fafd11` (list.ts update) were on an orphaned branch never merged to main.

Cherry-pick result:
- `dba5f3a` — feat(15-03): create /p/[slug] SSR landing page for PDF and App Store types
- `66880e5` — feat(15-03): update list API with LEFT JOIN to landingPages

Both commits are now on main (confirmed via `git log --oneline`). All 5 previously-failing truths now pass automated checks.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | landingPages table exists in Turso with all required columns | VERIFIED | `src/db/schema.ts` exports `landingPages` with all 20 columns, 2 indexes, FK to savedQrCodes with cascade. Migration SQL at `drizzle/0001_lively_stranger.sql` present. |
| 2 | Files can be uploaded to Vercel Blob via /api/landing/upload | VERIFIED | `src/pages/api/landing/upload.ts` exports POST, uses `handleUpload` from `@vercel/blob/client`, tier-based maxBytes enforced. |
| 3 | Landing page records can be created with linked savedQrCodes and dynamicQrCodes rows | VERIFIED | `src/pages/api/landing/create.ts` inserts 3 linked rows, checks totalQr limit, generates two nanoid(8) slugs, returns 201 with `{savedQrCodeId, landingPageId, landingSlug, dynamicSlug}`. |
| 4 | Landing page records can be read, updated, and deleted with IDOR prevention | VERIFIED | `src/pages/api/landing/[id].ts` exports GET/PUT/DELETE, all use `and(eq(landingPages.id, id), eq(landingPages.userId, userId))`. DELETE calls `del()` on Blob URLs. |
| 5 | Tier limits are enforced against totalQr on create | VERIFIED | `create.ts`: `if (totalCount >= limits.totalQr)` returns 403 `total_limit_reached`. Free:5, Starter:100, Pro:250. |
| 6 | Old Blob files are deleted when replaced during edit | VERIFIED | `[id].ts`: iterates `FILE_URL_FIELDS`, collects `blobUrlsToDelete`, calls `del(url)` after DB update. |
| 7 | User can fill out PDF form with all fields and upload cover photo + PDF file | VERIFIED | `src/components/tabs/PdfTab.tsx` has all D-01 fields (title, description, websiteUrl, companyName, ctaButtonText, cover photo FileUploadZone, PDF FileUploadZone, social sharing fieldset). Uploads via `upload()` from `@vercel/blob/client`. |
| 8 | User can fill out App Store form with all fields and upload app icon | VERIFIED | `src/components/tabs/AppStoreTab.tsx` has all D-06 fields (appName, description, companyName, ctaButtonText, appStoreUrl, googlePlayUrl, FileUploadZone for icon, screenshotUrl). |
| 9 | PDF and App Store tabs appear in the generator tab bar | VERIFIED | `QRGeneratorIsland.tsx`: `type TabId = "url" \| "text" \| "wifi" \| "vcard" \| "pdf" \| "appstore"`. Both tabs imported and rendered. |
| 10 | Saving a PDF/App Store QR creates the landing page and encodes /r/[dynamicSlug] | VERIFIED | `handleLandingPageSave` POSTs to `/api/landing/create`, on 201 sets `landingDynamicSlug`, QR content becomes `REDIRECT_BASE + dynamicSlug`. |
| 11 | Scanning QR code opens /p/[slug] landing page with correct content | VERIFIED | `src/pages/p/[slug].astro` (289 lines) exists. `prerender = false`, queries `landingPages` by slug, redirects to /404 on miss. Renders PDF layout or App Store layout by `page.type`. |
| 12 | Landing page has OG meta tags (og:title, og:description, og:image) in server-rendered head | VERIFIED | Lines 35-39 of `[slug].astro`: `og:title`, `og:description`, `og:image` (coverImageUrl ?? appIconUrl ?? '/og-image.png'), `og:type`, `og:url` — all in SSR `<head>`. |
| 13 | QR library list API returns landing page metadata for dashboard cards | VERIFIED | `src/pages/api/qr/list.ts` (54 lines): imports `landingPages`, LEFT JOIN at line 39, selects `landingPageId/Slug/Title/Type`, maps `isLandingPage: row.landingPageId !== null`. |

**Score: 13/13 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema.ts` | landingPages table definition | VERIFIED | All 20 columns, 2 indexes, FK to savedQrCodes. |
| `drizzle/0001_lively_stranger.sql` | SQL migration for landing_pages table | VERIFIED | `CREATE TABLE landing_pages` present. |
| `src/pages/api/landing/upload.ts` | Vercel Blob client-upload token exchange | VERIFIED | `handleUpload` present, tier size limits enforced. |
| `src/pages/api/landing/create.ts` | Landing page + QR creation endpoint | VERIFIED | 3-row insert, totalQr enforcement, dual slug generation. |
| `src/pages/api/landing/[id].ts` | Landing page CRUD (GET/PUT/DELETE) | VERIFIED | All three handlers, IDOR prevention, Blob cleanup on PUT/DELETE. |
| `src/components/FileUploadZone.tsx` | Reusable drag-and-drop file upload component | VERIFIED | 165 lines. All upload states implemented. |
| `src/components/tabs/PdfTab.tsx` | PDF landing page creation form | VERIFIED | 381 lines. All D-01 fields, `upload()` from `@vercel/blob/client`. |
| `src/components/tabs/AppStoreTab.tsx` | App Store landing page creation form | VERIFIED | 305 lines. All D-06 fields, sign-in gate. |
| `src/components/QRGeneratorIsland.tsx` | Updated generator with PDF and App Store tabs | VERIFIED | 823 lines. TabId includes pdf/appstore, `handleLandingPageSave` wired to both tabs. |
| `src/pages/p/[slug].astro` | Public SSR landing page for PDF and App Store types | VERIFIED | 289 lines. Was MISSING in previous verification; restored via cherry-pick dba5f3a. |
| `src/pages/api/qr/list.ts` | Updated list API with LEFT JOIN to landingPages | VERIFIED | 54 lines. Was STUB in previous verification; restored via cherry-pick 66880e5. |
| `src/components/dashboard/QRLibrary.tsx` | Extended QR library with PdfCardBody and AppStoreCardBody | VERIFIED | PdfBadge, AppStoreBadge, PdfCardBody, AppStoreCardBody present. Dispatches on `qr.isLandingPage` and `qr.landingPageType`. |
| `src/pages/dashboard/edit-landing/[id].astro` | Auth-protected edit landing page route | VERIFIED | `prerender = false`, auth guard, renders `EditLandingPageForm` with `client:load`. |
| `src/components/EditLandingPageForm.tsx` | React island for editing landing page fields | VERIFIED | 698 lines. Fetches GET on mount, partial-update PUT semantics. |

---

### Key Link Verification

**Plan 01 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/api/landing/create.ts` | `src/lib/tierLimits.ts` | `TIER_LIMITS[tier].totalQr` check | WIRED | Line 26: `if (totalCount >= limits.totalQr)` |
| `src/pages/api/landing/create.ts` | `src/db/schema.ts` | `db.insert` into landingPages, savedQrCodes, dynamicQrCodes | WIRED | Three `db.insert()` calls. |
| `src/pages/api/landing/[id].ts` | `@vercel/blob` | `del(oldUrl)` on file replacement | WIRED | `del()` called per replaced URL after DB update. |

**Plan 02 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/tabs/PdfTab.tsx` | `/api/landing/upload` | `upload()` from `@vercel/blob/client` | WIRED | Import at line 3. Upload call with `handleUploadUrl: '/api/landing/upload'`. |
| `src/components/tabs/PdfTab.tsx` | `/api/landing/create` | fetch POST via parent onSave | WIRED | `onSave` wired to `handleLandingPageSave` in QRGeneratorIsland which POSTs to `/api/landing/create`. |
| `src/components/QRGeneratorIsland.tsx` | `src/components/tabs/PdfTab.tsx` | import and render in tab switch | WIRED | Import present. `<PdfTab onSave={handleLandingPageSave} .../>` rendered. |

**Plan 03 Key Links (previously NOT_WIRED — now WIRED)**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/p/[slug].astro` | `src/db/schema.ts` | Drizzle query on landingPages by slug | WIRED | Lines 10-14: `db.select().from(landingPages).where(eq(landingPages.slug, slug)).limit(1)` |
| `src/pages/api/qr/list.ts` | `src/db/schema.ts` | LEFT JOIN landingPages on savedQrCodeId | WIRED | Line 39: `.leftJoin(landingPages, eq(savedQrCodes.id, landingPages.savedQrCodeId))` |

**Plan 04 Key Links**

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/dashboard/QRLibrary.tsx` | `/p/[slug]` | View Page link href | WIRED | `href={"/p/" + qr.landingPageSlug}` with `target="_blank"` |
| `src/components/dashboard/QRLibrary.tsx` | `/dashboard/edit-landing/[id]` | Edit button href | WIRED | `href={'/dashboard/edit-landing/' + qr.landingPageId}` |
| `src/components/EditLandingPageForm.tsx` | `/api/landing/[id]` | fetch PUT with updated data | WIRED | `fetch(\`/api/landing/${landingPageId}\`, { method: 'PUT' ... })`. Partial-update contract honored. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `src/components/dashboard/QRLibrary.tsx` | `qrCodes` (SavedQR[]) | `useEffect` → `fetch('/api/qr/list')` | `list.ts` now has landingPages LEFT JOIN — `isLandingPage`, `landingPageType`, `landingPageSlug`, `landingPageTitle` all returned from real DB query | FLOWING |
| `src/components/EditLandingPageForm.tsx` | `record` (LandingPageRecord) | `useEffect` → `GET /api/landing/${landingPageId}` | Real DB query in `[id].ts` GET handler | FLOWING |
| `src/pages/p/[slug].astro` | `page` (landingPages row) | Drizzle query on landingPages by slug (SSR) | `db.select().from(landingPages).where(eq(landingPages.slug, slug))` — real DB query, not static | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Migration SQL present | `ls drizzle/0001_lively_stranger.sql` | File exists | PASS |
| @vercel/blob installed | `grep "@vercel/blob" package.json` | `"@vercel/blob": "^2.3.2"` | PASS |
| slug.astro exists on disk | `ls src/pages/p/` | `[slug].astro` found | PASS |
| list.ts has landingPage join | `grep landingPage src/pages/api/qr/list.ts` | 6 matching lines including leftJoin | PASS |
| OG tags in slug.astro head | `grep "og:title" src/pages/p/[slug].astro` | Line 35 — server-rendered `<meta property="og:title">` | PASS |
| slug.astro has prerender = false | `grep "prerender = false" src/pages/p/[slug].astro` | Line 2 | PASS |
| slug.astro has Cache-Control | `grep "Cache-Control" src/pages/p/[slug].astro` | Line 25: `public, s-maxage=300, stale-while-revalidate=60` | PASS |
| Store buttons min-height 44px | `grep "min-height:44px" src/pages/p/[slug].astro` | Lines 227, 242 — both buttons | PASS |
| list.ts isLandingPage computed | `grep "isLandingPage" src/pages/api/qr/list.ts` | Line 47: `row.landingPageId !== null` | PASS |
| PdfTab imports upload | `grep "upload" src/components/tabs/PdfTab.tsx` | `import { upload } from "@vercel/blob/client"` | PASS |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONT-01 | 15-01, 15-02, 15-03, 15-04 | User can generate a QR code for a PDF with hosted landing page (cover photo, title, description, social buttons, website URL) | VERIFIED | Full chain implemented: PdfTab (form + upload) → `/api/landing/create` (3-row insert) → QR encodes `/r/[dynamicSlug]` → `/p/[slug].astro` renders cover photo hero + PDF iframe + sidebar + social sharing. OG tags in SSR head. |
| CONT-02 | 15-01, 15-02, 15-03, 15-04 | User can generate a QR code for an App Store listing with hosted landing page (all store links, app name, description, branding) | VERIFIED | AppStoreTab (form + upload) → same create API → `/p/[slug].astro` renders app icon + title + description + both store buttons (always visible, disabled via `opacity:0.5;pointer-events:none` when URL absent per D-05). |
| CONT-03 | 15-01, 15-03 | PDF/App Store landing pages follow same QR code limits per tier (Free: 5, Starter: 100, Pro: 250) | VERIFIED | `create.ts` checks `totalQr` (not `dynamicQr`) against `TIER_LIMITS[tier].totalQr`. Limits: Free 5, Starter 100, Pro 250. |

**Orphaned requirement check:** REQUIREMENTS.md rows 36-38 and tracking table rows 111-113 list exactly CONT-01, CONT-02, CONT-03 for Phase 15. All three accounted for. No orphaned requirements.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/tabs/PdfTab.tsx` | 192 | `styleData: ""` hardcoded empty string passed to `onSave` | Info | `QRGeneratorIsland.handleLandingPageSave` overrides `styleData` with real value at line 449. Not a runtime issue. |

No blocker anti-patterns found. Previous blocker (missing landingPages JOIN in list.ts) is resolved.

---

### Human Verification Required

#### 1. End-to-end PDF landing page creation and scan

**Test:** Set `BLOB_READ_WRITE_TOKEN` env, apply Turso migration, start dev server. Go to PDF tab — fill Title, Description, Website URL. Upload a test cover image and a small PDF. Click "Create PDF Landing Page".
**Expected:** Success toast "Landing page created". QR encodes `https://qr-code-generator-app.com/r/[slug]`. Navigate to `/p/[landingSlug]` directly — page shows cover photo hero (max-height 240px), PDF iframe (600px tall), metadata sidebar with title/description/website link, social share buttons for selected platforms, Download PDF button.
**Why human:** File upload requires live `BLOB_READ_WRITE_TOKEN`. PDF iframe rendering and visual layout are browser-only behaviors.

#### 2. End-to-end App Store landing page creation and scan

**Test:** Go to App Store tab, fill App Name + Description + iOS URL + Google Play URL. Upload an app icon. Leave one store URL blank. Click "Create App Store Page".
**Expected:** QR created. Opening `/p/[slug]` shows app icon (80x80 rounded), title, description, both store buttons always visible — button for missing URL has `opacity:0.5` and is non-clickable.
**Why human:** Visual button disabled state and icon render require a live Blob URL.

#### 3. Dashboard QR Library landing page cards

**Test:** After creating both a PDF and App Store QR, go to Dashboard > QR Library.
**Expected:** PDF QR shows indigo "PDF" badge, landing page title, "View Page" link opening `/p/[slug]` in new tab, edit icon routing to `/dashboard/edit-landing/[id]`. App Store QR shows emerald "App Store" badge. Each card's delete confirmation reads "This will delete the QR code and its hosted page permanently".
**Why human:** Requires live DB records populated via the generator; card badge and body rendering are visual.

#### 4. Edit and delete flow

**Test:** Click edit on a landing page card. Change the title and re-upload the cover photo. Save. Then delete a landing page.
**Expected:** Edit: toast "Landing page updated", redirect to dashboard, QR library shows updated title. Old Blob file deleted. Delete: after confirmation, both QR and `/p/[slug]` return 404; Blob files for cover/PDF/icon are gone.
**Why human:** Requires live Blob and DB to verify file cleanup and cascade delete.

---

### Gaps Summary

No automated gaps remain. All 13 must-haves pass. The two cherry-pick commits (`dba5f3a`, `66880e5`) fully resolved the previous 5 failures.

Phase 15 automated verification is complete. The 4 human verification items above all depend on external services (`BLOB_READ_WRITE_TOKEN`, live Turso DB with migration applied) — they cannot be verified programmatically without running the full stack.

---

_Verified: 2026-03-31T23:30:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after cherry-pick of Plan 03 orphaned commits onto main_
