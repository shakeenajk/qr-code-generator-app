# Phase 3: Customization - Research

**Researched:** 2026-03-10
**Domain:** qr-code-styling API (gradient, shapes, eyes, logo), WCAG contrast, React file input / drag-and-drop
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Panel placement**
- Customization controls live below the tab form in the same 60% left panel — same column, no layout refactor
- A "Customize" heading visually separates the content tabs section from the customization section
- Controls are organized into labeled sub-sections: Colors, Shapes, Logo — all visible without expansion (no accordion)
- Mobile order: Form → Customization → Preview (content input first, style second, result last)

**Color pickers**
- Each color (foreground dots, background) gets a native color swatch + editable hex text field — two ways to set the value, no extra library
- Defaults: keep Phase 2 values — `#1e293b` dark dots, `#ffffff` white background (no visual change on launch)

**Gradient**
- Toggle + type selector + two color stops pattern:
  - "Enable gradient" toggle — off by default
  - When on: linear / radial type selector + Color Stop 1 (start) + Color Stop 2 (end)
  - Gradient applies to QR dots only (foreground), not background

**Contrast validation (CUST-07)**
- Low-contrast is detected and flagged with an inline warning banner below the color controls — "Low contrast — QR may not scan reliably"
- Non-blocking: QR still renders and updates; user can see the result and decide
- Warning disappears when contrast passes

**Dot shape selector (CUST-04)**
- Visual thumbnail grid — small clickable previews of each shape, selected shape highlighted with blue ring
- All six qr-code-styling dot types offered: `square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`
- Default: `rounded` (Phase 2 current value — no change on launch)

**Eye style selectors (CUST-05, CUST-06)**
- Two separate labeled thumbnail rows: one for corner frame style (outer square), one for pupil style (inner square)
- Frame options: `square`, `extra-rounded`, `dot`
- Pupil options: `square`, `dot`, `extra-rounded`
- Defaults: `extra-rounded` frame + `square` pupil (Phase 2 current values — no change on launch)

**Logo upload (LOGO-01–04)**
- Drag-and-drop zone + click to browse — bordered dashed drop zone with "Drop image or click to upload" label; clicking opens native file picker
- Accepted types: `image/png, image/jpeg, image/svg+xml, image/webp`
- After upload: show small thumbnail + filename + Remove button
- When logo is active: display info note — "Error correction set to H for logo scannability"
- Info note disappears when logo is removed; error correction reverts to previous level
- Logo size capped at 25% of QR area — enforced in code, not exposed as a setting

### Claude's Discretion
- Exact thumbnail grid dimensions and spacing for shape pickers
- Color swatch size and hex field width
- Specific WCAG contrast ratio threshold used for CUST-07 (4.5:1 AA or 3:1 large-text)
- Gradient angle default for linear (45°, 90°, etc.)
- Drag-and-drop hover/active visual states
- Logo drop zone dimensions
- Exact position of info notes and warning banners within sections

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CUST-01 | User can set foreground (dot) color via color picker | `dotsOptions.color` in qr-code-styling update() call; native `<input type="color">` + hex text field pattern |
| CUST-02 | User can set background color via color picker | `backgroundOptions.color` in update() call; same native color input pattern |
| CUST-03 | User can apply a gradient to QR dots (linear or radial) | `dotsOptions.gradient` object with `type`, `rotation`, `colorStops` array — when gradient is set, `color` is ignored |
| CUST-04 | User can choose dot/module shape | `dotsOptions.type` — six valid values confirmed in TypeScript types |
| CUST-05 | User can choose corner eye frame style | `cornersSquareOptions.type` — three valid values for this requirement |
| CUST-06 | User can choose corner eye pupil style | `cornersDotOptions.type` — three valid values for this requirement |
| CUST-07 | Color contrast between fg and bg is validated | WCAG relative luminance formula implemented in pure JS; 4.5:1 AA threshold recommended |
| LOGO-01 | User can upload a local image file to embed | `FileReader.readAsDataURL()` → base64 data URI → passed as `image` option to qr-code-styling |
| LOGO-02 | Logo upload automatically sets error correction to H | `qrOptions.errorCorrectionLevel: "H"` in update() call when logo is active |
| LOGO-03 | Logo size capped at 25% of total QR area | `imageOptions.imageSize: 0.25` — library coefficient, already normalized |
| LOGO-04 | User can remove the uploaded logo | Clear `image` option, restore previous `errorCorrectionLevel`; track pre-logo ECL in state |
</phase_requirements>

---

## Summary

Phase 3 extends the existing `QRGeneratorIsland.tsx` with a customization panel below the tab form. All customization options feed directly into qr-code-styling's `.update()` call — the same method Phase 2 uses for content changes. No new QR library is needed; qr-code-styling@1.9.2 (already installed) has full TypeScript-typed support for colors, gradients, dot shapes, corner eye styles, and logo embedding via the `image` option.

The key integration challenge is correctly merging the customization state into the single `.update()` call alongside data updates. The existing `useDebounce` hook handles the 300ms feel; the same debounce pattern extends naturally to customization option changes. WCAG contrast validation requires about 15 lines of pure math — no library needed.

Logo handling is the most stateful concern: when a logo is loaded via `FileReader`, the data URI goes into qr-code-styling's `image` option, `qrOptions.errorCorrectionLevel` must switch to `"H"`, and the previous ECL value must be stored so it can be restored on logo removal.

**Primary recommendation:** Lift all qr-code-styling options into a single `customOptions` state object in `QRGeneratorIsland.tsx`. Debounce the merged options object (data + customOptions) together so a single `useEffect` calls `.update()` with the complete options snapshot. New sub-components (`ColorSection`, `ShapeSection`, `LogoSection`) are dumb controlled components — state ownership stays in the island.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qr-code-styling | 1.9.2 (installed) | QR rendering with all styling options | Already installed; full gradient/shape/logo API confirmed |
| React | 19.2.4 (installed) | Island state management and rendering | Already installed; controlled-component pattern established |
| Tailwind CSS | 4.2.1 (installed) | Styling thumbnail grids, color pickers, toggles | Already installed; project design tokens established |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| FileReader API | Browser built-in | Convert File object to base64 data URI for qr-code-styling `image` option | Logo upload only |
| `<input type="color">` | Browser built-in | Native OS color picker swatch | CUST-01, CUST-02 — no library needed |
| WCAG contrast formula | Pure JS (~15 lines) | Compute relative luminance and contrast ratio | CUST-07 — no library needed |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="color">` | react-colorful, react-color | Unnecessary bundle weight; native is sufficient for swatch + hex field pattern locked in CONTEXT.md |
| Pure WCAG math | color-contrast, wcag-contrast | ~15 line function covers the need; no npm dep required |
| FileReader API | URL.createObjectURL | createObjectURL returns an object URL (not base64 data URI); qr-code-styling `image` option works with both, but data URI is safer for SVG type (saveAsBlob interplay) |

**Installation:** No new packages needed — all requirements satisfied by installed dependencies and browser APIs.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── QRGeneratorIsland.tsx       # owns ALL state; extend with customOptions state
│   ├── QRPreview.tsx               # unchanged
│   ├── tabs/                       # unchanged
│   └── customize/
│       ├── ColorSection.tsx        # CUST-01, CUST-02, CUST-03, CUST-07
│       ├── ShapeSection.tsx        # CUST-04, CUST-05, CUST-06
│       └── LogoSection.tsx         # LOGO-01, LOGO-02, LOGO-03, LOGO-04
├── hooks/
│   └── useDebounce.ts              # unchanged; reused for customOptions debounce
└── lib/
    ├── qrEncoding.ts               # unchanged
    └── contrastUtils.ts            # WCAG relative luminance + contrast ratio (~15 lines)
```

### Pattern 1: Single Merged Update Call

**What:** All QR options (data + customization) are merged into one `.update()` call inside a single `useEffect`.
**When to use:** Prevents race conditions and double-renders from two separate update effects.

```typescript
// Source: qr-code-styling README + TypeScript types (installed package)
// In QRGeneratorIsland.tsx

type CustomOptions = {
  dotColor: string;
  bgColor: string;
  gradientEnabled: boolean;
  gradientType: "linear" | "radial";
  gradientStop1: string;
  gradientStop2: string;
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  logoSrc: string | null;      // base64 data URI from FileReader
  logoEcl: ErrorCorrectionLevel; // "H" when logo active
  prevEcl: ErrorCorrectionLevel; // stored ECL before logo was added
};

const debouncedContent = useDebounce(rawContent, 300);
const debouncedOptions = useDebounce(customOptions, 300);

useEffect(() => {
  if (!qrCodeRef.current || isEmpty) return;
  const dotsOptions = debouncedOptions.gradientEnabled
    ? {
        type: debouncedOptions.dotType,
        gradient: {
          type: debouncedOptions.gradientType,
          rotation: 0,
          colorStops: [
            { offset: 0, color: debouncedOptions.gradientStop1 },
            { offset: 1, color: debouncedOptions.gradientStop2 },
          ],
        },
      }
    : { type: debouncedOptions.dotType, color: debouncedOptions.dotColor };

  qrCodeRef.current.update({
    data: debouncedContent,
    dotsOptions,
    backgroundOptions: { color: debouncedOptions.bgColor },
    cornersSquareOptions: { type: debouncedOptions.cornerSquareType },
    cornersDotOptions: { type: debouncedOptions.cornerDotType },
    image: debouncedOptions.logoSrc ?? undefined,
    imageOptions: debouncedOptions.logoSrc
      ? { imageSize: 0.25, hideBackgroundDots: true, margin: 4 }
      : { imageSize: 0.25 },
    qrOptions: {
      errorCorrectionLevel: debouncedOptions.logoSrc
        ? "H"
        : debouncedOptions.prevEcl,
    },
  });
}, [debouncedContent, debouncedOptions, isEmpty]);
```

### Pattern 2: Native Color Swatch + Hex Field

**What:** `<input type="color">` and `<input type="text">` share the same value; syncing both ways.
**When to use:** CUST-01 and CUST-02 locked pattern.

```typescript
// Source: MDN HTML input type="color" specification (browser built-in)
function ColorPicker({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value); // "#rrggbb" format from native picker
  };
  const handleHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };
  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-gray-700">{label}</span>
      <input type="color" value={value} onChange={handleColorInput}
        className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
      <input type="text" value={value} onChange={handleHexInput}
        maxLength={7}
        className="w-24 font-mono text-sm border border-gray-200 rounded px-2 py-1
                   focus:ring-2 focus:ring-blue-600 focus:outline-none" />
    </label>
  );
}
```

### Pattern 3: WCAG Relative Luminance Contrast Check

**What:** Pure-JS WCAG 2.1 contrast ratio computation.
**When to use:** CUST-07 — no library needed.

```typescript
// Source: WCAG 2.1 specification §1.4.3 (official W3C formula)
// File: src/lib/contrastUtils.ts

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(...hexToRgb(hex1));
  const l2 = relativeLuminance(...hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLowContrast(fgHex: string, bgHex: string): boolean {
  return contrastRatio(fgHex, bgHex) < 4.5; // WCAG AA normal text threshold
}
```

**Discretion recommendation:** Use 4.5:1 (WCAG AA normal text). This is the most widely recognized threshold and will catch legitimately bad combinations without over-flagging slightly muted palettes that scan fine.

### Pattern 4: Logo Upload via FileReader

**What:** File input → FileReader.readAsDataURL → base64 URI stored in state → passed to `image` option.
**When to use:** LOGO-01 through LOGO-04.

```typescript
// Source: MDN FileReader API (browser built-in)
function handleFileSelect(file: File) {
  if (!file.type.match(/^image\/(png|jpeg|svg\+xml|webp)$/)) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target?.result as string; // "data:image/png;base64,..."
    setCustomOptions((prev) => ({
      ...prev,
      logoSrc: src,
      prevEcl: prev.logoSrc ? prev.prevEcl : prev.logoEcl, // only capture once
      logoEcl: "H",
    }));
  };
  reader.readAsDataURL(file);
}

function handleRemoveLogo() {
  setCustomOptions((prev) => ({
    ...prev,
    logoSrc: null,
    logoEcl: prev.prevEcl, // restore
  }));
}
```

### Pattern 5: Drag-and-Drop Zone

**What:** `onDragOver` / `onDrop` on a div + click-through to hidden `<input type="file">`.
**When to use:** LOGO-01 drop zone.

```typescript
// Source: MDN DragEvent API (browser built-in)
const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
};

// The drop zone div:
<div
  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
  onDragLeave={() => setIsDragging(false)}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
    ${isDragging
      ? "border-blue-600 bg-blue-50"
      : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}
>
  Drop image or click to upload
  <input
    ref={fileInputRef}
    type="file"
    accept="image/png,image/jpeg,image/svg+xml,image/webp"
    className="hidden"
    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
  />
</div>
```

### Anti-Patterns to Avoid

- **Passing `color` AND `gradient` simultaneously in `dotsOptions`:** When `gradient` is present, qr-code-styling ignores `color`. Mutually exclude them in the update call — either pass `{ color }` or `{ gradient }`, never both.
- **Two separate `useEffect` hooks for data vs options:** Causes double renders. Use a single debounced effect that merges all options.
- **Using `URL.createObjectURL()` for logo in SVG mode:** Object URLs are revoked on navigation; data URIs are self-contained. Use `FileReader.readAsDataURL()`.
- **Setting `image: ""` (empty string) to clear logo:** qr-code-styling will attempt to load an empty URL. Pass `image: undefined` (not `""`) when logo is removed.
- **Forgetting `cornersDotOptions` (pupil) vs `cornersSquareOptions` (frame):** These are separate options objects. The CONTEXT.md calls them "pupil" and "frame" — map to `cornersDotOptions` and `cornersSquareOptions` respectively.
- **Debouncing color picker separately from other options:** The native `<input type="color">` fires `onChange` on every mouse move during color selection, which can produce many rapid updates. Debounce the whole `customOptions` state, not individual fields.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR gradient rendering | Custom SVG gradient injection | `dotsOptions.gradient` in qr-code-styling | Library handles SVG defs, coordinate systems, radial vs linear correctly |
| Color space conversion for contrast | Custom RGB ↔ hex parser | 4-line `hexToRgb` function | Straightforward; no edge cases beyond hex validation |
| Image embedding in QR | Manual SVG `<image>` injection | `image` option + `imageOptions.imageSize` | Library handles hide-background-dots, scaling coefficients, and centering |
| Error correction level management | Custom ECL calculator | Library's `qrOptions.errorCorrectionLevel` | Library handles the QR data capacity implications automatically |
| File type validation | MIME type whitelist from scratch | `file.type.match()` against known MIME types | Simple regex on the File object's `.type` property is sufficient |

**Key insight:** qr-code-styling's `update()` method accepts the full options object — every customization parameter maps directly to a documented option. This phase is almost entirely UI wiring, not QR algorithm work.

---

## Common Pitfalls

### Pitfall 1: Gradient Removes Color When Toggle Is Disabled

**What goes wrong:** User enables gradient, sets colors, disables gradient — QR dots go black because `color` was never set back.
**Why it happens:** When building the update options object, developer forgets to branch on `gradientEnabled` and always includes `gradient`.
**How to avoid:** Explicitly branch: if `gradientEnabled`, include `gradient` and omit `color`; else include `color` and omit `gradient`. See Pattern 1.
**Warning signs:** QR dots render black after toggling gradient off.

### Pitfall 2: Logo URL Taint (CORS) vs Local File

**What goes wrong:** Developer tries to accept a URL instead of file upload — canvas/SVG gets CORS-tainted.
**Why it happens:** Browser security prevents reading cross-origin images without CORS headers.
**How to avoid:** File upload only (already locked in REQUIREMENTS.md out-of-scope section). FileReader converts local files to data URIs — no network request, no CORS.
**Warning signs:** "Tainted canvas" error in console when trying to export.

### Pitfall 3: Error Correction Level Not Restored on Logo Removal

**What goes wrong:** User adds logo (ECL → H), removes logo — ECL stays at H instead of reverting.
**Why it happens:** Developer clears `logoSrc` but doesn't restore the pre-logo ECL.
**How to avoid:** Store `prevEcl` in state before the first logo is added. Only capture it once (check `logoSrc === null` before storing). On removal, read back `prevEcl`.
**Warning signs:** After logo removal, QR is slightly smaller than before (H has higher density than Q/M/L).

### Pitfall 4: `image: undefined` vs `image: ""` vs No `image` Key

**What goes wrong:** Passing `image: ""` or `image: null` to `.update()` when removing logo causes qr-code-styling to attempt fetching an empty URL.
**Why it happens:** JavaScript falsy is not the same as "omit the key".
**How to avoid:** When logo is removed, pass `image: undefined` in the update call, or use `...(logoSrc ? { image: logoSrc } : {})` spread pattern to omit the key entirely.
**Warning signs:** Console errors about loading an empty image resource.

### Pitfall 5: Color Picker `onChange` Fires on Every Mouse Move

**What goes wrong:** Native `<input type="color">` fires `onChange` continuously during drag, causing many rapid `.update()` calls.
**Why it happens:** Browser fires `input` event on every color change, and React's `onChange` maps to `input`.
**How to avoid:** Debounce the entire `customOptions` state object (300ms, same as content). The existing `useDebounce` hook handles this without modification.
**Warning signs:** Sluggish performance while dragging the color wheel.

### Pitfall 6: cornersSquareOptions vs cornersDotOptions Confusion

**What goes wrong:** Frame style (outer corner box) is accidentally applied to pupil (inner dot), or vice versa.
**Why it happens:** The option names are non-obvious. "Corners square" = outer frame; "corners dot" = inner pupil.
**How to avoid:** Map explicitly in the update call: `cornersSquareOptions: { type: cornerSquareType }` for frame, `cornersDotOptions: { type: cornerDotType }` for pupil.
**Warning signs:** Shape picker changes appear on the wrong element.

---

## Code Examples

### Full Options Type for State

```typescript
// Source: qr-code-styling/lib/types/index.d.ts (installed package)
import type {
  DotType,
  CornerSquareType,
  CornerDotType,
  ErrorCorrectionLevel,
} from "qr-code-styling";

// DotType = "dots" | "rounded" | "classy" | "classy-rounded" | "square" | "extra-rounded"
// CornerSquareType = "dot" | "square" | "extra-rounded" | DotType
// CornerDotType = "dot" | "square" | DotType
// ErrorCorrectionLevel = "L" | "M" | "Q" | "H"
```

### Gradient Object Shape

```typescript
// Source: qr-code-styling/lib/types/index.d.ts (installed package)
type Gradient = {
  type: "linear" | "radial";
  rotation?: number; // radians; 0 = left-to-right, Math.PI/2 = top-to-bottom (45° default = Math.PI/4)
  colorStops: {
    offset: number; // 0 = start, 1 = end
    color: string;  // hex string
  }[];
};
```

**Discretion recommendation:** Default linear gradient rotation = `Math.PI / 4` (45 degrees, top-left to bottom-right) — visually interesting without being jarring.

### imageOptions for Logo

```typescript
// Source: qr-code-styling/lib/types/index.d.ts (installed package)
// imageSize: 0.25 enforces the 25% cap (coefficient of QR area width)
// hideBackgroundDots: true clears dots behind logo for readability
// margin: 4 adds a small white halo around the logo
imageOptions: {
  imageSize: 0.25,
  hideBackgroundDots: true,
  margin: 4,
}
```

### Clearing Logo Image (Correct Pattern)

```typescript
// When logo is removed, omit 'image' key entirely rather than passing undefined/null/""
qrCodeRef.current.update({
  data: debouncedContent,
  // ... other options ...
  ...(logoSrc ? { image: logoSrc } : {}),
  imageOptions: { imageSize: 0.25, hideBackgroundDots: true, margin: 4 },
  qrOptions: { errorCorrectionLevel: logoSrc ? "H" : prevEcl },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate `color` update + gradient update | Single `dotsOptions` with either `color` OR `gradient` | qr-code-styling v1.x design | Must branch in update call |
| `cornersSquareOptions` only for eye styling | `cornersSquareOptions` (frame) + `cornersDotOptions` (pupil) as separate option objects | qr-code-styling v1.5+ | Two separate state fields needed for CUST-05 and CUST-06 |
| `image` as URL string | `image` as data URI (base64) for local files | FileReader API, always supported | Avoids CORS issues; required for local file uploads |

**Deprecated/outdated:**
- `imageOptions.crossOrigin`: Only needed for URL-based images. File upload with data URI makes this irrelevant for this phase.

---

## Open Questions

1. **Gradient rotation control**
   - What we know: Locked decision provides linear/radial toggle + 2 color stops, no rotation input exposed to user
   - What's unclear: What default rotation angle to use for linear gradient
   - Recommendation: Use `Math.PI / 4` (45°) as default — visually appealing diagonal. Store as a constant; can be changed later without API changes.

2. **Color picker hex field validation timing**
   - What we know: Hex field should only trigger update on valid 6-digit hex input
   - What's unclear: Whether to validate on every keystroke or only on blur
   - Recommendation: Validate on `onChange` (per-keystroke) with regex `/^#[0-9a-fA-F]{6}$/` — only call `onChange` parent when valid. This means a partially typed hex won't update the swatch, which is correct behavior.

3. **Shape thumbnail rendering approach**
   - What we know: Locked decision calls for visual thumbnail grid showing each shape
   - What's unclear: Whether to render live mini QR codes or use static SVG path icons
   - Recommendation: Use static inline SVG path icons per shape — they render immediately with no library involvement and look identical to real QR dots. Generating live mini QR instances (one per shape) is technically possible but wastes resources.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test:smoke` (runs `--grep @smoke`) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CUST-01 | Color picker sets foreground dot color | smoke (visual diff) | `npx playwright test --grep CUST-01` | ❌ Wave 0 |
| CUST-02 | Color picker sets background color | smoke (visual diff) | `npx playwright test --grep CUST-02` | ❌ Wave 0 |
| CUST-03 | Gradient toggle + type selector applies gradient | smoke (DOM presence) | `npx playwright test --grep CUST-03` | ❌ Wave 0 |
| CUST-04 | Dot shape selector updates QR | smoke (DOM attribute) | `npx playwright test --grep CUST-04` | ❌ Wave 0 |
| CUST-05 | Corner frame selector updates QR | smoke (DOM attribute) | `npx playwright test --grep CUST-05` | ❌ Wave 0 |
| CUST-06 | Corner pupil selector updates QR | smoke (DOM attribute) | `npx playwright test --grep CUST-06` | ❌ Wave 0 |
| CUST-07 | Low-contrast warning appears/disappears | smoke (element visibility) | `npx playwright test --grep CUST-07` | ❌ Wave 0 |
| LOGO-01 | File upload embeds logo in QR | smoke (element presence) | `npx playwright test --grep LOGO-01` | ❌ Wave 0 |
| LOGO-02 | Logo upload shows ECL notice | smoke (element visibility) | `npx playwright test --grep LOGO-02` | ❌ Wave 0 |
| LOGO-03 | Logo size capped (not directly testable via Playwright) | manual-only | n/a — enforce in code via `imageOptions.imageSize: 0.25` | n/a |
| LOGO-04 | Remove logo reverts ECL notice | smoke (element visibility) | `npx playwright test --grep LOGO-04` | ❌ Wave 0 |

**Note on visual testing:** qr-code-styling renders SVG; Playwright can assert SVG attribute presence for gradient defs and `image` elements. This is more reliable than pixel-diff visual regression for this phase.

### Sampling Rate

- **Per task commit:** `npm run test:smoke`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/customization.spec.ts` — covers CUST-01 through CUST-07, LOGO-01 through LOGO-04 with `@smoke` tag
- [ ] `data-*` selector contract must be defined and added to new components:
  - `data-testid="color-fg"` — foreground color picker container
  - `data-testid="color-bg"` — background color picker container
  - `data-testid="gradient-toggle"` — gradient enable/disable toggle
  - `data-testid="gradient-type"` — linear/radial selector
  - `data-testid="low-contrast-warning"` — warning banner
  - `data-testid="dot-shape-{type}"` — each shape thumbnail button (e.g. `data-testid="dot-shape-rounded"`)
  - `data-testid="corner-frame-{type}"` — each frame thumbnail
  - `data-testid="corner-pupil-{type}"` — each pupil thumbnail
  - `data-testid="logo-dropzone"` — drag-and-drop zone
  - `data-testid="logo-thumbnail"` — shown after upload
  - `data-testid="logo-remove"` — remove button
  - `data-testid="logo-ecl-notice"` — "Error correction set to H" info note

---

## Sources

### Primary (HIGH confidence)
- `node_modules/qr-code-styling/lib/types/index.d.ts` — TypeScript types for all option objects (DotType, CornerSquareType, CornerDotType, Gradient, Options, ErrorCorrectionLevel)
- `node_modules/qr-code-styling/README.md` — full API documentation including gradient structure, imageOptions, update() semantics
- `src/components/QRGeneratorIsland.tsx` — existing Phase 2 implementation; confirmed update() pattern and initial options structure
- WCAG 2.1 specification §1.4.3 (relative luminance algorithm is stable mathematical formula; no version concern)

### Secondary (MEDIUM confidence)
- `playwright.config.ts` — confirmed test runner setup, webServer config on port 4321, smoke test grep pattern
- `tests/generator.spec.ts` — confirmed `data-testid` and `data-tab-panel` selector conventions; `@smoke` embedded in test name pattern

### Tertiary (LOW confidence)
- None — all critical findings verified from installed package source.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified from installed package types and README
- Architecture: HIGH — verified from existing QRGeneratorIsland.tsx code and qr-code-styling API
- Pitfalls: HIGH — derived from library API semantics (gradient/color mutual exclusion, undefined vs empty string) confirmed from TypeScript types
- WCAG formula: HIGH — stable mathematical specification unchanged for 20+ years
- Test patterns: HIGH — verified from existing playwright.config.ts and generator.spec.ts

**Research date:** 2026-03-10
**Valid until:** 2026-09-10 (stable library, 6 months; qr-code-styling is mature)
