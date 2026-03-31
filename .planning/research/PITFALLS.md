# Domain Pitfalls — v1.2 Feature Additions

**Domain:** Adding AdSense, hosted landing pages, decorative QR frames, SEO improvements, vCard enhancements, homepage marketing sections, and tier limit updates to existing QRCraft (Astro 5 + React + Vercel + Turso + Clerk + Stripe).
**Researched:** 2026-03-30
**Confidence:** HIGH (AdSense CLS mechanics, Drizzle migration, canvas/frame composition, Astro sitemap bugs) / MEDIUM (AdSense policy for SaaS tools, vCard cross-platform behavior) / LOW (exact AdSense revenue impact at this traffic scale)

This document covers pitfalls **specific to v1.2 additions**. See the companion PITFALLS.md from v1.1 research for auth, Stripe, and Turso connection pool pitfalls that remain relevant.

---

## Critical Pitfalls

---

### Pitfall 1: Google AdSense Auto Ads Destroy the Lighthouse 100 Score

**What goes wrong:**
The site currently ships Lighthouse mobile performance: 100. Adding AdSense's standard `<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js">` tag as a global head include (the default setup instruction AdSense provides) loads the ad script on every page, including the dashboard and auth pages. This alone costs 10-20 Lighthouse performance points before a single ad renders, because the script is render-blocking on slow connections and adds ~120KB of JavaScript to every page.

Auto Ads (the "paste one tag and forget it" mode) actively scans the DOM and inserts ads anywhere it sees whitespace. On the QR generator page, this breaks the carefully-tuned `client:visible` hydration by injecting DOM nodes mid-render. Auto Ads also strip `min-height` from any parent element it injects into, which guarantees a CLS of 0.3–0.6+ on the first ad load.

**Why it happens:**
The AdSense onboarding flow recommends the single global script tag and Auto Ads as the simplest setup. Teams follow the quickstart without knowing it conflicts with performance-first architectures.

**Consequences:**
- Lighthouse score drops from 100 to ~75-85
- CLS metric fails Core Web Vitals threshold (must be <0.1)
- Google Search ranking signal degraded (CWV is a ranking factor)
- The generator page's `client:visible` hydration timing is disrupted
- QRGeneratorIsland.tsx may re-render unexpectedly when Auto Ads inject nodes into its parent

**Prevention:**
1. Use **manual ad units only** — never enable Auto Ads on qrcraft. Place ads in explicit, statically-sized containers.
2. Load the AdSense script **conditionally** — only when the current user is on the free tier (unauthenticated or `tier === 'free'`). The script must never load on Pro dashboard pages. Use a dedicated `<AdsenseScript />` Astro component with a `Astro.locals.auth()` tier check, only included on pages where ads will render.
3. **Pre-reserve ad slot dimensions** with hard-coded CSS on the container div before the script loads:
   ```css
   .ad-slot { min-height: 90px; width: 100%; }
   ```
   Use an ID selector (not class) because AdSense JavaScript strips `min-height` from class-targeted elements but not ID-targeted ones.
4. Load the AdSense script with `strategy="lazyOnload"` (fire after page load completes, not in `<head>`). In Astro, add it via a `<script>` tag at the bottom of the page body, not in `<BaseLayout.astro>`'s head.
5. Run Lighthouse CI on every deployment. A regression from 100 to <90 should block the merge.

**Warning signs:**
- AdSense script added to `src/layouts/BaseLayout.astro` `<head>` section globally
- Auto Ads enabled in AdSense account dashboard
- No explicit `min-height` set on ad container divs
- `x-vercel-cache: MISS` for pages that previously served from CDN (means SSR was accidentally added to accommodate the ad tier check)

**Files at risk:** `src/layouts/BaseLayout.astro`, `src/pages/index.astro`, `src/components/QRGeneratorIsland.tsx`

**Phase to address:** AdSense phase. Lighthouse baseline test must be run before the ad script is added, and after, with pass/fail gating.

---

### Pitfall 2: AdSense Tier Check Exposes Auth State on a Static Page — Breaks the Current Architecture

**What goes wrong:**
Conditionally rendering ads only for free users requires knowing the user's tier when the page renders. The homepage (`/index.astro`) is currently a fully static, prerendered page — the server never sees request headers. There is no user context at build time. Developers who try to add `{userTier === 'free' && <AdSlot />}` to the Astro template discover that `Astro.locals.auth()` is unavailable on a static page and the build fails or returns null tier for everyone.

The typical "fix" is to convert the homepage to SSR (`export const prerender = false`), which adds cold start latency to every homepage load, breaking the Lighthouse 100 score from the other direction.

**Why it happens:**
The desire to avoid serving AdSense JS to Pro users (sensible) conflicts with the static-first architecture. Developers reach for the server-side solution without considering the client-side alternative.

**Prevention:**
Handle the ad tier gate **entirely client-side inside a React island**, not in the Astro template:
```tsx
// AdBanner.tsx — React island, client:idle
export default function AdBanner() {
  const user = $userStore.get();        // Clerk nanostore, available synchronously after hydration
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setTier('free'); return; }
    fetch('/api/subscription/status')
      .then(r => r.json())
      .then(d => setTier(d.tier));
  }, [user?.id]);

  if (tier !== 'free') return null;     // Pro/Starter users: render nothing
  return <div id="ad-slot-1" className="ad-slot">...</div>;
}
```
The homepage stays fully static. The AdSense script is loaded lazily by the island only when it renders. Pro users never trigger the script load. The `/api/subscription/status` call is a single fast Turso query already used elsewhere — no new infrastructure needed.

**Warning signs:**
- `Astro.locals.auth()` called in `src/pages/index.astro` which does not have `export const prerender = false`
- Build error: "locals.auth is not a function on prerendered page"
- Homepage response headers flip from `x-vercel-cache: HIT` to `MISS` after AdSense work begins

**Files at risk:** `src/pages/index.astro`, `src/layouts/BaseLayout.astro`

**Phase to address:** AdSense phase. Finalize the client-side tier-check-in-island pattern before writing any AdSense integration code.

---

### Pitfall 3: Decorative Frame Export Breaks Because Canvas Composite Is Untrusted

**What goes wrong:**
The current PNG export in `ExportButtons.tsx` creates a temporary `QRCodeStyling` instance at 768×768 with `type: "canvas"` and calls `tempQr.download()`. This works because all image data (including the user-uploaded logo) is a data URI stored in the island state — no cross-origin resources. Adding decorative frames changes the pipeline: the frame graphic must be composited onto the QR canvas before export. If the frame is loaded as an `<img>` tag from a URL (e.g., `/frames/frame1.svg`) rather than inlined as a data URI, the browser treats the canvas as **tainted** and `getRawData()` / `toBlob()` / `toDataURL()` throw `SecurityError: The operation is insecure`.

**Why it happens:**
SVG frames served from the same origin with a plain `<img>` tag do not automatically get CORS headers needed to mark them as safe for canvas use. The browser's canvas security model treats any image without explicit `crossOrigin="anonymous"` on the `<img>` element AND `Cross-Origin-Resource-Policy: same-origin` or `Access-Control-Allow-Origin` headers on the server as an untrusted source.

**Consequences:**
- PNG download silently fails (no error visible to user)
- Clipboard copy fails
- The export flow regresses silently — only noticed by users who try to export after applying a frame

**Prevention:**
Two safe approaches:

**Option A (recommended): Pre-inline frames as data URIs**
Load all frame SVG files at build time (Astro glob import) and inline them as base64 data URIs. No network fetch, no CORS issue, and the frame is available synchronously for canvas composition.
```typescript
const frames = import.meta.glob('/src/assets/frames/*.svg', { as: 'raw' });
// Convert to data URI: `data:image/svg+xml;base64,${btoa(svgString)}`
```

**Option B: Composite frame on a second canvas after QR generation**
Generate the QR code to a canvas blob, then draw it into a second `<canvas>` element that you fully control. Draw the frame (loaded with `crossOrigin="anonymous"`) before compositing. Since you own the canvas and control all draw operations, tainting does not occur if CORS headers are correct.

Never use `new Image()` with a URL src and draw it to canvas without `crossOrigin="anonymous"` set before setting `.src`.

**Warning signs:**
- Frame image loaded via `new Image(); img.src = '/frames/frame1.svg'` with no `crossOrigin` attribute
- `SecurityError` in browser console on PNG download attempt after frame is selected
- Export buttons produce no download but also show no error toast

**Files at risk:** `src/components/ExportButtons.tsx`, new frame composition utility

**Phase to address:** Decorative frames phase. Resolve the canvas composition strategy (inlined data URIs vs. CORS-enabled server fetch) before implementing any frame rendering.

---

### Pitfall 4: Drizzle Schema Migration Breaks Existing Rows on Turso Production

**What goes wrong:**
Adding new content types (PDF, App Store) requires new columns on `savedQrCodes` (e.g., `coverPhotoUrl`, `appStoreUrl`, `landingPageSlug`). When these columns are added to `schema.ts` and pushed with `drizzle-kit push` against a Turso production database that has existing rows, there is a known Drizzle bug: the push command fails with `"table has N columns but N+1 values were supplied"` on tables with existing data. This is a documented issue in the Drizzle ORM GitHub repo.

Worse: if the developer works around this by dropping and recreating the table, all existing user QR codes are deleted. A production data loss event.

**Why it happens:**
`drizzle-kit push` is designed for development schema sync. It is explicitly not recommended for production databases with existing data. Many developers use it anyway because it's simple and worked fine during v1.1 development.

**Prevention:**
1. **Never use `drizzle-kit push` against Turso production.** Generate a migration file instead:
   ```bash
   npx drizzle-kit generate
   ```
   Review the generated SQL carefully. For SQLite (Turso), adding a nullable column is safe. Adding a NOT NULL column without a default value is not — it will fail on existing rows.
2. **All new columns added for v1.2 must be nullable or have a default value.** Existing `savedQrCodes` rows have no PDF data; `coverPhotoUrl TEXT` (nullable) is safe, `coverPhotoUrl TEXT NOT NULL` is not.
3. Apply the migration against a Turso staging database (separate DB URL) before touching production.
4. Test the migration by inserting a row with the v1.1 schema, running the migration, then querying all columns — verify no null constraint violations.

**Warning signs:**
- `drizzle-kit push` used on production Turso URL (check `drizzle.config.ts` `dbCredentials.url`)
- New columns added as `NOT NULL` with no `.default()` in schema definition
- No migration staging step in the deployment checklist

**Files at risk:** `src/db/schema.ts`, `drizzle.config.ts`

**Phase to address:** First phase that adds new DB columns (PDF/App Store landing pages). Establish the generate-review-migrate workflow in the phase plan before any schema changes.

---

### Pitfall 5: Hosted Landing Page Slugs Conflict with Existing `/r/[slug]` Dynamic QR Routes

**What goes wrong:**
The existing dynamic QR redirect system uses `/r/[slug]` (nanoid 8 characters) for short URLs. Adding hosted PDF/App Store landing pages requires a shareable public URL. If landing pages also use `/r/[slug]` or a similar short path, there is a namespace collision risk: a landing page slug could be identical to an existing QR redirect slug (low probability but non-zero given an 8-character alphanumeric space), or users could manually guess short codes belonging to other users' landing pages.

A separate but related issue: the landing pages need dynamic SSR (per-page OG meta tags, SSR content from Turso) but the site is mostly static. Adding `export const prerender = false` to a new `/p/[slug].astro` landing page route is correct, but if this is placed in a directory that also contains static pages, the build may incorrectly apply static generation to the dynamic route.

**Why it happens:**
Short slug namespaces are shared globally across all content. Landing page UX requires short, shareable URLs. These two requirements conflict.

**Prevention:**
1. Use a **separate path prefix** for landing pages: `/p/[slug]` (for "page") rather than `/r/[slug]`. This eliminates namespace collision with redirect slugs.
2. Store landing page slugs in a **separate table** (`landingPages`) with its own unique constraint, not in `dynamicQrCodes`. The QR code simply encodes the `/p/[slug]` URL as its data.
3. Add `export const prerender = false` only to `src/pages/p/[slug].astro`, not to the entire pages directory.
4. Generate landing page slugs with nanoid(10) or longer to reduce collision probability in the `/p/` namespace.
5. OG meta tags (`og:title`, `og:description`, `og:image`) for landing pages must be set in the `<head>` of the SSR-rendered page — they cannot be set client-side because social crawlers do not execute JavaScript.

**Warning signs:**
- Landing page routes placed at `/r/[slug]` alongside dynamic QR redirects
- `landingPageSlug` stored as a column on `savedQrCodes` rather than a separate table
- OG tags set inside a React island (crawlers won't see them)
- `export const prerender = false` missing from the landing page route file

**Files at risk:** `src/pages/p/[slug].astro` (new), `src/db/schema.ts`

**Phase to address:** PDF/App Store landing pages phase. Define the URL structure and data model before any route is created.

---

### Pitfall 6: SEO Cannibalization Between Tool Page and New Content Landing Pages

**What goes wrong:**
Adding a "QR code use cases" section and dedicated landing page, a "how-to" section, and PDF/App Store QR generator pages creates multiple pages that target overlapping keywords ("QR code generator", "free QR code maker", etc.). The homepage already targets these head keywords. New pages that repeat the same H1 and meta description patterns split Google's link equity across multiple pages and can cause all of them to rank lower than the original single page.

The `@astrojs/sitemap` integration has a known issue with Vercel deployments where sitemap.xml is generated after Vercel finalizes static assets, causing the sitemap to be excluded from the deployed output. New SSR landing pages (`/p/[slug]`) are not statically enumerable at build time and will not appear in a static sitemap at all.

**Why it happens:**
Content strategy and SEO aren't considered during feature planning. Each new page is built to serve a feature need (show off PDF QR use case) without considering its relationship to existing pages targeting the same keywords.

**Prevention:**
1. **Keyword intent differentiation**: The homepage owns "QR code generator" (transactional intent). New pages must own distinct intents: "QR code for PDF" (informational), "QR code use cases" (navigational). Unique H1, unique meta description, unique focus keyword per page.
2. **Canonical tags** on near-duplicate pages. If the how-to section is split into a standalone `/guide/` page that closely mirrors homepage FAQ content, add `<link rel="canonical" href="/">` on the new page or consolidate into the homepage with anchor links.
3. **Sitemap fix**: Add `@astrojs/sitemap` config with explicit `customPages` array for known SSR routes. For dynamic landing pages (`/p/[slug]`), these cannot appear in a build-time sitemap — submit them via Google Search Console URL inspection individually, or build a dynamic sitemap endpoint at `/sitemap-dynamic.xml` that queries Turso for all active landing page slugs.
4. Never use the same title tag and meta description on two different pages. Even minor keyword variation matters.

**Warning signs:**
- New pages have H1 "Free QR Code Generator" — identical to homepage H1
- `sitemap.xml` deployed to production does not include new static pages added in v1.2
- `sitemap.xml` file is empty or missing from Vercel deployment (known `@astrojs/sitemap` + Vercel adapter bug)

**Files at risk:** `astro.config.mjs` (sitemap config), any new `.astro` page files with `<title>` and `<meta name="description">`

**Phase to address:** SEO improvements phase. Do a keyword intent map before writing any new page copy.

---

### Pitfall 7: vCard Special Character Encoding Corrupts the QR Data

**What goes wrong:**
The current `encodeVCard()` in `src/lib/qrEncoding.ts` supports `name`, `phone`, `email`, `org`. Adding `title`, `company`, `workPhone`, `address`, `website`, and `linkedin` to the vCard spec (v1.2 requirement) introduces new encoding hazards:

- **N field structure**: vCard 3.0's `N` property has 5 semicolon-delimited components (`FamilyName;GivenName;AdditionalNames;Prefix;Suffix`). The current code writes `N:${name};;;` which works for simple names but breaks if `name` contains a semicolon (a malicious or accidental input). The entire vCard parse fails on devices that strictly validate the `N` field structure.
- **Address field**: vCard `ADR` has 7 semicolon-delimited components (`POBox;Extended;Street;City;Region;Postal;Country`). Unescaped semicolons inside any component corrupt the structure. The current WiFi encoder has proper `escapeWifi()` — no equivalent escape function exists for vCard property values yet.
- **Line folding**: vCard 3.0 requires lines longer than 75 characters to be folded with `\r\n ` (CRLF + single space). iOS Contacts handles this gracefully. Outlook Desktop fails to import vCards with unfolded long lines. An `ADR` with a full street address easily exceeds 75 characters.
- **CHARSET for non-ASCII**: Outlook Express / older Outlook versions misparse UTF-8 vCard 3.0 without a `CHARSET=UTF-8` declaration. However, adding `CHARSET=UTF-8` to vCard 3.0 is technically spec-incorrect (it was deprecated in 3.0 but is needed for Outlook compat). This is a documented cross-client contradiction.

**Why it happens:**
vCard is a spec with known cross-client inconsistencies. Adding fields increases the surface area for encoding bugs. The current implementation was minimal enough to avoid most issues.

**Prevention:**
1. Add a `escapeVCard(s: string): string` function that escapes `\`, `;`, `,`, and newlines per RFC 6350:
   ```typescript
   function escapeVCard(s: string): string {
     return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
   }
   ```
2. Apply `escapeVCard()` to every property value before writing it to the vCard string. Audit the entire `encodeVCard()` function when adding new fields.
3. Implement `foldLine(line: string): string` that wraps at 75 bytes (not characters — bytes matter for UTF-8) with `\r\n ` continuation.
4. For the `ADR` property, use a structured input (separate fields for street, city, etc.) rather than a single free-text address field. This gives you control over the delimiter structure.
5. Test with Apple Contacts (iOS 17+), Google Contacts, and Outlook 365 Desktop for every new field added. These three cover >95% of real-world vCard import scenarios.

**Warning signs:**
- `encodeVCard()` concatenates user-provided strings directly into semicolon-delimited fields without escaping
- Long `ADR` or `NOTE` values not folded at 75 chars
- No automated test that imports the generated vCard into a contact app (even a unit test that validates the output against the RFC 6350 spec)
- New fields added by extending the function without adding escape calls

**Files at risk:** `src/lib/qrEncoding.ts`, `src/components/tabs/VCardTab.tsx` (new fields)

**Phase to address:** vCard enhancements phase. Refactor `escapeVCard()` and `foldLine()` as the first step, before adding any new fields.

---

### Pitfall 8: QR Frame + Logo Composition Produces Incorrect SVG Export

**What goes wrong:**
The current SVG export uses `qrCodeRef.current?.download({ extension: 'svg' })` which exports the raw QR code SVG from `qr-code-styling`. When a decorative frame is added, the frame must be part of the exported SVG. If the frame is rendered as a DOM overlay (positioned absolutely on top of the QR preview) rather than composited into the QR's SVG, the SVG download produces a frame-less QR code — the frame only appears in the browser preview.

Additionally, `qr-code-styling` does not support frame injection natively. The SVG output is a standalone document. Wrapping it in a larger SVG `<svg>` group with the frame requires:
1. Parsing the raw SVG string
2. Adjusting the `viewBox` to accommodate frame padding
3. Injecting frame SVG elements around the QR group
4. Re-serializing to a Blob for download

If this composition happens incorrectly, the QR module boundaries shift relative to the quiet zone, and the resulting QR becomes unscannable (especially at small print sizes).

**Why it happens:**
Frames are initially implemented as CSS/DOM overlays for live preview (simplest approach) but export is not considered until later. The export path requires a different composition strategy.

**Prevention:**
1. **Single source of truth for composition**: Build a `composeQRWithFrame(qrSvgString, frameSvgString, frameConfig)` utility that produces the final composite SVG. Both the preview and the export use this function — the preview renders the result in a React-controlled `<div dangerouslySetInnerHTML>` and the export downloads it.
2. Preserve the QR code's quiet zone (4-module white border). Frame padding must be added **outside** the quiet zone, not replacing it. The frame SVG should use a `viewBox` that positions the QR area in the center with frame elements around it.
3. For PNG export: composite the frame in the temp canvas. Draw the frame first (larger canvas dimensions), then draw the QR code centered on top. Do not draw the QR first and then attempt to draw the frame on top of modules — frame text ("SCAN ME") must be underneath the QR in z-order visually, but frame borders must be around the QR.
4. Test that the exported QR code (with frame) scans correctly with at least three apps (iOS Camera, Google Lens, a third-party scanner) at both 200px screen size and 300 DPI print simulation.

**Warning signs:**
- Frame implemented as `position: absolute` CSS overlay on the preview div
- SVG download does not include frame elements (easily verifiable: open the downloaded SVG in a text editor, look for frame-related SVG groups)
- No scanning test for the exported composite (only visual QA)
- `viewBox` not adjusted after frame is composited (QR appears clipped or frame appears clipped)

**Files at risk:** `src/components/ExportButtons.tsx`, `src/components/QRPreview.tsx`, new frame composition utility

**Phase to address:** Decorative frames phase. Build the composition utility and test export before building the visual frame picker UI.

---

### Pitfall 9: Updating Tier Limits Silently Downgrades Existing Users

**What goes wrong:**
v1.2 changes saved QR limits from (implied unlimited for Pro) to Free:5/3, Starter:100/10, Pro:250/100. The limits in `src/pages/api/qr/save.ts` currently read:
```typescript
if (tier !== 'pro') { /* limit to 3 dynamic QRs */ }
// static QRs: Pro required at all
```
The new limits affect every tier. If a Pro user has saved 251 QR codes (above the new 250 cap), and the limit check is changed to `savedCount >= TIER_LIMITS[tier].savedQrs`, that user is blocked from saving any more. Worse, if the limit check applies retroactively (e.g., on list or edit), existing users experience feature regression without any upgrade path.

Additionally, `save.ts` hardcodes `3` for the dynamic QR limit for non-Pro users. If this is changed to match the new tier structure (`Starter: 10`, `Free: 3`), existing Starter users who were already at limit 3 would suddenly have access to 10 — but Starter users who were blocked before need no migration. However, any logic change here could inadvertently grant free users the Starter limit if the tier mapping is wrong.

**Why it happens:**
Limit constants are scattered as hardcoded numbers across API routes rather than centralized in a constants file. Changes require updates in multiple places and it's easy to miss one.

**Prevention:**
1. **Centralize tier limits** in a single file before changing any limits:
   ```typescript
   // src/lib/tierLimits.ts
   export const TIER_LIMITS = {
     free:    { savedQrs: 5,   dynamicQrs: 3 },
     starter: { savedQrs: 100, dynamicQrs: 10 },
     pro:     { savedQrs: 250, dynamicQrs: 100 },
   } as const;
   ```
2. Update all API routes (`save.ts`, `list.ts`, any future limit checks) to import from `tierLimits.ts`. One change propagates everywhere.
3. For the limit increase case (Starter: 3→10 dynamic QRs): no migration needed. Users who were at 3 can now create more. Do not change existing data.
4. For the limit decrease case (if Pro had unlimited saves and now has 250): do NOT enforce the new 250 cap on existing Pro users' saved QRs retroactively. Guard the cap with:
   ```typescript
   // Only enforce on NEW saves — never prevent viewing or editing existing saves
   if (savedCount >= limit && isNewSave) { return 403; }
   ```
5. Update the pricing page display simultaneously with the code change — mismatched displayed limits and actual limits are a trust issue.

**Warning signs:**
- `3` appears as a magic number in `save.ts` (not imported from a constants file)
- Limit check runs on list/read operations (not just create)
- No audit of all places limits are checked before changing the values
- Pricing page shows different limits than what the API enforces

**Files at risk:** `src/pages/api/qr/save.ts`, `src/pages/api/qr/list.ts`, `src/pages/pricing.astro`

**Phase to address:** Tier limits update phase. Create `tierLimits.ts` as the first task before touching any limit-related logic.

---

## Moderate Pitfalls

---

### Pitfall 10: AdSense Policy — Ads Near the QR Generator Trigger Invalid Click Risk

**What goes wrong:**
AdSense policy prohibits ads placed in a way that encourages accidental clicks ("invalid click activity"). A banner ad placed directly below the QR preview or immediately adjacent to the Download/Copy buttons creates accidental click risk: users who aim for "Download PNG" may click an ad instead. AdSense's automated policy enforcement can flag and suspend accounts for elevated accidental click rates — the account suspension is permanent and cannot be reversed.

Additionally, AdSense prohibits ads in "interstitial" positions that obscure content on page load. If the ad is positioned to appear on top of the generator as it loads (because the island hydrates and CLS pushes content down), the ad briefly sits where the generator was, creating an interstitial-like effect.

**Why it happens:**
The generator page has limited whitespace. The natural ad placement is near the generator. The incentive to maximize ad viewability (paid per impression) conflicts with the policy requirement to minimize accidental clicks.

**Prevention:**
1. Place ads in the page **below the fold** — in the FAQ section or between homepage marketing sections, never inside or adjacent to the generator island.
2. Maintain at minimum 150px vertical separation between any ad and any interactive button (Download, Copy, Save).
3. Never place ads inside a modal, slide-in panel, or component that moves on load.
4. The PROJECT.md "Out of Scope" explicitly states "Ads in redirect path — anti-pattern." Extend this principle: no ads in the generator UI area.

**Warning signs:**
- Ad slot div placed inside `QRGeneratorIsland.tsx` or adjacent to `ExportButtons.tsx`
- Ad container placed directly above or below the QR preview without 150px+ of separation
- AdSense account flagged for "invalid click activity" (check AdSense → Policy Center)

**Phase to address:** AdSense phase, ad placement design step.

---

### Pitfall 11: PDF and App Store Landing Pages OG Image Is Missing or Generic

**What goes wrong:**
When a user shares a landing page URL (`/p/[slug]`) on WhatsApp, LinkedIn, or iMessage, the platform fetches the `og:image` meta tag to generate a link preview. If no `og:image` is set, or if it points to the generic QRCraft logo, the preview is visually unrelated to the content (e.g., a PDF landing page for "Company Brochure" shows the QRCraft logo instead of the brochure cover). This tanks the click-through rate on shared links.

**Why it happens:**
OG meta tags are added as an afterthought. The cover photo uploaded for a PDF landing page exists as a Vercel Blob URL, but it must be referenced in the server-rendered `<head>` of the SSR landing page.

**Prevention:**
1. In the SSR landing page route (`/p/[slug].astro`), query Turso for the landing page record including `coverPhotoUrl`. Set `og:image` to that URL dynamically.
2. OG image must be an absolute URL (not a relative path). Vercel Blob URLs are absolute by default.
3. OG image recommended minimum size is 1200×630px. Validate uploaded cover photos at upload time and reject files below 600×315px with a clear error message.
4. Set a fallback OG image (the QRCraft logo) only when `coverPhotoUrl` is null — never as the default for pages that have a cover photo.
5. Add `og:title` set to the landing page name, and `og:description` set to a truncated version of the landing page description.

**Warning signs:**
- `/p/[slug].astro` does not query Turso for the cover photo URL
- `og:image` set to a static asset path rather than the dynamic cover photo URL
- OG tags set in a React island instead of in the Astro `<head>`

**Phase to address:** PDF/App Store landing pages phase.

---

### Pitfall 12: Vercel Blob Server Upload Hits the 4.5MB Serverless Body Limit

**What goes wrong:**
PDF files uploaded for landing pages go through an API route if implemented as a server upload. Vercel serverless functions have a hard 4.5MB request body limit. A typical multi-page company brochure PDF is 2–15MB. Files above 4.5MB silently fail with a 413 or connection reset error — no user-friendly error message.

**Why it happens:**
Server upload is the default pattern for file uploads (frontend → API route → storage). The Vercel body limit is not obvious from the Vercel Blob documentation.

**Prevention:**
Use **Vercel Blob Client Uploads** (direct browser-to-Blob upload with server-side token exchange):
1. User selects file in browser.
2. Browser calls your API route to get an upload token (`/api/upload/token`).
3. Browser uploads directly to Vercel Blob using the token — file never passes through your serverless function.
4. After upload completes, browser receives the Blob URL and stores it in the landing page record.

Set a file size limit of 10MB in the upload token endpoint (reject token issuance for files above this size). Display a clear error for files above the limit. Enforce a per-user storage quota by summing existing blob sizes for the user in Turso before issuing the token.

**Warning signs:**
- PDF upload implemented as `request.formData()` in a standard API route
- No `Content-Length` check before processing the upload
- Users report upload failing silently for larger PDFs

**Phase to address:** PDF/App Store landing pages phase.

---

### Pitfall 13: JSON-LD Schema Inconsistency Between Pages After Adding New Pages

**What goes wrong:**
The site has JSON-LD `SoftwareApplication` and `WebSite` schemas on the homepage (from v1.0 SEO work). Adding new content pages (use cases landing page, how-to guide) without per-page schemas is a missed opportunity. Worse, if the new pages copy the homepage JSON-LD block unchanged, search engines receive the same `SoftwareApplication` schema on multiple pages — the `@id` URIs will be identical, which is technically invalid and can cause Rich Results to be stripped from all pages.

**Why it happens:**
JSON-LD schemas are copy-pasted between pages. The `@id` field (which must be a unique URI per schema entity) is not updated for each new page.

**Prevention:**
1. Each page gets its own schema tailored to its content: `HowTo` schema on the how-to guide, `FAQPage` schema on pages with FAQ sections, `Article` schema on blog-style content pages.
2. Never copy a JSON-LD block from one page to another without updating `@id`, `url`, `headline`, and `description`.
3. Use the [Google Rich Results Test](https://search.google.com/test/rich-results) on every new page before launch.
4. The `WebSite` with `SearchAction` schema belongs only on the homepage — not on every page.

**Warning signs:**
- Same `@id` URL appearing in JSON-LD on two different pages
- New content pages have no JSON-LD at all (missed opportunity)
- Rich Results Test shows errors on new pages

**Phase to address:** SEO improvements phase.

---

### Pitfall 14: Homepage Marketing Sections Regress LCP via Render-Blocking Images

**What goes wrong:**
Adding "how-to guide with programmatic screenshots," "use cases section," and "pricing promo section" to the homepage adds image assets. If these images are not lazily loaded and properly sized, they compete with the above-the-fold content for bandwidth. A hero section that currently achieves LCP in <1s can regress to 3-4s if a large screenshot image in the how-to section is loaded eagerly.

Additionally, React islands hydrating additional homepage sections (`client:visible` on new sections) add to Total Blocking Time. The current homepage has a carefully tuned set of islands. Each new island import adds to the JavaScript bundle.

**Why it happens:**
New sections are implemented as React components for interactivity (e.g., tab switching in the use cases section). Each React island adds hydration cost. Static sections that do not need interactivity are written as React components out of habit.

**Prevention:**
1. New homepage sections that do not require interactivity (pricing promo text, use cases list, static screenshots) must be **`.astro` components**, not React islands. Pure Astro components ship zero JavaScript.
2. All images in new sections below the fold must have `loading="lazy"` and explicit `width`/`height` attributes (prevents CLS).
3. Programmatic screenshots should be optimized to WebP at the appropriate display size before commit (no raw PNGs above 200KB for images shown at 600px width).
4. Run Lighthouse on the full homepage after adding each new section. Catch regressions incrementally.

**Warning signs:**
- New marketing sections implemented as `QRUseCasesIsland.tsx` (React) when they have no interactive behavior
- New images added without `loading="lazy"` or without explicit dimensions
- Lighthouse LCP metric increases above 1.5s after a section is added
- Bundle size increases by >50KB for a section that only shows static content

**Files at risk:** `src/pages/index.astro`, new section components

**Phase to address:** Homepage marketing sections phase. Conduct Lighthouse baseline before starting and treat any regression as a blocking issue.

---

## Minor Pitfalls

---

### Pitfall 15: AdSense Account Approval Requires Live Traffic — Not Just Code

**What goes wrong:**
AdSense account approval requires the site to have sufficient content, traffic, and policy compliance BEFORE Google approves the account. Setting up AdSense code in v1.2 does not mean ads will serve immediately. Google typically takes 2–4 weeks to approve new publishers. If the AdSense integration is built as a v1.2 feature and approval is not applied for until the feature ships, ads won't serve for a month post-launch.

**Prevention:**
Apply for AdSense account approval during the development sprint, not after. The site (which already has real traffic and substantial content from v1.0/v1.1) should be approved quickly. Have the AdSense publisher ID ready before any integration code is merged.

**Phase to address:** AdSense phase, day one.

---

### Pitfall 16: vCard LinkedIn and Website URLs Must Be Properly Encoded

**What goes wrong:**
LinkedIn URLs contain slashes, colons, and hyphens. vCard property values containing `://` (as in `https://`) are not inherently problematic in vCard 3.0 `URL` properties, but some parsers treat the colon as a property delimiter. Encoding the URL as `URL:https://linkedin.com/in/johndoe` is technically correct per RFC 6350, but older Outlook versions (2010–2016) sometimes truncate at the colon.

**Prevention:**
For the `URL` property, use the correct vCard property format (`URL:https://...`). Do not escape the `://` — it is valid in URL-type properties. Separately, add `X-SOCIALPROFILE;type=linkedin:https://...` as a supplementary property for apps that recognize it (Apple Contacts, iOS).

Test against both iOS Contacts and Outlook 365 Desktop before adding LinkedIn as a supported field.

**Phase to address:** vCard enhancements phase.

---

### Pitfall 17: Register Button in Header Breaks Ad-Free Pro Experience

**What goes wrong:**
Adding a "Register" button to the header is straightforward except that the header is currently in a static Astro component (`src/components/Header.astro`) and shows the same markup to all users. Showing a "Register" button to already-logged-in users is confusing. The existing `UserMenu.tsx` React island handles the signed-in state, but its `client:visible` hydration means there's a brief FOUC where both the "Register" button and the UserMenu are visible simultaneously.

**Prevention:**
Keep the "Register" / "Login" links as static markup in `Header.astro` (they show to everyone during initial page load). Add `data-auth-hidden` attributes to these elements. The `UserMenu.tsx` island, on hydration, can add a CSS class to hide them when a user is detected. This is the existing FOGC pattern from v1.1 applied to nav elements. Do not attempt to server-render the header conditionally — the page is static.

**Phase to address:** Header navigation phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| AdSense integration | CLS from unsized ad containers destroys Core Web Vitals | Pre-size every ad slot with a fixed-height container div before the script loads |
| AdSense integration | Auto Ads injects DOM into QR generator island | Use manual ad units only; never enable Auto Ads |
| AdSense integration | Global script tag loads on Pro/dashboard pages | Conditional island: ad script only loads when `tier === 'free'` |
| PDF landing pages | Server upload exceeds 4.5MB Vercel limit | Client-side Vercel Blob upload with token exchange |
| PDF landing pages | OG image not set dynamically | SSR route must query Turso for `coverPhotoUrl` and set `og:image` in `<head>` |
| PDF landing pages | Slug collision with `/r/[slug]` redirects | Use `/p/[slug]` path prefix; separate DB table |
| Decorative frames | Canvas CORS taint blocks PNG/copy export | Pre-inline frame SVGs as data URIs at build time |
| Decorative frames | Frame not included in SVG export | Composite in a utility function used by both preview and export |
| vCard enhancements | Semicolons in address corrupt the vCard | Add `escapeVCard()` before all new fields are written |
| vCard enhancements | Long lines not folded at 75 bytes | Implement line folding in `encodeVCard()` |
| SEO improvements | New pages target same keywords as homepage | Assign unique search intent to each page before writing copy |
| SEO improvements | Sitemap excludes new pages (Vercel adapter bug) | Verify sitemap.xml in Vercel deployment output; add `customPages` to sitemap config |
| Homepage sections | New React islands increase bundle size | Use Astro components for static sections; React only for interactive sections |
| Homepage sections | Images not lazy-loaded cause LCP regression | `loading="lazy"` + explicit dimensions on all below-fold images |
| Tier limits update | Hardcoded `3` in save.ts gets missed | Create `src/lib/tierLimits.ts` and refactor before changing values |
| Tier limits update | Existing users blocked retroactively | Enforce cap on NEW creates only; never on read/edit operations |

---

## Sources

- Google AdSense CLS documentation — minimize layout shift guide — [developers.google.com/publisher-tag/guides/minimize-layout-shift](https://developers.google.com/publisher-tag/guides/minimize-layout-shift) — HIGH confidence
- Google Publisher Ads Audits — cumulative ad shift — [developers.google.com/publisher-ads-audits/reference/audits/cumulative-ad-shift](https://developers.google.com/publisher-ads-audits/reference/audits/cumulative-ad-shift) — HIGH confidence
- AdSense CLS community thread — ID selector min-height fix — [support.google.com/webmasters/thread/87698000](https://support.google.com/webmasters/thread/87698000) — MEDIUM confidence (community, not official docs)
- AdSense best practices for ad placement — [support.google.com/adsense/answer/1282097](https://support.google.com/adsense/answer/1282097) — HIGH confidence
- React AdSense SSR hydration error handling — [brandonlehr.com/blog/2024-02-25-google-adsense-ssr-react/](https://brandonlehr.com/blog/2024-02-25-google-adsense-ssr-react/) — MEDIUM confidence
- Canvas CORS taint / toDataURL security error — MDN Web Docs — [developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image) — HIGH confidence
- Tainted Canvas explainer — [corsfix.com/blog/tainted-canvas](https://corsfix.com/blog/tainted-canvas) — MEDIUM confidence
- Drizzle ORM production migration docs — [orm.drizzle.team/docs/migrations](https://orm.drizzle.team/docs/migrations) — HIGH confidence
- Drizzle push:sqlite bug on tables with existing data — [github.com/drizzle-team/drizzle-orm/issues/2095](https://github.com/drizzle-team/drizzle-orm/issues/2095) — HIGH confidence (filed bug)
- Vercel Blob client upload documentation — [vercel.com/docs/vercel-blob/client-upload](https://vercel.com/docs/vercel-blob/client-upload) — HIGH confidence
- Vercel 4.5MB serverless body limit — [vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) — HIGH confidence
- Astro sitemap + Vercel adapter missing from output — [github.com/withastro/astro/issues/12437](https://github.com/withastro/astro/issues/12437) — HIGH confidence (filed issue)
- vCard RFC 6350 special character escaping — [correctvcf.com/help/generate-correct-vcf-files/](https://correctvcf.com/help/generate-correct-vcf-files/) — MEDIUM confidence
- vCard Outlook encoding incompatibility — [bugzilla.mozilla.org/show_bug.cgi?id=289892](https://bugzilla.mozilla.org/show_bug.cgi?id=289892) — MEDIUM confidence (old but still relevant behavior)
- JSON-LD schema markup mistakes — [zeo.org/resources/blog/most-common-json-ld-schema-issues-and-solutions](https://zeo.org/resources/blog/most-common-json-ld-schema-issues-and-solutions) — MEDIUM confidence
- QR code print DPI and quiet zone requirements — [imqrscan.com/blogs/qr-codes-in-print](https://imqrscan.com/blogs/qr-codes-in-print) — MEDIUM confidence
- qr-code-styling library npm / GitHub — [npmjs.com/package/qr-code-styling](https://www.npmjs.com/package/qr-code-styling) — HIGH confidence (first-party)
- Keyword cannibalization and intent differentiation — [searchengineland.com/guide/keyword-cannibalization](https://searchengineland.com/guide/keyword-cannibalization) — MEDIUM confidence

---
*Pitfalls research for: QRCraft v1.2 — growth & content additions to existing Astro 5 + Turso + Clerk + Stripe stack*
*Researched: 2026-03-30*
