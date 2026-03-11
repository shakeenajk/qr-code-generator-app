---
phase: 04-export-and-launch
verified: 2026-03-10T00:00:00Z
status: human_needed
score: 4/5 must-haves verified
human_verification:
  - test: "Confirm Lighthouse mobile performance score >= 90"
    expected: "Lighthouse mobile performance score >= 90 on a production build (npm run build && npm run preview), verified in Chrome DevTools Lighthouse tab with Mode=Navigation, Device=Mobile"
    why_human: "SEO-09 requires a Lighthouse score, which is a live browser audit. 04-04 SUMMARY claims human confirmed >= 90, but this verifier cannot re-run a Lighthouse audit programmatically. The code change (client:visible) is verified in the codebase; the score outcome needs human attestation."
---

# Phase 4: Export and Launch — Verification Report

**Phase Goal:** A user can take the QR code they built and download or copy it in any format — and the site loads fast enough to rank well on mobile search.
**Verified:** 2026-03-10T00:00:00Z
**Status:** human_needed — all automated checks passed; one item (Lighthouse score) requires human attestation.
**Re-verification:** No — initial verification.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking "Download PNG" produces a PNG file at 3x resolution | VERIFIED | `ExportButtons.tsx` L60-74: creates 768x768 `QRCodeStyling` canvas instance and calls `.download({ name: 'qrcraft-code', extension: 'png' })`. The 768px dimension is 3x the 256px preview. Playwright smoke test `export-png triggers download with filename containing qrcraft-code` validates the download event. |
| 2 | Clicking "Download SVG" produces a true vector SVG | VERIFIED | `ExportButtons.tsx` L77-79: `handleSvgDownload` delegates to `qrCodeRef.current?.download({ name: 'qrcraft-code', extension: 'svg' })`. The live `qrCodeRef` is initialized with `type: 'svg'` in `QRGeneratorIsland.tsx` L35 (`qrInitialOptions`), so the download is a true SVG, not a raster wrapper. Playwright test `export-svg triggers download with filename containing qrcraft-code` validates the filename. |
| 3 | Clicking "Copy to Clipboard" copies the QR as PNG; unsupported browsers get a clear fallback | VERIFIED | `ExportButtons.tsx` L81-103: feature-detects `navigator.clipboard?.write`, falls through to `setCopyState('unsupported')` on any failure path including when clipboard is undefined. `COPY_LABELS` map drives button label (`idle`, `copied`, `unsupported`). Both paths have `setTimeout 2000ms` revert. Tests `export-copy shows Copied! on success` (Chromium only) and `export-copy shows Copy not supported when clipboard unavailable` cover both paths. |
| 4 | Site renders correctly in dark mode when OS dark mode preference is active | VERIFIED | `dark:bg-[#0f172a] dark:text-slate-100` on Layout.astro `<body>`. `dark:bg-slate-900 dark:border-slate-700` on Header.astro `<header>`. `dark:bg-[#0f172a]` on Hero.astro `<section>`, `dark:bg-slate-800 dark:border-slate-700` on generator root `<div>`. `dark:bg-slate-900 dark:border-slate-700` on Footer.astro `<footer>`. Dark classes present on QRGeneratorIsland tab bar, customize section, h2. `QRPreview.tsx` has zero `dark:` classes — `bg-white` preserved per locked decision. Playwright BRAND-04 dark mode tests (body bg, header bg, QR preview stays white) all pass. |
| 5 | Lighthouse mobile performance score is 90 or higher | HUMAN NEEDED | `client:visible` directive confirmed in `Hero.astro` L22 (previously `client:load`). The code change is verified. The 04-04 SUMMARY claims human confirmed >= 90. Cannot verify a Lighthouse score programmatically — requires human re-run. |

**Score:** 4/5 truths fully verified (5th truth requires human attestation for the score outcome)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/export.spec.ts` | Wave 0 smoke stubs for EXPO-01/02/03/04 and BRAND-04 | VERIFIED | 171-line file. 15 @smoke tests across Export Buttons, Copy to Clipboard, and Dark Mode describe blocks. All selectors (`export-png`, `export-svg`, `export-copy`, `url-input`, `qr-preview`) match implementation. Substantive: tests cover visibility, disabled state, enabled-after-content state, download filenames, clipboard success/fallback, body/header dark bg, QR preview parent stays white. |
| `src/components/ExportButtons.tsx` | Three export buttons with PNG/SVG/clipboard logic | VERIFIED | 136-line file. No stubs, no TODOs. Exports `ExportButtons` component. Three handlers (`handlePngDownload`, `handleSvgDownload`, `handleCopy`) fully implemented. `CopyState` is `useState` (not `useRef`). Button layout: `flex gap-2 mt-4`, `flex-1` on each button. All three `data-testid` attributes present. |
| `src/components/QRGeneratorIsland.tsx` | Wires ExportButtons below QRPreview | VERIFIED | `ExportButtons` imported at L13. Rendered at L252-259 as sibling to `QRPreview` inside the preview panel `div`. Passes `qrCodeRef`, `isEmpty`, `debouncedColor`, `debouncedShape`, `debouncedLogo`, `debouncedContent` as props — debounced variants used (not raw state). |
| `src/layouts/Layout.astro` | `dark:bg-[#0f172a] dark:text-slate-100` on body | VERIFIED | L86: `<body class="bg-white text-gray-900 antialiased dark:bg-[#0f172a] dark:text-slate-100">` |
| `src/components/Header.astro` | `dark:bg-slate-900 dark:border-slate-700` on header, `dark:text-white` on brand | VERIFIED | L5: `dark:bg-slate-900 dark:border-slate-700` on `<header>`. L13: `dark:text-white` on brand `<span>`. |
| `src/components/Hero.astro` | Dark variants on section and generator root; `client:visible` directive | VERIFIED | L6: `dark:bg-[#0f172a]` on `<section>`. L19: `dark:bg-slate-800 dark:border-slate-700` on generator root `<div>`. L8-11: h1 has `dark:text-white`, p has `dark:text-slate-300`. L22: `<QRGeneratorIsland client:visible />` (not `client:load`). |
| `src/components/Footer.astro` | `dark:bg-slate-900 dark:border-slate-700` on footer, `dark:text-slate-400` on text/links | VERIFIED | L5: `dark:bg-slate-900 dark:border-slate-700` on `<footer>`. L8: `dark:text-slate-400` on copyright `<p>`. L12: `dark:text-slate-400` on nav `<ul>`. L13-14: `dark:hover:text-slate-200` on nav links. |
| `src/components/QRPreview.tsx` | No `dark:` classes — `bg-white` locked | VERIFIED | Zero `dark:` classes in file. Outer `<div>` has `bg-white` at L13. Locked decision honored. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `QRGeneratorIsland.tsx` | `ExportButtons.tsx` | `<ExportButtons` in JSX with all required props | WIRED | L13: `import { ExportButtons } from './ExportButtons'`. L252-259: `<ExportButtons qrCodeRef={qrCodeRef} isEmpty={isEmpty} colorOptions={debouncedColor} shapeOptions={debouncedShape} logoOptions={debouncedLogo} debouncedContent={debouncedContent} />` — all 6 props present, debounced variants used. |
| `ExportButtons.tsx` | `qr-code-styling` | `new QRCodeStyling({ width: 768, height: 768, type: 'canvas', ... })` for 3x PNG | WIRED | L60: `const tempQr = new QRCodeStyling({ width: 768, height: 768, type: 'canvas', ... })`. Import at L2: `import QRCodeStyling from 'qr-code-styling'`. |
| `ExportButtons.tsx` | `navigator.clipboard` | `clipboard.write([new ClipboardItem(...)])` after `getRawData('png')` | WIRED | L83: `if (!navigator.clipboard?.write)` feature-detect. L88: `qrCodeRef.current?.getRawData('png')`. L94-96: `await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob as Blob })])`. |
| `Hero.astro` | `QRGeneratorIsland.tsx` | `client:visible` (IntersectionObserver-deferred hydration) | WIRED | L22: `<QRGeneratorIsland client:visible />`. Previously `client:load`; changed in commit `149fdb7`. |
| `Layout.astro body` | CSS `prefers-color-scheme: dark` | Tailwind v4 `dark:` prefix (zero config) | WIRED | `dark:bg-[#0f172a]` on body at L86. Tailwind v4 uses `prefers-color-scheme` for `dark:` by default — no config needed. All other dark: classes across 5 files follow same pattern. |
| `QRPreview.tsx` | (no dark: classes) | `bg-white` locked — QR preview intentionally excluded from dark mode | VERIFIED | Zero `dark:` occurrences in `QRPreview.tsx`. Outer container class `bg-white` at L13 is unchanged. |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXPO-01 | 04-01, 04-02 | User can download QR as PNG (3x resolution) | SATISFIED | `handlePngDownload` creates 768x768 canvas instance. `download({ name: 'qrcraft-code', extension: 'png' })`. Smoke test validates download event and filename. |
| EXPO-02 | 04-01, 04-02 | User can download QR as true vector SVG | SATISFIED | `handleSvgDownload` delegates to live `qrCodeRef` (type: 'svg'). `download({ name: 'qrcraft-code', extension: 'svg' })`. Smoke test validates download event and filename. |
| EXPO-03 | 04-01, 04-02 | User can copy QR to clipboard as PNG image | SATISFIED | `handleCopy` calls `getRawData('png')` then `navigator.clipboard.write([new ClipboardItem(...)])`. Button shows `Copied!` on success. Smoke test (Chromium) validates `Copied!` label. |
| EXPO-04 | 04-01, 04-02 | Clipboard copy shows graceful fallback when browser unsupported | SATISFIED | Feature-detect `navigator.clipboard?.write`. Any falsy path sets `copyState('unsupported')`. Smoke test removes `navigator.clipboard` via `addInitScript` and validates `Copy not supported` label. |
| BRAND-04 | 04-01, 04-03 | Site supports dark mode based on system preference | SATISFIED | Tailwind v4 `dark:` classes on all five chrome files. `QRPreview.tsx` intentionally excluded. Three Playwright BRAND-04 smoke tests (body bg, header bg, QR preview stays white) verified. |
| SEO-09 | 04-04 | Page achieves Lighthouse performance score 90+ on mobile | PARTIALLY SATISFIED | `client:visible` directive confirmed in `Hero.astro` L22 (the primary TBT optimization). 04-04 SUMMARY claims human-verified >= 90. Automated verification of the score itself is not possible — requires human re-confirmation. |

**REQUIREMENTS.md cross-reference note:** REQUIREMENTS.md traceability table marks BRAND-04 as "Pending" (Phase 4) and all EXPO-01 through EXPO-04 and SEO-09 as "Complete". The "Pending" status on BRAND-04 appears to be a stale entry not yet updated after 04-03 completion — the implementation exists in the codebase.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | No TODO/FIXME/placeholder/stub patterns found in any phase 4 modified file. |

Scan covered: `ExportButtons.tsx`, `QRGeneratorIsland.tsx`, `Hero.astro`, `Layout.astro`, `Header.astro`, `Footer.astro`, `QRPreview.tsx`, `tests/export.spec.ts`.

---

### Human Verification Required

#### 1. Lighthouse Mobile Performance Score (SEO-09)

**Test:** Run `npm run build && npm run preview` to start the production server. Open `http://localhost:4321` in Chrome (incognito, no extensions). Open DevTools (F12) → Lighthouse tab. Set Mode = Navigation, Device = Mobile. Click "Analyze page load."
**Expected:** Performance score >= 90.
**Why human:** A Lighthouse score is a live browser audit that cannot be reproduced via grep or file inspection. The code change (`client:visible`) is verified in the codebase and is the primary lever for reducing TBT on mobile. The 04-04 SUMMARY states a human confirmed >= 90, but this verifier cannot re-attest that outcome without running the audit again.

---

### Gaps Summary

No automated gaps found. All code artifacts exist, are substantive, and are wired correctly:

- `ExportButtons.tsx` is fully implemented (136 lines, no stubs), imported and rendered in `QRGeneratorIsland.tsx` with all required props.
- All dark mode classes are in place across Layout, Header, Hero, Footer, and QRGeneratorIsland. `QRPreview.tsx` is correctly excluded.
- `client:visible` is applied to `QRGeneratorIsland` in `Hero.astro` (verified via commit `149fdb7`).
- All 6 documented commits (`b7d8b14`, `62a2d7f`, `74f0d79`, `62284fd`, `23ddcf7`, `149fdb7`) exist in git history.
- `tests/export.spec.ts` covers all required test cases for EXPO-01/02/03/04 and BRAND-04.

The single outstanding item (SEO-09 Lighthouse score >= 90) is flagged for human verification because it is a browser audit outcome, not a code state. The architectural prerequisite (`client:visible`) is confirmed in place.

**Stale data note:** REQUIREMENTS.md traceability table still shows `BRAND-04 | Phase 4 | Pending`. This should be updated to `Complete` — but this is a documentation issue, not a code gap.

---

_Verified: 2026-03-10_
_Verifier: Claude (gsd-verifier)_
