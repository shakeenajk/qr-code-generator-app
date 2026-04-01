---
phase: 15-hosted-landing-pages
plan: "02"
subsystem: frontend-ui
tags: [react, file-upload, vercel-blob, tabs, landing-pages]
dependency_graph:
  requires: [15-01]
  provides: [pdf-tab-ui, appstore-tab-ui, file-upload-zone, landing-page-qr-save-flow]
  affects: [QRGeneratorIsland, generator-tab-system]
tech_stack:
  added: []
  patterns:
    - Controlled file upload zone with drag-drop using React state
    - Parallel Vercel Blob client-upload from tab form on submit
    - Pill-shaped toggle buttons using fieldset/legend (accessible pattern)
    - Tab content panels always in DOM, hidden class toggled (CONT-05 preservation)
key_files:
  created:
    - src/components/FileUploadZone.tsx
    - src/components/tabs/PdfTab.tsx
    - src/components/tabs/AppStoreTab.tsx
  modified:
    - src/components/QRGeneratorIsland.tsx
decisions:
  - "Landing page tabs call handleLandingPageSave which injects current colorOptions/shapeOptions/logoOptions into the POST body, so the created QR code captures the user's active customization at save time"
  - "isEmpty for pdf/appstore tabs is true until landingDynamicSlug is set — QR preview shows placeholder until the landing page is actually created"
  - "handleLandingPageSave is declared as useCallback with colorOptions/shapeOptions/logoOptions deps to capture current styling at call time"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-01"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
---

# Phase 15 Plan 02: Generator UI for Hosted Landing Pages Summary

**One-liner:** PDF and App Store tabs added to QRGeneratorIsland with a reusable drag-drop FileUploadZone and two-step Vercel Blob upload + landing-page-create save flow.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create FileUploadZone component and PdfTab | e37ea64 | src/components/FileUploadZone.tsx, src/components/tabs/PdfTab.tsx |
| 2 | Create AppStoreTab and wire both tabs into QRGeneratorIsland | 48348ac | src/components/tabs/AppStoreTab.tsx, src/components/QRGeneratorIsland.tsx |

## What Was Built

### FileUploadZone (`src/components/FileUploadZone.tsx`)
Reusable controlled file upload component with all 5 UI states from UI-SPEC:
- **Idle**: dashed border `border-2 border-dashed border-gray-300 dark:border-slate-600`, min-height 96px
- **Drag-over**: `border-blue-400 bg-blue-50 dark:bg-blue-950/20` (onDragOver/onDrop/onDragLeave handlers)
- **Selected**: filename + formatted size + "Remove" link
- **Uploading**: `Loader2` spinner + "Uploading…" text, interaction disabled
- **Error**: `border-red-400 bg-red-50 dark:bg-red-950/20` + error text below in `text-xs text-red-600`
- Client-side size validation against `maxSizeMB` prop before calling `onFileSelect`
- Hidden `<input type="file">` triggered by click/keyboard on drop zone
- `helperText` prop renders `text-xs text-gray-400 dark:text-slate-500` below zone

### PdfTab (`src/components/tabs/PdfTab.tsx`)
PDF landing page creation form with all D-01 fields:
- Title* (required, inline error)
- Description* (textarea 3 rows, required, inline error)
- Website URL, Company Name, CTA Button Text
- Cover Photo upload via FileUploadZone (image/jpeg,png,webp)
- PDF File upload via FileUploadZone (application/pdf)
- Social Sharing toggle group: Facebook, Twitter/X, LinkedIn — pill-shaped buttons inside `<fieldset>` with `<legend className="sr-only">`
- On submit: validates required fields, then uploads cover + PDF in parallel using `upload()` from `@vercel/blob/client` with `handleUploadUrl: '/api/landing/upload'`, then calls `onSave()`
- Sign-in gate: shows prompt + sign-in link when `isSignedIn` is false

### AppStoreTab (`src/components/tabs/AppStoreTab.tsx`)
App Store landing page creation form with all D-06 fields:
- App Name* (required), Description* (required), Company Name, CTA Button Text
- iOS App Store URL, Google Play URL
- App Icon upload via FileUploadZone
- Screenshot/Trailer URL (text input, not file upload — per spec)
- On submit: validates required fields, uploads app icon, calls `onSave()`
- Same sign-in gate pattern as PdfTab

### QRGeneratorIsland updates (`src/components/QRGeneratorIsland.tsx`)
- `TabId` type extended: `"url" | "text" | "wifi" | "vcard" | "pdf" | "appstore"`
- `TABS` array: 6 tabs — URL, Text, WiFi, vCard, PDF, App Store
- `landingSaving` state and `landingDynamicSlug` state added
- `handleLandingPageSave` async function:
  - Injects current `colorOptions` + `shapeOptions` + `logoOptions` into POST body
  - POSTs to `/api/landing/create`
  - On 201: sets `landingDynamicSlug` → QR encodes `https://qr-code-generator-app.com/r/[slug]`
  - On 403: tier gate toast "You've reached your QR code limit. Upgrade your plan to create more."
  - On error: toast "Could not save your landing page. Please try again."
- `rawContent` returns `/r/--------` placeholder for pdf/appstore until slug is set
- `isEmpty` returns `true` for pdf/appstore tabs until `landingDynamicSlug` is set (QR stays blank)
- Edit-mode check: `["url", "text", "wifi", "vcard", "pdf", "appstore"].includes(data.contentType)`
- Tab panels for pdf and appstore added to the DOM-always pattern (hidden class toggled)

## Deviations from Plan

None — plan executed exactly as written.

## Decisions Made

1. **handleLandingPageSave captures styling at call time**: The function is a `useCallback` with `colorOptions`, `shapeOptions`, and `logoOptions` as dependencies. This ensures the landing page's QR code captures the user's active customization at the moment they click "Create".

2. **QR preview stays empty until landing page is created**: `isEmpty` returns `true` for pdf/appstore tabs until `landingDynamicSlug` is non-null. This is correct behavior — there is no meaningful QR data until the backend assigns a redirect slug.

3. **PdfTab/AppStoreTab data interfaces include name/styleData/logoData/thumbnailData fields**: The tabs declare these in their data interface but they are populated by `handleLandingPageSave` in QRGeneratorIsland (not by the tab itself), ensuring separation of concerns.

## Known Stubs

None — all fields are wired. The `landingDynamicSlug` placeholder renders `--------` in the QR URL before creation, which is intentional behavior (not a stub).

## Self-Check: PASSED

- [x] `src/components/FileUploadZone.tsx` exists
- [x] `src/components/tabs/PdfTab.tsx` exists
- [x] `src/components/tabs/AppStoreTab.tsx` exists
- [x] `src/components/QRGeneratorIsland.tsx` modified
- [x] Commits e37ea64 and 48348ac exist
- [x] `npm run build` passes (verified before commit)
