# Phase 14: QR Frames and Templates - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Decorative frames around QR codes with custom CTA text, correct PNG export of framed QR codes, and preset style templates that apply frame + color + shape in one click. No new content types, no new pages, no server-side changes — purely client-side customization features.

</domain>

<decisions>
## Implementation Decisions

### Frame Styles
- **D-01:** Ship 8-10 frame designs covering key categories: no frame (default), simple border + text, bottom banner, top+bottom text, shopping bag shape, clipboard shape, phone mockup, badge/tag shape
- **D-02:** Frame picker is a visual thumbnail grid (small icons showing frame silhouette), similar to competitor pattern — user clicks a thumbnail to select
- **D-03:** Frame rendering uses Canvas 2D post-composition on top of `getRawData('png')` from qr-code-styling — no new rendering library

### CTA Text
- **D-04:** Each frame has a default CTA text (e.g. "Scan Me", "Order Here") pre-filled when selected
- **D-05:** User can edit the CTA text in-place via an input field that appears in the Frame section when a frame is active
- **D-06:** "No frame" selection hides the CTA text input

### Preset Templates
- **D-07:** Preset template picker placed at the TOP of the customization panel as a "Start from a template" section, before individual settings
- **D-08:** Clicking a template applies frame + color + shape combo in one click
- **D-09:** Template picker UX: Claude's discretion (visual grid, carousel, or cards — choose what fits best)

### Frame Interactions
- **D-10:** Frame color follows QR foreground color automatically — no separate frame color picker
- **D-11:** Logo and frame coexist — both can be active simultaneously (logo in center, frame around outside)
- **D-12:** Frame + logo: ECL stays at H when logo is present (existing behavior unchanged)

### SVG Export
- **D-13:** SVG export behavior with active frame: Claude's discretion (toast notification or disabled button — choose the better UX)
- **D-14:** PNG export must include the frame via Canvas composition

### Claude's Discretion
- Template picker visual design and interaction pattern
- SVG export UX when frame is active (toast vs disabled button)
- Exact frame dimensions and padding ratios
- Number and names of preset templates (12-20 curated presets per research)
- Template categories (e.g. Minimal, Bold, Business, Vibrant)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### QR Rendering
- `src/components/QRGeneratorIsland.tsx` — Main QR generator component, qr-code-styling instance, state management
- `src/components/ExportButtons.tsx` — PNG/SVG/clipboard export pipeline, `getRawData('png')` usage
- `src/components/QRPreview.tsx` — Preview container where qr-code-styling renders

### Customization UI
- `src/components/customize/ShapeSection.tsx` — Existing dot/eye shape picker pattern (grid of clickable tiles)
- `src/components/customize/LogoSection.tsx` — Logo upload section, ECL=H auto-switch

### Research
- `.planning/research/SUMMARY.md` — Frame rendering approach (Canvas 2D), preset template categories, pitfalls
- `.planning/research/FEATURES.md` — Competitor frame patterns, template organization
- `.planning/research/PITFALLS.md` — Canvas taint warning (use data URIs for frame images), SVG export limitation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ShapeSection.tsx` grid pattern — Can be reused for frame picker (clickable tiles with active state)
- `QRGeneratorIsland.tsx` state management — Add `frameType`, `frameText` state slices following existing pattern
- `ExportButtons.tsx` `getRawData('png')` — Entry point for Canvas composition (get QR bitmap, draw frame around it)

### Established Patterns
- Customization sections are React components receiving state + onChange via props from QRGeneratorIsland
- Active selection uses blue ring (`ring-2 ring-blue-500`) on tiles
- Dark mode uses `dark:bg-slate-800` / `dark:text-slate-200` pattern throughout

### Integration Points
- Frame picker component slots into the customization panel (between Logo and Color & Shape, or as its own tab)
- Template picker goes at TOP of customization panel (before any individual sections)
- Export pipeline: intercept PNG export in ExportButtons to compose frame via Canvas before download
- State: `frameType` and `frameText` added to QRGeneratorIsland state, threaded to new FrameSection component

</code_context>

<specifics>
## Specific Ideas

- User shared a competitor screenshot showing ~20 frame thumbnails in a grid with categories (simple borders, decorative shapes like shopping bag, clipboard, mug, phone)
- Frame picker should be a tab-level section (Frame | Logo | Color & Shape pattern from competitor)
- Each frame thumbnail shows a small silhouette/icon of the frame shape

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-qr-frames-and-templates*
*Context gathered: 2026-03-31*
