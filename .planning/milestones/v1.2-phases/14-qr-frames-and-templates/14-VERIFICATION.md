---
phase: 14-qr-frames-and-templates
verified: 2026-03-31T14:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
gaps:
  - truth: "Live frame preview visible in the QR preview area when a frame is selected"
    status: approved_gap
    reason: "User explicitly approved — frames only render in PNG export, not in the live QR preview canvas. The live QRCodeStyling SVG preview does not include the canvas-composed frame layer."
    artifacts:
      - path: "src/components/QRGeneratorIsland.tsx"
        issue: "No live frame overlay on QRPreview component — frame is applied only at PNG export time in ExportButtons.tsx"
    missing:
      - "A live preview layer (canvas overlay or SVG wrapper) that composites the frame around the QR preview in real time"
    severity: approved_by_user
  - truth: "Frame graphic designs are visually attractive and polished"
    status: approved_gap
    reason: "User explicitly approved — current frame shapes are minimal Canvas 2D primitives (strokeRect, arc, fillRect). They are functional but not visually detailed or designed."
    artifacts:
      - path: "src/lib/frameComposer.ts"
        issue: "Frame drawing uses basic Canvas 2D primitives with no drop shadows, gradients, decorative details, or font variety"
    missing:
      - "Enhanced frame graphics with more visual detail — e.g. rounded corners on banners, icon accents, gradient fills, decorative patterns"
    severity: approved_by_user
human_verification:
  - test: "Download PNG with frame active — verify frame is composited in output"
    expected: "Downloaded PNG includes the selected frame drawn around the QR code with CTA text"
    why_human: "Canvas 2D composition happens at runtime in the browser; cannot inspect output PNG without running the app"
  - test: "SVG disabled tooltip when frame active"
    expected: "Hovering the greyed-out Download SVG button shows 'SVG export is frameless. Use PNG to include the frame.'"
    why_human: "Tooltip is a native title attribute — visual/hover behavior requires browser"
  - test: "Template preset applies all 6 fields simultaneously"
    expected: "Clicking a Vibrant template updates QR dot color, background, dot style, corner style, frame type, and frame text in one click"
    why_human: "Requires observing live QR preview state update in browser"
  - test: "Dark mode — new tiles and cards use dark variants"
    expected: "Frame tiles show dark:border-slate-600/dark:bg-slate-700 inactive state and dark:border-blue-500/dark:bg-blue-900/20 active state"
    why_human: "Dark mode appearance requires visual inspection in browser"
---

# Phase 14: QR Frames and Templates Verification Report

**Phase Goal:** Users can wrap their QR code in a decorative frame with custom CTA text, export the result as a correctly composed PNG, and choose a preset template to quick-start customization
**Verified:** 2026-03-31T14:00:00Z
**Status:** passed (with 2 approved gaps)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | frameComposer.ts exports composeQRWithFrame(qrBlob, frameConfig) returning a Blob | VERIFIED | `src/lib/frameComposer.ts` line 171 — `export async function composeQRWithFrame(qrBlob: Blob, config: FrameConfig): Promise<Blob>` |
| 2 | All 8 frame types defined with default CTA text and Canvas draw logic | VERIFIED | `src/data/frameData.ts` — 8 entries confirmed; `frameComposer.ts` switch handles all 8 cases |
| 3 | All 16 preset templates defined across 4 categories | VERIFIED | `src/data/templateData.ts` — 16 entries across Minimal/Bold/Business/Vibrant confirmed |
| 4 | No canvas-taint SecurityError — SVG silhouettes embedded inline, no network fetch | VERIFIED | `frameComposer.ts` uses `createImageBitmap(qrBlob)` on a Blob, not `img.src`. No `new Image()`, no cross-origin URL load anywhere in the file |
| 5 | FrameSection renders 8 frame tiles in 4-column grid | VERIFIED | `src/components/customize/FrameSection.tsx` — `grid grid-cols-4` class, iterates `FRAMES.map()` (8 entries), `aria-pressed` on each tile |
| 6 | CTA text input appears/hides on frameType !== 'none' | VERIFIED | `FrameSection.tsx` line 75 — `{value.frameType !== "none" && (` gates the CTA input |
| 7 | TemplateSection renders 16 cards under 4 category headings | VERIFIED | `src/components/customize/TemplateSection.tsx` — `TEMPLATE_CATEGORIES.map()` with `TEMPLATES.filter()` per category; `onApply(preset)` fires on click |
| 8 | QRGeneratorIsland wires FrameSection + TemplateSection and threads frameOptions to ExportButtons | VERIFIED | `QRGeneratorIsland.tsx` lines 26-28 (imports), 121-127 (state), 474-495 (handler), 642-680 (JSX + prop pass) |
| 9 | PNG export composes frame when frameType !== 'none' | VERIFIED | `ExportButtons.tsx` lines 82-112 — branches on `frameOptions.frameType === "none"`, calls `composeQRWithFrame()` in frame path |
| 10 | SVG button disabled with tooltip when frame active | VERIFIED | `ExportButtons.tsx` lines 174-176 — `disabled={isEmpty \|\| frameOptions.frameType !== "none"}` and `title={...}` with correct tooltip text |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/frames.ts` | FrameType union, FrameConfig, FrameSectionState, FrameDefinition, TemplatePreset | VERIFIED | All 5 interfaces/types exported; 8-member FrameType union confirmed |
| `src/data/frameData.ts` | FRAMES array (8 entries) + DEFAULT_CTA_TEXT record | VERIFIED | 8 entries: none, simple-border, rounded-border, top-bottom, bottom-banner, badge, shopping-bag, clipboard |
| `src/data/templateData.ts` | TEMPLATES array (16 entries) + TEMPLATE_CATEGORIES | VERIFIED | 16 entries across 4 categories; TEMPLATE_CATEGORIES as const with 4 members |
| `src/lib/frameComposer.ts` | Canvas 2D composition utility exporting composeQRWithFrame | VERIFIED | Substantive implementation: getDimensions(), drawFrame(), composeQRWithFrame() — handles all 8 frame types |
| `src/components/customize/FrameSection.tsx` | 8-tile frame picker + conditional CTA input | VERIFIED | grid-cols-4, aria-pressed, maxLength=30, char counter, dark mode classes, CTA gate |
| `src/components/customize/TemplateSection.tsx` | 16 preset cards in 4 category sections | VERIFIED | ring-2 ring-blue-500 selected state, QRThumbnailIcon with preset colors, onApply fires on click |
| `src/components/QRGeneratorIsland.tsx` | frameOptions state, handleApplyTemplate, TemplateSection first in panel | VERIFIED | TemplateSection rendered before FrameSection at line 642; frameOptions passed to ExportButtons at line 680 |
| `src/components/ExportButtons.tsx` | PNG compose branch + SVG disabled state | VERIFIED | composeQRWithFrame imported and called in both handlePngDownload and handleCopy; Loader2 spinner during compose |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/frameComposer.ts` | `src/types/frames.ts` | `import FrameConfig` | WIRED | Line 1: `import type { FrameConfig, FrameType } from "../types/frames"` |
| `src/data/frameData.ts` | `src/types/frames.ts` | `import FrameType` | WIRED | Line 1: `import type { FrameDefinition, FrameType } from "../types/frames"` |
| `src/components/customize/FrameSection.tsx` | `src/types/frames.ts` | `import FrameSectionState` | WIRED | Line 1: `import type { FrameSectionState, FrameType } from "../../types/frames"` |
| `src/components/customize/TemplateSection.tsx` | `src/data/templateData.ts` | `import TEMPLATES, TEMPLATE_CATEGORIES` | WIRED | Line 2: `import { TEMPLATES, TEMPLATE_CATEGORIES } from "../../data/templateData"` |
| `src/components/QRGeneratorIsland.tsx` | `src/components/customize/FrameSection.tsx` | `import FrameSection` | WIRED | Line 26; rendered at line 647 with value/onChange props |
| `src/components/QRGeneratorIsland.tsx` | `src/components/customize/TemplateSection.tsx` | `import TemplateSection` | WIRED | Line 27; rendered at line 642 with selectedId/onApply props |
| `src/components/ExportButtons.tsx` | `src/lib/frameComposer.ts` | `import composeQRWithFrame` | WIRED | Line 5; called at lines 93 and 133 inside frame-active branches |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `ExportButtons.tsx` PNG path | `frameOptions.frameType/frameText` | `QRGeneratorIsland.tsx` useState + prop | Yes — live state from user interaction | FLOWING |
| `ExportButtons.tsx` compose path | `qrBlob` from `tempQr.getRawData("png")` | QRCodeStyling canvas instance | Yes — real 768x768 QR canvas render | FLOWING |
| `FrameSection.tsx` CTA input | `value.frameText` | `frameOptions` state in QRGeneratorIsland | Yes — controlled input bound to live state | FLOWING |
| `TemplateSection.tsx` cards | `TEMPLATES`, `TEMPLATE_CATEGORIES` | `src/data/templateData.ts` | Yes — static typed data (16 real preset definitions) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| frameComposer exports composeQRWithFrame function | File exists and exports the function | Confirmed at line 171 | PASS |
| FRAMES has exactly 8 entries | `grep -c 'id: "' frameData.ts` | 8 | PASS |
| TEMPLATES has exactly 16 entries | `grep -c 'id: "' templateData.ts` | 16 | PASS |
| TypeScript compiles with zero errors | `npx tsc --noEmit` | Exit 0, no output | PASS |
| All 7 commits verified in git log | `git log --oneline [hashes]` | All 7 hashes present | PASS |
| PNG button shows Loader2 spinner during compose | `grep "Exporting" ExportButtons.tsx` | Line 168: `Exporting…` with Loader2 | PASS |
| SVG tooltip text matches spec | `grep "SVG export is frameless" ExportButtons.tsx` | Line 176 matches exactly | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FRAME-01 | 14-01, 14-02, 14-03 | User can add a decorative frame with custom CTA text | SATISFIED | FrameSection (8 tiles, CTA input) wired into QRGeneratorIsland; frameComposer draws frame on export |
| FRAME-02 | 14-01, 14-03 | Framed QR codes export correctly as PNG (Canvas composition) | SATISFIED | ExportButtons PNG path calls composeQRWithFrame via createImageBitmap(blob) — no canvas-taint risk; SVG disabled with tooltip |
| FRAME-03 | 14-01, 14-02, 14-03 | User can choose from preset style templates | SATISFIED | TemplateSection renders 16 presets across 4 categories; handleApplyTemplate applies frame + dotColor + bgColor + dotType + cornerSquareType in one click |

No orphaned requirements — all FRAME-01, FRAME-02, FRAME-03 IDs appear in plan frontmatter and are marked complete in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/frameComposer.ts` | 67–168 | `case "simple-border"` CTA band: fillText y-coordinate calculation is slightly non-standard (`height - (ctaH + pad) / 2` vs `height - ctaH/2`) | Info | CTA text may appear slightly above center of the banner fill; functional but imprecise geometry |
| Multiple | — | Frame graphics use only Canvas 2D primitives (strokeRect, arc, fillRect) — no drop shadows, gradients, or decorative details | Warning (approved gap) | User-visible: frames look plain. User explicitly approved this gap. |
| `QRGeneratorIsland.tsx` | 647+ | No live frame overlay on QRPreview — frame only visible in PNG export | Warning (approved gap) | User expectation: frames visible in real-time preview. User explicitly approved this gap. |

### Human Verification Required

#### 1. PNG Frame Composition Output

**Test:** Enter a URL (e.g. https://example.com). Select "Simple Border" frame. Click "Download PNG". Open the downloaded file.
**Expected:** The PNG shows the QR code surrounded by a rectangular border with "Scan Me" text in a filled band at the bottom. Canvas dimensions are wider and taller than the base 768x768 QR.
**Why human:** Canvas 2D composition produces a binary PNG file at runtime — cannot inspect pixel output programmatically without running the browser.

#### 2. SVG Disabled Tooltip

**Test:** Select any non-"none" frame. Hover over the greyed-out "Download SVG" button.
**Expected:** Native browser tooltip reads exactly: "SVG export is frameless. Use PNG to include the frame."
**Why human:** Title attribute tooltip requires browser hover interaction.

#### 3. Template One-Click Apply

**Test:** Click the "Ocean Blue" preset in the Vibrant category.
**Expected:** QR dot color updates to #2563eb, background to #eff6ff, dot style to "dots", corner squares to "extra-rounded", frame type to "rounded-border", and CTA text to "Scan Me" — all simultaneously.
**Why human:** Requires observing simultaneous live state updates across 5 different UI areas.

#### 4. Dark Mode Appearance

**Test:** Toggle dark mode. Observe FrameSection tiles and TemplateSection cards.
**Expected:** Inactive frame tiles show dark:border-slate-600/dark:bg-slate-700/dark:text-slate-300. Active tile shows dark:border-blue-500/dark:bg-blue-900/20/dark:text-blue-400.
**Why human:** Dark mode appearance requires visual inspection in browser.

### Gaps Summary

Two gaps were identified and **explicitly approved by the user** before verification. They are documented here for tracking but do not block the phase from passing:

1. **Live frame preview missing** — The frame drawn by `composeQRWithFrame` is a Canvas 2D post-composition step that only runs at export time. The live QR preview uses QRCodeStyling's own SVG renderer, which has no frame layer. Users see the frame only after downloading the PNG. Closure path: add a canvas overlay component on the QR preview area that replicates the frame drawing in real time.

2. **Frame graphics too plain** — The current `drawFrame()` switch cases use minimal Canvas 2D primitives: `strokeRect`, `fillRect`, `arc`, `fillText`. There are no drop shadows, gradient fills, rounded-corner fills, decorative accents, or custom fonts. The output is functional and correctly composed, but visually basic. Closure path: redesign each frame case with richer canvas drawing (gradient backgrounds, shadow effects, icon accents, custom typography weights via font loading with CORS-safe blob approach).

Both gaps are noted in the phase 14-03 SUMMARY under "Gaps Noted by User" and do not prevent FRAME-01, FRAME-02, or FRAME-03 from being considered satisfied at their current acceptance threshold.

---

_Verified: 2026-03-31T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
