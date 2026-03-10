---
phase: 02-core-generator
plan: "03"
subsystem: ui
tags: [react, island, qr-code-styling, astro, smoke-tests]
status: complete
---

# Plan 02-03 Summary: QRGeneratorIsland Assembly

## What Was Built

Assembled `QRGeneratorIsland.tsx` from all Phase 2 primitives and wired it into `Hero.astro` via `client:load`. All 57 smoke tests pass (11 foundation + 8 generator × 3 browsers).

## Key Files Created/Modified

### Created
- `src/components/QRGeneratorIsland.tsx` — Main React island with tab state, debounced QR generation, and all four content types

### Modified
- `src/components/Hero.astro` — Added `QRGeneratorIsland` import; replaced placeholder div content with `<QRGeneratorIsland client:load />`
- `src/components/QRPreview.tsx` — Fixed `data-testid="qr-preview"` placement and replaced `border` with `ring-1` for exact 256×256 test sizing

## Deviations from Plan

1. **SSR window access:** `qr-code-styling` accesses `window` during construction. The plan's `useState(() => new QRCodeStyling(...))` pattern triggers during Astro's build-time SSR step even with `client:load`. Fixed by deferring instantiation to `useEffect` (client-only). Semantics preserved: instance still created once.

2. **Strict mode test violation:** Both the QR-generated SVG and the ghost placeholder SVG were nested inside `[data-testid="qr-preview"]`, causing Playwright strict mode violations on `locator('svg, canvas')`. Fixed by moving `data-testid="qr-preview"` to the ref div (which only receives the qr-code-styling SVG), making the placeholder a sibling overlay instead of a nested child.

3. **PREV-02 size off by 2px:** The `border border-gray-100` class reduced content area from 256×256 to 254×254. Replaced with `ring-1 ring-gray-100` (box-shadow based, doesn't affect content dimensions).

## Verification

- `npm run build` exits 0 — no TypeScript errors
- `npm run test:smoke` — 57/57 passed (all 3 browsers)
- Human checkpoint approved — tabs, debounce, ghost placeholder, layout all confirmed working

## Self-Check: PASSED

All must-haves satisfied:
- [x] All 8 generator @smoke tests pass
- [x] All 11 foundation @smoke tests still pass (no regression)
- [x] No TypeScript errors
- [x] QRCodeStyling instance created once (in useEffect, ref pattern)
- [x] All four tab panels always in DOM (hidden class toggle)
- [x] `client:load` directive in Hero.astro
- [x] `id="qr-generator-root"` preserved on outer div
- [x] Human visual checkpoint approved
