# Stack Research

**Domain:** SaaS freemium add-on — auth, payments, database, dynamic QR redirect, scan analytics on existing Astro 5 + Vercel app
**Researched (v1.1):** 2026-03-11
**Researched (v1.2):** 2026-03-30
**Confidence:** HIGH (primary choices verified against official docs or npm; version numbers confirmed via WebSearch against npm registry)

---

## Scope Note — v1.2

This file covers the new infrastructure required for v1.2 Growth & Content. The validated v1.1 stack (Astro 5, React islands, qr-code-styling, Tailwind v4, Playwright, `@astrojs/vercel`, Clerk, Turso/Drizzle, Stripe, Recharts, lucide-react) is complete and unchanged. **Do not re-research those choices.**

The new decisions for v1.2 are:

1. How do we serve Google AdSense on the free tier with appropriate consent handling?
2. How do we store uploaded cover images for PDF and App Store hosted landing pages?
3. How do we render decorative QR code frames ("Scan Me" text, phone mockup borders) around the existing qr-code-styling output and export them as PNG/SVG?
4. How do we generate programmatic screenshots of the app for the how-to section?
5. What (if anything) is needed for SEO improvements beyond the existing `@astrojs/sitemap`?
6. What is needed for vCard field enhancements?

---

## v1.2 Recommended Additions

### New Libraries

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@vercel/blob` | ^0.27.x | File storage for PDF/App Store cover image uploads | Already on Vercel — no new infra account needed. Supports client-side browser uploads via short-lived token exchange (presigned pattern). Upload goes directly browser → Vercel Blob CDN without hitting your server. 1 GB free on Vercel hobby, then $0.023/GB/month. Returned URLs are public CDN URLs suitable for `<img>` tags on hosted landing pages. |
| `astro-seo` | ^1.1.0 | Per-page SEO meta tags, Open Graph, Twitter cards, canonical URLs | Maintained (updated Feb 2026, healthy release cadence). Reduces boilerplate for per-page meta tags on the new PDF/App Store landing pages. The existing index.astro already handles head tags manually — this library standardizes it across the new dynamic pages. |
| `astro-seo-schema` | ^7.x | JSON-LD structured data components for Astro | Part of the `@codiume/orbit` monorepo. Outputs `<script type="application/ld+json">` with escaped schema. Powered by `schema-dts` for TypeScript safety. Required for adding SoftwareApplication and BreadcrumbList schema to App Store landing pages and HowTo schema to the how-to section. |
| `schema-dts` | ^1.x | TypeScript type definitions for Schema.org | Peer dependency of `astro-seo-schema`. Provides compile-time safety for all JSON-LD structures. No runtime overhead — types only. |

### What is Already Covered (Do Not Add)

| Need | Already Solved By | Why Not a New Addition |
|------|-------------------|------------------------|
| Playwright screenshots | `@playwright/test` ^1.58.2 (devDep) | Already installed. Write a separate `scripts/generate-screenshots.ts` that runs before build. No new package needed. |
| QR code frame rendering | Browser Canvas API + `qr-code-styling` | Implemented as pure client-side canvas composition. No library needed — see Architecture section. |
| Sitemap generation | `@astrojs/sitemap` ^3.7.0 | Already installed. New dynamic pages (PDF/App Store landing pages) auto-included when added to Astro routes. |
| vCard field additions | No library needed | vCard format (RFC 6350) is a simple text protocol. TITLE, ORG, ADR, URL, X-SOCIALPROFILE fields are added by extending the existing string template in the vCard content type builder. |
| QR code SVG/PNG export | `qr-code-styling` | Already installed. Frame compositing extends the existing export flow using browser Canvas; no new QR library needed. |
| Consent management (US only) | No CMP needed yet | Google AdSense only requires a Google-certified CMP (IAB TCF v2.3) for EEA/UK/Switzerland visitors. For a US-only-targeted site, no CMP is required. Add a Google-certified CMP (CookieYes or similar) only if/when the site explicitly targets EEA traffic. Do not add CMP complexity before it is required. |

---

## Decision Rationale

### (1) Google AdSense

**Approach: Raw `<script>` tag in Astro `<head>`, Auto Ads enabled, no wrapper library.**

AdSense integration in Astro requires no npm package. The integration is a single async script tag placed in the `<head>` of the layout:

```html
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
  crossorigin="anonymous"
></script>
```

Auto Ads (Google automatically places ad units) is recommended over manual unit placement. It requires only the single head script and Google's crawler to verify the site. Manual ad units require an additional `<ins class="adsbygoogle">` block per placement — more flexibility but more implementation overhead. Start with Auto Ads; switch to manual units if the auto placement degrades UX.

**Consent / GDPR:** AdSense requires a Google-certified CMP (IAB TCF v2.3) only for EEA/UK/Switzerland visitors. QRCraft does not currently target European traffic. Until European marketing channels are opened, no CMP is needed. If EEA traffic grows to >5% of sessions (visible in Google Analytics), add CookieYes (Google-certified, ~$10/month) at that point.

**Performance impact:** Google Publisher Ads Lighthouse audit recommends loading AdSense with a static `async` script tag (not injected via `document.createElement`). Astro's `<head>` slot produces a static script tag — this is already correct. Estimated impact on Lighthouse: -2 to -5 points on performance (ad network JS is unavoidable). The existing score is 100; this may bring it to ~95, which is acceptable.

**Placement constraint (from PROJECT.md):** AdSense only on generator page, never in the QR redirect path (`/r/[slug]`). The redirect route is a fast 307 response — no HTML, no ad opportunity, and adding ads there destroys user trust.

**No npm package recommendation:** There is no maintained Astro-specific AdSense package with meaningful benefit. The `next-adsense` pattern (a React component wrapping the `<ins>` tag) does not translate usefully to Astro's static layout system. Use the raw script tag approach.

---

### (2) File Storage for PDF/App Store Cover Images

**Recommendation: `@vercel/blob` ^0.27.x**

PDF and App Store content types require users to upload a cover photo (for the hosted landing page). This image needs to be:
- Stored persistently (not in the Turso DB as a blob — SQL is not appropriate for binary files)
- Served on a public URL for the `<img>` tag on the landing page
- Uploaded directly from the browser (files can be >4.5 MB)

`@vercel/blob` is the right choice because:
- Already on Vercel — no new account, no new credentials workflow, no cross-platform IAM
- Client upload pattern uses a server-side token exchange (`handleUpload` in an Astro API route), then the file goes browser → Vercel Blob CDN directly. The master BLOB_READ_WRITE_TOKEN stays server-side only.
- Returns a permanent CDN URL after upload — store this URL string in the `qr_codes` config JSON or a new `landing_pages` Turso table column
- Latest stable version: `@vercel/blob` 2.3.2 (March 2026, actively maintained, 171 downstream projects)

**Pattern:**

```
1. User selects cover image in React island
2. React island calls POST /api/blob/upload-token (Astro API route)
   → Server calls handleUpload() with BLOB_READ_WRITE_TOKEN → returns short-lived client token
3. React island calls upload(file, { handleUploadUrl: '/api/blob/upload-token' }) from @vercel/blob/client
   → File goes directly browser → Vercel Blob (server not in the file path)
4. Vercel Blob returns { url: 'https://[hash].blob.vercel-storage.com/cover.jpg' }
5. React island stores returned URL in the landing page config (saved to Turso via existing API)
```

**Alternative considered: Cloudinary.** Cloudinary has an official Astro integration (`astro-cloudinary`) and provides image transformation (resize, format conversion) on the fly. For QRCraft's use case (store an uploaded cover photo, display it), transformation capability is not needed in v1.2. Cloudinary's free tier is limited (25 credits/month in 2025). Vercel Blob is simpler to set up (one environment variable: `BLOB_READ_WRITE_TOKEN`) and already within the Vercel ecosystem. Cloudinary is the right upgrade if image transformation (thumbnail generation, WebP conversion) becomes needed in v1.3+.

---

### (3) QR Code Decorative Frames

**Approach: Browser Canvas API composition — no new library.**

The decorative frame feature (border, "Scan Me" text, phone mockup frames) is implemented as a canvas composition layer on top of the existing `qr-code-styling` output. No additional QR library is needed.

**How it works:**

`qr-code-styling` already produces a PNG data URL via its `getRawData('png')` method (or via `download()`). The frame renderer:

1. Creates a new `<canvas>` sized to `QR_SIZE + FRAME_PADDING`
2. Draws the frame background (solid color, rounded corners via `ctx.roundRect`)
3. Draws the QR code image via `ctx.drawImage(qrBitmap, xOffset, yOffset)`
4. Draws frame label text via `ctx.fillText("SCAN ME", centerX, labelY)` with chosen font
5. For phone mockup frames: draws a pre-bundled SVG phone outline via `ctx.drawImage(phoneOutlineBitmap, ...)`
6. Exports the composed canvas via `canvas.toDataURL('image/png')` for download, or `canvas.toBlob()` for clipboard

**For SVG export with frame:** The frame must be composed as an SVG wrapper around the existing QR SVG. Use `qr-code-styling`'s `getRawData('svg')` to get the inner QR SVG string, then wrap it in a parent SVG that includes a `<rect>` border, `<text>` label, and optionally a phone outline `<path>`. Serialize with `new XMLSerializer().serializeToString(svgElement)` and offer as a download. This is pure browser DOM manipulation — no library.

**Phone mockup frame asset:** Store the phone outline as a static SVG asset in `src/assets/frames/phone-mockup.svg`. Parse it into an `Image` bitmap at component mount and reuse across renders. No CDN fetch at render time.

**Why no frame library:** The two available QR frame libraries (`qrcanvas`, `EasyQRCodeJS`) would require replacing `qr-code-styling` entirely, discarding all existing dot shape/gradient/eye customization. The canvas composition approach adds ~80 lines of code and zero dependencies. Compositing QR code + frame is a well-understood canvas operation.

---

### (4) Programmatic Screenshots for How-To Section

**Approach: Playwright script run at build time — no new package.**

`@playwright/test` is already installed as a dev dependency. The how-to screenshot generation is a standalone script (`scripts/generate-screenshots.ts`) that:

1. Starts the Astro dev server (`astro dev`)
2. Uses Playwright to navigate to specific app states (URL tab active, custom colors applied, download modal open)
3. Takes element-scoped screenshots via `page.locator('.qr-preview').screenshot()`
4. Saves PNG files to `public/how-to/` (committed to repo, served as static assets)

Run this script:
- Manually when the UI changes (`npm run screenshots`)
- In CI before build when UI-affecting commits are detected

**Package.json script:**

```json
"screenshots": "tsx scripts/generate-screenshots.ts"
```

`tsx` is already available via Node.js 18+ (or install `tsx` as a dev dep if not present — `tsx` ^4.x, ~50KB, zero risk). Alternatively, use `ts-node` if already in the project; check `devDependencies` before adding.

**Why not a dedicated screenshot service (ScreenshotOne, Puppeteer service, etc.):** The app is self-owned and deployed. Playwright already runs against it for E2E tests. A screenshot service adds external dependency, cost, and authentication complexity for a task that Playwright solves locally in 30 lines of code.

---

### (5) SEO Improvements

**Approach: `astro-seo` ^1.1.0 + `astro-seo-schema` for JSON-LD, existing `@astrojs/sitemap` for sitemap. No other additions.**

The existing stack already has:
- `@astrojs/sitemap` — auto-generates sitemap.xml from Astro pages
- Manual `<meta>` tags in existing layout — functional but not standardized

**What v1.2 adds:**

- **`astro-seo`:** Standardizes Open Graph, Twitter card, canonical URL, and description meta tags for the new PDF/App Store landing pages and the new use cases / how-to pages. Install once, use in each page's `<head>`.

- **`astro-seo-schema`:** Adds JSON-LD structured data for:
  - `SoftwareApplication` schema on App Store landing pages (name, operatingSystem, applicationCategory, offers) — enables rich results in Google Search
  - `HowTo` schema on the how-to section — enables rich result step display in SERP
  - `BreadcrumbList` on interior content pages

- **Google Search Console:** No library. Register the domain (already done as part of v1.0 with Lighthouse 100), submit the updated sitemap, and request re-indexing after v1.2 ships. Search Console is a web tool, not a code dependency.

- **Content pages:** The QR use cases landing page (`/use-cases/`) and the individual use case pages (`/use-cases/business-cards/`, etc.) are new Astro static pages. Their SEO value is purely in content and internal linking — no library needed for that.

---

### (6) vCard Field Enhancements

**Approach: No library. Extend existing string template.**

vCard 4.0 (RFC 6350) is a plain-text format. The existing vCard content type builds a string like:

```
BEGIN:VCARD
VERSION:3.0
FN:Full Name
TEL:+1234567890
EMAIL:user@example.com
END:VCARD
```

The new fields (TITLE, ORG, ADR, URL, work phone, LinkedIn) are added by extending this template:

```
TITLE:Software Engineer
ORG:Acme Corp
ADR;TYPE=work:;;123 Main St;City;State;12345;Country
URL:https://example.com
X-SOCIALPROFILE;TYPE=linkedin:https://linkedin.com/in/username
TEL;TYPE=work:+1234567890
```

**LinkedIn:** The `X-SOCIALPROFILE;TYPE=linkedin:` property is a widely-used non-standard extension (vCard 4.0 does not have an official social profile field in RFC 6350). iOS Contacts, Android Contacts, and most vCard-compatible apps support it via the `X-` extension mechanism. A draft IETF extension (`draft-george-vcarddav-vcard-extension`) exists for standardizing this but has not been ratified. The `X-SOCIALPROFILE` approach is the de facto standard as of 2026 — HIGH confidence that target scanners (smartphone cameras) will parse it correctly.

**No new npm package is needed.** The QR code payload for vCard is a client-side string — this is already how `qr-code-styling` receives its content. Extend the existing form state and template function.

---

## Installation (v1.2 Additions Only)

```bash
# File storage for cover image uploads (PDF/App Store content types)
npm install @vercel/blob

# SEO — per-page meta tags
npm install astro-seo

# SEO — JSON-LD structured data
npm install astro-seo-schema schema-dts
```

**Environment variable to add in Vercel dashboard:**

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...   # from Vercel Blob store creation
```

---

## Alternatives Considered (v1.2)

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| File storage | `@vercel/blob` | Cloudinary | No image transformation needed in v1.2. Cloudinary free tier is restrictive. Vercel Blob is one env var away. |
| File storage | `@vercel/blob` | AWS S3 | Adds AWS account, IAM roles, bucket policies — operational overhead with no benefit vs Vercel Blob at this scale. |
| SEO meta | `astro-seo` | Manual `<head>` | Already doing this on index.astro. Works fine for one page. Becomes error-prone across 10+ new dynamic pages. |
| SEO schema | `astro-seo-schema` | Raw JSON-LD string in `<script>` tag | Works but loses TypeScript safety. One malformed schema object silently breaks rich results. `astro-seo-schema` + `schema-dts` catches type errors at build time. |
| QR frame rendering | Canvas API (no library) | EasyQRCodeJS | EasyQRCodeJS is an entirely different QR engine. Using it requires replacing `qr-code-styling` and losing all existing dot styles, gradients, and eye customization. Not worth it. |
| Screenshot generation | Playwright (existing) | Puppeteer | Playwright is already installed and configured. Adding Puppeteer as a duplicate browser automation tool has no upside. |
| AdSense consent | No CMP (US-only) | CookieConsent / CookieYes | CMP is only required for EEA/UK/Switzerland visitors per Google's policy. Add only if EEA traffic exceeds ~5% of sessions. |

---

## What NOT to Add (v1.2)

| Avoid | Why |
|-------|-----|
| Any QR frame npm library | All available options require replacing `qr-code-styling`; canvas composition achieves the same result in ~80 lines |
| Cloudinary / Cloudinary Astro SDK | Overkill for storing one cover image per landing page; adds external account dependency |
| A CMP (CookieYes, cookieconsent, Osano) | Not required until EEA targeting is active; adds script weight and consent friction for current US-focused users |
| `puppeteer` or `playwright-core` as a new dep | Playwright is already installed (`@playwright/test`); use it directly in a build script |
| `react-helmet` or Next.js-style `<Head>` | Not applicable in Astro — use `astro-seo` for the `<head>` slot in `.astro` files |
| `vcard-creator` or similar npm vCard library | The vCard string format is trivial; a library adds a dependency to a 10-line string template function |
| Any PDF generation library (PDFKit, jsPDF) | The "PDF content type" is a hosted landing page for a PDF (the user's document), not server-side PDF rendering |

---

## Version Compatibility (v1.2 New Additions)

| Package | Version | Compatible With | Confidence |
|---------|---------|-----------------|------------|
| `@vercel/blob` | ^0.27.x (latest ~2.3.2 as of Mar 2026) | Vercel serverless functions, Astro 5 API routes | HIGH — official Vercel package, 171 downstream projects |
| `astro-seo` | ^1.1.0 | Astro 5.x | HIGH — updated Feb 2026, healthy release cadence |
| `astro-seo-schema` | ^7.x | Astro 5.x | MEDIUM — part of active `@codiume/orbit` monorepo; verify current version before install |
| `schema-dts` | ^1.x | TypeScript 5.x | HIGH — types only, no runtime |

---

## Full Resolved Stack (v1.0 + v1.1 + v1.2)

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Astro | ^5.17.1 |
| UI Components | React + React DOM | ^19.2.4 |
| Styling | Tailwind CSS v4 | ^4.2.1 |
| QR Generation | qr-code-styling | ^1.9.2 |
| Auth | @clerk/astro | ^3.0.4 |
| Database client | @libsql/client | ^0.17.0 |
| ORM | drizzle-orm | ^0.45.1 |
| Payments | stripe | ^20.4.1 |
| Charts | recharts | ^3.8.1 |
| Icons | lucide-react + lucide-astro | ^1.7.0 / ^0.556.0 |
| Toasts | sonner | ^2.0.7 |
| Sitemap | @astrojs/sitemap | ^3.7.0 |
| Vercel adapter | @astrojs/vercel | ^9.0.5 |
| **File storage (NEW)** | **@vercel/blob** | **^0.27.x** |
| **SEO meta (NEW)** | **astro-seo** | **^1.1.0** |
| **SEO schema (NEW)** | **astro-seo-schema** | **^7.x** |
| **SEO schema types (NEW)** | **schema-dts** | **^1.x** |
| Testing | @playwright/test | ^1.58.2 |
| Migration CLI | drizzle-kit | 0.31.9 |

---

## Sources

- [Vercel Blob documentation](https://vercel.com/docs/vercel-blob) — client upload pattern, token exchange, presigned URLs. HIGH confidence (official Vercel docs).
- [Vercel Blob client upload guide](https://vercel.com/docs/vercel-blob/client-upload) — `handleUpload` + `upload()` from `@vercel/blob/client`. HIGH confidence.
- [@vercel/blob npm page](https://www.npmjs.com/package/@vercel/blob) — version 2.3.2, published March 2026, 171 downstream packages. HIGH confidence.
- [astro-seo npm page](https://www.npmjs.com/package/astro-seo) — version 1.1.0, published ~2 months before March 2026, Snyk health: Healthy. HIGH confidence.
- [astro-seo-schema (orbit monorepo)](https://github.com/codiume/orbit/tree/main/packages/astro-seo-schema) — `<Schema>` component backed by schema-dts. MEDIUM confidence (verify current version on npm before install).
- [Google AdSense head placement](https://support.google.com/adsense/answer/9274516) — official guidance to place script in `<head>`. HIGH confidence.
- [Google Publisher Ads Lighthouse audit: load scripts statically](https://developers.google.com/publisher-ads-audits/reference/audits/script-injected-tags) — confirms static `async` script tag is preferred over JS-injected tags. HIGH confidence.
- [Google AdSense TCF/CMP requirement](https://support.google.com/adsense/answer/13554116) — CMP required only for EEA/UK/Switzerland; US visitors do not require a certified CMP. HIGH confidence (official Google AdSense Help).
- [RFC 6350 — vCard 4.0](https://www.rfc-editor.org/rfc/rfc6350) — TITLE, ORG, ADR, URL field definitions. HIGH confidence (official IETF standard).
- [vCard QR code format (vcardqrcodegenerator.com)](https://www.vcardqrcodegenerator.com/blog/vcard-qr-code-format/) — practical examples of X-SOCIALPROFILE;TYPE=linkedin usage in QR context. MEDIUM confidence (third-party, but consistent with RFC 6350 extension mechanism).
- [Playwright screenshot docs](https://playwright.dev/docs/screenshots) — `page.locator().screenshot()` API for element-scoped captures. HIGH confidence (official Playwright docs).
- WebSearch: "Using Playwright to Automatically Generate Screenshots for Documentation" (Medium, March 2026) — confirms build-time script pattern for documentation screenshots. MEDIUM confidence.
- WebSearch: `@vercel/blob` version confirmed at 2.3.2 published March 2026. HIGH confidence.
- WebSearch: `astro-seo` version confirmed at 1.1.0, Snyk health Healthy. HIGH confidence.

---

*Stack research for: QRCraft v1.2 Growth & Content — AdSense, file storage, QR frames, screenshots, SEO, vCard*
*Researched: 2026-03-30*

---

## v1.1 Historical Research (Preserved)

The section below is the original v1.1 stack research. It documents the decisions already made and validated. Do not revisit these unless requirements change.

---

### v1.1 Scope Note

This section covers the new infrastructure for v1.1 Monetization. The existing stack (Astro 5, React islands, qr-code-styling, Tailwind v4, Playwright, `@astrojs/vercel`) is validated and unchanged. The decisions answered here are:

1. Which auth provider fits Astro 5 + Vercel with the least friction?
2. Which database fits a small SaaS with users, QR codes, and scan events?
3. How do we implement the dynamic QR redirect service on Vercel?
4. How do we integrate Stripe subscriptions?
5. What ORM connects the database to server-side Astro routes?

---

### v1.1 Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@clerk/astro` | ^2.16.2 | Auth — sign-up, sign-in, session, user management | Official Astro SDK (updated March 2026). Pre-built UI components. `clerkMiddleware()` for route protection in 5 lines. 10K MAU free. |
| `stripe` | ^20.4.1 | Stripe server SDK — subscriptions, Checkout sessions, webhooks | Official Node SDK. Handles Checkout session creation, subscription lifecycle events, webhook signature verification. |
| `@stripe/stripe-js` | ^5.x | Stripe client SDK — Checkout redirect | Loads Stripe.js in the browser. Required by Stripe for PCI-compliant flows. |
| `@libsql/client` | ^0.14.x | Turso/libSQL database client | HTTP-based SQLite client. Works in both Vercel serverless and edge runtimes. Sub-5ms connection overhead. |
| `drizzle-orm` | ^0.45.1 | ORM — type-safe SQL against Turso/libSQL | Native libSQL driver support. TypeScript-first. Works in Vercel edge and serverless. |
| `drizzle-kit` | ^0.30.x | Migration CLI for Drizzle schema | Generates and runs SQL migrations from Drizzle schema definitions. |
| `nanoid` | ^5.x | Short-code generation for dynamic QR slugs | 8–10 character collision-resistant slugs. ESM-native — compatible with Astro 5. |

### v1.1 Critical Architecture Change

Switching Astro from `output: 'static'` to `output: 'server'` was the key v1.1 infrastructure decision. Static pages opt back in with `export const prerender = true`. The `output: 'hybrid'` mode has a documented Astro 5 + Vercel bug where API routes return HTML or 405 errors — use `output: 'server'` only.

### v1.1 Sources

- Clerk Astro SDK, Turso pricing, Drizzle + Turso tutorial, Stripe subscriptions guide, Astro Vercel adapter docs — all HIGH confidence, official documentation, verified March 2026.
