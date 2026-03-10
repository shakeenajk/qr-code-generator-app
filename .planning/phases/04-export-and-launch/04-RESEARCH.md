# Phase 4: Export and Launch - Research

**Researched:** 2026-03-10
**Domain:** Browser file export, Clipboard API, Tailwind v4 dark mode, Astro Lighthouse performance
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Export actions live in the **right panel, below the QR preview** — contextually co-located with the output
- **3 equal-width outlined/ghost buttons in a row**: "Download PNG" | "Download SVG" | "Copy"
- Buttons are **disabled with reduced opacity** when no QR content has been entered (consistent with Phase 2 ghost/placeholder behavior)
- **Outlined/ghost style** — border + text, no fill — QR is the hero, buttons should not compete for attention
- Accent color `#2563EB` (blue-600) on hover/active states, consistent with existing interactive elements
- On **success**: button text changes from "Copy" → "Copied!" for ~2 seconds, then reverts
- On **unsupported browser** (EXPO-04): button text changes from "Copy" → "Copy not supported" briefly, then reverts
- No toast or modal — inline button-state feedback only, consistent across success and failure
- **Site chrome goes dark** (page background, nav, panels, text, borders, form inputs)
- **QR preview container stays light** — white/light background so the QR code remains legible regardless of user's color choices
- **Default QR palette does NOT change** — `#1e293b` dots on `#ffffff` background regardless of OS mode
- Dark mode base background: `#0f172a` (slate-900)
- Dark mode triggered by OS/system preference only (`prefers-color-scheme: dark`) — no manual toggle
- Default filename: **`qrcraft-code`** (e.g. `qrcraft-code.png`, `qrcraft-code.svg`)

### Claude's Discretion
- Exact dark mode color tokens for secondary surfaces (panels, borders, inputs in dark mode)
- Whether to use Tailwind `dark:` utility classes or CSS custom properties for dark mode
- Lighthouse fix strategy — audit, identify bottlenecks, apply fixes
- 3x PNG implementation detail (temp QRCodeStyling instance at 768×768 vs canvas scaling)
- How long "Copied!" / "Copy not supported" feedback persists (suggest ~2s)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EXPO-01 | User can download the QR code as PNG (3x resolution for print quality) | `qrCodeRef.current.download({ name: 'qrcraft-code', extension: 'png' })` on a temp 768×768 canvas-type instance covers this; temp-instance pattern is the safest approach |
| EXPO-02 | User can download the QR code as true vector SVG (not raster-in-SVG) | `qr-code-styling` SVG type renders native SVG paths/rects via XMLSerializer — confirmed not a raster wrapper |
| EXPO-03 | User can copy the QR code to clipboard as PNG image | `getRawData('png')` returns a `Blob` → `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` |
| EXPO-04 | Clipboard copy shows graceful fallback/message when browser does not support it | Wrap in try/catch; feature-detect `navigator.clipboard?.write`; inline button-state feedback |
| BRAND-04 | Site supports dark mode based on system preference | Tailwind v4 `dark:` classes work via `prefers-color-scheme` with zero config |
| SEO-09 | Page achieves Lighthouse performance score 90+ on mobile | Astro + Tailwind already outputs minimal JS; main risks are `client:load` hydration timing and og-image asset weight |
</phase_requirements>

---

## Summary

Phase 4 ships four export actions and two quality concerns (dark mode, Lighthouse) against the finished QR generator. All implementation paths are confirmed by direct inspection of the installed `qr-code-styling@1.9.2` package and official documentation.

The `qr-code-styling` library's `download()` method handles both PNG and SVG export natively. SVG export is confirmed as true vector output (native `<rect>` and `<path>` elements serialized by `XMLSerializer`, not a canvas-rasterized wrapper). The only nuance is the 3x PNG: the live instance renders at 256×256 (`type: 'svg'`), so a temporary `type: 'canvas'` instance at 768×768 must be created, configured identically, and called to `.download()`.

Clipboard copy uses `navigator.clipboard.write()` which is Baseline 2024 and requires HTTPS. The `image/png` MIME type is broadly supported across Chromium, Firefox, and Safari in secure contexts. The only failure path is non-secure context or an older browser — both caught with a try/catch wrapper that triggers the inline "Copy not supported" feedback.

Tailwind v4 `dark:` utilities work via `prefers-color-scheme` with zero configuration — the existing `@import "tailwindcss"` in `global.css` is sufficient. Dark mode for this phase is a mechanical addition of `dark:` classes to Layout, Header, Hero wrapper, customize panel, and input elements. The QR preview container explicitly does NOT receive dark-mode styles (locked decision).

Lighthouse at 90+ on mobile is achievable for this Astro site. The main risk is the React island hydrated with `client:load`, which forces TBT/LCP impact. Switching to `client:visible` for the generator island would reduce initial JS execution. The og-image (`public/og-image.png`) should be audited — if oversized, it affects LCP. No Google Fonts are used in this project, eliminating a common render-blocking risk.

**Primary recommendation:** Implement exports using the library's native `.download()` and `.getRawData()` APIs. Add dark mode via Tailwind `dark:` classes to layout shell components. Run `npm run build && npm run preview` with Lighthouse DevTools mobile audit to identify the specific bottleneck before applying fixes.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qr-code-styling | 1.9.2 (installed) | PNG/SVG export, clipboard blob | Already in use; `.download()` and `.getRawData()` are its built-in export surface |
| Tailwind CSS | 4.2.1 (installed) | Dark mode via `dark:` classes | `dark:` prefix works out of the box; no config needed for `prefers-color-scheme` |
| Playwright | 1.58.2 (installed) | Automated smoke tests | Established test infrastructure for all prior phases |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `navigator.clipboard` API | Browser native | Copy image blob to clipboard | Already available in secure contexts (HTTPS/localhost); no extra dependency |
| Lighthouse (browser DevTools or CLI) | n/a | Measure mobile performance score | Run against production build (`npm run build && npm run preview`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Temp 768×768 instance for 3x PNG | Canvas `drawImage` scaling | Library-native is more reliable for custom dot shapes/gradients; scaling a 256px canvas introduces blur |
| `dark:` Tailwind classes | CSS custom properties (`--color-bg`) | Custom properties require more setup; `dark:` classes are simpler for layout shell migration and consistent with existing Tailwind usage |

**Installation:**
No new packages needed. All tooling is already installed.

---

## Architecture Patterns

### Recommended Component Structure

```
src/
├── components/
│   ├── ExportButtons.tsx          # New: 3 export buttons, all logic here
│   ├── QRGeneratorIsland.tsx      # Modified: pass qrCodeRef + options to ExportButtons
│   ├── QRPreview.tsx              # Unchanged
│   ├── Header.astro               # Modified: add dark: classes
│   ├── Hero.astro                 # Modified: add dark: classes to wrapper
│   └── Footer.astro               # Modified: add dark: classes
├── layouts/
│   └── Layout.astro               # Modified: <html> or <body> gets dark: base colors
└── styles/
    └── global.css                 # No change needed for dark mode
```

### Pattern 1: 3x PNG Export via Temporary Instance

**What:** Create a throw-away QRCodeStyling instance at 768×768 with `type: 'canvas'`, matching all current options, call `.download()`, then discard it.

**When to use:** Whenever the live preview instance renders at a smaller size or uses `type: 'svg'` (which is the case here — `qrInitialOptions.type = 'svg'`, optimal for preview rendering but not for pixel-accurate PNG export at 3x).

**Example:**
```typescript
// Source: qr-code-styling types + package README pattern
async function downloadPng3x(currentOptions: Partial<Options>) {
  const tempQr = new QRCodeStyling({
    ...currentOptions,
    width: 768,
    height: 768,
    type: 'canvas',
  });
  await tempQr.download({ name: 'qrcraft-code', extension: 'png' });
}
```

**Key constraint:** The temp instance must receive the same `dotsOptions`, `backgroundOptions`, `cornersSquareOptions`, `cornersDotOptions`, `image`, `imageOptions`, and `qrOptions` as the live instance. These come from the island's current state (pass as props or derive from state snapshot).

### Pattern 2: SVG Export via Built-in Download

**What:** Call `.download({ name, extension })` on the live `qrCodeRef` instance.

**When to use:** SVG export can use the live instance directly because `qrCodeRef` is already `type: 'svg'` — no temp instance needed.

**Example:**
```typescript
// Source: qr-code-styling .d.ts — download(options: Partial<DownloadOptions>): Promise<void>
async function downloadSvg() {
  await qrCodeRef.current?.download({ name: 'qrcraft-code', extension: 'svg' });
}
```

**SVG output confirmed:** `getRawData('svg')` serializes the live `<svg>` element via `XMLSerializer`, producing native `<rect>` and `<path>` elements. This is true vector output, not a raster-in-SVG wrapper. (Source: direct inspection of `qr-code-styling.common.js` bundled source — confirmed string `"<?xml version="1.0" standalone="no"?>\r\n" + XMLSerializer.serializeToString(svgElement)`)

### Pattern 3: Clipboard Copy as PNG

**What:** Call `getRawData('png')` on the live instance to get a `Blob`, then write to clipboard.

**When to use:** For the "Copy" button. EXPO-03 and EXPO-04 are both handled by a single try/catch wrapper.

**Example:**
```typescript
// Source: MDN Clipboard.write() + qr-code-styling getRawData() .d.ts
async function copyToClipboard(
  qrRef: React.RefObject<QRCodeStyling | null>,
  onSuccess: () => void,
  onUnsupported: () => void,
) {
  try {
    if (!navigator.clipboard?.write) {
      onUnsupported();
      return;
    }
    const blob = await qrRef.current?.getRawData('png');
    if (!blob) { onUnsupported(); return; }
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob as Blob }),
    ]);
    onSuccess();
  } catch {
    // NotAllowedError (permission denied) or unsupported browser
    onUnsupported();
  }
}
```

**Security note:** `navigator.clipboard.write()` requires a secure context (HTTPS or localhost). Production deploy on Vercel (HTTPS) satisfies this. Local dev on `localhost:4321` also satisfies this.

### Pattern 4: Tailwind v4 Dark Mode

**What:** Apply `dark:` prefix utility classes to layout shell components. No configuration change to `global.css` is needed.

**When to use:** This is the only supported approach for OS-preference-only dark mode in Tailwind v4. The `dark:` prefix generates `@media (prefers-color-scheme: dark)` rules automatically.

**Example (Layout.astro body tag):**
```astro
<!-- Before -->
<body class="bg-white text-gray-900 antialiased">

<!-- After (BRAND-04) -->
<body class="bg-white text-gray-900 antialiased dark:bg-[#0f172a] dark:text-slate-100">
```

**Example (Header.astro):**
```astro
<!-- Before -->
<header class="bg-white border-b border-gray-200 sticky top-0 z-50">

<!-- After -->
<header class="bg-white border-b border-gray-200 sticky top-0 z-50
               dark:bg-slate-900 dark:border-slate-700">
```

**QR preview container exception:** The `QRPreview.tsx` white background (`bg-white`) must NOT receive a `dark:` override — locked decision.

### Pattern 5: Disabled Button State

**What:** Export buttons use the existing `isEmpty` state already computed in `QRGeneratorIsland.tsx`.

**Example:**
```tsx
// ExportButtons.tsx — receives isEmpty prop from island
<button
  data-testid="export-png"
  disabled={isEmpty}
  onClick={handlePngDownload}
  className={`... border border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB] hover:text-white
    disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`}
>
  Download PNG
</button>
```

### Anti-Patterns to Avoid

- **Using the live 256×256 SVG instance for PNG download:** Results in a 256×256 PNG, not 3x. Always use a temp 768×768 canvas instance for EXPO-01.
- **Relying on `document.execCommand('copy')` as the primary path:** It's deprecated and cannot copy images. It is only valid as a text fallback for older browsers, which is out of scope here (EXPO-04 just shows a message).
- **Storing clipboard state as a ref instead of useState:** The "Copied!" / "Copy not supported" UI feedback must be reactive — use `useState` for `copyState: 'idle' | 'copied' | 'unsupported'`.
- **Applying dark mode to the QR preview container:** The QR must remain on a white background. Adding `dark:bg-slate-800` to `QRPreview.tsx` would violate the locked decision and break scannability with light-colored QR palettes.
- **Running Lighthouse against the dev server:** Vite dev server is not minified; always run against `npm run build && npm run preview`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PNG/SVG file download | `<a download>` link with Blob URL | `qrCodeRef.current.download(options)` | Library handles filename, extension, blob creation, and cross-browser `<a>` trigger automatically |
| PNG blob generation | `canvas.toBlob()` + manual canvas draw | `qrCodeRef.current.getRawData('png')` | Library already has the canvas element populated with all dot shapes, gradients, and logo compositing |
| True vector SVG serialization | Walking the DOM manually | `qrCodeRef.current.download({ extension: 'svg' })` | Library serializes its internal SVG element correctly with proper `xmlns`, `viewBox`, and nested shape elements |

**Key insight:** `qr-code-styling` is not just a renderer — it is a full export toolkit. Its `.download()` and `.getRawData()` APIs exist precisely to replace custom blob/file logic. Bypass them only for the 3x PNG use case, which requires a temporary instance (not a workaround — the library supports this pattern).

---

## Common Pitfalls

### Pitfall 1: 3x PNG is blurry because it scaled the canvas

**What goes wrong:** Developer reads the 256×256 canvas from the live instance and scales it to 768×768, producing a blurry rasterized output instead of a crisp 3x render.

**Why it happens:** Misunderstanding that you can "upscale" a canvas. Canvas is a bitmap — you get `768 × 768` pixels of scaled content, not a fresh 768px render of the QR.

**How to avoid:** Always instantiate a new QRCodeStyling at `{ width: 768, height: 768, type: 'canvas' }` with identical data and styling options.

**Warning signs:** PNG download appears blurry when opened in an image viewer at 100%.

### Pitfall 2: SVG download wraps a base64 PNG

**What goes wrong:** If the live instance is `type: 'canvas'` and you call `.download({ extension: 'svg' })`, the library may embed the canvas bitmap as a base64 PNG data URI inside the SVG tag, producing a raster-in-SVG wrapper.

**Why it happens:** `qr-code-styling` generates different SVG based on the instance's `type`. Only `type: 'svg'` instances produce native vector SVG.

**How to avoid:** The live preview instance is already `type: 'svg'` (confirmed in `qrInitialOptions`). Call `.download({ extension: 'svg' })` directly on `qrCodeRef.current`.

**Warning signs:** Downloaded `.svg` contains `<image xlink:href="data:image/png;base64,...` instead of `<rect>` or `<path>` elements.

### Pitfall 3: Clipboard copy fails silently on HTTP

**What goes wrong:** `navigator.clipboard.write()` throws a `NotAllowedError` in a non-HTTPS context. In dev, Vite serves `localhost` which is treated as a secure context — but the staging or preview environment might not be HTTPS.

**Why it happens:** Clipboard write API is gated on secure contexts per spec.

**How to avoid:** Vercel deploys HTTPS by default. For local dev, `localhost` is always secure. Wrap the call in try/catch and surface the "Copy not supported" state.

**Warning signs:** Copy button goes to "Copy not supported" on what looks like a working browser.

### Pitfall 4: Dark mode flicker (FOUC)

**What goes wrong:** On page load, the browser renders with the light theme for a frame before the OS preference is applied, causing a white flash.

**Why it happens:** CSS `@media (prefers-color-scheme: dark)` is resolved synchronously by the browser rendering engine — it does NOT cause FOUC. FOUC only happens with class-based dark mode + JavaScript that runs after paint.

**How to avoid:** Use Tailwind v4's `dark:` prefix (media-based) rather than class-based toggling. No JavaScript needed — the browser applies the correct theme before first paint.

**Warning signs:** Brief white flash visible before dark theme loads. This does NOT happen with the `dark:` media approach.

### Pitfall 5: Lighthouse mobile score below 90 due to React island TBT

**What goes wrong:** The QR generator island uses `client:load`, which means its JavaScript bundle (React + qr-code-styling) is fetched and executed immediately, blocking the main thread during LCP window.

**Why it happens:** `client:load` is Astro's "hydrate immediately" directive. The generator is below the fold on mobile, so the user sees LCP content (the H1 hero text) before the island is needed — but the JS still executes during the load window.

**How to avoid:** Switching `client:load` to `client:visible` on `<QRGeneratorIsland>` in `Hero.astro` defers hydration until the element enters the viewport. On mobile, where the generator is below fold, this directly reduces TBT and improves the Lighthouse score.

**Warning signs:** Lighthouse DevTools shows high "Total Blocking Time" and the waterfall highlights the React bundle as a main-thread-blocking resource.

### Pitfall 6: ExportButtons receives stale qr-code-styling options

**What goes wrong:** The temp 768×768 instance for 3x PNG is created with stale or default options, producing a PNG that doesn't match the current QR preview (wrong colors, shapes, or missing logo).

**Why it happens:** The temp instance must replicate all current options from the island's debounced state. If it reads from a prop that hasn't been updated or uses defaults, the visual output diverges.

**How to avoid:** Pass the current `colorOptions`, `shapeOptions`, and `logoOptions` state as a snapshot to the export function. Build the `dotsOptions` object the same way the update effect does.

---

## Code Examples

Verified patterns from official sources and installed library code:

### Download PNG at 3x (temp instance)

```typescript
// Source: qr-code-styling types (installed) + direct source inspection
import QRCodeStyling from 'qr-code-styling';

async function handlePngDownload(
  colorOptions: ColorSectionState,
  shapeOptions: ShapeSectionState,
  logoOptions: LogoSectionState,
  debouncedContent: string,
) {
  const { dotColor, bgColor, gradientEnabled, gradientType, gradientStop1, gradientStop2 } = colorOptions;
  const { dotType, cornerSquareType, cornerDotType } = shapeOptions;
  const { logoSrc } = logoOptions;

  const dotsOptions = gradientEnabled
    ? { type: dotType, gradient: { type: gradientType, rotation: Math.PI / 4,
        colorStops: [{ offset: 0, color: gradientStop1 }, { offset: 1, color: gradientStop2 }] } }
    : { type: dotType, color: dotColor };

  const tempQr = new QRCodeStyling({
    width: 768,
    height: 768,
    type: 'canvas',
    data: debouncedContent,
    dotsOptions,
    backgroundOptions: { color: bgColor },
    cornersSquareOptions: { type: cornerSquareType },
    cornersDotOptions: { type: cornerDotType },
    ...(logoSrc ? { image: logoSrc } : {}),
    imageOptions: { imageSize: 0.25, hideBackgroundDots: true, margin: 4 },
    qrOptions: { errorCorrectionLevel: logoSrc ? 'H' : 'Q' },
  });

  await tempQr.download({ name: 'qrcraft-code', extension: 'png' });
}
```

### Download SVG (live instance)

```typescript
// Source: qr-code-styling .download() .d.ts
async function handleSvgDownload(qrCodeRef: React.RefObject<QRCodeStyling | null>) {
  await qrCodeRef.current?.download({ name: 'qrcraft-code', extension: 'svg' });
}
```

### Copy to Clipboard

```typescript
// Source: MDN Clipboard.write(), qr-code-styling getRawData() .d.ts
type CopyState = 'idle' | 'copied' | 'unsupported';

async function handleCopy(
  qrCodeRef: React.RefObject<QRCodeStyling | null>,
  setCopyState: (s: CopyState) => void,
) {
  try {
    if (!navigator.clipboard?.write) {
      setCopyState('unsupported');
      setTimeout(() => setCopyState('idle'), 2000);
      return;
    }
    const blob = await qrCodeRef.current?.getRawData('png');
    if (!blob) { setCopyState('unsupported'); setTimeout(() => setCopyState('idle'), 2000); return; }
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob as Blob })]);
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 2000);
  } catch {
    setCopyState('unsupported');
    setTimeout(() => setCopyState('idle'), 2000);
  }
}
```

### Copy Button Label Map

```typescript
const COPY_LABELS: Record<CopyState, string> = {
  idle: 'Copy',
  copied: 'Copied!',
  unsupported: 'Copy not supported',
};
```

### Tailwind v4 Dark Mode — No Config Required

```css
/* global.css — no changes needed. dark: classes work out of the box */
@import "tailwindcss";

@layer base {
  :root {
    --color-brand: #2563EB;
  }
}
```

```astro
<!-- Layout.astro — add dark: tokens to body -->
<body class="bg-white text-gray-900 antialiased dark:bg-[#0f172a] dark:text-slate-100">
```

### Astro client:visible for Lighthouse

```astro
<!-- Hero.astro — change client:load to client:visible -->
<!-- Before: -->
<QRGeneratorIsland client:load />

<!-- After: -->
<QRGeneratorIsland client:visible />
```

`client:visible` uses `IntersectionObserver` to hydrate only when the element enters the viewport. On mobile, where the generator is below the hero text, this eliminates the main-thread block during LCP.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind `darkMode: 'media'` in `tailwind.config.js` | No config — `dark:` works by default via media query | Tailwind v4 (2024) | Simpler; no config file needed |
| `document.execCommand('copy')` for image copy | `navigator.clipboard.write()` with `ClipboardItem` | Clipboard API Baseline 2024 | True async, image/png supported natively |
| `client:load` for all interactive islands | `client:visible` for below-fold islands | Astro best practice | Reduces TBT, improves Lighthouse mobile score |
| Manual canvas blob + `<a download>` | `qrCodeStyling.download(options)` | Library feature | Handles all edge cases including iOS Safari |

**Deprecated/outdated:**
- `darkMode: 'media'` key in `tailwind.config.js`: Tailwind v4 removes this config key entirely.
- `document.execCommand('copy')`: Deprecated. Cannot copy images. Do not use as a fallback path for EXPO-03.
- Extension string argument in `qr-code-styling.download()`: `download('png')` is deprecated; use `download({ extension: 'png' })` object form.

---

## Open Questions

1. **Will `client:visible` cause a perceptible pop-in on desktop?**
   - What we know: `client:visible` uses IntersectionObserver; on desktop the island may be in the viewport on load (generator is the hero section), meaning hydration happens immediately anyway.
   - What's unclear: Whether the desktop user on a large monitor sees the generator before scrolling. If so, `client:visible` behaves identically to `client:load` for them.
   - Recommendation: Use `client:visible` — it cannot be worse than `client:load` and is better for mobile. If Lighthouse mobile score doesn't improve, also audit og-image.png size.

2. **Does the temp 768×768 instance render logos correctly?**
   - What we know: `image` option accepts a data URI; the logo is already stored as a `logoSrc` data URI in state.
   - What's unclear: Whether qr-code-styling renders the logo correctly in a canvas instance that is never appended to the DOM.
   - Recommendation: The library supports server-side rendering with jsdom+canvas, so off-DOM canvas rendering is an intended use case. Confidence is HIGH that it works. Validate with a manual test during implementation.

3. **Does the current og-image.png block Lighthouse LCP?**
   - What we know: `og-image.png` is in `public/` — it's a static asset but only referenced in `<meta property="og:image">`, not rendered in the page body, so it does not affect LCP.
   - What's unclear: Whether there are any other images (favicon.ico, favicon.svg) that affect performance.
   - Recommendation: Run the actual Lighthouse mobile audit first. Identify the real bottleneck before applying fixes. Likely root cause is the React + qr-code-styling JS bundle blocking main thread.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (exists) |
| Quick run command | `npm run build && playwright test --grep @smoke tests/export.spec.ts` |
| Full suite command | `npm run build && npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPO-01 | "Download PNG" button visible and enabled after content entered; disabled when empty | smoke/UI | `playwright test --grep @smoke tests/export.spec.ts` | ❌ Wave 0 |
| EXPO-02 | "Download SVG" button visible and enabled after content entered; disabled when empty | smoke/UI | `playwright test --grep @smoke tests/export.spec.ts` | ❌ Wave 0 |
| EXPO-03 | "Copy" button visible; clipboard write triggered (mock/intercept) | smoke/UI | `playwright test --grep @smoke tests/export.spec.ts` | ❌ Wave 0 |
| EXPO-04 | "Copy" button shows "Copy not supported" when clipboard API unavailable | smoke/UI | `playwright test --grep @smoke tests/export.spec.ts` | ❌ Wave 0 |
| BRAND-04 | Dark mode tokens applied: bg, text, borders on layout shell elements | smoke/UI | `playwright test --grep @smoke tests/export.spec.ts` | ❌ Wave 0 |
| SEO-09 | Lighthouse mobile performance score ≥ 90 | manual audit | `npm run build && npm run preview` then DevTools Lighthouse | manual only |

**SEO-09 rationale for manual-only:** Playwright does not run Lighthouse audits. The Lighthouse CLI requires a running server and produces scores that vary by environment. Manual DevTools audit against the production build (`npm run preview`) is the correct verification method.

### Playwright Test Patterns for Export Phase

**EXPO-01/EXPO-02 (Download buttons):**
Playwright cannot intercept the browser's native file download dialog with full file content verification in a simple smoke test. Instead, test that:
- The button exists with the correct `data-testid`
- The button is disabled (has `disabled` attribute or `aria-disabled`) when input is empty
- The button is enabled after content is entered
- The download is triggered (Playwright's `page.waitForEvent('download')` can confirm a download event fires)

```typescript
// Positive download trigger test
await page.fill('[data-testid="url-input"]', 'https://example.com');
await page.waitForTimeout(400); // debounce
const [download] = await Promise.all([
  page.waitForEvent('download'),
  page.click('[data-testid="export-png"]'),
]);
expect(download.suggestedFilename()).toContain('qrcraft-code');
```

**EXPO-03/EXPO-04 (Clipboard):**
Playwright provides `page.context().grantPermissions(['clipboard-read', 'clipboard-write'])` for Chromium. For EXPO-04, override `navigator.clipboard` in the page context to simulate an unsupported browser:

```typescript
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
});
await page.goto('/');
await page.fill('[data-testid="url-input"]', 'https://example.com');
await page.waitForTimeout(400);
await page.click('[data-testid="export-copy"]');
await expect(page.locator('[data-testid="export-copy"]')).toHaveText('Copy not supported');
```

**BRAND-04 (Dark mode):**
Playwright supports `colorScheme: 'dark'` in browser context:

```typescript
const context = await browser.newContext({ colorScheme: 'dark' });
const page = await context.newPage();
await page.goto('/');
const bodyBg = await page.locator('body').evaluate((el) =>
  window.getComputedStyle(el).backgroundColor
);
// #0f172a = rgb(15, 23, 42)
expect(bodyBg).toBe('rgb(15, 23, 42)');
```

### Sampling Rate
- **Per task commit:** `playwright test --grep @smoke tests/export.spec.ts` (export tests only, fast)
- **Per wave merge:** `npm run build && npm run test` (full suite across all 3 spec files)
- **Phase gate:** Full suite green + manual Lighthouse mobile audit ≥ 90 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/export.spec.ts` — covers EXPO-01, EXPO-02, EXPO-03, EXPO-04, BRAND-04 (new file, Wave 0 stubs)
- [ ] No framework install needed — Playwright already installed and configured

---

## Sources

### Primary (HIGH confidence)
- `node_modules/qr-code-styling/lib/core/QRCodeStyling.d.ts` — `.download()`, `.getRawData()` signatures
- `node_modules/qr-code-styling/lib/types/index.d.ts` — `FileExtension`, `DownloadOptions`, `Options` types
- `node_modules/qr-code-styling/lib/qr-code-styling.common.js` — confirmed SVG serialization via XMLSerializer, confirmed SVG output format (`"<?xml version="1.0" standalone="no"?>..."`)
- https://tailwindcss.com/docs/dark-mode — v4 `dark:` uses `prefers-color-scheme` by default, no config needed
- https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/write — Baseline 2024, requires secure context, `NotAllowedError` is only exception

### Secondary (MEDIUM confidence)
- https://eastondev.com/blog/en/posts/dev/20251202-astro-performance-optimization/ — `client:visible` vs `client:load` Lighthouse impact (corroborated by Astro docs general guidance)
- https://web.dev/blog/baseline-clipboard-item-supports — `ClipboardItem.supports()` is Baseline Newly Available as of March 2025

### Tertiary (LOW confidence — flag for validation)
- Manual Lighthouse mobile score claims of 90+ for Astro sites from blog posts; actual score for THIS site must be measured against its production build

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are installed and inspected locally
- Export API patterns: HIGH — confirmed against installed qr-code-styling types and bundled source
- Dark mode (Tailwind v4): HIGH — confirmed against official Tailwind docs
- Clipboard API: HIGH — MDN Baseline 2024, confirmed browser support for `image/png`
- Lighthouse strategy: MEDIUM — general Astro best practices verified; actual bottleneck unknown until measured
- Test patterns: HIGH — Playwright `colorScheme`, `waitForEvent('download')`, `addInitScript` are all confirmed APIs in Playwright 1.58.2

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (stable libraries; Tailwind docs unlikely to change)
