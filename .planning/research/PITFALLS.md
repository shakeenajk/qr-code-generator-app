# Domain Pitfalls

**Domain:** QR code generator website (client-side, static, SEO-first)
**Researched:** 2026-03-06
**Confidence:** HIGH (core QR spec, canvas API, SEO mechanics) / MEDIUM (library-specific behaviors)

---

## Critical Pitfalls

Mistakes that cause rewrites, broken scans in production, or failed downloads.

---

### Pitfall 1: Logo Coverage Exceeds Error Correction Capacity

**What goes wrong:** A logo overlaid on a QR code obscures more modules than the error correction level can recover. The QR code renders visually but fails to scan on real devices — especially lower-end phone cameras in poor lighting.

**Why it happens:** Developers pick an aesthetically pleasing logo size without understanding that QR error correction has a hard ceiling. Error correction level H recovers up to 30% of codewords, but "30% of codewords" does not map directly to 30% of visible area — the finder patterns and format information at corners also consume recovery budget and must never be covered.

**Consequences:** QR codes pass desktop browser tests (which use perfect-lighting webcam scans) but fail in the field on printed materials, business cards, and signage. Users blame the tool. Real-world complaints surface weeks after launch.

**The numbers (HIGH confidence — ISO/IEC 18004 spec):**
- Level L: ~7% codeword recovery
- Level M: ~15% codeword recovery
- Level Q: ~25% codeword recovery
- Level H: ~30% codeword recovery

**Safe logo area guidance (MEDIUM confidence — industry practice):**
- Hard limit: logo must not cover more than 30% of the QR module area when using level H
- Practical safe limit: 20-25% to account for quiet zone, finder patterns, format info, and real-world camera variance
- Never allow the logo to touch or overlap the three corner finder squares

**Prevention:**
1. Force error correction level to H whenever a logo is present — make this automatic, not user-selectable when logo is uploaded
2. Enforce a maximum logo size as a percentage of QR canvas size (20-25% of total area)
3. Add a real-device scan test to CI: generate a QR code with logo at max coverage, scan it with a test script or ZXing CLI, assert it decodes correctly
4. Show a warning in the UI if the user tries to resize a logo beyond the safe threshold

**Warning signs:** QR scans fine in Chrome's BarcodeDetector API on a Mac but fails on a printed copy or on a mid-range Android phone.

**Phase:** QR customization phase (logo upload feature). Address at implementation time, not after.

---

### Pitfall 2: Canvas Taint from Cross-Origin Logo Images

**What goes wrong:** The user pastes a URL to an externally hosted logo image. The image is drawn onto an HTML `<canvas>`. The canvas becomes "tainted" and all calls to `canvas.toDataURL()` or `canvas.toBlob()` throw a `SecurityError`. The download button silently fails or produces a broken file.

**Why it happens:** The HTML Canvas security model marks a canvas as tainted as soon as any cross-origin image is drawn onto it, unless that image was served with `Access-Control-Allow-Origin: *` (CORS header) AND the `<img>` element was loaded with `crossOrigin="anonymous"`. Most external image URLs do not include CORS headers.

**Consequences:** Download fails for a subset of users (those who paste an image URL rather than uploading a file). Error is silent in some browsers — the canvas appears correct visually but export is broken.

**Prevention:**
1. Prefer file upload (local `File` object via `<input type="file">`) as the primary logo input — local files are never cross-origin
2. If URL input is supported, proxy the image through your own origin server or a serverless function (e.g., Vercel Edge Function) so it arrives same-origin. This requires a small backend piece even for an otherwise static site
3. As a fallback: try loading with `crossOrigin="anonymous"` and catch the taint error; show a clear user-facing message: "This image cannot be downloaded due to browser security restrictions — please upload the file instead"
4. Do not silently swallow the SecurityError — users must know why the download failed

**Warning signs:** Download works when testing with locally uploaded images but fails with URL-pasted images. `canvas.toDataURL()` throws `DOMException: Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported`.

**Phase:** Export/download phase. Decide URL-vs-upload strategy before building the logo feature.

---

### Pitfall 3: SVG Export Produces Unscannable or Broken Output

**What goes wrong:** The SVG download looks perfect in the browser but either (a) fails to scan when printed because the SVG renderer used by the print shop anti-aliases module edges, (b) contains embedded fonts that are missing when opened in Illustrator, or (c) is not a true vector SVG but a base64-encoded raster image wrapped in an SVG container.

**Sub-issue A — Raster-in-SVG:** Some QR libraries generate a canvas internally and then wrap `toDataURL()` output in an SVG `<image>` tag. This produces a file with an `.svg` extension that is actually a raster image. It will not scale losslessly.

**Sub-issue B — Font embedding:** If the QR code includes text labels (e.g., "Scan me") using web fonts, SVG export must either embed the font as base64 or convert text to `<path>` outlines. Missing fonts cause fallback rendering on the recipient's machine.

**Sub-issue C — Anti-aliasing at small sizes:** SVG QR codes with rounded dots that use `rx`/`ry` attributes on `<rect>` elements can anti-alias at certain zoom levels, introducing gray pixels between modules. Scanners expect high contrast.

**Prevention:**
1. Verify your chosen QR library generates true vector SVG (paths or rects, not `<image>` wrappers) — test by opening the SVG in a text editor and checking the root element's children
2. Convert any text labels to `<path>` outlines before SVG export, or omit text from SVG and document this limitation
3. For rounded dot styles, test the SVG export by printing at 1-inch size and scanning — this catches anti-aliasing failures invisible on screen
4. Add a "PNG recommended for print shops" note in the UI next to the SVG download button

**Warning signs:** SVG file size is suspiciously large for what should be simple vector data (indicates embedded raster). SVG opens in Illustrator with missing font warnings.

**Phase:** Export/download phase. Verify library SVG output quality before committing to it.

---

### Pitfall 4: SEO Cannibalization and Thin Content

**What goes wrong:** The site creates multiple pages for each QR code type (e.g., `/qr-code-generator/url`, `/qr-code-generator/wifi`, `/qr-code-generator/vcard`) with near-identical content. Google treats them as thin content, fails to rank any of them, or ranks them against each other (keyword cannibalization).

**Why it happens:** Developers assume "more pages = more SEO surface area." For a single-tool product, the opposite is often true — a single well-optimized page with differentiated H2 sections outperforms five near-duplicate pages.

**Consequences:** No pages rank well despite significant effort on SEO metadata.

**Prevention:**
1. Default strategy: one primary landing page (`/`) with comprehensive content covering all QR code types, rich FAQ structured data, and full E-E-A-T signals
2. If sub-pages are created (e.g., `/wifi-qr-code-generator`), ensure they have genuinely unique content: different hero copy, different FAQ section, different use-case text — not just a different H1
3. Use canonical tags if sub-pages share content with the main page
4. Target long-tail queries on sub-pages: "free wifi QR code generator for restaurant" not just "wifi qr code generator"
5. Implement FAQ schema (`FAQPage` structured data) on every page — this earns featured snippet real estate for "how to" queries

**Warning signs:** Google Search Console shows multiple pages competing for the same query. Impressions are spread thin across pages with no single page getting clicks.

**Phase:** Foundation/SEO phase. URL structure is hard to change after indexing — decide before launch.

---

### Pitfall 5: Live Preview Causing Layout Shift and Input Lag

**What goes wrong:** Every keystroke in the URL input triggers a QR code regeneration. On slower devices, this causes: (a) visible re-render flicker in the preview, (b) input lag that makes typing feel broken, (c) layout shift as the QR code changes size between versions.

**Why it happens:** QR code generation is synchronous and CPU-bound. A URL that changes from 10 to 200 characters changes the QR version (size in modules), requiring a larger canvas and different layout dimensions.

**Consequences:** Poor mobile UX (the primary audience for quick QR generation). Google's Core Web Vitals penalize Cumulative Layout Shift (CLS) — hurts SEO.

**Prevention:**
1. Debounce the QR regeneration: 200-300ms after the last keystroke before regenerating
2. Reserve a fixed canvas/container size that accommodates the largest expected QR version — do not let the container resize as content changes. Use CSS `aspect-ratio: 1` with a fixed `max-width`
3. If using a web worker for generation (recommended for heavy customization), ensure the worker interface uses `postMessage` with a debounced caller, not one message per keystroke
4. Test on a mid-range Android device (not just a MacBook) — this is where input lag manifests

**Warning signs:** Chrome DevTools Performance panel shows long tasks (>50ms) on every keystroke. Lighthouse CLS score above 0.1.

**Phase:** Core generator phase. Architecture decision (canvas sizing strategy, debounce) must be made when building live preview, not retrofitted.

---

## Moderate Pitfalls

---

### Pitfall 6: Inverted Color QR Codes That Don't Scan

**What goes wrong:** A user sets a white or light foreground on a dark background (inverted color scheme). The QR code looks beautiful but most scanner apps fail to read it. The ISO spec defines QR modules as dark-on-light. While some modern apps handle inversion, many embedded scanners (WhatsApp, WeChat, Instagram camera, bank apps) do not.

**Prevention:**
1. Validate that foreground is always darker than background — compute relative luminance of both colors and reject (or warn) if the contrast ratio is below 3:1 (WCAG AA for graphical objects)
2. Show a warning: "Inverted colors may not scan on all devices. Dark modules on light background is recommended."
3. Do not allow pure white foreground — enforce a minimum darkness threshold
4. Test with at least three scanner apps: iOS native camera, Google Lens, and one bank/payment app

**Warning signs:** User-reported scan failures in comments/support channels. Color picker allows #FFFFFF foreground with no warning.

**Phase:** Customization phase. Add validation alongside color picker implementation.

---

### Pitfall 7: Insufficient Quiet Zone (Margin)

**What goes wrong:** The QR code is generated without adequate quiet zone (white margin around the code). The QR spec requires a minimum 4-module quiet zone on all sides. When users download a PNG and place it on a colored background (e.g., a red business card), the missing quiet zone causes scan failures because the scanner cannot locate the finder patterns.

**Prevention:**
1. Always generate QR codes with at least 4 modules of quiet zone (the library default is often 4, but verify — some libraries default to 1 or 0)
2. Add a UI option for quiet zone size (4, 8 modules) — power users need this for tight-layout designs
3. In the preview, render the QR code on a white/neutral background that visually shows the quiet zone, so users see what they're getting

**Warning signs:** QR library initialized with `margin: 0` or `quietZone: 0`. Printed QR codes placed on non-white backgrounds fail to scan.

**Phase:** Core generator phase. Set correct defaults before any customization features.

---

### Pitfall 8: vCard and WiFi Encoding Bugs

**What goes wrong:** vCard fields containing commas, semicolons, or newlines are not properly escaped per the vCard 3.0/4.0 spec. WiFi credentials with special characters (quotes, backslashes, semicolons) are not escaped per the WiFi QR spec. The resulting QR codes scan but import garbage data into the contact app or fail to connect to the network.

**Specific WiFi encoding rules (HIGH confidence — ZXing spec):**
- SSID and password must escape: `\`, `;`, `"`, `,` with a backslash
- Format: `WIFI:T:WPA;S:<SSID>;P:<password>;;`
- Empty password: omit the `P:` field entirely, do not pass empty string

**Specific vCard rules (HIGH confidence — RFC 6350):**
- Semicolons in name fields must be escaped as `\;`
- Newlines in NOTE or ADR fields must be encoded as `\n` (literal backslash-n)
- Phone numbers should include country code for international use

**Prevention:**
1. Write a dedicated encoding function for each QR content type — do not concatenate strings naively
2. Write unit tests for edge cases: SSID with spaces and quotes, vCard name with hyphen and comma (e.g., "Smith, Jr."), phone number with parentheses
3. Test final QR codes on iOS and Android natively — iOS Contacts and Android contacts handle vCard differently

**Warning signs:** Test QR code with SSID containing a quote character. If it fails to connect, encoding is broken.

**Phase:** Content type implementation phase. Write tests alongside each encoder.

---

### Pitfall 9: PNG Download Produces Low-Resolution Output

**What goes wrong:** The canvas is rendered at 300x300 pixels. The user downloads the PNG and tries to print it at business-card size (2 inches). At 72 PPI effective resolution, the output is 150 DPI — visibly blurry when printed. Professional print requires 300+ DPI.

**Prevention:**
1. Render the QR code at 2x or 3x the display size on a hidden canvas for download: if preview is 300px, download canvas should be 900px (3x) or 1200px (4x)
2. Offer a resolution selector: "Web (600px)", "Print (1200px)", "High-res (2400px)"
3. Document recommended minimum resolution for print on the download button tooltip
4. SVG is the correct answer for print — push users toward SVG for professional use

**Warning signs:** Canvas initialized at the same dimensions as the CSS display size. Download file is under 50KB for a complex QR with logo.

**Phase:** Export/download phase. Build resolution handling before the first PNG download ships.

---

### Pitfall 10: Clipboard Copy Fails in Non-HTTPS or Some Browsers

**What goes wrong:** `navigator.clipboard.writeText()` and `navigator.clipboard.write()` (for image data) require a secure context (HTTPS or localhost). On HTTP-served pages or in certain embedded contexts (iframes without `allow="clipboard-write"`), clipboard access is denied and the copy button silently does nothing.

**For image copy specifically:** `ClipboardItem` with `image/png` is supported in Chrome and Edge but not in Firefox as of 2025. `writeText()` works everywhere on HTTPS.

**Prevention:**
1. Always serve on HTTPS — Vercel/Netlify do this by default
2. Detect clipboard API availability: `if (navigator.clipboard && navigator.clipboard.write)` before attempting
3. Implement a graceful fallback: if clipboard API unavailable, show a modal with the QR as a data URL so the user can right-click and save
4. Do not use the deprecated `document.execCommand('copy')` as a fallback for image data — it does not support binary content
5. Test clipboard copy in Firefox — it will fail for images, succeed for text

**Warning signs:** Copy button has no error handling. `navigator.clipboard` is used without a feature check. Firefox is not in the test matrix.

**Phase:** Export/download phase. Build feature detection in from the start.

---

## Minor Pitfalls

---

### Pitfall 11: Google Core Web Vitals and Script Loading Order

**What goes wrong:** The QR generation library (which can be 50-200KB) is loaded synchronously in `<head>`, blocking First Contentful Paint. Google's page speed score suffers, which harms SEO rankings for competitive "qr code generator" queries.

**Prevention:**
1. Load the QR library with `defer` or `type="module"` — never blocking
2. Show the input form immediately on page load; the QR preview area shows a skeleton/placeholder until the library loads
3. Target Lighthouse score 90+ on mobile — this is achievable with a static site if dependencies are managed carefully
4. Split the library: if using a framework, lazy-import the QR library only when the user interacts with the generator

**Phase:** Foundation phase. Script loading strategy must be set when the HTML structure is first built.

---

### Pitfall 12: Gradient QR Codes That Fail to Scan at Low Contrast Endpoints

**What goes wrong:** A gradient applied across QR modules looks great at the center but the gradient endpoints (corners or edges) may be too light against the background. The finder squares in the corners receive the lightest gradient color — which are the most critical modules for scanner detection.

**Prevention:**
1. Apply gradients to the QR module fill but enforce a minimum luminance difference between the darkest module color and the background at every point in the gradient
2. Keep the three corner finder squares (and their separator rings) in a solid dark color regardless of gradient settings — offer this as a design constraint, not an option
3. After applying gradient, test scan on a real phone, not just browser BarcodeDetector

**Phase:** Customization phase. Validate alongside gradient color picker implementation.

---

### Pitfall 13: Missing `og:image` and Structured Data Hurts SEO Social Sharing

**What goes wrong:** The site has title and description meta tags but no `og:image`. When the URL is shared on social media or in Slack/WhatsApp, no preview image appears. This reduces click-through rate from shared links, reducing organic traffic.

**Prevention:**
1. Create a static `og:image` at 1200x630px showing a sample branded QR code — generate it once and commit it as a static asset
2. Add `og:image`, `og:type`, `og:url`, `og:title`, `og:description` to every page
3. Add `twitter:card: summary_large_image` for Twitter/X previews
4. Add `WebApplication` structured data (JSON-LD) on the main page — this is the correct schema type for a web tool and can earn rich results

**Phase:** Foundation/SEO phase. Add all meta tags when the HTML shell is first built.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core QR generation setup | Wrong quiet zone default (0 or 1 module) | Verify library default, set to 4 explicitly |
| Live preview implementation | Input lag + layout shift on every keystroke | Debounce (200ms) + fixed container size from day one |
| Color/gradient customization | Inverted colors, gradient corners too light to scan | Luminance validation, lock finder squares to dark |
| Logo upload feature | Error correction not forced to H, logo too large | Auto-set H, enforce 20-25% max area |
| Logo URL input | Canvas taint blocks download | Decide upload-only vs. proxy strategy before building |
| WiFi QR type | Unescaped special chars in SSID/password | Dedicated encoder + unit tests |
| vCard QR type | Missing escaping per RFC 6350 | Dedicated encoder + unit tests |
| PNG download | Resolution too low for print | Render at 3-4x on hidden canvas |
| SVG download | Library wraps raster in SVG container | Verify library produces true vector; test in text editor |
| Clipboard copy | Firefox image clipboard failure, HTTP context failure | Feature detect, implement graceful fallback modal |
| SEO page structure | Multiple thin pages cannibalizing each other | Decide URL architecture before launch |
| Script/asset loading | QR library blocking FCP | Use defer/module, skeleton UI |
| Social sharing | Missing og:image kills preview in Slack/WhatsApp | Static og:image asset + full OG tags at foundation |

---

## Sources

All findings are based on:

- ISO/IEC 18004:2015 — QR Code bar code symbology specification (error correction level capacities, quiet zone requirements, module definitions) — HIGH confidence
- HTML Living Standard, Canvas API — CORS-enabled image, canvas taint security model — HIGH confidence, MDN Web Docs reference
- ZXing QR WiFi format specification — WiFi credential encoding rules — HIGH confidence
- RFC 6350 (vCard 4.0) / RFC 2426 (vCard 3.0) — vCard escaping rules — HIGH confidence
- W3C Clipboard API and events specification — `navigator.clipboard.write()` secure context requirement, browser support matrix — HIGH confidence
- Google Search Central — Core Web Vitals (CLS, LCP, INP), structured data for WebApplication schema — HIGH confidence
- WCAG 2.1 — Success Criterion 1.4.11 Non-text Contrast (3:1 minimum for graphical objects) — HIGH confidence
- Training knowledge of QR library ecosystem (qrcode.js, qr-code-styling, node-qrcode) behavior — MEDIUM confidence (library-specific defaults should be verified against current library documentation during implementation)
