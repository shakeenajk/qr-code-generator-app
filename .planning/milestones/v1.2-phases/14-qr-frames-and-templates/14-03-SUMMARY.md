---
plan: 14-03
phase: 14-qr-frames-and-templates
status: complete
started: 2026-03-31
completed: 2026-03-31
tasks_completed: 3
tasks_total: 3
requirements_completed:
  - FRAME-01
  - FRAME-02
  - FRAME-03
one_liner: Wire FrameSection + TemplateSection into QRGeneratorIsland, Canvas frame composition in PNG export, SVG disabled with tooltip when frame active
---

# Plan 14-03: Wiring + Export + Human Checkpoint

## What Was Done

### Task 1: Wire frame/template state into QRGeneratorIsland
- Added `frameType`, `frameText` state slices to QRGeneratorIsland
- Imported and rendered TemplateSection at TOP of Customize panel (per D-07)
- Imported and rendered FrameSection below TemplateSection
- `handleApplyTemplate` applies all 6 fields (frame, dotColor, bgColor, dotType, cornerSquareType, cornerDotType) in one click
- `frameOptions` prop threaded to ExportButtons

### Task 2: Update ExportButtons for frame composition
- PNG export: when frame active, calls `composeQRWithFrame()` via Canvas 2D before download
- Copy PNG: same compose path, result goes to clipboard
- SVG export: disabled with tooltip "SVG export is frameless. Use PNG to include the frame." when frame active
- Loading state with spinner during composition ("Exporting...")

### Task 3: Human verification checkpoint
- User approved with 2 noted gaps (see below)

## Gaps Noted by User

1. **Live frame preview missing** — Frames only render in PNG export, not in the live QR preview on screen. Users expect to see the frame in real-time as they select it.
2. **Frame graphics too plain** — Current frame designs are basic Canvas 2D shapes. Need more visually attractive, detailed frame graphics.

## Key Files

- `src/components/QRGeneratorIsland.tsx` — frame/template state, TemplateSection + FrameSection wiring
- `src/components/ExportButtons.tsx` — PNG compose branch, SVG disabled, Copy compose

## Commits

- `143b64b` feat(14-03): wire frame/template state into QRGeneratorIsland
- `6768e2e` feat(14-03): PNG frame composition + SVG disabled in ExportButtons

## Deviations

None — all CONTEXT.md decisions (D-01 through D-14) honored.
