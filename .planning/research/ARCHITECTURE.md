# Architecture Research: v1.2 Integration Points

**Domain:** Freemium SaaS — QR code generator adding content types, frames, ads, SEO pages, and vCard enhancements
**Researched:** 2026-03-30
**Confidence:** HIGH for items that build on existing verified patterns; MEDIUM for AdSense conditional rendering (community-verified, not official); LOW for programmatic screenshots at build time (limited official guidance for Astro + Playwright in production)

---

## Context: Existing Architecture (What v1.2 Extends)

```
astro.config.mjs: output: 'static', adapter: vercel()
src/
  pages/
    index.astro                    # static, CDN-cached
    r/[slug].ts                    # prerender=false, serverless, Turso lookup → 307
    api/qr/save.ts                 # prerender=false, serverless, Drizzle insert
    api/qr/[id].ts                 # prerender=false, serverless, CRUD
    api/qr/list.ts                 # prerender=false, serverless, SELECT
    api/subscription/status.ts     # prerender=false, serverless, tier read
    api/analytics/...              # prerender=false, serverless, scan counts
    api/webhooks/stripe.ts         # prerender=false, serverless, Stripe events
    dashboard/                     # prerender=false, SSR, Clerk-protected
    login.astro / signup.astro     # prerender=false, SSR, Clerk
  components/
    QRGeneratorIsland.tsx          # client:only React — qr-code-styling, tabs, save
    ExportButtons.tsx              # client-side PNG/SVG/copy via getRawData()
    tabs/
      UrlTab.tsx / TextTab.tsx / WifiTab.tsx / VCardTab.tsx
    customize/
      ColorSection.tsx / ShapeSection.tsx / LogoSection.tsx
  db/schema.ts                     # Drizzle: subscriptions, savedQrCodes, dynamicQrCodes, scanEvents, stripeEvents
  lib/qrEncoding.ts                # VCardState { name, phone, email, org }, encodeVCard()
  layouts/Layout.astro             # <slot name="head" /> already wired
```

Key constraint: `output: 'static'` means all pages prerender at build time unless they carry `export const prerender = false`. Only pages/routes with that export run server-side. React islands hydrate client-side via `client:only` or `client:visible`.

---

## Feature 1: PDF and App Store Hosted Landing Pages

### What It Is

Instead of encoding a raw URL in a QR code, users encode a QRCraft-hosted URL (`/p/[slug]`) that renders a branded landing page. For PDF content type: page shows cover image, title, description, and a "View PDF" / download button. For App Store content type: page shows app icon, name, description, and smart-redirect buttons (App Store / Google Play).

### Data Model

Two new tables are needed. The landing page record is separate from `savedQrCodes` and `dynamicQrCodes` because it has its own field schema, but it still needs a slug for the QR redirect path.

**New table: `landingPages`**

```typescript
export const landingPages = sqliteTable('landing_pages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  savedQrCodeId: text('saved_qr_code_id').references(() => savedQrCodes.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),              // short ID for /p/[slug]
  type: text('type').notNull(),                        // 'pdf' | 'appstore'
  title: text('title').notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),              // Vercel Blob URL or base64 for small covers
  // PDF-specific
  pdfUrl: text('pdf_url'),                             // Vercel Blob URL
  // App Store-specific
  appStoreUrl: text('app_store_url'),
  googlePlayUrl: text('google_play_url'),
  appIconUrl: text('app_icon_url'),
  // Social buttons (optional, both types)
  socialLinks: text('social_links'),                   // JSON array: [{platform, url}]
  isPaused: integer('is_paused', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('landing_pages_user_id_idx').on(table.userId),
  index('landing_pages_saved_qr_id_idx').on(table.savedQrCodeId),
]);
```

**Why not reuse `dynamicQrCodes`?** The `dynamicQrCodes` table stores a single `destinationUrl` and is optimized for a fast 307 redirect. Landing pages have 10+ fields of structured content. Keeping them separate preserves the redirect path's simplicity and avoids nullable columns polluting the redirect hot path.

**Storage for PDFs and images:** Vercel Blob (`@vercel/blob`) is the natural fit — already in the Vercel ecosystem, no new infrastructure, returns a public URL suitable for `<a href>` and `<img src>`. Files upload from the client via a server-side presigned approach or from an API route.

### New Routes

| Route | Type | Description |
|-------|------|-------------|
| `/p/[slug].astro` | `prerender=false`, SSR | Renders the hosted landing page from Turso data |
| `/api/landing/create.ts` | serverless | POST — creates `landingPages` row, returns slug |
| `/api/landing/[id].ts` | serverless | GET/PUT/DELETE a landing page record |
| `/api/landing/upload.ts` | serverless | POST — proxies to Vercel Blob `put()`, returns URL |

### QR Code Data Flow

1. User fills "PDF" or "App Store" tab in `QRGeneratorIsland`
2. On save, API route creates `landingPages` row and also inserts a `dynamicQrCodes` row where `destinationUrl = https://qr-code-generator-app.com/p/[slug]`
3. The QR code encodes `/r/[slug]` (via existing `dynamicQrCodes` redirect) which 307s to `/p/[slug]`
4. `/p/[slug].astro` reads the `landingPages` record from Turso and renders the page

This design reuses the existing redirect infrastructure — no new redirect logic, scan tracking works automatically, pausing works automatically.

### New Tabs in `QRGeneratorIsland`

Add two new tab IDs: `'pdf'` and `'appstore'`. Update the `TabId` type union and the `TABS` array. Create:
- `src/components/tabs/PdfTab.tsx` — title, description, PDF file upload, cover image upload
- `src/components/tabs/AppStoreTab.tsx` — app icon upload, app name, description, App Store URL, Google Play URL, optional social links

The save flow for these tabs requires a two-step process: first upload files to Vercel Blob via `/api/landing/upload`, then POST to `/api/landing/create` with the returned URLs.

### Component Boundaries

```
QRGeneratorIsland
  ├── PdfTab          → collects form state, handles file upload to /api/landing/upload
  ├── AppStoreTab     → same pattern
  └── on save → POST /api/landing/create → returns {landingPageId, slug}
                    → POST /api/qr/save with isDynamic=true, destinationUrl=/p/[slug]

/p/[slug].astro        → reads landingPages from Turso, renders static HTML
                         → no JS required for scan-facing page (performance)
```

---

## Feature 2: QR Code Decorative Frames

### How Frames Work Architecturally

`qr-code-styling` outputs either an SVG element or a Canvas element. It does not natively support surrounding frames with call-to-action text (e.g. "SCAN ME"). The frame must be composed on top of the QR output using the browser's Canvas 2D API.

**Recommended approach: Canvas 2D composition**

```
1. Get raw QR PNG from qr-code-styling via getRawData('png') → Blob
2. Create an offscreen HTMLCanvasElement sized to frame dimensions
   (e.g., QR 256px + 60px top + 60px bottom = 256×376px canvas)
3. Draw frame background (solid color or gradient)
4. Draw optional border radius rect for frame shape
5. Draw QR image via ctx.drawImage(img, x, y, w, h)
6. Draw frame label text via ctx.fillText() with ctx.font
7. Export composite canvas via canvas.toBlob('image/png')
```

This approach works entirely client-side, uses only the Web Canvas API (no new dependencies), and integrates cleanly with the existing export pipeline.

**Why not SVG wrapping?** SVG composition is viable but qr-code-styling's SVG type embeds image URLs (logo) as `<image href="...">` which some apps refuse to render for security reasons. Canvas composition produces a flat raster PNG that is universally compatible — important for printing use cases. SVG frames would need a separate SVG-to-PNG rasterization step anyway.

### Frame State

Add a new `FrameSection` component alongside the existing `ColorSection`, `ShapeSection`, `LogoSection`:

```typescript
// src/components/customize/FrameSection.tsx
export interface FrameSectionState {
  frameEnabled: boolean;
  frameStyle: 'none' | 'simple' | 'rounded' | 'badge';
  frameColor: string;         // background color of frame band
  frameTextColor: string;     // label text color
  frameLabel: string;         // "SCAN ME", "VISIT US", custom
  frameLabelPosition: 'top' | 'bottom';
}
```

### Impact on Export Pipeline

The `ExportButtons` component currently calls `qrCodeRef.current?.getRawData('png')` and `qrCodeRef.current?.download()`. When a frame is enabled:

- **PNG download**: Replace with a `composeWithFrame(qrCodeRef, frameOptions)` helper that returns a composed blob, then trigger download
- **SVG download**: Frame composition is not possible for SVG (frames are raster-only). Either disable SVG export when frame is enabled, or export SVG without frame and show a note
- **Copy**: Use the composed blob from the same frame compositor
- **Thumbnail** (for saved QR): Use the composed version so the library thumbnail shows the frame

```typescript
// src/lib/frameComposer.ts (new file)
export async function composeQRWithFrame(
  qrBlob: Blob,
  frame: FrameSectionState,
  qrSize: number = 256
): Promise<Blob> { ... }
```

`ExportButtons` needs to accept `frameOptions: FrameSectionState` as a new prop and branch on `frameOptions.frameEnabled`.

### Preset Style Templates

A preset is a named combination of `{ frameOptions, colorOptions, shapeOptions }`. Presets can be stored as a static TypeScript object in `src/data/presets.ts` — no DB required for v1.2. User selects a preset → state slices update in `QRGeneratorIsland`. This is a pure client-side concern.

---

## Feature 3: Google AdSense (Free Tier Only)

### Script Injection in Astro

Astro's `Layout.astro` already has `<slot name="head" />`. The AdSense auto-ads script is a `<script>` tag that must appear in `<head>`. The pattern is:

```astro
<!-- In Layout.astro, make adsense an optional prop -->
---
interface Props {
  title: string;
  description: string;
  ogImage?: string;
  showAds?: boolean;   // NEW — passed by pages that want ads
}
const { title, description, ogImage = '/og-image.png', showAds = false } = Astro.props;
---
<!-- Inside <head> -->
{showAds && (
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXX"
    crossorigin="anonymous"
  />
)}
```

**Confidence:** MEDIUM — this is the standard approach per community discussion (astro-paper #437, general Astro script injection docs). Official AdSense docs are framework-agnostic but the `<script>` tag placement is straightforward.

### Conditional Rendering: Free Tier Only

AdSense should show for:
- Anonymous users (no auth, no tier)
- Free-tier signed-in users

AdSense should NOT show for:
- Starter or Pro subscribers (paying users see no ads)

The `index.astro` homepage is static (`output: 'static'`), so tier information is not available at render time. The conditional must happen client-side:

```typescript
// Pattern: AdSenseIsland.tsx (React island, client:only)
// After Clerk loads and tier is fetched, inject <ins class="adsbygoogle"> elements
// only when userTier is null or 'free'
```

**Ad placement**: A banner below the QR customization panel (not inside the generation flow, not in the redirect path). The `QRGeneratorIsland` can conditionally render an `<AdBanner>` sub-component based on `userTier`. When `userTier === 'pro' || userTier === 'starter'` → no banner rendered.

**Auto-ads vs. manual placement**: Auto-ads (global script in `<head>`) will inject ads anywhere on the page regardless of tier. Use manual placement instead: add `showAds={false}` on all pages globally, render a client-side `<AdUnit>` component conditionally inside the React island based on tier state.

**Key risk**: AdSense policies require the site to have meaningful content. The generator page qualifies. Do not place ads inside the `/r/[slug]` redirect path or landing pages — this is already called out in PROJECT.md "Out of Scope."

---

## Feature 4: SEO Content Pages

### Static Astro Pages

All SEO content pages are static `.astro` files with `prerender` defaulting to `true` (site is `output: 'static'`). No new infrastructure needed.

| Page | Route | Type | Notes |
|------|-------|------|-------|
| QR use cases landing | `/use-cases` | static | H1 + description + grid of use cases with links |
| Individual use case | `/use-cases/[slug]` | static (getStaticPaths) | One page per use case: restaurant, event, retail, etc. |
| How-to guide | `/how-to` or section on homepage | static | Instructional content with embedded screenshots |

### Sitemap Impact

The existing `@astrojs/sitemap` integration auto-discovers all static pages. New static pages are picked up automatically at build time — no sitemap config changes needed.

**Exception**: `/p/[slug]` (landing pages) is SSR (`prerender=false`) and will not appear in the sitemap. This is correct — those are user-generated pages, not SEO targets for QRCraft.

### JSON-LD for Use Case Pages

Add `HowTo` or `Article` schema to individual use case pages. The existing `Layout.astro` `<slot name="head" />` slot supports per-page JSON-LD injection:

```astro
<!-- In /use-cases/restaurant-qr-code.astro -->
<Layout title="..." description="...">
  <script slot="head" type="application/ld+json" set:html={JSON.stringify(articleSchema)} />
  <!-- page content -->
</Layout>
```

### Homepage Sections

New Astro components added to `index.astro`:

- `PricingPromo.astro` — pricing section with tier comparison, added between Features and FAQ
- `HowTo.astro` — step-by-step guide with screenshots
- `UseCasesTeaser.astro` — grid of top use cases linking to `/use-cases`

These are all purely static Astro components. No React, no hydration needed. They live in `src/components/` alongside existing `Hero.astro`, `Features.astro`, `FAQ.astro`.

---

## Feature 5: Programmatic Screenshots for How-To Section

### Approach

Screenshots for the how-to guide should be generated at build time and committed to the repository as static assets in `public/screenshots/`. This keeps them cacheable by CDN and avoids any runtime screenshot API.

**Recommended pattern:**

```
scripts/
  generate-screenshots.ts    # Playwright script — run manually or in CI
```

```typescript
// scripts/generate-screenshots.ts
import { chromium } from '@playwright/test';

const screenshots = [
  { url: 'http://localhost:4321/', selector: '#qr-generator', filename: 'step-1-generator.png' },
  { url: 'http://localhost:4321/?tab=vcard', selector: '#qr-preview', filename: 'step-2-preview.png' },
  // ...
];

// Launch, navigate, clip to element, save to public/screenshots/
```

Run `astro dev` first, then run the script. Screenshots output to `public/screenshots/`. Commit them. Reference as `/screenshots/step-1-generator.png` in `HowTo.astro`.

**Why not on-demand via API?** Running Playwright in a Vercel serverless function is complex (bundling Chromium, 50MB+ limit), expensive per-request, and overkill — the app UI doesn't change between deploys. Static screenshots are simpler, faster to load, and cache perfectly on CDN.

**Confidence:** MEDIUM — the Playwright screenshot approach is well-documented; the build-time + commit pattern is the established approach for documentation sites (confirmed via spacejelly.dev Astro + Playwright article).

---

## Feature 6: vCard Enhancements

### vCard 3.0 Spec for New Fields

The current `VCardState` has `{ name, phone, email, org }`. RFC 2426 (vCard 3.0) supports all requested fields natively. No format research needed — the fields are standardized.

**Extended `VCardState`:**

```typescript
// src/lib/qrEncoding.ts — extend interface and encoder
export interface VCardState {
  name: string;
  phone: string;         // existing — maps to TEL;TYPE=voice
  email: string;         // existing
  org: string;           // existing — maps to ORG
  title: string;         // NEW — maps to TITLE
  workPhone: string;     // NEW — maps to TEL;TYPE=work
  address: string;       // NEW — maps to ADR (single-line, most compatible)
  website: string;       // NEW — maps to URL
  linkedin: string;      // NEW — maps to X-SOCIALPROFILE;TYPE=linkedin or URL
}
```

**Updated `encodeVCard`:**

```typescript
export function encodeVCard(state: VCardState): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${state.name}`, `N:${state.name};;;`];
  if (state.org.trim())       lines.push(`ORG:${state.org}`);
  if (state.title.trim())     lines.push(`TITLE:${state.title}`);
  if (state.phone.trim())     lines.push(`TEL;TYPE=voice:${state.phone}`);
  if (state.workPhone.trim()) lines.push(`TEL;TYPE=work:${state.workPhone}`);
  if (state.email.trim())     lines.push(`EMAIL:${state.email}`);
  if (state.website.trim())   lines.push(`URL:${state.website}`);
  if (state.address.trim())   lines.push(`ADR:;;${state.address};;;;`);
  if (state.linkedin.trim())  lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${state.linkedin}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}
```

**Note on `isVCardEmpty`:** Must be updated to include the new fields in its all-blank check.

**Note on saved QR hydration:** When loading a saved vCard QR in edit mode, `QRGeneratorIsland` maps `data.contentData` to `vcardValue`. The new fields will be absent on old records — they default to empty strings in the initial state, so no migration is needed. Old records open and display correctly with blank new fields.

### `VCardTab.tsx` Changes

Add new form inputs for `title`, `workPhone`, `address`, `website`, `linkedin`. The component is a straightforward form — each new field follows the existing input pattern. No architectural complexity.

---

## Feature 7: Header Navigation Improvements

Pure Astro/HTML changes to `Header.astro`. No architectural implications. Add:
- "Register" button linking to `/signup`
- "Pricing" nav link

These are static Astro component edits, no new routes or API calls.

---

## Recommended Architecture Diagram (v1.2 Additions)

```
src/
├── components/
│   ├── QRGeneratorIsland.tsx       MODIFIED — add 'pdf', 'appstore' tabs; FrameSection; AdBanner
│   ├── ExportButtons.tsx           MODIFIED — accept frameOptions, branch on composeWithFrame
│   ├── tabs/
│   │   ├── PdfTab.tsx              NEW — PDF landing page form + file upload
│   │   └── AppStoreTab.tsx         NEW — App Store form + icon upload
│   ├── customize/
│   │   └── FrameSection.tsx        NEW — frame style/color/label controls
│   ├── AdBanner.tsx                NEW — client-side AdSense unit (renders only for free tier)
│   ├── PricingPromo.astro          NEW — homepage pricing section
│   ├── HowTo.astro                 NEW — homepage how-to section
│   └── UseCasesTeaser.astro        NEW — homepage use cases grid
├── pages/
│   ├── index.astro                 MODIFIED — add PricingPromo, HowTo, UseCasesTeaser
│   ├── p/
│   │   └── [slug].astro            NEW — prerender=false, hosted landing page
│   ├── use-cases/
│   │   ├── index.astro             NEW — static use cases hub
│   │   └── [slug].astro            NEW — static individual use case pages (getStaticPaths)
│   └── api/
│       └── landing/
│           ├── create.ts           NEW — POST creates landingPages row
│           ├── [id].ts             NEW — GET/PUT/DELETE landing page
│           └── upload.ts           NEW — POST proxies file to Vercel Blob
├── db/schema.ts                    MODIFIED — add landingPages table
├── lib/
│   ├── qrEncoding.ts               MODIFIED — extend VCardState + encodeVCard
│   └── frameComposer.ts            NEW — canvas 2D frame composition helper
├── data/
│   └── presets.ts                  NEW — static array of preset {frame+color+shape} combos
└── public/
    └── screenshots/                NEW — committed PNG screenshots for HowTo
scripts/
  └── generate-screenshots.ts       NEW — Playwright script for screenshot generation
```

---

## Component Boundaries Summary

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `PdfTab.tsx` | Collects PDF landing page form data; triggers file upload | `/api/landing/upload` (file), passes state up to Island |
| `AppStoreTab.tsx` | Collects App Store page form data; triggers icon upload | `/api/landing/upload` (icon), passes state up to Island |
| `FrameSection.tsx` | Frame style UI controls, exposes `FrameSectionState` | `QRGeneratorIsland` (state lift), `ExportButtons` (frame data) |
| `frameComposer.ts` | Canvas 2D composition: QR PNG + frame → composite Blob | `ExportButtons` (called on download/copy when frame enabled) |
| `AdBanner.tsx` | Client-side ad unit, checks tier from existing subscription API | `/api/subscription/status` (already called by Island) |
| `/p/[slug].astro` | SSR: reads `landingPages` from Turso, renders page | `db` (Drizzle query), no client JS needed |
| `/api/landing/create.ts` | Creates `landingPages` row + linked `dynamicQrCodes` row | `db`, called by `QRGeneratorIsland` save flow |
| `/api/landing/upload.ts` | Proxies binary upload to Vercel Blob | `@vercel/blob`, called by tab components |
| `use-cases/[slug].astro` | Renders SEO article for one use case (static) | `src/data/useCases.ts` (new static data file) |

---

## Data Flow Changes

### Existing Flow (URL Dynamic QR)

```
User fills URL tab → toggles Dynamic → clicks Save
→ POST /api/qr/save { isDynamic:true, destinationUrl }
  → INSERT savedQrCodes + INSERT dynamicQrCodes { slug, destinationUrl }
  → returns { id, slug }
→ QR encodes https://qr-code-generator-app.com/r/[slug]
Scan → GET /r/[slug] → 307 → destinationUrl
```

### New Flow (PDF/App Store Landing Page)

```
User fills PDF tab → clicks Save
→ (if files selected) POST /api/landing/upload → { url: "https://...vercel.app/..." }
→ POST /api/landing/create {
    type:'pdf', title, pdfUrl, coverImageUrl,
    savedQrCodeId: (linked after insert)
  }
  → INSERT landingPages { slug: nanoid(8) }
  → INSERT dynamicQrCodes { slug: same nanoid, destinationUrl: /p/[landing_slug] }
  → INSERT savedQrCodes { contentType:'pdf', contentData: { landingPageId } }
  → returns { landingPageId, dynamicSlug }
→ QR encodes https://qr-code-generator-app.com/r/[dynamicSlug]
Scan → GET /r/[dynamicSlug] → 307 → /p/[landing_slug]
     → GET /p/[landing_slug] (SSR) → renders landing page
```

---

## Scalability Considerations

| Concern | Current state | v1.2 impact | Mitigation |
|---------|--------------|-------------|------------|
| Turso read load | Low — dynamic QR redirects only | Landing page SSR adds reads per scan | `/p/[slug].astro` can add `Cache-Control: s-maxage=60` — page content rarely changes |
| Vercel Blob storage | Not used today | PDF + image uploads add binary storage | Vercel Blob is pay-per-use; $0.023/GB — negligible at early scale |
| Canvas frame composition | Not used today | Client-side only — zero server load | Pure browser API, no infra concern |
| AdSense load | Not used today | Script adds ~50ms to initial load for free tier | Lazy-load via `client:idle` or `async` attribute; Pro/Starter users unaffected |
| Screenshots | Not generated | Static files committed to repo | ~20 PNG files, ~100KB each — negligible |

---

## Breaking Change Analysis

| Change | Breaks Existing Feature? | Mitigation |
|--------|--------------------------|------------|
| Extend `VCardState` with new optional fields | No — new fields default to empty string; old saved records load with blank new fields; `encodeVCard` skips blank lines | None needed |
| Add `FrameSection` state to `QRGeneratorIsland` | No — `frameEnabled: false` by default; export pipeline branches only when enabled | Default state preserves existing behavior |
| Modify `ExportButtons` to accept `frameOptions` | No — prop is new, existing call sites pass it with `frameEnabled: false` | Default to no-frame behavior |
| Add `landingPages` DB table | No — new table, no FK into existing tables (other than soft reference to `savedQrCodes`) | Additive migration only |
| Add `showAds` prop to `Layout.astro` | No — defaults to `false`; existing pages unchanged | All existing pages omit the prop |

---

## Suggested Build Order (with Dependency Rationale)

### Phase 1: Foundation and No-Dependency Items (build first)
1. **vCard enhancements** — extends `qrEncoding.ts` and `VCardTab.tsx`, zero dependencies on other v1.2 work, immediately testable, no new infra
2. **Header navigation** — pure HTML/Astro, zero dependencies
3. **Fix marketing copy and pricing page accuracy** — static content edits, zero dependencies

### Phase 2: SEO and Homepage Sections (build second)
4. **Homepage marketing sections** (PricingPromo, HowTo stub, UseCasesTeaser) — pure static Astro, no new infra; HowTo can use placeholder images until screenshots are generated
5. **SEO content pages** (`/use-cases` hub and `[slug]` pages) — static Astro, no new infra, sitemap auto-picks them up
6. **Programmatic screenshots** — run after homepage sections are built; generate and commit `public/screenshots/`; then wire into `HowTo.astro`

### Phase 3: QR Frame Rendering (build third)
7. **QR code decorative frames** — new `FrameSection.tsx`, new `frameComposer.ts`, modify `ExportButtons`; requires no new API routes or DB changes; self-contained client-side feature
8. **Preset style templates** — pure data file `src/data/presets.ts`; depends on FrameSection existing

### Phase 4: Hosted Landing Pages (build fourth, largest scope)
9. **Vercel Blob setup** — install `@vercel/blob`, add env var, wire `/api/landing/upload.ts`
10. **DB schema addition** — add `landingPages` table, run migration
11. **`/api/landing/create.ts`** and **`/api/landing/[id].ts`** — server routes for CRUD
12. **`PdfTab.tsx`** and **`AppStoreTab.tsx`** — new tabs, depends on upload API
13. **`/p/[slug].astro`** — SSR landing page renderer
14. **Wire into `QRGeneratorIsland`** — add new tabs, update save flow

### Phase 5: Google AdSense (build last)
15. **AdSense** — add `showAds` prop to Layout, create `AdBanner.tsx`, wire conditional into `QRGeneratorIsland`; build last because: (a) requires AdSense account approval which may take 1-2 weeks, (b) no dependencies on other features, (c) lowest risk to delay

**Rationale for this ordering:**
- vCard and header come first because they are pure modifications with zero new infra risk
- SEO pages come before landing pages because they are static and independently deployable
- Frames come before landing pages because they are self-contained and de-risk the client-side canvas approach early
- Landing pages are last in the "feature" work because they require new DB schema, Vercel Blob, and the most API surface
- AdSense is last because external approval gating makes it the least controllable timeline item

---

## Open Questions / Gaps

1. **Vercel Blob file size limits for PDFs**: Vercel Blob supports up to 500MB per file on all plans, but QRCraft should impose its own limit (e.g., 10MB for free, 25MB for Pro) to control storage costs. Needs a policy decision.
2. **Landing page auth gate**: Should anonymous users be able to create PDF/App Store landing pages? The redirect infrastructure requires a `dynamicQrCodes` row (which is currently Pro-only). If landing pages are a Pro feature, the gate is inherited automatically. This needs a product decision before building.
3. **AdSense approval timeline**: Google AdSense approval requires the site to have content, a privacy policy, and an active audience. The SEO content pages (Phase 2) should be live before applying for AdSense. Apply after Phase 2 is deployed.
4. **Frame + SVG export conflict**: When a frame is enabled, the SVG export cannot include the frame (frames are canvas/raster-only). UX decision needed: disable SVG export button when frame is on, or export frameless SVG with an informational tooltip.
5. **`/p/[slug]` caching strategy**: Landing pages are SSR. Without cache headers, every QR scan triggers a Turso read. A `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` header on the SSR response lets Vercel edge cache the landing page for 5 minutes — appropriate given that users rarely update landing page content mid-campaign.

---

## Sources

- [qr-code-styling README](https://github.com/kozakdenys/qr-code-styling/blob/master/README.md) — `getRawData()` method signature (returns `Promise<Blob>`)
- [MDN Canvas API — Drawing text](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text) — canvas frame composition approach
- [vCard 3.0 Format Specification](https://www.evenx.com/vcard-3-0-format-specification) — TITLE, TEL;TYPE=work, ADR, URL field formats (MEDIUM confidence — spec is stable since 1998)
- [RFC 6350 — vCard Format Specification](https://tools.ietf.org/html/rfc6350) — authoritative vCard field reference
- [Playwright Screenshots Docs](https://playwright.dev/docs/screenshots) — `page.screenshot()` and element clip approach
- [Website Archive with Playwright in Astro](https://spacejelly.dev/posts/website-archive-with-automated-screenshots-in-astro-with-playwright-github-actions) — build-time screenshot generation pattern
- [astro-paper AdSense discussion](https://github.com/satnaing/astro-paper/discussions/437) — Astro + AdSense script injection community pattern (MEDIUM confidence)
- [Astro Scripts and event handling docs](https://docs.astro.build/en/guides/client-side-scripts/) — `<script>` tag placement in Astro layouts
- Existing codebase: `src/db/schema.ts`, `src/pages/r/[slug].ts`, `src/components/QRGeneratorIsland.tsx`, `src/components/ExportButtons.tsx`, `src/lib/qrEncoding.ts`, `src/layouts/Layout.astro`
