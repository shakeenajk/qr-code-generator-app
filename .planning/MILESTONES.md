# Milestones

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
