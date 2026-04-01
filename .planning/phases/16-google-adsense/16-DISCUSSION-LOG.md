# Phase 16: Google AdSense - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 16-google-adsense
**Areas discussed:** Ad placement and layout, Loading strategy, Tier gating behavior

---

## Ad Placement and Layout

### Q1: Where should the ad unit appear on the generator page?

| Option | Description | Selected |
|--------|-------------|----------|
| Below export buttons (Recommended) | After PNG/SVG/Copy buttons, before footer. Naturally below the fold. | |
| Between preview and customization | Between QR preview and shape/color/logo sections. More visible but interrupts workflow. | |
| Right sidebar on desktop | Dedicated ad column on wide screens, collapses below on mobile. | |
| You decide | Claude picks best placement. | ✓ |

**User's choice:** You decide
**Notes:** User trusts Claude's judgment on placement.

### Q2: What ad format should be used?

| Option | Description | Selected |
|--------|-------------|----------|
| Display ad (horizontal banner) | Standard 728x90 leaderboard or responsive horizontal. Unobtrusive, predictable height. | |
| In-feed/native ad | Blends with page content styling. Harder to control dimensions. | |
| You decide | Claude picks based on layout fit. | ✓ |

**User's choice:** You decide

### Q3: Should the ad unit have a visible label or separator?

| Option | Description | Selected |
|--------|-------------|----------|
| Small 'Advertisement' text above | Clear disclosure, standard practice. Required by AdSense TOS. | |
| You decide | Claude follows AdSense best practices. | ✓ |

**User's choice:** You decide

---

## Loading Strategy

### Q4: How should AdSense script be loaded to protect Lighthouse score?

| Option | Description | Selected |
|--------|-------------|----------|
| Delayed injection (Recommended) | Don't load until user interacts. Zero Lighthouse impact. Ad appears ~1-2s after first interaction. | |
| Intersection Observer lazy-load | Load script when ad container scrolls into viewport. | |
| Async script with low priority | Standard async tag with fetchpriority=low. Simplest but may impact TBT/LCP. | |
| You decide | Claude picks strategy protecting Lighthouse >= 90. | ✓ |

**User's choice:** You decide

### Q5: Should the ad slot reserve space before loading?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed min-height placeholder (Recommended) | Reserve ~90px so page doesn't jump. Good for CLS. | |
| No placeholder — collapse when empty | Simpler but may cause CLS. | |
| You decide | Claude picks based on CLS impact. | ✓ |

**User's choice:** You decide

---

## Tier Gating Behavior

### Q6: What should happen while userTier is loading?

| Option | Description | Selected |
|--------|-------------|----------|
| Render nothing until tier known (Recommended) | No container, no placeholder, no flash. Once tier = 'free', inject ad. | |
| Show placeholder, then show/hide | Reserve space immediately, fill or collapse based on tier. | |
| You decide | Claude picks based on existing userTier async pattern. | ✓ |

**User's choice:** You decide

### Q7: Should the ad show on other pages or only the generator?

| Option | Description | Selected |
|--------|-------------|----------|
| Generator page only (Recommended) | Matches ADS-01. Single integration point. | |
| Generator + use case pages | More ad inventory but expands scope. | |
| You decide | Claude follows phase requirements strictly. | ✓ |

**User's choice:** You decide

---

## Claude's Discretion

All 7 decisions were deferred to Claude. The user trusts Claude to make optimal choices constrained by: Lighthouse >= 90, no ads on redirect path, reuse existing userTier state, and AdSense TOS compliance.

## Deferred Ideas

None — discussion stayed within phase scope.
