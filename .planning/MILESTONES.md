# Milestones

## v1.2 Growth & Content (Shipped: 2026-04-02)

**Phases completed:** 5 phases, 16 plans, 32 tasks

**Key accomplishments:**

- Centralized tier limits module (TIER_LIMITS) created and save.ts updated to enforce per-tier total and dynamic QR code counts for Free(5/3), Starter(100/10), and Pro(250/100)
- Header (Header.astro):
- escapeVCard/foldLine RFC 6350 safety functions added to qrEncoding.ts; VCardState extended with title/company/workPhone/address/website/linkedin; VCardTab shows all 10 fields
- astro-seo installed, SoftwareApplication JSON-LD schema live, sitemap link added, and 6 fully-authored use case entries exported from src/data/useCases.ts
- One-liner:
- PricingPromo, HowTo (3-step guide), and UseCasesTeaser (6 clickable cards) components wired into index.astro with HowTo JSON-LD schema in head
- Playwright screenshot generation script + 3 committed 800x512 PNGs for HowTo section; Search Console verification and sitemap submission pending human action
- FrameType union, 8 frame definitions with SVG paths, 16 template presets, and Canvas 2D composeQRWithFrame() utility — zero canvas-taint SecurityError by using createImageBitmap() on blob data
- FrameSection (8 frame tiles in 4-col grid + conditional CTA input) and TemplateSection (16 preset cards across 4 categories with inline SVG color thumbnails)
- Vercel Blob upload endpoint, landingPages DB table (20 cols, 3 indexes), and full CRUD API with totalQr enforcement, partial-update file URL semantics, and Blob cleanup on edit/delete
- One-liner:
- Public SSR /p/[slug] page serving PDF and App Store landing pages with OG meta tags and edge caching, plus list API extended with landingPage metadata for dashboard display
- QRLibrary extended with PDF/App Store card variants (indigo/emerald badges, View Page links, edit buttons) plus a full edit landing page route with partial-update file semantics
- Lighthouse CI config with >= 90 performance gate, ads.txt authorization file, and CLS prevention CSS — all established before any AdSense component code, with baseline 100/100 mobile performance captured
- Tier-gated AdUnit React component with delayed script injection wired into QRGeneratorIsland — free-tier signed-in users see ads, all others see nothing, Lighthouse stays 100/100

---

## v1.1 Monetization (Shipped: 2026-03-31)

**Phases completed:** 5 phases, 24 plans, 37 tasks

**Delivered:** Freemium monetization layer — user accounts via Clerk, Stripe-powered subscriptions (monthly/annual), saved QR library, dynamic QR codes with editable destinations, scan analytics dashboard, and Pro-only feature gates — all while keeping anonymous static generation fully ungated.

**Key accomplishments:**

- Clerk auth with email/password + Google/GitHub OAuth, session management, and protected dashboard with sidebar layout
- Stripe billing with idempotent webhooks (6 lifecycle events), monthly/annual checkout, Customer Portal, and post-checkout polling
- Saved QR library with save/edit/delete flows, UUID-based IDOR prevention, thumbnail previews, and grid/list views
- Dynamic QR codes with nanoid slug generation, /r/[slug] serverless redirect (307), editable destinations, pause/unpause, and 3-QR free limit
- Scan analytics: per-QR total/unique scans, 30-day Recharts chart, device breakdown, top countries, bot filtering
- Pro gates on logo upload and advanced dot shapes — server-side enforced; anonymous users fully ungated

**Stats:**

- 5 phases | 24 plans | 220 files changed | ~5,279 source LOC
- Timeline: 25 days (2026-03-06 → 2026-03-31)
- Requirements: 26/26 v1.1 complete

---

## v1.0 MVP (Shipped: 2026-03-11)

**Phases completed:** 6 phases, 23 plans, 0 tasks

**Delivered:** A free, no-signup QR code generator with live preview, full visual customization, logo embedding, and PNG/SVG/clipboard export — scoring 100 on Lighthouse mobile performance.

**Key accomplishments:**

- Deployed crawlable Astro + Tailwind v4 static site with full SEO instrumentation (title, OG tags, JSON-LD schemas, sitemap, robots.txt)
- Built live QR generator for URL, plain text, WiFi, and vCard content types with debounced preview and no layout shift
- Added full visual customization: dot/eye shapes, colors, linear/radial gradients, WCAG AA contrast validation
- Implemented logo embedding with automatic ECL=H switch and 25% area cap
- Shipped PNG (3×), true vector SVG, and clipboard export pipeline
- Achieved Lighthouse mobile performance score 100 with `client:visible` hydration and complete dark mode support

**Stats:**

- 6 phases | 23 plans | 106 files changed | ~1,672 source LOC
- Timeline: 5 days (2026-03-06 → 2026-03-11)
- Requirements: 36/36 v1 complete

---
