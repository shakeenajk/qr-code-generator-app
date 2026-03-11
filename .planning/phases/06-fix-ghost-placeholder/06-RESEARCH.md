# Phase 6: Fix Ghost Placeholder + Lighthouse Attestation — Research

**Researched:** 2026-03-11
**Domain:** React state logic (empty-state detection), Playwright testing, Lighthouse performance attestation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PREV-03 | Preview shows an empty/placeholder state when no content is entered | Root cause identified in `isContentEmpty()` + `encodeWifi()`/`encodeVCard()`. Fix pattern documented. New Playwright tests for WiFi/vCard empty states specified. |
| SEO-09 | Page achieves Lighthouse performance score 90+ on mobile | `client:visible` hydration deferral already in place from Phase 4. Attestation is a human-run Lighthouse audit; no code change expected unless score < 90. |
</phase_requirements>

---

## Summary

Phase 6 has two independent tracks. The first — and only code-change track — is a bug fix: the ghost placeholder (PREV-03) never appears on the WiFi and vCard tabs when all fields are blank. The root cause is fully understood: `isContentEmpty()` in `qrEncoding.ts` checks `!data.trim()` on the already-encoded string, but `encodeWifi()` always returns a non-empty protocol string (`"WIFI:T:WPA;S:;P:;;"`) and `encodeVCard()` always returns a vCard skeleton (`BEGIN:VCARD…END:VCARD`) even when every input field is empty. The fix is to move the emptiness check upstream — test the raw field values before encoding — so that "all fields blank" correctly produces `isEmpty = true`.

The second track is attestation-only: SEO-09 requires Lighthouse mobile performance ≥ 90. Phase 4 already applied `client:visible` to `QRGeneratorIsland` to defer React + qr-code-styling hydration, which is the primary lever for reducing Total Blocking Time on mobile. No further code change is expected unless the Lighthouse run comes back below threshold.

**Primary recommendation:** Fix `isContentEmpty()` to accept raw tab state (not the encoded string) for WiFi and vCard tabs, add WiFi/vCard empty-state Playwright smoke tests, then run Lighthouse mobile audit and record the score.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Relevant to Phase 6 |
|---------|---------|---------|----------------------|
| TypeScript | project default | Type-safe empty-state logic | `isContentEmpty` signature update |
| React | project default | `isEmpty` state in `QRGeneratorIsland` | No change required |
| Playwright | project default | Smoke tests for WiFi/vCard empty states | New test cases |
| qr-code-styling | 1.9.2 | QR rendering | No change — bug is pre-render |

### No New Dependencies Required

All fixes are pure logic changes in existing files. No packages need to be installed.

---

## Architecture Patterns

### Recommended File Locations

```
src/
├── lib/
│   └── qrEncoding.ts        # isContentEmpty() — primary fix location
├── components/
│   └── QRGeneratorIsland.tsx # isEmpty derived value — may need rawContent guard
tests/
└── generator.spec.ts        # new PREV-03 WiFi/vCard test cases
```

### Pattern 1: Pre-Encoding Emptiness Check

**What:** Export a new function (or overload `isContentEmpty`) that accepts the raw tab state rather than the encoded string. Check whether meaningful user input exists before encoding.

**When to use:** Any time a tab's encoder produces non-empty output even with all fields blank (WiFi, vCard).

**Current (broken) flow:**
```
wifiValue = {ssid:"", password:"", security:"WPA"}
  → encodeWifi() → "WIFI:T:WPA;S:;P:;;"   (non-empty)
  → isContentEmpty("WIFI:T:WPA;S:;P:;;")   → false
  → isEmpty = false → ghost placeholder hidden — BUG
```

**Fixed flow (option A — recommended: per-tab isEmpty computed in island):**
```typescript
// In QRGeneratorIsland.tsx — compute isEmpty before encoding
const isEmpty = useMemo(() => {
  switch (activeTab) {
    case "url":   return !urlValue.trim();
    case "text":  return !textValue.trim();
    case "wifi":  return !wifiValue.ssid.trim();    // SSID is required; blank = empty
    case "vcard": return !vcardValue.name.trim() && !vcardValue.phone.trim()
                      && !vcardValue.email.trim() && !vcardValue.org.trim();
  }
}, [activeTab, urlValue, textValue, wifiValue, vcardValue]);
```

**Fixed flow (option B — update isContentEmpty signature):**
```typescript
// In qrEncoding.ts — add per-type check functions
export function isWifiEmpty(state: WifiState): boolean {
  return !state.ssid.trim();
}
export function isVCardEmpty(state: VCardState): boolean {
  return !state.name.trim() && !state.phone.trim()
      && !state.email.trim() && !state.org.trim();
}
```

Then in QRGeneratorIsland:
```typescript
const isEmpty = useMemo(() => {
  switch (activeTab) {
    case "url":   return isContentEmpty(urlValue);
    case "text":  return isContentEmpty(textValue);
    case "wifi":  return isWifiEmpty(wifiValue);
    case "vcard": return isVCardEmpty(vcardValue);
  }
}, [activeTab, urlValue, textValue, wifiValue, vcardValue]);
```

**Which option:** Option B keeps the per-type logic co-located with the encoders in `qrEncoding.ts` and is easier to unit test. **Option B is preferred.**

**Important:** `isEmpty` must use the raw (un-debounced) values to avoid placeholder flash delay at initial state. The existing code already uses `debouncedContent` for `isEmpty` — this should change to raw values for instantaneous empty-state detection. The debounce is only needed to prevent QR re-renders on every keystroke; empty/non-empty transitions should be immediate.

Actually, reviewing the current code more carefully: `isEmpty = isContentEmpty(debouncedContent)`. For URL/text this is fine — the 300ms debounce delay before the placeholder disappears is imperceptible. For WiFi/vCard after the fix, using raw (non-debounced) state values is cleaner because the tab switch itself should immediately show/hide the placeholder without waiting for debounce.

**Recommendation:** Compute `isEmpty` from raw (un-debounced) state slices, not from `debouncedContent`.

### Pattern 2: Playwright Empty-State Test for WiFi/vCard

**What:** Add two new `@smoke` test cases to `tests/generator.spec.ts` that:
1. Navigate to WiFi tab without entering anything — assert placeholder is visible
2. Navigate to vCard tab without entering anything — assert placeholder is visible

**Template:**
```typescript
// PREV-03 gap: WiFi tab empty state
test('PREV-03b: WiFi tab with no input shows ghost placeholder @smoke', async ({ page }) => {
  await page.waitForSelector('[data-tab="wifi"]');
  await page.click('[data-tab="wifi"]');
  await page.waitForTimeout(400); // debounce window
  await expect(page.locator('[data-testid="qr-placeholder"]')).toBeVisible();
});

// PREV-03 gap: vCard tab empty state
test('PREV-03c: vCard tab with no input shows ghost placeholder @smoke', async ({ page }) => {
  await page.click('[data-tab="vcard"]');
  await page.waitForTimeout(400);
  await expect(page.locator('[data-testid="qr-placeholder"]')).toBeVisible();
});
```

### Pattern 3: Lighthouse Mobile Attestation (Manual)

**What:** Human runs Lighthouse in Chrome DevTools (or CLI) with mobile device emulation to confirm score ≥ 90.

**How to run:**
1. `npm run build && npm run preview` — builds production bundle
2. Open `http://localhost:4321` in Chrome
3. DevTools → Lighthouse → Mobile → Performance — Generate report
4. Record score in VERIFICATION.md

**No code change expected** — `client:visible` on `QRGeneratorIsland` (added in Phase 4) defers qr-code-styling hydration until element is scrolled into view, which is the primary TBT reducer. If score < 90, investigate render-blocking resources or LCP image.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WiFi/vCard empty detection | Custom encoded-string parser | Pre-encoding field check | Encoded strings are protocol-format; parsing them to detect emptiness is fragile. Check fields before encoding. |
| Lighthouse CI gate | Script to parse Lighthouse JSON | Human attestation (manual) | SEO-09 is a one-time milestone attestation, not a CI gate. Human runs once, records in VERIFICATION.md. |
| Ghost placeholder SVG | New component | Existing `GhostQR` in `QRPreview.tsx` | Component is already built and correctly positioned. |

---

## Common Pitfalls

### Pitfall 1: Debounced isEmpty Causes Visible Delay on Tab Switch

**What goes wrong:** If `isEmpty` is computed from `debouncedContent`, switching from a populated URL tab to an empty WiFi tab takes 300ms before the ghost appears. The QR briefly renders a protocol-string QR before the placeholder fades in.

**Why it happens:** `rawContent` is recomputed immediately on tab switch, but `debouncedContent` trails by 300ms. `isContentEmpty(debouncedContent)` still returns `false` during the delay.

**How to avoid:** Compute `isEmpty` from raw (un-debounced) state slices, not `debouncedContent`. The debounce is only for controlling QR re-render frequency, not for placeholder visibility.

**Existing code note:** The current `isEmpty = isContentEmpty(debouncedContent)` comment says "Use debouncedContent for isEmpty so placeholder doesn't flicker during debounce." This was the right call for URL/text (avoids placeholder flash while typing). For WiFi/vCard fix, computing from raw fields is the correct approach since there is no intermediate typed value — the tab switch is instantaneous.

### Pitfall 2: WiFi SSID is the Canonical "Required" Field

**What goes wrong:** Treating any field combination as "empty" — e.g., requiring all three fields (SSID, password, security) to be blank before showing placeholder.

**Why it happens:** Misunderstanding which fields are required for a valid WiFi QR. SSID is required; password is optional (open networks); security type has a default.

**How to avoid:** Use only `!ssid.trim()` as the WiFi emptiness check. A blank SSID means no scannable WiFi QR can be generated; a QR from `WIFI:T:WPA;S:;P:;;` is useless to scanners.

### Pitfall 3: vCard "Empty" Means All Four Fields Blank

**What goes wrong:** Requiring only `name` to be blank — but users might enter an org without a name.

**Why it happens:** Treating name as the single canonical field, mirroring URL/text behavior.

**How to avoid:** Use `!name.trim() && !phone.trim() && !email.trim() && !org.trim()` for vCard emptiness. Any meaningful field should produce a real QR.

### Pitfall 4: Existing PREV-03 Test Only Covers URL Tab

**What goes wrong:** Believing PREV-03 is already passing because the smoke test is green.

**Why it happens:** The existing PREV-03 test in `generator.spec.ts` lines 93–104 only tests URL tab clearing. WiFi and vCard empty states are not covered.

**How to avoid:** Add dedicated test cases for WiFi and vCard empty states (see Pattern 2 above). These should fail (RED) before the fix and pass (GREEN) after.

### Pitfall 5: Lighthouse Score vs. Threshold

**What goes wrong:** Running Lighthouse in development mode (Vite dev server) which has no bundle optimization.

**Why it happens:** Running `npm run dev` instead of `npm run build && npm run preview`.

**How to avoid:** Always run Lighthouse against the production preview build.

---

## Code Examples

### Current isContentEmpty (in src/lib/qrEncoding.ts)

```typescript
// Source: /src/lib/qrEncoding.ts line 43
export function isContentEmpty(data: string): boolean {
  return !data.trim();
}
```

This works for URL and text tabs (raw value is passed directly). It fails for WiFi/vCard because the encoded string is never empty.

### Proposed Addition to qrEncoding.ts

```typescript
// Add after isContentEmpty — pre-encoding emptiness checks for structured types
export function isWifiEmpty(state: WifiState): boolean {
  return !state.ssid.trim();
}

export function isVCardEmpty(state: VCardState): boolean {
  return (
    !state.name.trim() &&
    !state.phone.trim() &&
    !state.email.trim() &&
    !state.org.trim()
  );
}
```

### Updated isEmpty in QRGeneratorIsland.tsx

```typescript
// Replace current line: const isEmpty = isContentEmpty(debouncedContent);
// With: (uses raw non-debounced state slices for immediate placeholder response)
const isEmpty = useMemo(() => {
  switch (activeTab) {
    case "url":   return isContentEmpty(urlValue);
    case "text":  return isContentEmpty(textValue);
    case "wifi":  return isWifiEmpty(wifiValue);
    case "vcard": return isVCardEmpty(vcardValue);
  }
}, [activeTab, urlValue, textValue, wifiValue, vcardValue]);
```

The update effect guard `if (!qrCodeRef.current || isEmpty) return;` is unchanged and still correct.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Check encoded string for emptiness | Check raw field values before encoding | The fix — do not parse protocol-format strings |
| PREV-03 tested on URL tab only | PREV-03 tested on all four tabs | After fix |

---

## Open Questions

1. **Should PREV-03 test stub be RED-first (TDD) or written alongside the fix?**
   - What we know: Phase 2 and Phase 3 used Wave 0 stub pattern (fail-first tests before implementation)
   - What's unclear: Phase 6 is a gap-closure phase — tests could be written at the same time as the fix
   - Recommendation: Write the failing tests first (Wave 0 stub), then apply the fix. This confirms the bug is observable and the fix makes tests pass.

2. **Is `isPulsing` still correct after moving isEmpty off debouncedContent?**
   - What we know: `isPulsing = rawContent !== debouncedContent`. If `isEmpty` is now computed from raw values, the pulse animation still fires during the debounce window for non-empty inputs — this is correct behavior.
   - What's unclear: Nothing — this is safe.
   - Recommendation: No change to `isPulsing` logic.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test tests/generator.spec.ts --grep "@smoke" --project=chromium` |
| Full suite command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PREV-03 | WiFi tab empty → ghost placeholder visible | smoke | `npx playwright test tests/generator.spec.ts --grep "PREV-03b" --project=chromium` | ❌ Wave 0 |
| PREV-03 | vCard tab empty → ghost placeholder visible | smoke | `npx playwright test tests/generator.spec.ts --grep "PREV-03c" --project=chromium` | ❌ Wave 0 |
| SEO-09 | Lighthouse mobile performance ≥ 90 | manual-only | — human runs Lighthouse — | N/A |

### Sampling Rate

- **Per task commit:** `npx playwright test tests/generator.spec.ts --grep "@smoke" --project=chromium`
- **Per wave merge:** `npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/generator.spec.ts` — add two failing @smoke stubs: `PREV-03b: WiFi tab with no input shows ghost placeholder @smoke` and `PREV-03c: vCard tab with no input shows ghost placeholder @smoke` — both must fail (RED) before fix, pass (GREEN) after

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `/src/lib/qrEncoding.ts` — `isContentEmpty()` implementation
- Direct code inspection: `/src/components/QRGeneratorIsland.tsx` — `isEmpty` derivation, update effect guard
- Direct code inspection: `/src/components/QRPreview.tsx` — ghost placeholder implementation
- Direct code inspection: `tests/generator.spec.ts` — existing PREV-03 test scope
- `.planning/v1.0-MILESTONE-AUDIT.md` — INT-02 root cause analysis (lines 172–188)
- `.planning/STATE.md` — Phase 4 decision: `client:visible` on QRGeneratorIsland for Lighthouse ≥ 90

### Secondary (MEDIUM confidence)

- ZXing WiFi QR spec: SSID is required field; blank SSID = un-scannable QR

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- PREV-03 root cause: HIGH — directly observed in source code + confirmed by audit
- PREV-03 fix approach: HIGH — standard React pattern; no external library changes
- SEO-09 attestation: HIGH — `client:visible` already in place; this is a human checkpoint, not code work
- Test patterns: HIGH — existing Playwright infrastructure, same selector contracts

**Research date:** 2026-03-11
**Valid until:** 2026-04-11 (stable codebase; no moving parts)
