# Phase 2: Core Generator - Research

**Researched:** 2026-03-09
**Domain:** React island + qr-code-styling + live debounced QR generation for four content types
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two-column desktop layout: form panel left (60%), live QR preview right (40%)
- Preview panel is sticky — stays visible as user scrolls
- QR preview renders at 256×256px
- Mobile: columns collapse to stacked — form on top, preview below
- Horizontal tab bar: URL | Text | WiFi | vCard (all four always visible)
- Default tab: URL
- Tab state is preserved when switching (CONT-05)
- URL tab: soft validation only — warning if not URL-like, but QR still generates; no hard blocking
- WiFi fields: SSID, Password, Security type dropdown (WPA/WPA2 | WEP | None)
- Password field has show/hide toggle (eye icon)
- No hidden network toggle in Phase 2
- vCard fields: Name (required), Phone (optional), Email (optional), Organization (optional)
- Field order: Name → Phone → Email → Organization
- Generation is fully automatic — debounce 300ms after user stops typing; no Generate button
- Download is Phase 4 scope (EXPO-01, EXPO-02, EXPO-03)
- Empty preview: faded/ghost QR pattern (muted gray, non-interactive)
- When user clears all content: preview reverts to ghost placeholder (PREV-03)
- During debounce window: preview pulses at reduced opacity to signal "updating"
- QR generation failure: inline error message inside preview area — no toast/banner
- No always-visible character counter; warning only when approaching/exceeding QR encoding capacity
- Over-limit: inline error in preview area

### Claude's Discretion
- Default tab selection (URL strongly implied)
- Exact debounce timing (300ms specified — use that)
- Placeholder ghost QR exact styling (opacity, pattern complexity)
- Opacity pulse animation specifics (duration, easing)
- Form field placeholder text and labels
- Security type dropdown default value (WPA/WPA2)
- Exact character-count warning threshold

### Deferred Ideas (OUT OF SCOPE)
- Download / export buttons (PNG, SVG, clipboard copy) — Phase 4
- Hidden network toggle for WiFi — consider Phase 3 or later
- Additional vCard fields (URL, Note) — Phase 3 or v2
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | User can generate a QR code from a URL/website link | qr-code-styling `data` string encoding; URL string passed directly |
| CONT-02 | User can generate a QR code from plain text | Plain string passed as `data`; identical to URL path |
| CONT-03 | User can generate a QR code from WiFi credentials | WIFI: format string; SSID/password/security type encoding rules |
| CONT-04 | User can generate a QR code from vCard contact info | BEGIN:VCARD format string for name/phone/email/org |
| CONT-05 | User can switch between content types without losing other settings | Per-tab state slices in React useState; only active tab's string sent to QR library |
| PREV-01 | QR preview updates in real time as user edits content (debounced) | useDebounce hook pattern; qrCode.update(options) method |
| PREV-02 | Preview container is fixed size (no layout shift as QR version changes) | Fixed 256×256 container div; qr-code-styling renders inside it |
| PREV-03 | Preview shows empty/placeholder state when no content is entered | Conditional render: ghost SVG when data === empty; real QR when data present |
</phase_requirements>

---

## Summary

Phase 2 mounts a single React island (`client:load`) into the existing `div#qr-generator-root` in `Hero.astro`. The island owns all state: which tab is active, per-tab form values, and the debounced QR data string. `qr-code-styling` (not yet installed — must be added to package.json) renders into a fixed 256×256 `<div ref>` using the official `append`/`update` pattern from the library's own React example.

The four content types map to four string-encoding functions (URL: pass-through, Text: pass-through, WiFi: `WIFI:T:{type};S:{ssid};P:{pass};;`, vCard: `BEGIN:VCARD\nVERSION:3.0\n...END:VCARD`). The 300ms `useDebounce` hook delays calling `qrCode.update()` until the user pauses, while a CSS pulse animation on the preview container signals the in-flight debounce window. Empty state shows a ghost SVG placeholder, not an empty or broken canvas.

**Primary recommendation:** Install `qr-code-styling@1.8.3`, use the `useState([new QRCodeStyling(options)])` + `useRef<HTMLDivElement>` + two-`useEffect` pattern from the official React example. Build one `QRGeneratorIsland.tsx` component with inline tab state; keep encoding functions pure and co-located.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qr-code-styling | 1.8.3 (latest) | QR rendering (canvas or SVG) with styling | Already decided; supports all Phase 3 styling options (dots, corners, gradients, logo) |
| React 19 | ^19.2.4 (installed) | Island UI and state management | Already installed via @astrojs/react |
| Tailwind CSS v4 | ^4.2.1 (installed) | Layout and utility styling | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none) | — | Debounce | Implement inline with useEffect + setTimeout (~8 lines); no dependency needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| qr-code-styling | qrcode.react | qrcode.react is simpler but does NOT support Phase 3 styling (gradients, custom dots, logo) — would require full rewrite in Phase 3 |
| inline debounce | use-debounce npm | use-debounce adds a dependency for 8 lines of code; not worth it |

**Installation:**
```bash
npm install qr-code-styling
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── QRGeneratorIsland.tsx     # Single React island — all generator logic
│   ├── tabs/
│   │   ├── UrlTab.tsx            # URL input + soft validation warning
│   │   ├── TextTab.tsx           # Plain textarea
│   │   ├── WifiTab.tsx           # SSID, password (show/hide), security dropdown
│   │   └── VCardTab.tsx          # Name (req), phone, email, org
│   └── QRPreview.tsx             # ref div + placeholder logic + pulse animation
├── hooks/
│   └── useDebounce.ts            # 8-line debounce hook
├── lib/
│   └── qrEncoding.ts             # Pure string-encoding functions per content type
└── Hero.astro                    # Already has #qr-generator-root mount point
```

### Pattern 1: Official qr-code-styling React Pattern

**What:** Create QRCodeStyling instance once with `useState`, append to ref on mount, update on options change.
**When to use:** Always — this is the official pattern from the library's own React example.
**Example:**
```typescript
// Source: https://github.com/kozakdenys/qr-code-styling-examples/blob/master/examples/react/src/App.tsx
import QRCodeStyling, { Options } from "qr-code-styling";
import { useState, useEffect, useRef } from "react";

const [qrCode] = useState<QRCodeStyling>(new QRCodeStyling(initialOptions));
const ref = useRef<HTMLDivElement>(null);

// Mount once
useEffect(() => {
  if (ref.current) {
    qrCode.append(ref.current);
  }
}, [qrCode, ref]);

// Update on data/options change
useEffect(() => {
  if (!qrCode) return;
  qrCode.update(options);
}, [qrCode, options]);

// In JSX:
// <div ref={ref} style={{ width: 256, height: 256 }} />
```

### Pattern 2: Debounced QR Data with Pulse State

**What:** useDebounce delays sending value to QR update; a separate `isPending` boolean drives CSS pulse.
**When to use:** Live preview with 300ms debounce as specified in success criteria.
**Example:**
```typescript
// Source: standard React pattern (no library needed)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// In component:
const [rawContent, setRawContent] = useState("");
const debouncedContent = useDebounce(rawContent, 300);
const isPending = rawContent !== debouncedContent;

// isPending drives: opacity-50 + animate-pulse on preview container
// debouncedContent drives: qrCode.update({ data: encodeContent(debouncedContent) })
```

### Pattern 3: Per-Tab State Slices (CONT-05)

**What:** Each tab owns its own state object; only the active tab's encoded string is passed to QR library.
**When to use:** Required — switching tabs must preserve previously entered values.
**Example:**
```typescript
// Each tab's data lives independently
const [urlState, setUrlState] = useState({ url: "" });
const [textState, setTextState] = useState({ text: "" });
const [wifiState, setWifiState] = useState({ ssid: "", password: "", security: "WPA" });
const [vcardState, setVcardState] = useState({ name: "", phone: "", email: "", org: "" });
const [activeTab, setActiveTab] = useState<"url" | "text" | "wifi" | "vcard">("url");

// Derive the current QR data string
const rawContent = useMemo(() => {
  switch (activeTab) {
    case "url":   return urlState.url;
    case "text":  return textState.text;
    case "wifi":  return encodeWifi(wifiState);
    case "vcard": return encodeVCard(vcardState);
  }
}, [activeTab, urlState, textState, wifiState, vcardState]);
```

### Pattern 4: SSR Safety for qr-code-styling

**What:** qr-code-styling references `self` (browser global) — fails in SSR/Node. Astro's `client:load` on the island component prevents SSR execution, so the import is safe inside the `.tsx` file without dynamic import gymnastics.
**When to use:** As long as `QRGeneratorIsland` is used with `client:load` (or `client:only="react"`), no special guard needed inside the component.

**In Hero.astro:**
```astro
---
import QRGeneratorIsland from "../components/QRGeneratorIsland";
---
<div id="qr-generator-root">
  <QRGeneratorIsland client:load />
</div>
```

If the static placeholder `<p>` text was previously inside `#qr-generator-root`, remove it — the island replaces it.

### Pattern 5: Accessible Tab Bar

**What:** Native `role="tablist"` / `role="tab"` ARIA pattern with keyboard support.
**When to use:** Required for accessibility.
**Example:**
```tsx
<div role="tablist" aria-label="Content type">
  {tabs.map(tab => (
    <button
      key={tab.id}
      role="tab"
      aria-selected={activeTab === tab.id}
      aria-controls={`panel-${tab.id}`}
      tabIndex={activeTab === tab.id ? 0 : -1}
      onClick={() => setActiveTab(tab.id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
        ${activeTab === tab.id
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"}`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Anti-Patterns to Avoid
- **Recreating QRCodeStyling on every render:** The instance must be created once with `useState`. Creating inside `useEffect` or on each render produces multiple DOM children inside the ref div.
- **Putting QR generation inside a form onSubmit:** Phase 2 is fully automatic — no submit event.
- **Blocking QR generation on validation:** URL soft validation warns but never blocks. WiFi generates even with partial fields. Only vCard name=empty should suppress QR.
- **Storing the QRCodeStyling instance in a ref instead of useState:** The official example uses `useState` to ensure a single stable instance.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code pixel matrix | Custom QR encoder | qr-code-styling | QR encoding (Reed-Solomon error correction, version selection, masking) is extremely complex; qr-code-styling wraps qrcode-generator |
| WiFi string encoding | Custom WIFI: formatter | `lib/qrEncoding.ts` with the established format | Special-character escaping (\\, ;, ,, ", :) is fiddly; centralize it |
| vCard string encoding | Custom BEGIN:VCARD formatter | `lib/qrEncoding.ts` | Field ordering, optional field omission, line-ending sensitivity |
| Debounce | lodash.debounce or use-debounce | Inline useEffect hook | 8 lines, no dependency, avoids stale closure issues in React |

**Key insight:** The QR encoding layer (WIFI: string, BEGIN:VCARD) is where bugs will hide — keep these pure functions with unit tests.

---

## Common Pitfalls

### Pitfall 1: Multiple QR Renders in the ref div
**What goes wrong:** Every `useEffect` run calls `qrCode.append(ref.current)` again, adding a second SVG/canvas element inside the preview div.
**Why it happens:** `useEffect` runs more than once (StrictMode double-invoke, dependency change).
**How to avoid:** Create the QRCodeStyling instance with `useState` (not inside useEffect). Separate the `append` effect (runs once on mount) from the `update` effect (runs on options change). The `append` effect's dependency array `[qrCode, ref]` means it only runs when the instance or ref changes — effectively once.
**Warning signs:** QR preview shows stacked/doubled images.

### Pitfall 2: qr-code-styling `self is not defined` Error
**What goes wrong:** Build-time or SSR error because the library accesses `self` (browser global).
**Why it happens:** Astro components can server-render; if the island is not correctly tagged with a `client:` directive, the import runs on the server.
**How to avoid:** Always use `client:load` (or `client:only="react"`) on `QRGeneratorIsland` in Hero.astro. Do NOT import `qr-code-styling` directly in any `.astro` file.
**Warning signs:** Build error "self is not defined" or "document is not defined".

### Pitfall 3: WiFi String Special Characters
**What goes wrong:** QR scan fails silently or joins wrong network.
**Why it happens:** Characters `\`, `;`, `,`, `"`, `:` in SSID or password must be backslash-escaped; unescaped semicolons terminate fields prematurely.
**How to avoid:** Apply escaping in `encodeWifi()`:
```typescript
const escape = (s: string) => s.replace(/([\\;,":"])/g, "\\$1");
```
**Warning signs:** A network with a semicolon in its name fails to connect from QR scan.

### Pitfall 4: Fixed Preview Size vs. qr-code-styling Internal Sizing
**What goes wrong:** QR code renders at library's internal size (300×300 default) and overflows the 256×256 container, causing layout shift (violates PREV-02).
**Why it happens:** The library renders a canvas or SVG at the `width`/`height` from options, ignoring the container's CSS size.
**How to avoid:** Set `width: 256, height: 256` in QRCodeStyling options. Also set the container div to `w-64 h-64 overflow-hidden` as a guard.
**Warning signs:** QR code spills outside the preview panel.

### Pitfall 5: Debounce Window Leaves Stale QR Visible
**What goes wrong:** User clears URL field; old QR stays visible for 300ms before placeholder appears.
**Why it happens:** The debounced value lags behind rawContent.
**How to avoid:** The pulse animation (`isPending = rawContent !== debouncedContent`) provides correct UX — reduced opacity signals "stale". When debounced value arrives as empty string, switch to placeholder. This is acceptable per the user's decisions.
**Warning signs:** Users see a QR for content they already deleted.

### Pitfall 6: vCard Line Endings
**What goes wrong:** Some Android/iOS contacts apps fail to parse the vCard.
**Why it happens:** vCard 3.0 spec calls for CRLF (`\r\n`) line endings, but most implementations accept `\n`. Some parsers are strict.
**How to avoid:** Use `\r\n` in the vCard encoder to maximize compatibility.
**Warning signs:** Scanned vCard produces garbled name or missing fields.

---

## Code Examples

Verified patterns from official sources:

### WiFi QR Encoding (WIFI: format)
```typescript
// Source: https://github.com/zxing/zxing/wiki/Barcode-Contents
function encodeWifi(ssid: string, password: string, security: "WPA" | "WEP" | "nopass"): string {
  const escape = (s: string) => s.replace(/([\\;,":"])/g, "\\$1");
  const p = security === "nopass" ? "" : `;P:${escape(password)}`;
  return `WIFI:T:${security};S:${escape(ssid)}${p};;`;
}
// Example output: WIFI:T:WPA;S:MyNetwork;P:MyPass;;
```

### vCard QR Encoding (BEGIN:VCARD 3.0)
```typescript
// Source: https://github.com/zxing/zxing/wiki/Barcode-Contents + RFC 6350
function encodeVCard(name: string, phone?: string, email?: string, org?: string): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${name}`,
    `N:${name};;;`,  // simplified: full name in Last field
  ];
  if (org)   lines.push(`ORG:${org}`);
  if (phone) lines.push(`TEL:${phone}`);
  if (email) lines.push(`EMAIL:${email}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
```

### QR Placeholder Ghost (SVG)
```tsx
// Pure SVG ghost — a simplified 5×5 QR module grid at reduced opacity
// Communicates the widget's purpose without rendering a real code
function GhostQR() {
  return (
    <svg
      width="256" height="256" viewBox="0 0 256 256"
      aria-hidden="true"
      className="opacity-20 text-gray-400"
    >
      {/* render a simple 7x7 grid pattern — 3 finder patterns at corners */}
      {/* implementation detail left to planner */}
    </svg>
  );
}
```

### Content-Is-Empty Check
```typescript
function isContentEmpty(activeTab: Tab, states: TabStates): boolean {
  switch (activeTab) {
    case "url":   return !states.url.trim();
    case "text":  return !states.text.trim();
    case "wifi":  return !states.wifi.ssid.trim();
    case "vcard": return !states.vcard.name.trim(); // name is the only required field
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `qr-code-styling` type: `'canvas'` default | type: `'svg'` recommended | Phase 3+ concern | SVG export in Phase 4 requires SVG type; start with SVG now to avoid re-render |
| Separate generate button | Auto-generation on debounce | UX standard 2023+ | Removes friction; is the stated Phase 2 requirement |
| MECARD format for contacts | vCard 3.0 (BEGIN:VCARD) | vCard more universal | MECARD is compact but vCard is supported by all major contacts apps (iOS, Android, Windows, macOS) |

**Deprecated/outdated:**
- `@astrojs/tailwind` integration: replaced by `@tailwindcss/vite` (already correctly used in this project)
- `qr-code-styling` type `'canvas'` for Phase 4: SVG export requires `type: 'svg'` — set it now

---

## Open Questions

1. **Ghost QR placeholder visual**
   - What we know: User decision says "faded/ghost QR pattern (muted gray, non-interactive)"
   - What's unclear: Exact SVG structure — hardcoded static SVG vs. a real QR code rendered at low opacity
   - Recommendation: Use a hardcoded simplified SVG (three corner finder squares + scattered dots) — avoids generating an actual QR from empty string which throws an error in some libraries

2. **qr-code-styling error on empty/too-long data**
   - What we know: The library propagates errors from the underlying `qrcode-generator` lib; content too long throws
   - What's unclear: Exact byte thresholds at Q error correction before library throws vs. silently truncates
   - Recommendation: Wrap `qrCode.update()` in try/catch; display inline error in preview when caught; for QR capacity at M error correction level ~2,953 bytes max (version 40) — warn at ~80% of expected capacity for the active content type

3. **React 19 Strict Mode double-invoke**
   - What we know: React 19 Strict Mode double-invokes effects in dev; the `append` pattern may create two SVG children
   - What's unclear: Whether `qr-code-styling` handles this gracefully
   - Recommendation: Wrap the append call with a check: `if (ref.current && ref.current.childNodes.length === 0) { qrCode.append(ref.current); }`

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Playwright 1.58.2 |
| Config file | `playwright.config.ts` |
| Quick run command | `npm run test:smoke` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | URL input produces a QR code SVG/canvas in the preview | smoke | `npm run test:smoke` | ❌ Wave 0 |
| CONT-02 | Plain text input produces a QR code | smoke | `npm run test:smoke` | ❌ Wave 0 |
| CONT-03 | WiFi form (SSID/password/security) produces a QR code | smoke | `npm run test:smoke` | ❌ Wave 0 |
| CONT-04 | vCard form (name required) produces a QR code | smoke | `npm run test:smoke` | ❌ Wave 0 |
| CONT-05 | Switching tabs preserves previously entered values | smoke | `npm run test:smoke` | ❌ Wave 0 |
| PREV-01 | Typing triggers QR update without button press (within 1s) | smoke | `npm run test:smoke` | ❌ Wave 0 |
| PREV-02 | Preview container size does not change as QR version updates | smoke | `npm run test:smoke` | ❌ Wave 0 |
| PREV-03 | Empty input shows placeholder state (no QR element or ghost element present) | smoke | `npm run test:smoke` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:smoke` (all smoke tests, ~10-20s)
- **Per wave merge:** `npm test` (all browsers)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/generator.spec.ts` — covers CONT-01 through PREV-03 (@smoke tags)
- [ ] Existing `tests/foundation.spec.ts` continues to pass — Phase 2 must not break Phase 1 smoke tests

*(No new test framework install needed — Playwright already configured.)*

---

## Sources

### Primary (HIGH confidence)
- `https://github.com/kozakdenys/qr-code-styling-examples/blob/master/examples/react/src/App.tsx` — official React integration pattern (retrieved raw from GitHub)
- `https://raw.githubusercontent.com/kozakdenys/qr-code-styling/master/README.md` — full options table, methods, API (retrieved raw from GitHub)
- `https://github.com/zxing/zxing/wiki/Barcode-Contents` — WiFi and vCard QR format specification

### Secondary (MEDIUM confidence)
- `https://github.com/kozakdenys/qr-code-styling/issues/38` and `issues/172` — confirmed SSR `self is not defined` issue and fix pattern
- vCard 3.0 format cross-verified with RFC 6350 and QuickChart documentation
- WiFi format cross-verified with ZXing Barcode Contents spec and multiple secondary sources

### Tertiary (LOW confidence)
- Ghost QR placeholder implementation — no authoritative source; recommendation is Claude's judgment

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — qr-code-styling API verified from raw GitHub source; React pattern from official example
- Architecture: HIGH — React island pattern verified from official example; tab/debounce patterns are standard React
- Encoding formats: HIGH — WiFi format from ZXing spec; vCard from RFC 6350
- SSR pitfall: HIGH — confirmed from library's own GitHub issues
- Pitfalls: MEDIUM — Pitfalls 1-4 verified; pitfall on vCard line endings is LOW (convention-based)

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (qr-code-styling is stable; React 19 patterns stable)
