# Architecture Patterns

**Domain:** Client-side QR code generator website (QRCraft)
**Researched:** 2026-03-06
**Confidence:** MEDIUM — based on training knowledge of QR generation libraries and browser rendering APIs; web/fetch tools unavailable for live verification

---

## Recommended Architecture

QRCraft is a pure client-side, single-page application with no backend. All QR generation, customization, logo compositing, and export happen in the browser. The architecture has three distinct layers: input collection, render pipeline, and export pipeline.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Input Layer │───>│ Render Layer │───>│ Export Layer  │  │
│  │              │    │              │    │               │  │
│  │ - Content    │    │ - QR Matrix  │    │ - PNG (canvas)│  │
│  │   Form       │    │   Generator  │    │ - SVG (string)│  │
│  │ - Style      │    │ - SVG/Canvas │    │ - Clipboard   │  │
│  │   Controls   │    │   Renderer   │    │               │  │
│  │ - Logo       │    │ - Logo       │    │               │  │
│  │   Upload     │    │   Compositor │    │               │  │
│  └──────────────┘    └──────────────┘    └───────────────┘  │
│                              │                               │
│                     ┌────────▼────────┐                      │
│                     │  Live Preview   │                      │
│                     │  (debounced)    │                      │
│                     └─────────────────┘                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            State Layer (single source of truth)       │   │
│  │  content | style | logo | outputFormat                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| ContentForm | Collects QR data payload: URL, text, WiFi, vCard. Validates per type. | State Layer (writes content) |
| StyleControls | Foreground/background color pickers, gradient toggles, dot shape selector, corner eye style selector | State Layer (writes style) |
| LogoUpload | Accepts image file, validates size/type, stores as data URL or object URL | State Layer (writes logo) |
| AppState | Single reactive state object: content + style + logo + outputFormat | All components read/write |
| QRMatrixGenerator | Calls qr library to produce the raw bit matrix from content string. Pure function, no side effects. | RenderPipeline (provides matrix) |
| RenderPipeline | Orchestrates: matrix → styled SVG/canvas → logo compositing → preview update. Triggered by debounced state change. | QRMatrixGenerator, CanvasRenderer, SVGRenderer, LogoCompositor, LivePreview |
| CanvasRenderer | Draws QR matrix to an off-screen `<canvas>` applying dot shapes, colors, gradients | RenderPipeline |
| SVGRenderer | Builds SVG string/element from QR matrix applying dot shapes, colors, gradients | RenderPipeline |
| LogoCompositor | Overlays logo image centered on canvas or inserts `<image>` tag in SVG. Handles sizing (max ~25% of QR area to preserve scannability). | CanvasRenderer, SVGRenderer |
| LivePreview | Displays current render output (either canvas element or inline SVG). Updates when RenderPipeline emits new output. | RenderPipeline |
| ExportController | On user action: triggers PNG export (canvas.toBlob → download) or SVG export (serialize SVG string → download) or clipboard write. | CanvasRenderer, SVGRenderer, LogoCompositor |
| SEOLayer | Static `<head>` meta tags, JSON-LD structured data, semantic HTML shell. Not a runtime component — baked into HTML. | None at runtime |
| PageShell | Top-level layout: header/logo, hero, generator section, how-it-works, FAQ, footer. Semantic HTML for SEO. | All UI components mount inside this |

---

## Data Flow

### Input → Render (happy path)

```
User types in ContentForm
  → AppState.content updated
  → debounce timer reset (300ms)
  → debounce fires → RenderPipeline.run(state)
    → QRMatrixGenerator.generate(state.content)  // pure: string → matrix
    → CanvasRenderer.draw(matrix, state.style)    // canvas with dot shapes + colors
    → LogoCompositor.apply(canvas, state.logo)    // if logo present
    → LivePreview.update(canvas)                  // swap preview src

User clicks Download PNG
  → ExportController.exportPNG()
    → CanvasRenderer.draw(matrix, state.style, highRes: true)  // 2x or 3x size
    → LogoCompositor.apply(canvas, state.logo)
    → canvas.toBlob('image/png') → link.download trigger

User clicks Download SVG
  → ExportController.exportSVG()
    → SVGRenderer.build(matrix, state.style)      // produces SVG string
    → LogoCompositor.applySVG(svgElement, state.logo)  // embeds <image> with data URL
    → Blob('image/svg+xml') → link.download trigger

User clicks Copy
  → ExportController.copyToClipboard()
    → canvas (already rendered) → canvas.toBlob → ClipboardItem → clipboard.write()
```

### State shape

```typescript
interface AppState {
  content: {
    type: 'url' | 'text' | 'wifi' | 'vcard';
    value: string;           // encoded payload string
    fields: Record<string, string>;  // raw form fields before encoding
  };
  style: {
    dotShape: 'square' | 'rounded' | 'dots' | 'classy';
    eyeShape: 'square' | 'rounded' | 'circle';
    foreground: string;      // hex or gradient descriptor
    background: string;      // hex or transparent
    gradient: {
      enabled: boolean;
      type: 'linear' | 'radial';
      colorStart: string;
      colorEnd: string;
      angle: number;
    };
    errorCorrection: 'L' | 'M' | 'Q' | 'H';  // H required when logo present
  };
  logo: {
    dataUrl: string | null;
    sizeRatio: number;       // 0.2 default, max 0.3
  };
}
```

---

## Rendering Strategy: Canvas vs SVG

**Use dual rendering: SVG for display and PNG export, Canvas for clipboard and PNG fallback.**

The practical split is:

| Purpose | Renderer | Reason |
|---------|----------|--------|
| Live preview | SVG (inline) | Resolution-independent, no blur on HiDPI displays, DOM-inspectable |
| PNG download | Canvas (off-screen) | `canvas.toBlob()` is the standard PNG export path; high-res by rendering at 3x |
| SVG download | SVG string serialization | Direct: build SVG, serialize, Blob download |
| Clipboard | Canvas → `canvas.toBlob()` | `ClipboardItem` with `image/png` blob is the supported API |

Maintain two render paths (SVG builder + Canvas drawer) that share the same matrix and style inputs. Keep them as separate pure functions so either can be called independently.

**Confidence:** HIGH — this split is well-established in open-source QR generators.

---

## Debouncing Strategy

```
ContentForm / StyleControls → onChange
  → clearTimeout(debounceTimer)
  → debounceTimer = setTimeout(runRender, 300ms)
```

- 300ms delay prevents render on every keystroke while typing a URL
- StyleControls (color pickers, shape toggles) can use shorter delay (100ms) since no text is being typed — color picker `input` events fire continuously
- Logo upload triggers immediate render (one-time event, no debounce needed)
- Error correction level change: immediate (single click, not continuous)

**Confidence:** HIGH — standard debounce pattern, values are community convention.

---

## Logo Embedding

### Scannability constraint

QR codes with logos require Error Correction Level H (30% redundancy). The library must be configured to use `H` when `state.logo.dataUrl` is non-null. This is a hard requirement — lower EC levels with a logo center will cause scan failures.

**Confidence:** HIGH — this is a fundamental property of QR error correction.

### Logo sizing

Center logo should occupy at most 25-30% of the QR code's total area. A common formula:

```
logoPixels = qrPixels * sizeRatio    // sizeRatio = 0.2 default
logoX = (qrPixels - logoPixels) / 2
logoY = (qrPixels - logoPixels) / 2
```

### Canvas logo compositing

```
1. Draw QR to canvas (all dots/colors/gradients)
2. Optionally draw white "padding" rectangle centered (slightly larger than logo)
3. Draw logo image centered
```

### SVG logo embedding

```xml
<image
  href="data:image/png;base64,..."
  x="85" y="85"
  width="50" height="50"
  preserveAspectRatio="xMidYMid meet"
/>
```

The `href` must use the logo's data URL (not an object URL) so the SVG is self-contained when downloaded.

---

## Patterns to Follow

### Pattern 1: Pure Matrix Generation

**What:** QR matrix generation is a pure function — same input always produces same output. No side effects, no DOM interaction.

**When:** Always. Keeps the core algorithm testable and portable.

```typescript
// Pure — takes string, returns 2D boolean array
function generateMatrix(content: string, ecLevel: ECLevel): boolean[][] {
  // delegate to qr library
}
```

### Pattern 2: Render Pipeline as Orchestrator

**What:** A single `render(state)` function orchestrates matrix generation → drawing → preview update. Components don't call each other directly.

**When:** Always. Prevents circular dependencies and makes the data flow explicit.

```typescript
async function render(state: AppState): Promise<void> {
  const matrix = generateMatrix(encodeContent(state.content), state.style.errorCorrection);
  const canvas = drawToCanvas(matrix, state.style);
  if (state.logo.dataUrl) {
    await compositeLogoOnCanvas(canvas, state.logo);
  }
  updatePreview(canvas);  // sets img src or swaps canvas element
}
```

### Pattern 3: Content Encoding as Lookup

**What:** Each content type (URL, WiFi, vCard) has a dedicated encoder function that converts form fields to the QR payload string.

**When:** Always. Separates encoding logic from UI.

```typescript
const encoders = {
  url:   (fields) => fields.url,
  text:  (fields) => fields.text,
  wifi:  (fields) => `WIFI:T:${fields.auth};S:${fields.ssid};P:${fields.password};;`,
  vcard: (fields) => `BEGIN:VCARD\nVERSION:3.0\nFN:${fields.name}\n...END:VCARD`,
};
```

### Pattern 4: Self-Contained SVG Export

**What:** SVG export embeds all assets (logo, gradients, fonts) as inline data. The downloaded `.svg` file opens correctly in any viewer without external dependencies.

**When:** Always for the SVG download path.

### Pattern 5: Progressive Enhancement for Clipboard

**What:** Check `navigator.clipboard.write` support before offering the Copy button. Degrade gracefully (hide button or show "not supported" tooltip) on browsers without Clipboard API.

**When:** Always. Safari historically lagged on `ClipboardItem` support.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Rendering Directly in Event Handlers

**What:** Calling the QR render function synchronously inside every `onChange` handler.

**Why bad:** Causes janky UI, blocks the main thread on every keystroke, especially for complex dot shapes with gradients.

**Instead:** Always go through the debounce layer. The render pipeline should only be triggered by the debounce timer firing.

### Anti-Pattern 2: Object URLs in SVG Export

**What:** Using `URL.createObjectURL(logoFile)` as the logo `href` in the exported SVG.

**Why bad:** Object URLs are session-scoped. The downloaded SVG will show a broken image when opened later.

**Instead:** Convert the logo to a data URL immediately on upload (`FileReader.readAsDataURL`). Store the data URL in state. Always use data URLs in SVG export.

### Anti-Pattern 3: Single Renderer for Both Preview and Export

**What:** Using a visible `<canvas>` element as both the live preview and the export source.

**Why bad:** Preview canvas is sized for display (e.g., 300×300). PNG export should be larger (e.g., 1000×1000). Sharing the element requires resizing, which causes a visible flash.

**Instead:** Use an off-screen canvas for export at high resolution. The live preview uses a separate element (SVG for sharpness, or a display-sized canvas).

### Anti-Pattern 4: Allowing Logo Without Forcing EC=H

**What:** Letting users embed a logo without automatically setting error correction to H.

**Why bad:** The QR code will fail to scan in real-world conditions — the logo occludes modules that are not recoverable with lower EC levels.

**Instead:** When `state.logo.dataUrl` is non-null, force `errorCorrection = 'H'` before calling the matrix generator. Optionally surface this to users with a tooltip.

### Anti-Pattern 5: Monolithic Single-File Component

**What:** All form inputs, style controls, preview, and export buttons in one massive component/file.

**Why bad:** Impossible to maintain, hard to add content types later, blocks parallel development of sections.

**Instead:** Follow the component boundary table above. Each section is its own file/component.

---

## SEO Page Structure

The page is a static HTML document. SEO is baked into the HTML shell — not dynamically injected.

### Head section

```html
<title>Free QR Code Generator — Customize & Download Instantly | QRCraft</title>
<meta name="description" content="Create beautiful, custom QR codes in seconds. Customize colors, add your logo, and download as PNG or SVG. Free, no signup required.">
<link rel="canonical" href="https://qrcraft.io/">

<!-- Open Graph -->
<meta property="og:title" content="QRCraft — Free Custom QR Code Generator">
<meta property="og:description" content="...">
<meta property="og:image" content="/og-image.png">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
```

### Structured data (JSON-LD)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "QRCraft",
  "description": "Free custom QR code generator",
  "applicationCategory": "UtilitiesApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "url": "https://qrcraft.io/"
}
</script>
```

### Page section order (semantic HTML)

```
<header>      — site name + nav
<main>
  <section>   — hero: headline + subheadline (H1 here)
  <section>   — generator tool (the interactive app)
  <section>   — how it works (H2, 3 steps with icons)
  <section>   — use cases / feature highlights (H2)
  <section>   — FAQ with schema.org FAQPage markup (H2)
<footer>      — links, legal
```

FAQ section with `FAQPage` structured data is high-value for search: it can generate rich results (expandable Q&A directly in Google).

**Confidence:** MEDIUM — SEO best practices are stable but ranking outcomes depend on competition and Google's current weighting.

---

## Scalability Considerations

| Concern | At launch | If traffic grows | If product grows |
|---------|-----------|-----------------|-----------------|
| QR generation load | Pure client-side, zero server load | No change needed | No change needed |
| File download bandwidth | Static CDN (Vercel/Netlify edge) | CDN handles it automatically | Same |
| Logo storage | Not stored — lives in browser session only | No change | Add server storage only if "saved QR codes" feature added |
| Additional content types | Add encoder function + form fields | No architecture change | Follow Pattern 3 (lookup table) |
| Freemium gating | Not needed now | Wrap style/export features in a feature-flag check | Don't couple to auth yet |
| Analytics | Add script tag | No architecture change | Standard |

---

## Suggested Build Order

Build order is driven by data flow dependencies: nothing can be previewed until rendering works, nothing can be exported until preview works, SEO shell can be built independently.

```
1. AppState definition
   (Everything depends on the state shape — define it first)

2. QRMatrixGenerator
   (Pure function, no UI dependencies — testable immediately)

3. Content encoders (URL, text, WiFi, vCard)
   (Pure functions, depend on nothing)

4. ContentForm UI
   (Depends on: AppState, content encoders)

5. CanvasRenderer (basic square dots, solid color)
   (Depends on: QRMatrixGenerator)

6. LivePreview (basic canvas display)
   (Depends on: CanvasRenderer)
   -- At this point: end-to-end URL → QR → preview works --

7. StyleControls (colors, dot shapes, eye styles)
   (Depends on: AppState, CanvasRenderer to extend)

8. SVGRenderer
   (Depends on: QRMatrixGenerator — parallel to CanvasRenderer)

9. LogoUpload + LogoCompositor
   (Depends on: CanvasRenderer, SVGRenderer — extends both)
   -- At this point: full customization + logo works --

10. ExportController (PNG, SVG, clipboard)
    (Depends on: CanvasRenderer, SVGRenderer, LogoCompositor)
    -- At this point: core product is complete --

11. SEO shell (page structure, meta tags, structured data, FAQ)
    (Depends on: nothing runtime — can be done in parallel with 1-10)

12. PageShell polish (how-it-works section, feature highlights, footer)
    (Depends on: SEO shell)
```

**Critical path:** 1 → 2 → 5 → 6 gets you a working prototype. Everything else is incremental.

---

## Sources

- Confidence levels reflect reasoning from training knowledge (cutoff August 2025); web search tools were unavailable during this research session.
- QR error correction and logo scannability: ISO/IEC 18004 standard behavior — HIGH confidence.
- Canvas export pattern (`toBlob` → download): Browser API — HIGH confidence.
- Clipboard API (`ClipboardItem`) browser support caveats: MEDIUM confidence — verify current Safari support before shipping.
- SEO structured data recommendations: schema.org WebApplication and FAQPage — MEDIUM confidence.
- Debounce timing values (100ms, 300ms): convention, not specification — LOW confidence, tune by feel.
