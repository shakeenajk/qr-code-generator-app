# Phase 4: Export and Launch - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Add export actions (PNG 3x, SVG, copy to clipboard) to the QR generator, implement system-preference dark mode across the site, and achieve Lighthouse 90+ performance on mobile. No new QR generation capabilities — this phase ships the finished product.

</domain>

<decisions>
## Implementation Decisions

### Export button placement
- Export actions live in the **right panel, below the QR preview** — contextually co-located with the output
- **3 equal-width outlined/ghost buttons in a row**: "Download PNG" | "Download SVG" | "Copy"
- Buttons are **disabled with reduced opacity** when no QR content has been entered (consistent with Phase 2 ghost/placeholder behavior)

### Export button style
- **Outlined/ghost style** — border + text, no fill — QR is the hero, buttons should not compete for attention
- Accent color `#2563EB` (blue-600) on hover/active states, consistent with existing interactive elements

### Clipboard UX
- On **success**: button text changes from "Copy" → "Copied!" for ~2 seconds, then reverts
- On **unsupported browser** (EXPO-04): button text changes from "Copy" → "Copy not supported" briefly, then reverts
- No toast or modal — inline button-state feedback only, consistent across success and failure

### Dark mode scope
- **Site chrome goes dark** (page background, nav, panels, text, borders, form inputs)
- **QR preview container stays light** — white/light background so the QR code remains legible regardless of user's color choices
- **Default QR palette does NOT change** — `#1e293b` dots on `#ffffff` background regardless of OS mode
- Dark mode base background: `#0f172a` (slate-900) — cohesive with the existing dark dot color (#1e293b is slate-800)
- Dark mode triggered by OS/system preference only (`prefers-color-scheme: dark`) — no manual toggle

### Export filename
- Default filename: **`qrcraft-code`** (e.g. `qrcraft-code.png`, `qrcraft-code.svg`)
- Brand-forward — consistent with QRCraft identity

### Claude's Discretion
- Exact dark mode color tokens for secondary surfaces (panels, borders, inputs in dark mode)
- Whether to use Tailwind `dark:` utility classes or CSS custom properties for dark mode
- Lighthouse fix strategy — audit, identify bottlenecks, apply fixes
- 3x PNG implementation detail (temp QRCodeStyling instance at 768×768 vs canvas scaling)
- How long "Copied!" / "Copy not supported" feedback persists (suggest ~2s)

</decisions>

<specifics>
## Specific Ideas

- Export buttons should feel like secondary UI — present but not competing with the QR preview itself
- The site should feel complete and polished in dark mode — not an afterthought

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `QRGeneratorIsland.tsx`: `qrCodeRef` holds the QRCodeStyling instance — export methods call `.download()` and `.getRawData()` on this ref
- `QRPreview.tsx`: Right panel preview container — export buttons render below this in the island
- `useDebounce` hook: Already available, not needed for export buttons but context is useful
- `isEmpty` state in `QRGeneratorIsland.tsx`: Already derived — drives disabled state on export buttons

### Established Patterns
- `qr-code-styling` built-in: `.download({ name: 'qrcraft-code', extension: 'png'|'svg' })` — handles PNG and SVG download directly
- For 3x PNG (EXPO-01): qr-code-styling's type is 'svg' in current instance; 3x download requires a temporary instance at `width: 768, height: 768` with `type: 'canvas'` or using `getRawData` with scaled options
- For clipboard (EXPO-03): `.getRawData('png')` returns Promise<Blob> → `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`
- Accent color `#2563EB` (blue-600): ghost buttons use this for border and text, hover fill
- State blocker: `isEmpty` is already computed in the island — pass as prop to export button group to drive disabled state

### Integration Points
- Export button group is a new component rendered inside `QRGeneratorIsland.tsx`, below the `QRPreview` component
- Dark mode: Tailwind v4 — check existing tailwind config for darkMode setting; apply `dark:` utility classes to Layout.astro, Header.astro, Hero.astro, and island wrapper
- Lighthouse: Production build audit (`npm run build && npm run preview`) — fix identified issues (image optimization, unused CSS, render-blocking resources)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-export-and-launch*
*Context gathered: 2026-03-10*
