# Project Research Summary

**Project:** QRCraft v1.2 Growth & Content
**Domain:** Freemium SaaS QR code generator — adding hosted landing pages, decorative frames, AdSense monetization, SEO content, vCard enhancements, and tier limit restructuring to an existing Astro 5 + Vercel + Turso + Clerk + Stripe stack
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

QRCraft v1.2 is a feature-expansion milestone on top of a production-proven v1.0 + v1.1 stack. All core infrastructure (auth, billing, database, dynamic QR redirect, scan analytics) is already in place. The new work falls into five distinct categories: new content types (PDF and App Store hosted landing pages), a client-side QR frame compositor, Google AdSense for free-tier monetization, SEO content pages, and quality-of-life improvements (vCard enhancements, header navigation, tier limit restructuring). Each category is architecturally independent and can be sequenced without blocking the others.

The recommended approach follows the architecture file's build order: start with no-dependency items (vCard, header, tier limits), advance to static content work (SEO pages, homepage sections, screenshots), tackle client-side rendering features (QR frames), then move to the largest new infrastructure (hosted landing pages and Vercel Blob), and finish with AdSense last because it requires external Google account approval that can take 1–2 weeks. This ordering keeps every phase independently deployable and avoids delaying simple wins while waiting on infrastructure.

The two highest-risk areas are AdSense and the QR frame export pipeline. AdSense must be implemented as a client-side React island — not a server-side Astro template conditional — to preserve the static homepage architecture and avoid Lighthouse regression. The frame compositor must inline SVG frame assets as build-time data URIs to prevent canvas-tainting `SecurityError` on export. Both are non-obvious traps that will cause silent production failures if not addressed from the start of each respective phase.

---

## Key Findings

### Recommended Stack

The v1.1 stack requires only four additions for v1.2. `@vercel/blob` handles file storage for PDF and App Store cover image uploads — it is the right choice because the project is already on Vercel, requires only one environment variable (`BLOB_READ_WRITE_TOKEN`), and its client-upload pattern keeps large files off the serverless function path (critical given Vercel's hard 4.5MB request body limit). `astro-seo` and `astro-seo-schema` standardize Open Graph meta tags and JSON-LD structured data across 10+ new static pages. `schema-dts` provides compile-time TypeScript safety for JSON-LD at zero runtime cost. Everything else (QR frames, screenshots, vCard, sitemap) is handled by existing packages or the browser Canvas API.

**Core new technologies:**
- `@vercel/blob` ^0.27.x: File storage for PDF/app icon uploads — no new infra account, client-upload bypasses the 4.5MB serverless body limit, public CDN URLs returned after upload
- `astro-seo` ^1.1.0: Per-page OG meta tags and canonical URLs — standardizes boilerplate across new dynamic and static pages
- `astro-seo-schema` ^7.x: JSON-LD structured data via TypeScript-safe `<Schema>` component — `SoftwareApplication`, `HowTo`, `BreadcrumbList` schemas for rich results
- `schema-dts` ^1.x: Compile-time Schema.org type definitions — no runtime overhead, peer dependency of astro-seo-schema
- Browser Canvas API (no new library): QR frame composition — all available frame libraries require replacing qr-code-styling entirely; canvas 2D achieves the same in ~80 lines
- Playwright (already installed): Build-time screenshots for the how-to section — standalone `scripts/generate-screenshots.ts`, no new package needed

**Installation:**
```bash
npm install @vercel/blob astro-seo astro-seo-schema schema-dts
```

### Expected Features

**Must have (table stakes for v1.2):**
- vCard field enhancements (title, work phone, address, website, LinkedIn) — users with existing vCard QRs expect richer contact data; adding fields is low complexity
- Header navigation improvements (Register + Pricing links) — current header omits key conversion entry points
- Tier limit centralization (Free: 5 saved / 3 dynamic; Starter: 100 / 10; Pro: 250 / 100) — current hardcoded limits scattered across API routes need a single `tierLimits.ts` constants file before any limit values change
- Homepage marketing sections (PricingPromo, HowTo, UseCasesTeaser) — homepage conversion improvement is the primary v1.2 growth lever
- SEO use case pages (`/use-cases/` hub + individual pages) — informational-intent organic traffic to feed the acquisition funnel

**Should have (competitive differentiators):**
- PDF and App Store hosted landing pages — upgrades QRCraft from a generator to a platform; the core new content type expansion
- Decorative QR frames with export (simple, rounded, badge styles) — visual differentiation for print and marketing use cases
- Preset style templates — surfaces the full customization system to non-technical users
- Google AdSense on free tier — monetizes the large anonymous user base; placed below-the-fold only, never in the redirect path

**Defer (v2+):**
- Custom short domains for redirects — requires DNS handling infrastructure
- Team and multi-seat accounts — requires org data model redesign
- Cloudinary image transformation — upgrade from Vercel Blob only when resize/WebP conversion is needed
- EEA/GDPR consent management (CookieYes or equivalent) — add only if EEA traffic exceeds ~5% of sessions; not required for US-only targeting

**Anti-features (confirmed by competitor research):**
- Ads in redirect path — the most-complained-about competitor anti-pattern; destroys user trust
- Watermarks on QR code output — makes output unusable in professional contexts, kills the acquisition funnel
- Requiring account for static QR generation — breaks the core anonymous acquisition model

### Architecture Approach

v1.2 extends the existing hybrid static/SSR Astro architecture without altering the core routing contract. Static pages stay static; SSR routes carry `export const prerender = false`. New routes follow established patterns: `/p/[slug].astro` for hosted landing pages (SSR, prerender=false), `/use-cases/[slug].astro` for SEO content (static, getStaticPaths). The QR frame compositor is a pure client-side utility (`src/lib/frameComposer.ts`) that slots into the existing export pipeline in `ExportButtons.tsx`. AdSense is a React island (`AdBanner.tsx`, `client:idle`) that performs tier detection after Clerk hydrates — this keeps the homepage fully static and avoids converting it to SSR. The largest structural addition is a new `landingPages` Turso table and three new API routes (`/api/landing/create`, `/api/landing/[id]`, `/api/landing/upload`).

**Major new components:**
1. `PdfTab.tsx` / `AppStoreTab.tsx` — new QRGeneratorIsland tabs; handle two-step save (upload to Vercel Blob, then POST to `/api/landing/create`)
2. `FrameSection.tsx` + `frameComposer.ts` — frame UI controls and canvas 2D composition utility; SVG frames inlined as build-time data URIs to prevent canvas tainting
3. `AdBanner.tsx` — client:idle React island; fetches tier from existing `/api/subscription/status`; renders nothing for Pro/Starter users; never loads AdSense JS on protected pages
4. `/p/[slug].astro` — SSR landing page renderer; reads `landingPages` from Turso; sets per-page `og:title`, `og:description`, `og:image` (absolute Blob URL) in server-rendered `<head>`
5. `use-cases/[slug].astro` — static SEO article pages via `getStaticPaths` from `src/data/useCases.ts`; JSON-LD via `astro-seo-schema`
6. `scripts/generate-screenshots.ts` — Playwright build-time script; outputs committed PNGs to `public/screenshots/`

**Data flow additions:**
- PDF/App Store save: file upload → Vercel Blob token exchange → browser-to-Blob direct upload → URL returned → `POST /api/landing/create` → `landingPages` row + linked `dynamicQrCodes` row → QR encodes `/r/[dynamicSlug]` → scans 307 to `/p/[landingSlug]`
- Frames: `FrameSection` state lifts to `QRGeneratorIsland` → passed as prop to `ExportButtons` → `composeQRWithFrame()` called on download/copy when `frameEnabled === true`

### Critical Pitfalls

1. **AdSense Auto Ads destroy Lighthouse 100** — Auto Ads injects DOM nodes mid-render, strips `min-height` from parent elements, and adds ~120KB of JS to every page. Prevention: use manual ad units only in statically-sized containers; load AdSense script lazily via the React island (not in `<head>` globally); set `min-height` on the ad container using an ID selector (AdSense JS strips class-targeted min-height but not ID-targeted). Run Lighthouse CI with a <90 block gate on every deploy.

2. **AdSense tier check breaks the static homepage** — `Astro.locals.auth()` is unavailable on prerendered pages. Converting the homepage to SSR to enable the tier check adds cold-start latency and destroys CDN caching. Prevention: all ad conditional logic must live inside `AdBanner.tsx` using `client:idle` hydration and the existing `/api/subscription/status` fetch. The homepage must stay `x-vercel-cache: HIT`.

3. **Canvas taint `SecurityError` on frame export** — SVG frame images loaded via `new Image(); img.src = '/path'` without `crossOrigin="anonymous"` taint the canvas and cause `toBlob()` / `getRawData()` to throw silently. Prevention: load all frame SVGs at build time via `import.meta.glob('/src/assets/frames/*.svg', { as: 'raw' })` and convert to base64 data URIs. No network fetch, no CORS issue, available synchronously.

4. **`drizzle-kit push` against Turso production destroys data** — `drizzle-kit push` is designed for development schema sync only; on a table with existing rows it fails or requires table drops. Prevention: always use `drizzle-kit generate` to produce a SQL migration file, review the SQL, then apply against staging before production. All new columns must be nullable or carry a `.default()` to avoid NOT NULL violations on existing rows.

5. **vCard special character encoding corrupts QR data** — Semicolons, commas, and backslashes in user-provided vCard field values corrupt the delimited field structure. Long address fields violate the 75-byte line folding requirement. Prevention: add `escapeVCard(s: string)` (escaping `\`, `;`, `,`, newlines per RFC 6350) and `foldLine(line: string)` (CRLF + space wrap at 75 bytes) before adding any new fields. Apply escape to every property value in `encodeVCard()`.

6. **Tier limit changes silently downgrade existing users** — Limit constants are currently hardcoded as magic numbers in `api/qr/save.ts`. Changing values without centralizing them first causes missed updates and inconsistency between displayed limits and enforced limits. Prevention: create `src/lib/tierLimits.ts` as the very first task of Phase 1; update all API routes to import from it; enforce new caps on create operations only, never on read/list/edit.

---

## Implications for Roadmap

Based on research, suggested phase structure (5 phases):

### Phase 1: Foundation Improvements
**Rationale:** Zero new infrastructure risk. Pure modifications to existing files with immediate testability. Establishing tier limits as a centralized constants file before any other phase needs them prevents limit-related bugs in Phases 4 and 5.
**Delivers:** `src/lib/tierLimits.ts` (Free: 5/3, Starter: 100/10, Pro: 250/100), vCard field enhancements (title, work phone, address, website, LinkedIn) with `escapeVCard()` and `foldLine()` refactor, header navigation additions (Register + Pricing links), marketing copy and pricing page accuracy fixes
**Addresses:** vCard table stakes, navigation conversion entry points, tier limit hygiene
**Avoids:** vCard encoding corruption pitfall (escape functions added before new fields); tier limit silent-downgrade pitfall (centralize before changing values)

### Phase 2: SEO and Homepage Content
**Rationale:** All static Astro work — no new API routes, no new DB tables, no external dependencies. Can be deployed independently and starts accumulating Google index time immediately. The SEO content pages should be live before applying for AdSense (Google requires meaningful content). Programmatic screenshots depend on this phase's UI being stable.
**Delivers:** Homepage sections (PricingPromo, HowTo stub, UseCasesTeaser), `/use-cases/` hub and individual use case static pages with per-page JSON-LD, `astro-seo` integration for canonical URLs and OG tags, `astro-seo-schema` for `HowTo` / `Article` / `BreadcrumbList` schemas, `scripts/generate-screenshots.ts` Playwright build script, committed screenshots in `public/screenshots/`
**Uses:** `astro-seo` ^1.1.0, `astro-seo-schema` ^7.x, `schema-dts` ^1.x, existing Playwright
**Avoids:** SEO keyword cannibalization (unique H1 and intent per page; how-to section owns "how" intent, homepage owns "generator" intent); JSON-LD `@id` duplication across pages; LCP regression from how-to screenshots (use `loading="lazy"` on all below-fold images)

### Phase 3: QR Frame Rendering
**Rationale:** Self-contained client-side feature — no new API routes, no new DB tables, no new infra accounts. De-risks the canvas composition approach early before the more complex Phase 4 work begins. Build the composition utility and test export before building the frame picker UI.
**Delivers:** `FrameSection.tsx` UI controls (style, color, label, position), `frameComposer.ts` canvas 2D utility, modified `ExportButtons.tsx` branching on `frameEnabled`, `src/data/presets.ts` static preset templates, SVG-vs-PNG export decision communicated in UI when frame is active
**Implements:** Canvas 2D composition pipeline; build-time SVG inlining via `import.meta.glob`
**Avoids:** Canvas taint SecurityError (data URI approach established from day one); SVG export producing frame-less output (single `composeQRWithFrame` utility used by both live preview and all export paths)

### Phase 4: Hosted Landing Pages
**Rationale:** Largest scope in v1.2 — new Drizzle table, Vercel Blob storage, multiple new API routes, two new QRGeneratorIsland tabs. Sequenced after Phases 1–3 so the DB migration is the only major risk in an otherwise stable codebase. All prerequisites (redirect infra, Drizzle patterns, nanoid, Clerk auth) are validated from v1.1.
**Delivers:** `landingPages` Drizzle table with additive SQL migration, Vercel Blob client-upload token exchange at `/api/landing/upload`, `PdfTab.tsx` and `AppStoreTab.tsx` new tabs, `/api/landing/create` + `/api/landing/[id]` CRUD routes, `/p/[slug].astro` SSR landing page with dynamic OG tags, QRGeneratorIsland save flow updated for the two-step upload+create pattern
**Uses:** `@vercel/blob` ^0.27.x, `BLOB_READ_WRITE_TOKEN` env var, existing Turso/Drizzle, existing nanoid, existing `/r/[slug]` redirect infrastructure
**Avoids:** Drizzle push on production (generate → review SQL → apply to staging → apply to production); Vercel 4.5MB body limit (client-upload, files never through serverless function); slug namespace collision (`/p/` prefix separate from `/r/`); missing OG image on landing pages (`og:image` = `coverPhotoUrl` set in SSR `<head>`, not in a React island)

### Phase 5: Google AdSense
**Rationale:** Build last because (a) Google AdSense account approval requires meaningful site content and typically takes 1–2 weeks — Phase 2 SEO pages should be indexed before applying; (b) no other v1.2 feature depends on AdSense; (c) Lighthouse regression risk is isolated to this phase and caught by Lighthouse CI before it reaches users.
**Delivers:** `AdBanner.tsx` React island (`client:idle`) with tier check via `/api/subscription/status`, manual ad unit placement below-the-fold on the generator page with statically-sized container (ID-selector `min-height`), AdSense auto-script load gated to free tier only
**Avoids:** Auto Ads Lighthouse regression (manual placement only); static homepage SSR conversion (client-side tier check in island, homepage stays prerendered); accidental click policy violation (150px+ separation from Download/Copy buttons; never inside the generator island or modal)

### Phase Ordering Rationale

- Phases 1 and 2 have zero new infrastructure risk and can be shipped and rolled back without database migrations or external service accounts
- Phase 2 (SEO pages) must be live and indexed before applying for AdSense — Google requires meaningful content and audience activity
- Phase 3 (frames) is sequenced before Phase 4 (landing pages) because it is fully self-contained, its canvas approach is validated early, and Phase 4 is the only high-stakes DB migration in v1.2
- Phase 4 is the only phase requiring a production Drizzle migration — placing it fourth means the rest of the codebase is stable and the migration is the sole risk variable
- Phase 5 (AdSense) is last because its external approval dependency is outside the team's control; development can proceed in parallel with the AdSense application but the feature should not go live until approval is confirmed

### Research Flags

Phases likely needing deeper research or product decisions during planning:
- **Phase 4 (Hosted Landing Pages):** Two product decisions must be resolved before building: (1) whether anonymous or free users can create PDF/App Store landing pages (the gate is inherited from `dynamicQrCodes` Pro check — confirm intent); (2) per-user Vercel Blob storage quota and acceptable file size limits (suggested: 10MB free, 25MB Pro — needs policy decision before the upload token endpoint is built).
- **Phase 5 (AdSense):** CLS impact of manual ad units on the specific homepage layout is unknown until measured. Requires a Lighthouse CI baseline capture before any AdSense code is written, with a documented pass/fail gate at <90.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** vCard is RFC-documented; tier limits are code-only; header is static HTML. No research needed.
- **Phase 2 (SEO/Content):** Static Astro pages, well-understood sitemap + JSON-LD patterns. `astro-seo` and `astro-seo-schema` are well-documented.
- **Phase 3 (Frames):** Canvas 2D composition is a standard browser API; no new dependencies; build-time glob import for SVGs is a documented Astro pattern.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All v1.2 additions verified against npm registry and official Vercel/Astro docs as of March 2026; `@vercel/blob` client upload pattern confirmed via official Vercel Blob documentation; `astro-seo-schema` is MEDIUM — verify current version on npm before install |
| Features | MEDIUM-HIGH | Core patterns verified via live competitor research (QRTiger, Hovercode, Uniqode); tier limits are product decisions not technical constraints; anti-feature choices confirmed by negative competitor reviews |
| Architecture | HIGH | All patterns extend existing validated v1.1 patterns; component boundaries reflect the actual codebase structure; build order validated by cross-referencing the feature dependency graph |
| Pitfalls | HIGH (canvas tainting, Drizzle migration, vCard encoding, tier limits) / MEDIUM (AdSense policy enforcement thresholds, CLS impact at specific traffic scale) | Technical pitfalls verified against official docs and known bug reports; AdSense policy enforcement behavior is documented but precise threshold behavior requires empirical measurement |

**Overall confidence:** HIGH

### Gaps to Address

- **Landing page auth gate**: Product decision — are PDF/App Store landing pages a Pro-only feature? If yes, the gate is automatically inherited from the `dynamicQrCodes` Pro check. If free users can create them, a new explicit gate check is required. Resolve before Phase 4 task planning begins.
- **Vercel Blob storage quotas**: Per-user limits and acceptable file size caps must be decided before the upload token endpoint is built. Current suggestion: 10MB per file for free users, 25MB for Pro. This is a product/cost decision, not a technical unknown.
- **Frame + SVG export conflict**: When a frame is enabled, SVG export cannot include the frame (canvas composition produces raster, not vector). UX decision needed at the start of Phase 3: disable the SVG button when a frame is active, or export frameless SVG with an informational tooltip.
- **AdSense approval timeline**: Apply after Phase 2 SEO pages are deployed and indexed. Build the Phase 5 implementation concurrently but do not go live until approval is confirmed. Budget 1–2 weeks for the approval process.
- **`astro-seo-schema` version**: Listed as ^7.x with MEDIUM confidence. It is part of the `@codiume/orbit` monorepo — verify the current published version on npm before installing, as monorepo packages do not always follow standard semver.

---

## Sources

### Primary (HIGH confidence)
- [Vercel Blob documentation](https://vercel.com/docs/vercel-blob) — client upload pattern, token exchange, presigned URLs
- [Vercel Blob client upload guide](https://vercel.com/docs/vercel-blob/client-upload) — `handleUpload` + `upload()` from `@vercel/blob/client`
- [@vercel/blob npm](https://www.npmjs.com/package/@vercel/blob) — version 2.3.2, March 2026, 171 downstream packages confirmed
- [astro-seo npm](https://www.npmjs.com/package/astro-seo) — version 1.1.0, Snyk health: Healthy, updated February 2026
- [RFC 6350 — vCard 4.0](https://www.rfc-editor.org/rfc/rfc6350) — TITLE, ORG, ADR, URL field definitions; authoritative vCard field reference
- [Google AdSense head placement](https://support.google.com/adsense/answer/9274516) — official guidance: place script in `<head>` statically
- [Google Publisher Ads Lighthouse audit](https://developers.google.com/publisher-ads-audits/reference/audits/script-injected-tags) — static async script preferred over JS-injected tags
- [Google AdSense TCF/CMP requirement](https://support.google.com/adsense/answer/13554116) — CMP required only for EEA/UK/Switzerland; US visitors do not require certified CMP
- [Playwright Screenshots Docs](https://playwright.dev/docs/screenshots) — `page.locator().screenshot()` API for element-scoped captures
- [MDN Canvas API — Drawing text](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text) — canvas frame composition approach
- Existing codebase: `src/db/schema.ts`, `src/pages/r/[slug].ts`, `src/components/QRGeneratorIsland.tsx`, `src/components/ExportButtons.tsx`, `src/lib/qrEncoding.ts`, `src/layouts/Layout.astro`

### Secondary (MEDIUM confidence)
- [astro-seo-schema (orbit monorepo)](https://github.com/codiume/orbit/tree/main/packages/astro-seo-schema) — `<Schema>` component backed by schema-dts
- [astro-paper AdSense discussion #437](https://github.com/satnaing/astro-paper/discussions/437) — Astro + AdSense script injection community pattern
- [Astro client-side scripts docs](https://docs.astro.build/en/guides/client-side-scripts/) — `<script>` tag placement in Astro layouts
- [vCard 3.0 Format Specification](https://www.evenx.com/vcard-3-0-format-specification) — TITLE, TEL;TYPE=work, ADR, URL field formats (spec stable since 1998)
- [Website Archive with Playwright in Astro](https://spacejelly.dev/posts/website-archive-with-automated-screenshots-in-astro-with-playwright-github-actions) — build-time screenshot generation pattern
- Competitor analysis: QRTiger, Hovercode, QR Code Generator, Uniqode (live feature research, March 2026)
- qr-code-styling README — `getRawData()` method signature (`Promise<Blob>`)

### Tertiary (LOW confidence)
- WebSearch: "Using Playwright to Automatically Generate Screenshots for Documentation" (Medium, March 2026) — confirms build-time script pattern; single source
- vCard X-SOCIALPROFILE;TYPE=linkedin cross-platform support — de facto standard as of 2026 per community sources; no official RFC ratification; iOS Contacts, Android Contacts, and most apps support it via the X- extension mechanism
- vcardqrcodegenerator.com — practical X-SOCIALPROFILE examples in QR context (third-party, consistent with RFC 6350 extension mechanism)

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
