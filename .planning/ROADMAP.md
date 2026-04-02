# Roadmap: QRCraft

## Milestones

- ✅ **v1.0 MVP** - Phases 1-6 (shipped 2026-03-11)
- ✅ **v1.1 Monetization** - Phases 7-11 (shipped 2026-03-31)
- ✅ **v1.2 Growth & Content** - Phases 12-16 (shipped 2026-04-02)
- 🚧 **v1.3 Scale & Integrate** - Phases 17-23 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-6) - SHIPPED 2026-03-11</summary>

### Phase 1: Project Foundation
**Goal**: Project is deployed and observable
**Plans**: Complete

### Phase 2: QR Generator Core
**Goal**: Users can generate QR codes for all content types
**Plans**: Complete

### Phase 3: Visual Customization
**Goal**: Users can fully customize QR appearance
**Plans**: Complete

### Phase 4: Logo Embedding
**Goal**: Users can embed logos in QR codes
**Plans**: Complete

### Phase 5: Export Pipeline
**Goal**: Users can download QR codes in multiple formats
**Plans**: Complete

### Phase 6: SEO & Polish
**Goal**: Site is SEO-optimized and Lighthouse 100
**Plans**: Complete

</details>

<details>
<summary>✅ v1.1 Monetization (Phases 7-11) - SHIPPED 2026-03-31</summary>

### Phase 7: Auth Foundation
**Goal**: Users can sign up, log in, and manage sessions
**Plans**: Complete

### Phase 8: Stripe Billing
**Goal**: Users can subscribe to Pro tier via Stripe
**Plans**: Complete

### Phase 9: Saved QR Library
**Goal**: Pro users can save, name, edit, and delete QR codes
**Plans**: Complete

### Phase 10: Dynamic QR Codes
**Goal**: Pro users can create QR codes with editable destinations
**Plans**: Complete

### Phase 11: Scan Analytics
**Goal**: Pro users can see scan counts, device breakdowns, and charts
**Plans**: Complete

</details>

<details>
<summary>✅ v1.2 Growth & Content (Phases 12-16) - SHIPPED 2026-04-02</summary>

### Phase 12: Foundation Improvements
**Goal**: Tier limits centralized, vCard extended, header navigation updated, pricing accuracy fixed
**Plans**: Complete

### Phase 13: SEO & Homepage Content
**Goal**: Marketing content and SEO improvements live
**Plans**: Complete

### Phase 14: QR Frames & Templates
**Goal**: Users can apply decorative frames and preset style templates
**Plans**: Complete

### Phase 15: Hosted Landing Pages
**Goal**: Users can create PDF and App Store landing pages linked to dynamic QR codes
**Plans**: Complete

### Phase 16: AdSense Integration
**Goal**: Free-tier signed-in users see ads; Lighthouse stays 100
**Plans**: Complete

</details>

### 🚧 v1.3 Scale & Integrate (In Progress)

**Milestone Goal:** Move QRCraft from a self-serve tool to a developer and agency platform — bulk generation, REST API, advanced analytics, campaign scheduling, seasonal templates, and i18n for three languages — plus the infrastructure hardening (Sentry + rate limiting) that makes all of it production-safe.

## Phase Details

### Phase 17: Observability Foundation
**Goal**: Production errors are visible in Sentry and all public endpoints are rate-limited before any new API surface ships
**Depends on**: Phase 16
**Requirements**: INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. A production error on any SSR route or API handler appears in Sentry with a readable stack trace and source map pointing to TypeScript line numbers
  2. Hitting a public API endpoint more than the allowed rate returns HTTP 429 with a Retry-After header
  3. The /r/[slug] redirect path is exempt from rate limiting and never returns 429
  4. Sentry release is tied to the Vercel deploy SHA so errors map to the correct build
**Plans**: 2 plans
Plans:
- [x] 17-01-PLAN.md — Sentry integration with source maps and deploy-SHA release
- [x] 17-02-PLAN.md — Upstash rate limiting with /r/[slug] exemption

### Phase 18: Bulk QR Generation
**Goal**: Users can upload a CSV and download a ZIP of fully generated QR codes without hitting any server size limit
**Depends on**: Phase 17
**Requirements**: BULK-01, BULK-02, BULK-03, BULK-04
**Success Criteria** (what must be TRUE):
  1. User can upload a CSV with URL, text, or WiFi rows and see a thumbnail grid preview of all generated QR codes before downloading
  2. User can download all generated QR codes as a single ZIP file assembled entirely in the browser
  3. User sees a clear error message if the batch row count would exceed their tier limit before the download is triggered
  4. Batches up to 500 rows complete without a server timeout or 4.5 MB response body error
**Plans**: TBD
**UI hint**: yes

### Phase 19: REST API + API Key Management
**Goal**: Developers can generate and retrieve QR codes programmatically using hashed API keys, with rate limiting and usage tracking visible in the dashboard
**Depends on**: Phase 17
**Requirements**: API-01, API-02, API-03, API-04
**Success Criteria** (what must be TRUE):
  1. Developer can POST to /api/v1/generate with a JSON body and receive a base64 PNG or SVG QR code in the response
  2. User can create, revoke, and view API keys in the dashboard; the full key value is shown exactly once at creation time
  3. Each API key has a visible usage counter in the dashboard that increments with every request
  4. An API request that exceeds the per-key rate limit returns 429; the raw key value is never stored in the database
**Plans**: TBD
**UI hint**: yes

### Phase 20: Advanced Analytics
**Goal**: Users can interrogate scan data across any date range, export it as CSV, and see UTM parameter breakdowns alongside device and country charts
**Depends on**: Phase 17
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04
**Success Criteria** (what must be TRUE):
  1. User can select a custom date range on the analytics panel and see scan counts, device breakdown, and country breakdown update for that range
  2. User can click Export CSV and download a file with one row per scan event including date, device, country, and UTM parameters
  3. When a dynamic QR code destination URL contains UTM parameters, those parameters are captured at scan time and appear in the analytics dashboard
  4. Analytics dashboard shows a UTM breakdown chart (source, medium, campaign) alongside the existing device and country charts
**Plans**: TBD
**UI hint**: yes

### Phase 21: Campaign Scheduling
**Goal**: Users can schedule a dynamic QR code to activate and deactivate automatically on future dates without any manual intervention
**Depends on**: Phase 17
**Requirements**: CAMPAIGN-01, CAMPAIGN-02, CAMPAIGN-03
**Success Criteria** (what must be TRUE):
  1. User can set a future activation date and an optional deactivation date on any dynamic QR code from the edit screen
  2. Dashboard shows scheduled QR codes with a countdown timer, current status (scheduled / active / expired), and the scheduled dates
  3. A QR code with a past activation date and no deactivation date starts redirecting visitors automatically without user action
  4. A QR code with a past deactivation date stops redirecting visitors automatically; the cron handler never double-activates the same QR code
**Plans**: TBD
**UI hint**: yes

### Phase 22: Seasonal Template Packs
**Goal**: Users can apply seasonal and holiday-themed presets from a curated collection, and the homepage surfaces currently relevant templates based on the calendar
**Depends on**: Phase 14
**Requirements**: TEMPLATE-01, TEMPLATE-02
**Success Criteria** (what must be TRUE):
  1. Template picker contains 20 or more seasonal/holiday presets covering Christmas, Halloween, Valentine's Day, Easter, Black Friday, Summer, and Back to School
  2. Homepage displays a seasonal collection section that shows templates matching the current calendar period (e.g., Christmas templates appear in December)
  3. Applying a seasonal template updates the QR code preview with the correct frame, colors, and dot style — no page reload required
**Plans**: TBD
**UI hint**: yes

### Phase 23: Internationalization
**Goal**: Marketing pages are available in Spanish, French, and German with correct hreflang tags and a persistent language switcher — no duplicate content SEO penalty
**Depends on**: Phase 17
**Requirements**: I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):
  1. Homepage, pricing page, and use cases page are fully readable in Spanish, French, and German at /es/, /fr/, and /de/ URL prefixes
  2. Language switcher in the site header changes the language and the selection persists when navigating between marketing pages
  3. Every translated page has hreflang link tags (including x-default) and the sitemap includes all language variants — no duplicate content warning in Google Search Console
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 17 → 18 → 19 → 20 → 21 → 22 → 23

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6. Foundation through SEO | v1.0 | — | Complete | 2026-03-11 |
| 7-11. Auth through Analytics | v1.1 | — | Complete | 2026-03-31 |
| 12-16. Improvements through AdSense | v1.2 | — | Complete | 2026-04-02 |
| 17. Observability Foundation | v1.3 | 2/2 | Complete    | 2026-04-02 |
| 18. Bulk QR Generation | v1.3 | 0/TBD | Not started | - |
| 19. REST API + API Key Management | v1.3 | 0/TBD | Not started | - |
| 20. Advanced Analytics | v1.3 | 0/TBD | Not started | - |
| 21. Campaign Scheduling | v1.3 | 0/TBD | Not started | - |
| 22. Seasonal Template Packs | v1.3 | 0/TBD | Not started | - |
| 23. Internationalization | v1.3 | 0/TBD | Not started | - |
