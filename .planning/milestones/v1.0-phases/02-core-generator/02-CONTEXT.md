# Phase 2: Core Generator - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a live QR code generator for all four content types (URL, plain text, WiFi, vCard) — fully automatic, no form submission. The QR preview updates in real time as the user types. Customization (colors, shapes, logo) is Phase 3. Export/download is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Generator layout
- Two-column layout on desktop: form panel left (60%), live QR preview right (40%)
- Preview panel is sticky — stays visible as user scrolls through longer forms (WiFi, vCard)
- QR preview renders at 256×256px
- Mobile: columns collapse to stacked — form on top, preview below

### Content-type tabs
- Horizontal tab bar above the form — all four types visible simultaneously: URL | Text | WiFi | vCard
- Default tab: URL (Claude's call — most common use case)
- Tab state is preserved: switching URL → WiFi → URL restores all previously entered values (CONT-05)
- URL tab: soft validation — warning shown if input doesn't look like a URL, but QR still generates; no hard blocking

### WiFi form fields
- Fields: SSID (network name), Password, Security type (dropdown: WPA/WPA2, WEP, None)
- Password field has a show/hide toggle (eye icon)
- All three fields included — no hidden network toggle in Phase 2

### vCard form fields
- Fields: Name (required), Phone (optional), Email (optional), Organization (optional)
- Name is the only required field — QR generates with whatever subset is filled
- Field order: Name → Phone → Email → Organization

### Generation trigger
- Fully automatic — QR updates on debounce (300ms after user stops typing)
- No manual Generate button in the form
- Download capability expected by user — confirmed as Phase 4 scope (EXPO-01, EXPO-02, EXPO-03)

### Placeholder / empty state
- Empty preview shows a faded/ghost QR pattern (muted gray, non-interactive) — communicates purpose without a real code
- When user clears all content after generating, preview reverts to the ghost placeholder (PREV-03)
- During debounce window (user still typing): preview pulses at reduced opacity to signal "updating"

### Error handling
- QR generation failure (e.g., content too long): inline error message displayed inside the preview area in place of the QR
- No toast/banner — error is scoped to the preview

### Character limits
- No always-visible character counter
- Warning shown only when content is approaching or exceeds QR encoding capacity
- Over-limit case also produces an inline error in the preview area

### Claude's Discretion
- Default tab selection (URL strongly implied by convention)
- Exact debounce timing (300ms specified in success criteria — use that)
- Placeholder ghost QR exact styling (opacity, pattern complexity)
- Opacity pulse animation specifics (duration, easing)
- Form field placeholder text and labels
- Security type dropdown default value (WPA/WPA2)
- Exact character-count warning threshold

</decisions>

<specifics>
## Specific Ideas

- User expects the generator to feel instant and frictionless — "without submitting a form or pressing a button" is the core UX promise
- Download button anticipated as a natural part of the QR preview area (Phase 4 will add it beneath the preview)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `div#qr-generator-root` in `src/components/Hero.astro`: Phase 2 React island mounts here — DO NOT remove this div
- `src/components/Header.astro`, `Footer.astro`: established layout shell, no changes needed
- Tailwind CSS v4 configured with `@tailwindcss/vite` — all utility classes available

### Established Patterns
- Accent color: `#2563EB` (blue-600) — use for active tab indicator, focused inputs, primary UI elements
- Surfaces: white (`#FFFFFF`) page bg, `#F9FAFB` (gray-50) for card/panel backgrounds, `#E5E7EB` (gray-200) borders
- Body text: `#111827` (gray-900)
- Stack: Astro + React islands + `qr-code-styling` + Tailwind CSS (all installed from Phase 1)
- No backend — all QR generation is client-side

### Integration Points
- React island drops into `#qr-generator-root` via `client:load` directive in Hero.astro
- `qr-code-styling` is already in package.json (installed Phase 1) — use it for QR rendering
- Phase 3 will extend this island with customization controls — design the component to accept a `settings` prop or similar extensible interface

</code_context>

<deferred>
## Deferred Ideas

- Download / export buttons (PNG, SVG, clipboard copy) — Phase 4 (EXPO-01, EXPO-02, EXPO-03)
- Hidden network toggle for WiFi — consider in Phase 3 or later
- Additional vCard fields (URL, Note) — Phase 3 or v2

</deferred>

---

*Phase: 02-core-generator*
*Context gathered: 2026-03-09*
