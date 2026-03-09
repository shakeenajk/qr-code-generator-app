# Roadmap: QRCraft

## Overview

QRCraft is built in four coarse phases that mirror how the product layers onto itself. Phase 1 lays down the static site shell with branding and full SEO instrumentation — crawlable and deployable from day one. Phase 2 adds the live QR generator for all four content types, establishing the reactive core. Phase 3 stacks on full visual customization and logo embedding, transforming a basic generator into a branded QR tool. Phase 4 ships the export pipeline, dark mode, and performance tuning, making the product launch-ready.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Static site, branding, and full SEO instrumentation deployed
- [ ] **Phase 2: Core Generator** - Live QR preview for all four content types
- [ ] **Phase 3: Customization** - Full visual customization and logo embedding
- [ ] **Phase 4: Export and Launch** - Export pipeline, dark mode, and Lighthouse 90+ performance

## Phase Details

### Phase 1: Foundation
**Goal**: A deployable, crawlable site with QRCraft branding and complete SEO instrumentation exists — before a single line of generator code is written.
**Depends on**: Nothing (first phase)
**Requirements**: BRAND-01, BRAND-02, BRAND-03, SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07, SEO-08
**Success Criteria** (what must be TRUE):
  1. The site loads with the QRCraft SVG logo (letter "Q" from QR dot pattern) visible in the header
  2. Viewing page source shows a correct title tag, meta description, og:title, og:description, og:image, JSON-LD WebApplication schema, and FAQPage schema
  3. A visible FAQ section targeting QR code generator queries renders on the page
  4. sitemap.xml and robots.txt are accessible at their canonical URLs
  5. Page uses semantic HTML landmarks (main, nav, section, h1, h2) with no layout errors on mobile
**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md — Astro project scaffold, all npm deps, robots.txt, Playwright install
- [ ] 01-02-PLAN.md — Playwright smoke test suite for all BRAND and SEO requirements
- [ ] 01-03-PLAN.md — Layout.astro with SEO head meta, OG tags, both JSON-LD schemas + FAQ data file
- [ ] 01-04-PLAN.md — SVG logo, Header, Footer components + OG image
- [ ] 01-05-PLAN.md — Page assembly (index.astro, Hero, Features, FAQ) + smoke tests green + human verify

### Phase 2: Core Generator
**Goal**: A user can enter content and instantly see a live QR code — for all four content types — without submitting a form or pressing a button.
**Depends on**: Phase 1
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, PREV-01, PREV-02, PREV-03
**Success Criteria** (what must be TRUE):
  1. Typing a URL produces a live QR code preview within 300ms, with no layout shift as the QR version changes
  2. Switching between URL, plain text, WiFi, and vCard tabs retains all previously entered settings
  3. WiFi and vCard forms collect the correct fields (SSID/password/security type; name/phone/email/org) and produce scannable QR codes
  4. When no content is entered, the preview area shows a placeholder state rather than a broken or empty canvas
**Plans**: TBD

### Phase 3: Customization
**Goal**: A user can produce a visually branded QR code — choosing dot shapes, eye styles, colors, gradients, and an embedded logo — with every change reflected instantly in the preview.
**Depends on**: Phase 2
**Requirements**: CUST-01, CUST-02, CUST-03, CUST-04, CUST-05, CUST-06, CUST-07, LOGO-01, LOGO-02, LOGO-03, LOGO-04
**Success Criteria** (what must be TRUE):
  1. User can pick foreground and background colors via color pickers, and an invalid low-contrast combination is flagged before the QR updates
  2. User can apply a linear or radial gradient to QR dots and see the result live in the preview
  3. User can select from at least four dot shapes and two corner eye styles/pupil styles, with each choice updating the preview immediately
  4. User can upload a local image file as a center logo; the error correction level automatically switches to H and the logo is capped at 25% of QR area
  5. User can remove an uploaded logo and the QR returns to its previous error correction level
**Plans**: TBD

### Phase 4: Export and Launch
**Goal**: A user can take the QR code they built and download or copy it in any format — and the site loads fast enough to rank well on mobile search.
**Depends on**: Phase 3
**Requirements**: EXPO-01, EXPO-02, EXPO-03, EXPO-04, BRAND-04, SEO-09
**Success Criteria** (what must be TRUE):
  1. Clicking "Download PNG" produces a PNG file at 3x resolution (minimum 900px side) suitable for print
  2. Clicking "Download SVG" produces a true vector SVG file (paths/rects, not a raster image wrapper)
  3. Clicking "Copy to Clipboard" copies the QR as a PNG image; on unsupported browsers a clear fallback message appears
  4. The site renders correctly in dark mode when the OS dark mode preference is active
  5. Lighthouse mobile performance score is 90 or higher on a production build
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Core Generator | 0/TBD | Not started | - |
| 3. Customization | 0/TBD | Not started | - |
| 4. Export and Launch | 0/TBD | Not started | - |
