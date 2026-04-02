---
phase: 14-qr-frames-and-templates
plan: 01
subsystem: ui
tags: [canvas, qr-code-styling, typescript, frames, templates]

# Dependency graph
requires:
  - phase: 12-foundation-improvements
    provides: tierLimits.ts patterns and existing customization state slices
  - phase: 13-seo-and-homepage-content
    provides: useCases.ts data module pattern
provides:
  - FrameType union (8 members) and all frame/config/template TypeScript interfaces
  - FRAMES array with 8 frame definitions including SVG path data for tile icons
  - DEFAULT_CTA_TEXT record with per-frame CTA defaults
  - TEMPLATES array with 16 preset style combos across 4 categories
  - composeQRWithFrame() Canvas 2D composition utility for framed PNG export
affects:
  - 14-02 (FrameSection + TemplateSection UI components import from all 4 files)
  - 14-03 (ExportButtons PNG pipeline calls composeQRWithFrame, QRGeneratorIsland adds FrameSectionState)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canvas 2D post-composition: createImageBitmap(blob) avoids canvas-taint SecurityError"
    - "Data modules: typed const arrays with explicit as const, same pattern as useCases.ts"
    - "Inline SVG paths in data (svgPath string field) — no file imports, no network fetches"

key-files:
  created:
    - src/types/frames.ts
    - src/data/frameData.ts
    - src/data/templateData.ts
    - src/lib/frameComposer.ts
  modified: []

key-decisions:
  - "Canvas composition uses createImageBitmap(blob) not img.src — eliminates canvas-taint SecurityError on export"
  - "Frame SVG silhouettes stored as inline path strings in FrameDefinition.svgPath — no file imports needed"
  - "CornerSquareType 'dot' confirmed valid in qr-code-styling — used in bold-badge and vibrant-purple templates"
  - "composeQRWithFrame returns input blob unchanged when frameType === 'none' — zero overhead on no-frame case"

patterns-established:
  - "Types-first: src/types/ directory established for shared type contracts"
  - "Frame composition: draw background → draw frame shapes → draw QR bitmap on top"
  - "getDimensions() + drawFrame() separation: layout calc separate from rendering logic"

requirements-completed:
  - FRAME-01
  - FRAME-02
  - FRAME-03

# Metrics
duration: 10min
completed: 2026-03-31
---

# Phase 14 Plan 01: QR Frames and Templates Data Layer Summary

**FrameType union, 8 frame definitions with SVG paths, 16 template presets, and Canvas 2D composeQRWithFrame() utility — zero canvas-taint SecurityError by using createImageBitmap() on blob data**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-31T13:00:00Z
- **Completed:** 2026-03-31T13:05:05Z
- **Tasks:** 3
- **Files modified:** 4 (all created new)

## Accomplishments

- Established `src/types/` directory with all Phase 14 TypeScript contracts (FrameType, FrameSectionState, FrameConfig, FrameDefinition, TemplatePreset)
- Defined 8 frame types with inline SVG path data for thumbnail icons and per-frame default CTA text
- Created 16 template presets across 4 categories (Minimal, Bold, Business, Vibrant) with realistic color palettes and shape combos
- Implemented `composeQRWithFrame()` Canvas 2D utility that handles all 8 frame layouts using `createImageBitmap(blob)` to avoid cross-origin canvas-taint issues

## Task Commits

Each task was committed atomically:

1. **Task 1: Type contracts (src/types/frames.ts)** - `ba89f4a` (feat)
2. **Task 2: Frame and template data (frameData.ts + templateData.ts)** - `a998761` (feat)
3. **Task 3: Canvas composition utility (frameComposer.ts)** - `6b20aac` (feat)

## Files Created/Modified

- `src/types/frames.ts` - FrameType union, FrameSectionState, FrameConfig, FrameDefinition, TemplatePreset interfaces
- `src/data/frameData.ts` - FRAMES (8 entries) and DEFAULT_CTA_TEXT record
- `src/data/templateData.ts` - TEMPLATES (16 entries) and TEMPLATE_CATEGORIES across 4 categories
- `src/lib/frameComposer.ts` - composeQRWithFrame() Canvas 2D utility

## Decisions Made

- Canvas composition uses `createImageBitmap(blob)` instead of `new Image(); img.src = url` — the QR PNG blob is a pure data blob, not a cross-origin URL, so no SecurityError can occur even when canvas is later exported
- `composeQRWithFrame` short-circuits and returns the input blob when `frameType === "none"` — zero Canvas overhead on the no-frame case
- `CornerSquareType "dot"` confirmed valid in qr-code-styling (type is `"dot" | "square" | "extra-rounded" | DotType`) — used in `bold-badge` and `vibrant-purple` templates as specified in the plan
- Frame SVG paths stored as inline strings in `FrameDefinition.svgPath` — no file imports, no build-time asset pipeline needed for thumbnail icons

## Deviations from Plan

None - plan executed exactly as written. Minor cleanup: the `drawFrame` switch cases had an inconsistency in the `simple-border` case (original plan code referenced `dims.height` in its fillRect call which was redundant) — fixed to use the simpler `height - ctaH - pad` calculation that matches all other banner cases.

## Issues Encountered

None. TypeScript checked clean (exit 0) across all 4 files on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can import all 4 files immediately: `FrameType`, `FrameDefinition`, `FRAMES`, `DEFAULT_CTA_TEXT`, `TemplatePreset`, `TEMPLATES`, `TEMPLATE_CATEGORIES` are all exported and typed
- Plan 03 can call `composeQRWithFrame(blob, config)` from `src/lib/frameComposer.ts` directly from ExportButtons.tsx
- `FrameSectionState` interface is ready for QRGeneratorIsland state slice addition in Plan 03

---
*Phase: 14-qr-frames-and-templates*
*Completed: 2026-03-31*
