# Phase 1: Foundation - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy a static site with QRCraft branding and complete SEO instrumentation — crawlable and indexable before a single line of generator code is written. Covers brand identity, SVG logo, semantic HTML structure, SEO meta tags, JSON-LD schemas, FAQ section, sitemap.xml, and robots.txt.

</domain>

<decisions>
## Implementation Decisions

### Brand accent color
- Primary accent: `#2563EB` (Tailwind `blue-600`) — clean, neutral, flat blue
- No gradient or tint on the accent itself — solid and consistent

### Background and surfaces
- Page background: `#FFFFFF` (pure white)
- Card/section backgrounds: `#F9FAFB` (Tailwind `gray-50`)
- Borders: `#E5E7EB` (Tailwind `gray-200`)
- Body text: `#111827` (Tailwind `gray-900`)

### Header / nav
- White nav background — no colored bar
- QRCraft logo in blue (`#2563EB`), brand name in dark gray
- Primary CTA button in solid blue with white text

### Claude's Discretion
- SVG logo exact construction (the "Q" from QR dot pattern — letter is established, dot grid approach is open)
- Page layout / section order (hero, features, FAQ, footer)
- FAQ questions and content (target standard QR code generator queries)
- Exact typography scale and font choice
- Tailwind v3 vs v4 (verify stability at build time; fall back to v3.4.x if v4 is unstable)
- Astro v4 vs v5 (use latest stable at project start)

</decisions>

<specifics>
## Specific Ideas

No specific references given — open to standard approaches for layout and FAQ.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- Stack decided: Astro + React islands + qr-code-styling + Tailwind CSS, deployed to Vercel
- All QR generation is client-side (no backend)

### Integration Points
- Phase 1 establishes the Astro project structure that Phase 2+ builds on
- Component slots for generator area should be stubbed (empty placeholder) so Phase 2 can drop in without restructuring layout

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-08*
