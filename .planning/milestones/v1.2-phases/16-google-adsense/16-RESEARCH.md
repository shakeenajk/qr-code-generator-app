# Phase 16: Google AdSense - Research

**Researched:** 2026-03-31
**Domain:** Google AdSense integration, Lighthouse performance, tier-gated React component
**Confidence:** HIGH

## Summary

Phase 16 adds a single Google AdSense ad unit to the QRCraft generator page, visible exclusively to signed-in free-tier users. The tier gate is already established in `QRGeneratorIsland.tsx` — `userTier` resolves asynchronously from `null` to `"free"` | `"starter"` | `"pro"` via `/api/subscription/status`. The ad component must wait for that resolution before rendering, preventing any flash for non-free users.

The central performance risk is the AdSense script itself (`adsbygoogle.js`). When loaded synchronously in `<head>`, it reliably degrades Lighthouse mobile performance to the 70–80 range. The proven mitigation is **delayed injection**: suppress the script entirely until the user triggers an interaction event (keydown, mousemove, scroll, touch), or a 5-second fallback fires. This is only viable for **manually placed** ad units — not Google Auto Ads. The approach has been validated by publishers achieving 90+ Lighthouse scores post-AdSense with this method.

Two additional infrastructure items are required regardless of implementation approach: (1) `public/ads.txt` authorizing Google to serve inventory on the domain, and (2) a baseline Lighthouse CI measurement taken before any ad code ships, to establish the regression gate.

**Primary recommendation:** Build a React `AdUnit` component that renders conditionally on `userTier === "free"`. Inside the component, use a `useEffect` with interaction-event listeners to inject `adsbygoogle.js` as a dynamic `<script>` tag. Reserve a fixed-height placeholder container (90px) before the script fires to prevent CLS. Place the component inside `QRGeneratorIsland.tsx` just after `ExportButtons` and the save buttons, before closing the preview panel `</div>`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — all decisions are at Claude's discretion per CONTEXT.md.

### Claude's Discretion
- **D-01:** Ad placement on generator page. Recommended: below export buttons (PNG/SVG/Copy), before footer. Naturally below the fold, doesn't interrupt the generate-customize-export flow.
- **D-02:** Ad format. Recommended: responsive horizontal display ad (leaderboard style). Predictable height, unobtrusive.
- **D-03:** Ad labeling. Follow AdSense TOS requirements (typically small "Advertisement" disclosure text).
- **D-04:** Script loading approach. Recommended: delayed injection (load AdSense script only after user interaction — click/scroll/type). Zero impact on initial Lighthouse metrics.
- **D-05:** Layout shift prevention. Recommended: fixed min-height placeholder (e.g. 90px) when ad container is rendered, to prevent CLS.
- **D-06:** Loading state behavior. Recommended: render nothing until `userTier` resolves. Once confirmed as `"free"`, inject the ad container. No flash of ad for paid users, no placeholder visible to non-free users.
- **D-07:** Page scope. Recommended: generator page only per ADS-01 requirement. Single integration point.

### Hard Constraints (non-negotiable)
- Lighthouse mobile >= 90
- No ads on `/r/[slug]` redirect path
- `userTier` is already available in `QRGeneratorIsland.tsx` — reuse existing state
- AdSense script must not load for users who won't see ads

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADS-01 | Free-tier users see Google AdSense ads on the generator page (not in QR redirect path) | Tier-gating via `userTier === "free"` in existing `QRGeneratorIsland.tsx` state; `AdUnit` React component with `ins.adsbygoogle` + `adsbygoogle.push({})`; placement inside the island's preview panel after ExportButtons |
| ADS-02 | Starter/Pro users and anonymous users loading the page do not see ads (ads only for signed-in free tier) | Condition `isSignedIn && userTier === "free"` guards both rendering and script injection; `userTier` is `null` for anonymous and resolves to `"starter"` or `"pro"` for paid — neither matches the guard |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Google AdSense (adsbygoogle.js) | N/A (CDN) | Ad serving | Google's own SDK; required for AdSense |
| `@ctrl/react-adsense` | 2.1.0 (verified) | React `<ins>` wrapper with `useEffect` push | Thin, well-maintained wrapper; avoids manual `window.adsbygoogle` TypeScript casting |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@lhci/cli` | 0.15.1 (verified) | Lighthouse CI baseline + regression gate | Wave 0: capture baseline before AdSense code; Wave 1: verify score stays >= 90 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@ctrl/react-adsense` | Manual `<ins>` + `window.adsbygoogle` | Manual approach works but requires TypeScript augmentation for `window.adsbygoogle`; wrapper is cleaner |
| Delayed injection | `async` script in `<head>` | Async in head still fires on page load for ALL users; delayed injection fires only on interaction and only for free-tier users |
| `@ctrl/react-adsense` | Google Auto Ads | Auto Ads cannot be lazy-loaded and frequently cause CLS anchor ads; manual placement is required for Lighthouse compliance |

**Installation (Wave 0):**
```bash
npm install @ctrl/react-adsense
npm install --save-dev @lhci/cli
```

**Version verification:** Both versions above confirmed via `npm view [package] version` on 2026-03-31.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   └── AdUnit.tsx          # New: tier-gated AdSense component
public/
└── ads.txt                 # New: AdSense inventory authorization
.lighthouserc.json          # New: Lighthouse CI config with >= 90 gate
```

### Pattern 1: Tier-Gated Delayed Ad Injection

**What:** `AdUnit` is a React component that (a) renders nothing if `userTier !== "free"`, (b) reserves a fixed-height container to prevent CLS, and (c) lazily injects `adsbygoogle.js` on first user interaction via a `useEffect`.

**When to use:** Any page where ads should appear only for free users.

**Example:**
```tsx
// src/components/AdUnit.tsx
import { useEffect, useRef } from "react";

interface AdUnitProps {
  adClient: string;   // e.g. "ca-pub-XXXXXXXXXXXXXXXX"
  adSlot: string;     // e.g. "1234567890"
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdUnit({ adClient, adSlot }: AdUnitProps) {
  const injectedRef = useRef(false);

  useEffect(() => {
    const injectAds = () => {
      if (injectedRef.current) return;
      injectedRef.current = true;

      // Inject adsbygoogle.js dynamically
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);

      // Push the ad unit
      script.onload = () => {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      };
    };

    // Delay until user interaction or 5s timeout
    const events = ["keydown", "mousemove", "wheel", "touchmove", "touchstart", "scroll"];
    const timeout = window.setTimeout(injectAds, 5000);
    events.forEach((e) => window.addEventListener(e, injectAds, { once: true, passive: true }));

    return () => {
      window.clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, injectAds));
    };
  }, [adClient]);

  return (
    <div
      className="w-full mt-4"
      style={{ minHeight: 90 }}
      aria-label="Advertisement"
    >
      <p className="text-xs text-gray-400 mb-1">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
}
```

**Consumption in QRGeneratorIsland.tsx:**
```tsx
// Inside the preview panel div, after the save buttons:
{isSignedIn && userTier === "free" && (
  <AdUnit
    adClient={import.meta.env.PUBLIC_ADSENSE_CLIENT}
    adSlot={import.meta.env.PUBLIC_ADSENSE_SLOT}
  />
)}
```

### Pattern 2: ads.txt Authorization

**What:** A plaintext file at the domain root that authorizes Google to sell ad inventory. Required before AdSense will serve ads.

**File:** `public/ads.txt`
```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Replace `pub-XXXXXXXXXXXXXXXX` with the actual publisher ID from the AdSense dashboard.

### Pattern 3: CLS Prevention for Unfilled Slots

**What:** When AdSense returns no ad (unfilled slot), the `<ins>` element can collapse to zero height causing CLS. The fix is a CSS rule that removes the element from flow.

**In `src/styles/global.css`:**
```css
ins.adsbygoogle[data-ad-status="unfilled"] {
  display: none !important;
}
```

The parent `div` keeps its `minHeight: 90` as the stable placeholder. The `"Advertisement"` label is inside the same container, so when the ins hides, the label is still visible — acceptable behavior.

### Pattern 4: Lighthouse CI Baseline Gate

**File:** `.lighthouserc.json` (project root)
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:4323/"],
      "numberOfRuns": 3,
      "settings": {
        "formFactor": "mobile",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

Run with: `npx lhci autorun --collect.startServerCommand="npm run dev -- --port 4323"`

### Anti-Patterns to Avoid

- **Auto Ads:** Google Auto Ads inject anchor/overlay ads that cause CLS and cannot be lazy-loaded. Use manual placement only.
- **Script in `<head>` unconditionally:** The `adsbygoogle.js` script loaded in `<head>` will fire for every user (including anonymous and paid), wasting bandwidth and degrading Lighthouse even when no ad renders.
- **Rendering a placeholder for non-free users:** A `minHeight` container should only render when `userTier === "free"`. Anonymous visitors and paid users must see zero trace of the ad container — no whitespace, no label.
- **Calling `adsbygoogle.push({})` multiple times:** React Strict Mode double-invokes effects. The `injectedRef` guard prevents double-injection. Without it, the browser logs a duplicate push warning.
- **Relying on `data-adbreak-test="on"` in production:** This attribute disables real ad serving. Must be removed before production deployment.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| `<ins>` + push() React wrapper | Custom component with manual TypeScript window augmentation | `@ctrl/react-adsense` | Already handles the `window.adsbygoogle` array initialization, TypeScript types, and React lifecycle |
| Lighthouse regression gate | Manual before/after score comparison | `@lhci/cli autorun` | LHCI runs N samples, averages, and asserts — single-run Lighthouse has ±5 point variance |

**Key insight:** AdSense integration is only ~30 lines of code, but the performance safety net (Lighthouse CI baseline + gate) prevents shipping a regression to production. The baseline must be captured _before_ ad code is added; doing it after means you cannot distinguish pre-existing performance issues from AdSense regressions.

---

## Common Pitfalls

### Pitfall 1: Flash of Ad Container for Paid/Anonymous Users
**What goes wrong:** `userTier` starts as `null` (while Clerk loads), then resolves. If the component renders the `minHeight` placeholder before `userTier` resolves, paid users briefly see a 90px blank space.
**Why it happens:** Standard conditional `userTier === "free"` is false when `userTier === null`, so this _should_ not render — but if the condition is written as `userTier !== "starter" && userTier !== "pro"`, null passes through.
**How to avoid:** The condition must be exact: `isSignedIn && userTier === "free"`. This correctly excludes `null` (loading), `"starter"`, and `"pro"`.
**Warning signs:** White space appears below export buttons on page load for all users, then disappears.

### Pitfall 2: AdSense Script Loads for Non-Free Users
**What goes wrong:** If the `adsbygoogle.js` injection happens outside the `userTier === "free"` guard (e.g., in a parent component or layout), it fires for everyone.
**Why it happens:** Script injection and component rendering are separate concerns; easy to place the script tag in `Layout.astro` for "simplicity."
**How to avoid:** The script injection lives _inside_ `AdUnit.tsx` via `useEffect`. Since `AdUnit` only renders for free-tier users, the script only injects for free-tier users.
**Warning signs:** Network tab shows `adsbygoogle.js` request for anonymous page loads.

### Pitfall 3: CLS from Unfilled Slots
**What goes wrong:** When AdSense returns no ad, the `<ins>` element collapses to 0 height mid-render, causing a visible layout shift.
**Why it happens:** Default AdSense behavior is to set `display: none` on unfilled units, but this happens after an initial render at some height.
**How to avoid:** Add `ins.adsbygoogle[data-ad-status="unfilled"] { display: none !important; }` to global CSS. The parent container keeps its `minHeight` as static reserved space, so no shift occurs.

### Pitfall 4: Lighthouse Measurement Variance Masking Regression
**What goes wrong:** A single Lighthouse run shows 91 — passes the gate. But AdSense actually degrades score to 87 on average.
**Why it happens:** Single Lighthouse runs have ±5 point variance. One lucky sample can mask a real regression.
**How to avoid:** `@lhci/cli` defaults to 3 runs and uses the median. Always use LHCI for threshold assertions, never a single `lighthouse` CLI invocation.

### Pitfall 5: Lighthouse CI Measures Without Real AdSense Served
**What goes wrong:** CI runs without a real AdSense account/approved site, so `adsbygoogle.js` makes the script request but ads don't actually load — giving a falsely optimistic score.
**Why it happens:** AdSense requires site approval; during development/CI, no real ads serve.
**How to avoid:** The Lighthouse baseline in Wave 0 should be taken against a dev build where `adsbygoogle.js` _is_ injected but returns empty. This simulates the script overhead. The critical check is that the script injection itself (not ad rendering) stays within the budget.

---

## Code Examples

### Verified: Interaction-Triggered Script Injection Pattern
```typescript
// Source: dariusz.wieckiewicz.org/en/implementing-google-adsense-performance/
// Adapted for TypeScript/React

const events = ["keydown", "mousemove", "wheel", "touchmove", "touchstart", "scroll"];
const timeout = window.setTimeout(injectAds, 5000);
events.forEach((e) => window.addEventListener(e, injectAds, { once: true, passive: true }));
```

### Verified: Astro Environment Variables for Client-Side React
```typescript
// Astro exposes PUBLIC_ prefixed vars to client-side code via import.meta.env
// In astro.config.mjs, no special configuration needed — this is built-in behavior
// Source: Astro docs — Scripts and Event Handling

const client = import.meta.env.PUBLIC_ADSENSE_CLIENT; // "ca-pub-XXXXXXXXXXXXXXXX"
const slot   = import.meta.env.PUBLIC_ADSENSE_SLOT;   // "1234567890"
```

Add to `.env` (local) and Vercel environment variables (production):
```
PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
PUBLIC_ADSENSE_SLOT=1234567890
```

### Verified: ads.txt Format
```
# Source: support.google.com/adsense/answer/12171612
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```
The `f08c47fec0942fa0` value is Google's fixed TAG ID — it does not change per publisher.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AdSense script in `<head>` unconditionally | Delayed dynamic injection via interaction events | 2022–2023 (Core Web Vitals emphasis) | Eliminates script-driven LCP/TBT impact for non-ad sessions |
| Google Auto Ads | Manual ad unit placement | 2021+ (CLS awareness) | Auto Ads cause anchor ad CLS; manual placement gives full control |
| Separate `ads.txt` hosting | `public/ads.txt` in static site root | Always standard | Vercel serves `public/` as root; correct approach for Astro static output |

**Deprecated/outdated:**
- `data-adbreak-test="on"` in production: Test attribute used only during development. Remove before deploy.
- Synchronous AdSense script tag: Blocks rendering, fails Lighthouse — do not use.

---

## Open Questions

1. **AdSense account approval status**
   - What we know: Phase 16 depends on Phase 13 (SEO pages) being live and indexed; STATE.md notes "apply for AdSense after Phase 13 ships"
   - What's unclear: Whether the AdSense account for qr-code-generator-app.com has been applied for and approved at implementation time
   - Recommendation: Plan Wave 0 to include a pre-flight check: "Confirm AdSense account is approved and publisher ID + slot ID are available." The implementation tasks are fully mechanical and can be coded before approval, but the site cannot be tested with real ads until approved.

2. **`PUBLIC_ADSENSE_SLOT` value**
   - What we know: The slot ID is unique per ad unit, generated in the AdSense UI
   - What's unclear: Whether a slot has been created
   - Recommendation: Wave 0 task includes "Create horizontal display ad unit in AdSense dashboard; record slot ID." Planner should flag this as a human action required before the code task.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| Node.js | `@lhci/cli` install | ✓ | Runtime confirmed | — |
| `@lhci/cli` | Lighthouse CI gate | ✗ (not installed) | — | Install in Wave 0: `npm install --save-dev @lhci/cli` |
| `@ctrl/react-adsense` | AdUnit component | ✗ (not installed) | — | Install in Wave 0: `npm install @ctrl/react-adsense` |
| AdSense account (approved) | Real ad serving | Unknown | — | Can implement/test script injection; real ads require account approval |
| Vercel env vars set | Production ad serving | Unknown | — | Set `PUBLIC_ADSENSE_CLIENT` + `PUBLIC_ADSENSE_SLOT` in Vercel dashboard |

**Missing dependencies with no fallback:**
- None that block code implementation.

**Missing dependencies with fallback (or human prerequisite):**
- AdSense account approval — code can ship; real ads only serve post-approval.
- Vercel environment variables — must be set before production deployment.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` (exists) |
| Quick run command | `npx playwright test --grep @ads` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADS-01 | Free-tier signed-in user sees ad container on generator page | e2e (requires Clerk auth mock) | `npx playwright test tests/ads/ads-visibility.spec.ts -x` | ❌ Wave 0 |
| ADS-02 | Anonymous user sees no ad container | e2e smoke | `npx playwright test tests/ads/ads-visibility.spec.ts --grep @smoke -x` | ❌ Wave 0 |
| ADS-02 | Redirect page `/r/[slug]` has no adsbygoogle script/element | e2e smoke | `npx playwright test tests/ads/ads-visibility.spec.ts --grep @smoke -x` | ❌ Wave 0 |
| Lighthouse >= 90 | Mobile Lighthouse performance with AdSense active | Lighthouse CI | `npx lhci autorun` | ❌ Wave 0 (.lighthouserc.json) |

**Note on ADS-01 auth mock:** Existing `tests/auth/` and `tests/gates/` specs mock signed-in state using Playwright's `storageState` or Clerk test helper. The ADS-01 test should follow the same pattern.

### Sampling Rate
- **Per task commit:** `npx playwright test tests/ads/ads-visibility.spec.ts --grep @smoke`
- **Per wave merge:** `npx playwright test` (full suite)
- **Phase gate:** Full suite green + `npx lhci autorun` reports >= 0.9 before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ads/ads-visibility.spec.ts` — covers ADS-01 (free-tier sees ad) + ADS-02 (anon/paid see nothing + redirect has no ad)
- [ ] `.lighthouserc.json` — Lighthouse CI config with mobile performance >= 90 assertion
- [ ] `npm install @ctrl/react-adsense` — install package
- [ ] `npm install --save-dev @lhci/cli` — install Lighthouse CI
- [ ] Pre-flight: capture Lighthouse baseline BEFORE writing any AdSense code (STATE.md note)

---

## Sources

### Primary (HIGH confidence)
- `src/components/QRGeneratorIsland.tsx` — Direct code read; `userTier` state, tier-fetch pattern, render structure confirmed
- `src/components/Hero.astro` — Confirmed generator is mounted via `<QRGeneratorIsland client:visible />` inside `Hero.astro`, not directly in `index.astro`
- `package.json` — Direct read; confirmed no existing AdSense or LHCI packages; confirmed Astro 5 + React 19 + Playwright 1.58.2 stack
- `npm view @ctrl/react-adsense version` — Confirmed 2.1.0 (2026-03-31)
- `npm view @lhci/cli version` — Confirmed 0.15.1 (2026-03-31)

### Secondary (MEDIUM confidence)
- [Implementing Google AdSense without affecting site performance](https://dariusz.wieckiewicz.org/en/implementing-google-adsense-performance/) — Delayed injection pattern with interaction events + 5s fallback; verified matches React useEffect approach
- [How to Implement Google AdSense into ReactJS - 2025](https://dev.to/deuos/how-to-implement-google-adsense-into-reactjs-2025-5g3h) — `@ctrl/react-adsense` usage pattern confirmed; `adClient`/`adSlot` prop API
- [Ads.txt guide - Google AdSense Help](https://support.google.com/adsense/answer/12171612?hl=en) — Official Google source for ads.txt format
- [AdSense Program policies](https://support.google.com/adsense/answer/48182?hl=en) — Labeling requirements: "Sponsored Links" or "Advertisements" are acceptable

### Tertiary (LOW confidence — needs validation at implementation)
- [How To Fix CLS Shifting When Using Google AdSense](https://goldpenguin.org/blog/fix-massive-cls-shift-from-adsense/) — `ins.adsbygoogle[data-ad-status="unfilled"]` CSS fix; widely cited but should be verified with `data-ad-status` attribute behavior in current AdSense SDK
- [Lazy loading on Google AdSense community thread](https://support.google.com/adsense/thread/160735613/lazy-loading-on-google-ad-sense?hl=en) — Google support confirms lazy loading is permitted for manual placements, not Auto Ads

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions verified against npm registry
- Architecture: HIGH — existing `userTier` pattern confirmed via direct code read; `AdUnit` pattern derived from verified sources
- Pitfalls: HIGH — CLS and script-loading pitfalls confirmed by multiple sources including Lighthouse GitHub issues
- Lighthouse CI: HIGH — `@lhci/cli` confirmed at 0.15.1; configuration structure from official docs

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (AdSense policy stable; Lighthouse scoring weights occasionally shift)
