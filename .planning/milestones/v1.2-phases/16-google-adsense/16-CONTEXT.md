# Phase 16: Google AdSense - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a single Google AdSense ad unit to the generator page, visible only to signed-in free-tier users. No ads for Starter/Pro users, anonymous visitors, or the QR redirect path. Lighthouse mobile performance must remain >= 90.

</domain>

<decisions>
## Implementation Decisions

### Ad Placement and Layout
- **D-01:** Claude's Discretion — ad placement on generator page. Recommended: below export buttons (PNG/SVG/Copy), before footer. Naturally below the fold, doesn't interrupt the generate-customize-export flow.
- **D-02:** Claude's Discretion — ad format. Recommended: responsive horizontal display ad (leaderboard style). Predictable height, unobtrusive.
- **D-03:** Claude's Discretion — ad labeling. Follow AdSense TOS requirements (typically small "Advertisement" disclosure text).

### Loading Strategy
- **D-04:** Claude's Discretion — script loading approach. Recommended: delayed injection (load AdSense script only after user interaction — click/scroll/type). Zero impact on initial Lighthouse metrics.
- **D-05:** Claude's Discretion — layout shift prevention. Recommended: fixed min-height placeholder (e.g. 90px) when ad container is rendered, to prevent CLS.

### Tier Gating Behavior
- **D-06:** Claude's Discretion — loading state behavior. Recommended: render nothing until `userTier` resolves. Once confirmed as `"free"`, inject the ad container. No flash of ad for paid users, no placeholder visible to non-free users.
- **D-07:** Claude's Discretion — page scope. Recommended: generator page only per ADS-01 requirement. Single integration point.

### Claude's Discretion
All seven decisions above are at Claude's discretion. The user trusts Claude to make the best technical and UX choices. Key constraints:
- Lighthouse mobile >= 90 is non-negotiable
- No ads on `/r/[slug]` redirect path (PROJECT.md constraint)
- `userTier` is already available in `QRGeneratorIsland.tsx` — reuse existing state
- AdSense script must not load for users who won't see ads (no wasted bandwidth)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above.

### Existing Code
- `src/components/QRGeneratorIsland.tsx` — Main generator island; `userTier` state, `isSignedIn` state, tier-gating patterns
- `src/pages/index.astro` — Generator page layout; where ad component would be placed
- `src/lib/tierLimits.ts` — Tier limit constants and types (if exists)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `userTier` state in QRGeneratorIsland.tsx — already fetched from Clerk metadata, resolves async from null → "free" | "starter" | "pro"
- `isSignedIn` state — already tracked in QRGeneratorIsland.tsx
- Existing tier-check pattern: `isSignedIn && userTier !== null && userTier !== "pro"` — can be adapted for ad gating

### Established Patterns
- React islands with `client:visible` hydration — ad component should follow this pattern
- Tailwind v4 utility classes for all styling — no CSS modules or styled-components
- No existing ad infrastructure — this is the first ad integration

### Integration Points
- QRGeneratorIsland.tsx exports section — ad component renders inside or adjacent to the island
- index.astro layout — if ad is outside the React island, it could be a separate island or Astro component
- No existing script injection patterns — delayed loading will be a new pattern

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User deferred all implementation choices to Claude's judgment with the constraint of maintaining Lighthouse >= 90.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 16-google-adsense*
*Context gathered: 2026-04-01*
