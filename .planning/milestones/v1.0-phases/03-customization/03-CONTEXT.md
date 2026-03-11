# Phase 3: Customization - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add visual customization controls to the existing QR generator: foreground/background color pickers, gradient configuration, dot shape selection, corner eye style selection, and logo embedding. Every change updates the live preview with the same debounce feel as Phase 2. Export/download remains Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Panel placement
- Customization controls live **below the tab form** in the same 60% left panel — same column, no layout refactor
- A "Customize" heading visually separates the content tabs section from the customization section
- Controls are organized into labeled sub-sections: **Colors**, **Shapes**, **Logo** — all visible without expansion (no accordion)
- Mobile order: Form → Customization → Preview (content input first, style second, result last)

### Color pickers
- Each color (foreground dots, background) gets a **native color swatch + editable hex text field** — two ways to set the value, no extra library
- Defaults: keep Phase 2 values — `#1e293b` dark dots, `#ffffff` white background (no visual change on launch)

### Gradient
- **Toggle + type selector + two color stops** pattern:
  - "Enable gradient" toggle — off by default
  - When on: linear / radial type selector + Color Stop 1 (start) + Color Stop 2 (end)
  - Gradient applies to QR dots only (foreground), not background

### Contrast validation (CUST-07)
- Low-contrast is detected and flagged with an **inline warning banner below the color controls** — "Low contrast — QR may not scan reliably"
- Non-blocking: QR still renders and updates; user can see the result and decide
- Warning disappears when contrast passes

### Dot shape selector (CUST-04)
- **Visual thumbnail grid** — small clickable previews of each shape, selected shape highlighted with blue ring
- All six qr-code-styling dot types offered: `square`, `dots`, `rounded`, `extra-rounded`, `classy`, `classy-rounded`
- Default: `rounded` (Phase 2 current value — no change on launch)

### Eye style selectors (CUST-05, CUST-06)
- **Two separate labeled thumbnail rows**: one for corner frame style (outer square), one for pupil style (inner square)
- Frame options: `square`, `extra-rounded`, `dot`
- Pupil options: `square`, `dot`, `extra-rounded`
- Defaults: `extra-rounded` frame + `square` pupil (Phase 2 current values — no change on launch)

### Logo upload (LOGO-01–04)
- **Drag-and-drop zone + click to browse** — bordered dashed drop zone with "Drop image or click to upload" label; clicking opens native file picker
- Accepted types: `image/png, image/jpeg, image/svg+xml, image/webp`
- After upload: show **small thumbnail + filename + Remove button** — confirms the right image was picked, satisfies LOGO-04
- When logo is active: display a small info note below the uploader — "Error correction set to H for logo scannability" (satisfies LOGO-02 communication)
- Info note disappears when logo is removed; error correction reverts to previous level (LOGO-04 behavior)
- Logo size capped at 25% of QR area (LOGO-03) — enforced in code, not exposed as a setting

### Claude's Discretion
- Exact thumbnail grid dimensions and spacing for shape pickers
- Color swatch size and hex field width
- Specific WCAG contrast ratio threshold used for CUST-07 (4.5:1 AA or 3:1 large-text)
- Gradient angle default for linear (45°, 90°, etc.)
- Drag-and-drop hover/active visual states
- Logo drop zone dimensions
- Exact position of info notes and warning banners within sections

</decisions>

<specifics>
## Specific Ideas

- All changes must trigger live preview update with the same 300ms debounce feel as Phase 2 — the "instant and frictionless" UX promise extends to customization
- No change to the two-column layout (60/40 split, sticky preview) — customization is additive below the existing form

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `QRGeneratorIsland.tsx`: Creates one `QRCodeStyling` instance and calls `.update({ data })`. Phase 3 extends this to also pass `dotsOptions`, `cornersSquareOptions`, `backgroundOptions`, and `imageOptions` to the same `.update()` call.
- `qrInitialOptions` in `QRGeneratorIsland.tsx`: Currently hardcodes `dotsOptions: { type: "rounded", color: "#1e293b" }` and `cornersSquareOptions: { type: "extra-rounded" }`. Phase 3 lifts these into state.
- `QRPreview.tsx`: No changes needed — it just receives `isEmpty` and `isPulsing` props and renders the container.
- `useDebounce` hook (`src/hooks/useDebounce.ts`): Available for debouncing customization settings updates too, or a single debounce on the combined options object.

### Established Patterns
- Accent color `#2563EB` (blue-600): use for selected shape ring highlight, active toggles, focused hex inputs
- Surfaces: `#F9FAFB` gray-50 for panel/card backgrounds, `#E5E7EB` gray-200 borders
- All state lives in `QRGeneratorIsland.tsx` — tab components are dumb controlled components; new customization sub-components should follow the same pattern

### Integration Points
- Phase 3 customization state flows into `qrCodeRef.current.update(options)` alongside data updates — single update call, options merged
- Logo image is passed via `imageOptions.src` in qr-code-styling; `imageOptions.imageSize` controls the 25% cap (`0.25`)
- Error correction level (`qrOptions.errorCorrectionLevel`) switches to `"H"` when logo is active, reverts to previous value on removal — this state needs to be tracked alongside logo state

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-customization*
*Context gathered: 2026-03-10*
