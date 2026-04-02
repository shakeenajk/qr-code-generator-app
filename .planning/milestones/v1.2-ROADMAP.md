# Roadmap: QRCraft

## Milestones

- ✅ **v1.0 MVP** — Phases 1–6 (shipped 2026-03-11)
- ✅ **v1.1 Monetization** — Phases 7–11 (shipped 2026-03-31)
- 🚧 **v1.2 Growth & Content** — Phases 12–16 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–6) — SHIPPED 2026-03-11</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-03-09
- [x] Phase 2: Core Generator (3/3 plans) — completed 2026-03-10
- [x] Phase 3: Customization (5/5 plans) — completed 2026-03-10
- [x] Phase 4: Export and Launch (4/4 plans) — completed 2026-03-10
- [x] Phase 5: Complete Dark Mode (3/3 plans) — completed 2026-03-11
- [x] Phase 6: Fix Ghost Placeholder + Lighthouse Attestation (3/3 plans) — completed 2026-03-11

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Monetization (Phases 7–11) — SHIPPED 2026-03-31</summary>

- [x] Phase 7: SSR Foundation + Auth (5/5 plans) — completed 2026-03-16
- [x] Phase 8: Stripe Billing (6/6 plans) — completed 2026-03-17
- [x] Phase 9: Saved QR Library + Pro Gates (5/5 plans) — completed 2026-03-17
- [x] Phase 10: Dynamic QR Redirect Service (5/5 plans) — completed 2026-03-30
- [x] Phase 11: Scan Analytics Dashboard (3/3 plans) — completed 2026-03-31

Full details: `.planning/milestones/v1.1-ROADMAP.md`

</details>

### 🚧 v1.2 Growth & Content (In Progress)

**Milestone Goal:** Improve SEO and discoverability, expand content types with hosted landing pages, add homepage marketing sections, introduce QR frames and preset templates, enhance vCard, fix pricing accuracy, and add ads to the free tier.

- [x] **Phase 12: Foundation Improvements** - Fix copy accuracy, header navigation, tier limits centralization, and vCard field enhancements (completed 2026-03-31)
- [x] **Phase 13: SEO and Homepage Content** - Search Console setup, per-page meta/OG/JSON-LD, use cases landing page, and three new homepage sections (completed 2026-03-31)
- [x] **Phase 14: QR Frames and Templates** - Decorative frame compositor, PNG export pipeline, and preset style templates (completed 2026-03-31)
- [x] **Phase 15: Hosted Landing Pages** - PDF and App Store content types with DB-backed landing pages and Vercel Blob uploads (completed 2026-04-01)
- [x] **Phase 16: Google AdSense** - Free-tier ad placement using a client-side React island with tier check (completed 2026-04-01)

## Phase Details

### Phase 12: Foundation Improvements
**Goal**: The site accurately represents its freemium model, header navigation surfaces conversion entry points, tier limits are enforced from one place, and vCard QR codes carry rich contact data
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: COPY-01, COPY-02, COPY-03, TIER-01, TIER-02, TIER-03, TIER-04, VCARD-01, VCARD-02
**Success Criteria** (what must be TRUE):
  1. Homepage hero, FAQ, and feature copy contain no "no limits" or inaccurate freemium claims
  2. Header shows a visible Register/Sign Up button alongside Sign In on all pages
  3. Header has a working navigation link to /pricing
  4. Pricing page displays the correct tier limits (Free: 5 QRs / 3 dynamic, Starter: 100 / 10, Pro: 250 / 100) with the "No ads" benefit removed from Starter/Pro
  5. vCard tab exposes Title, Company, Work Phone, Address, Website, and LinkedIn fields and encodes all values without corruption
**Plans**: 3 plans
Plans:
- [x] 12-01-PLAN.md — Tier limits centralization (tierLimits.ts + save.ts update)
- [x] 12-02-PLAN.md — Copy and pricing fixes (header, hero, FAQ, pricing page)
- [x] 12-03-PLAN.md — vCard encoding safety and 6 new fields
**UI hint**: yes

### Phase 13: SEO and Homepage Content
**Goal**: The site is verified in Google Search Console, every page has complete meta and Open Graph coverage, key pages carry JSON-LD structured data, and the homepage has three new content sections that aid conversion and feed organic traffic
**Depends on**: Phase 12
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, HOME-01, HOME-02, HOME-03
**Success Criteria** (what must be TRUE):
  1. Site ownership is verified in Google Search Console and the sitemap is submitted
  2. Every page has a unique meta title, description, and Open Graph tags (og:title, og:description, og:image, canonical)
  3. Homepage has JSON-LD for SoftwareApplication; how-to page/section has HowTo schema; use cases pages have BreadcrumbList
  4. /use-cases/ landing page exists with rich content targeting long-tail QR keywords and links to individual use case articles
  5. Homepage displays a Pricing Promo section, a How-To section with programmatic screenshots, and a Use Cases teaser grid
**Plans**: 4 plans
Plans:
- [x] 13-01-PLAN.md — SEO infrastructure: install astro-seo, fix SoftwareApplication JSON-LD, add sitemap link, create useCases data
- [x] 13-02-PLAN.md — Use cases hub and article pages with astro-seo meta and BreadcrumbList JSON-LD
- [x] 13-03-PLAN.md — Three homepage sections (PricingPromo, HowTo, UseCasesTeaser) + HowTo JSON-LD
- [x] 13-04-PLAN.md — Playwright screenshot script and committed step PNGs
**UI hint**: yes

### Phase 14: QR Frames and Templates
**Goal**: Users can wrap their QR code in a decorative frame with custom CTA text, export the result as a correctly composed PNG, and choose a preset template to quick-start customization
**Depends on**: Phase 13
**Requirements**: FRAME-01, FRAME-02, FRAME-03
**Success Criteria** (what must be TRUE):
  1. User can select a decorative frame style (e.g. "Scan Me" text border, geometric border) and enter custom CTA text that renders around the QR code in live preview
  2. Downloading as PNG produces a correctly composed raster image with the frame included; SVG export remains frameless and the UI communicates this
  3. User can select a preset template (combined frame + color + shape) from a picker and the generator applies all settings in one click
**Plans**: 3 plans
Plans:
- [x] 14-01-PLAN.md — Type contracts, frame data, template data, frameComposer Canvas 2D utility
- [x] 14-02-PLAN.md — FrameSection and TemplateSection UI components
- [ ] 14-03-PLAN.md — Wire into QRGeneratorIsland + ExportButtons (PNG compose + SVG disabled)
**UI hint**: yes

### Phase 15: Hosted Landing Pages
**Goal**: Users can generate a QR code that scans to a hosted, branded landing page — either a PDF viewer or an App Store listing — with uploaded cover art, descriptive copy, and sharing links
**Depends on**: Phase 12
**Requirements**: CONT-01, CONT-02, CONT-03
**Success Criteria** (what must be TRUE):
  1. User can create a PDF landing page QR code by uploading a cover photo and entering title, description, website URL, and social sharing links; scanning the QR opens a hosted /p/[slug] page
  2. User can create an App Store listing QR code by entering app name, description, branding, and all store URLs; scanning the QR opens a hosted /p/[slug] page with the correct store buttons
  3. PDF and App Store landing pages respect the same tier limits as other QR codes (Free: 5, Starter: 100, Pro: 250); the hosted page renders og:title, og:description, og:image for social sharing
**Plans**: 4 plans
Plans:
- [x] 15-01-PLAN.md — DB schema + migration + Vercel Blob upload API + landing page CRUD APIs
- [x] 15-02-PLAN.md — FileUploadZone + PdfTab + AppStoreTab + QRGeneratorIsland wiring
- [x] 15-03-PLAN.md — /p/[slug] SSR landing page + list API update
- [x] 15-04-PLAN.md — QRLibrary dashboard extension + edit landing page route
**UI hint**: yes

### Phase 16: Google AdSense
**Goal**: Free-tier signed-in users see a below-the-fold ad unit on the generator page; all other users see nothing; site Lighthouse performance score remains at or above 90
**Depends on**: Phase 13
**Requirements**: ADS-01, ADS-02
**Success Criteria** (what must be TRUE):
  1. A signed-in free-tier user sees a Google AdSense ad unit below the fold on the generator page
  2. Signed-in Starter and Pro users see no ad unit; anonymous visitors see no ad unit; the QR redirect path (/r/[slug]) has no ad code
  3. Lighthouse mobile performance score is 90 or above with AdSense active (measured via Lighthouse CI)
**Plans**: 2 plans
Plans:
- [x] 16-01-PLAN.md — Lighthouse CI baseline, ads.txt, CLS prevention CSS, dependency installation
- [x] 16-02-PLAN.md — AdUnit component with delayed injection + QRGeneratorIsland wiring + performance verification

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-03-09 |
| 2. Core Generator | v1.0 | 3/3 | Complete | 2026-03-10 |
| 3. Customization | v1.0 | 5/5 | Complete | 2026-03-10 |
| 4. Export and Launch | v1.0 | 4/4 | Complete | 2026-03-10 |
| 5. Complete Dark Mode | v1.0 | 3/3 | Complete | 2026-03-11 |
| 6. Fix Ghost Placeholder + Lighthouse | v1.0 | 3/3 | Complete | 2026-03-11 |
| 7. SSR Foundation + Auth | v1.1 | 5/5 | Complete | 2026-03-16 |
| 8. Stripe Billing | v1.1 | 6/6 | Complete | 2026-03-17 |
| 9. Saved QR Library + Pro Gates | v1.1 | 5/5 | Complete | 2026-03-17 |
| 10. Dynamic QR Redirect Service | v1.1 | 5/5 | Complete | 2026-03-30 |
| 11. Scan Analytics Dashboard | v1.1 | 3/3 | Complete | 2026-03-31 |
| 12. Foundation Improvements | v1.2 | 3/3 | Complete    | 2026-03-31 |
| 13. SEO and Homepage Content | v1.2 | 4/4 | Complete    | 2026-03-31 |
| 14. QR Frames and Templates | v1.2 | 2/3 | Complete    | 2026-03-31 |
| 15. Hosted Landing Pages | v1.2 | 4/4 | Complete    | 2026-04-01 |
| 16. Google AdSense | v1.2 | 2/2 | Complete    | 2026-04-01 |
