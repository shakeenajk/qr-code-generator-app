---
phase: 12-foundation-improvements
verified: 2026-03-31T08:00:00Z
status: gaps_found
score: 8/9 must-haves verified
re_verification: false
gaps:
  - truth: "Pricing page shows accurate dynamic QR limits for all tiers (Free: 3, Starter: 10, Pro: 100)"
    status: partial
    reason: "TIER-01 requires the Free card to show '3 dynamic QR codes'. The Free card currently omits a dynamic QR row entirely. Starter (10) and Pro (100) are correctly shown."
    artifacts:
      - path: "src/pages/pricing.astro"
        issue: "Free card has no dynamic QR list item. TIER-01 explicitly specifies Free: 3."
    missing:
      - "Add '3 dynamic QR codes' list item to the Free card <ul> in pricing.astro (matching the same <li> pattern used by Starter and Pro)"
human_verification:
  - test: "Header conversion flow — signed-out state"
    expected: "Pricing text link appears between logo and auth buttons; Sign Up (outlined blue) and Sign In (filled blue) buttons appear in that order; clicking Pricing navigates to /pricing; clicking Sign Up navigates to /signup"
    why_human: "Clerk Show when='signed-out' rendering requires a live browser session — cannot be verified by static grep"
  - test: "Hero subtext accuracy"
    expected: "Hero reads 'No signup required — download as PNG or SVG instantly.' with no 'no limits' claim visible anywhere on the homepage"
    why_human: "Visual confirmation of rendered output; also verifies the Hero.astro subtext paragraph renders as expected rather than being hidden by another element"
  - test: "vCard form — 10 fields visible and wired"
    expected: "vCard tab shows Full Name, Phone, Email, Organization, Title, Company, Work Phone, Address, Website, LinkedIn in that order; filling any new field and clicking download produces a QR whose decoded vCard contains the entered value"
    why_human: "Field rendering and QR encode output requires a live browser; cannot inspect React state or QR decode result programmatically in static analysis"
  - test: "vCard special character encoding"
    expected: "Entering 'O'Brien;Jr' as name, scanning the QR, shows 'O'Brien;Jr' in the contact name (semicolon not splitting the field)"
    why_human: "Requires QR scanning with a real device or QR decoder to confirm the RFC 6350 escaping works end-to-end"
---

# Phase 12: Foundation Improvements Verification Report

**Phase Goal:** The site accurately represents its freemium model, header navigation surfaces conversion entry points, tier limits are enforced from one place, and vCard QR codes carry rich contact data
**Verified:** 2026-03-31
**Status:** gaps_found — 1 gap blocking full TIER-01 coverage
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A single source of truth for tier limits exists at src/lib/tierLimits.ts | VERIFIED | File exists with TIER_LIMITS constant: free(5/3), starter(100/10), pro(250/100) |
| 2 | save.ts reads limit values from TIER_LIMITS, not hardcoded magic numbers | VERIFIED | `import { TIER_LIMITS, type TierKey }` at line 8; `limits.totalQr` and `limits.dynamicQr` used at lines 73, 86, 148 |
| 3 | Header shows a Pricing navigation link between logo and auth buttons | VERIFIED | `href="/pricing"` with `text-gray-700 hover:text-gray-900` text-link style found at lines 16-21 of Header.astro |
| 4 | Header shows a Sign Up outlined-blue button next to Sign In when signed out | VERIFIED | `href="/signup"` with `border border-[#2563EB]` outlined style at lines 25-30; Sign Up precedes Sign In; both inside `<Show when="signed-out">` |
| 5 | Hero subtext no longer contains 'no limits' | VERIFIED | `grep "no limits"` returns 0 matches; "No signup required" present at line 13 of Hero.astro |
| 6 | FAQ contains no unqualified 'no limits' or 'unlimited' absolute claims about QR generation | VERIFIED | "unlimited scalability" at line 32 refers to SVG vector format — accurate technical claim. "no signup or account" at line 37 is accurate for anonymous generation (no account required for static QR). No `no limits` phrase found. |
| 7 | Pricing page Pro card shows 250 QR codes and 100 dynamic QR codes; Starter shows 10 dynamic QR codes; No ads removed | VERIFIED | "250 QR codes" at line 154, "100 dynamic QR codes" at line 158, "10 dynamic QR codes" at line 115; grep for "No ads" returns 0 matches |
| 8 | Pricing page Free card shows 3 dynamic QR codes (TIER-01 Free tier) | FAILED | Free card has no dynamic QR list item. TIER-01 explicitly requires "Free: 3". UI-SPEC chose to omit this row, directly contradicting the requirement. |
| 9 | vCard tab shows all 10 fields and encoding applies RFC 6350 escaping and line folding | VERIFIED | VCardTab.tsx has all 6 new fields (vcard-title through vcard-linkedin); qrEncoding.ts exports `escapeVCard` and `foldLine`; `encodeVCard` applies both to every property value |

**Score: 8/9 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/tierLimits.ts` | TIER_LIMITS with free/starter/pro values | VERIFIED | Exists, 17 lines, exports TierKey type + TierLimitValues interface + TIER_LIMITS constant with correct values |
| `src/pages/api/qr/save.ts` | Enforces limits from TIER_LIMITS for all tiers | VERIFIED | Imports TIER_LIMITS; both static and dynamic paths use `limits.totalQr` and `limits.dynamicQr`; no Infinity or hardcoded limit integers remain |
| `src/components/Header.astro` | Pricing link and Sign Up button | VERIFIED | Both href="/pricing" and href="/signup" present; correct styles applied; Sign Up precedes Sign In |
| `src/components/Hero.astro` | Corrected subtext without 'no limits' | VERIFIED | "No signup required — download as PNG or SVG instantly." at line 13 |
| `src/data/faq.ts` | No unqualified freemium-inaccurate claims | VERIFIED | No "no limits" phrase; "unlimited scalability" refers to SVG format (accurate); "no signup or account" accurate for anonymous use |
| `src/pages/pricing.astro` | Accurate tier limits, No ads removed | PARTIAL | Starter (10 dynamic) and Pro (250 total, 100 dynamic) correct; "No ads" removed. Gap: Free card missing "3 dynamic QR codes" row required by TIER-01 |
| `src/lib/qrEncoding.ts` | escapeVCard, foldLine, extended VCardState, updated encodeVCard | VERIFIED | All four exports present; VCardState has 10 fields (4 required + 6 optional); encodeVCard applies escaping to all values; foldLine used on every line |
| `src/components/tabs/VCardTab.tsx` | 6 new form fields | VERIFIED | All 6 new fields present (vcard-title, vcard-company, vcard-work-phone, vcard-address, vcard-website, vcard-linkedin); correct input types (tel for Work Phone, url for Website/LinkedIn) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/pages/api/qr/save.ts` | `src/lib/tierLimits.ts` | named import `TIER_LIMITS` | VERIFIED | Line 8: `import { TIER_LIMITS, type TierKey } from '../../../lib/tierLimits'` |
| `src/components/Header.astro` | `/signup` | `href` on Sign Up button | VERIFIED | Line 27: `href="/signup"` |
| `src/components/Header.astro` | `/pricing` | `href` on Pricing nav link | VERIFIED | Line 17: `href="/pricing"` |
| `src/components/tabs/VCardTab.tsx` | `src/lib/qrEncoding.ts` | `import type { VCardState }` | VERIFIED | Line 1: `import type { VCardState } from "../../lib/qrEncoding"` |
| `src/lib/qrEncoding.ts` | `escapeVCard` | Applied in encodeVCard to all property values | VERIFIED | `const e = escapeVCard` at line 74; applied to all 10 fields in encodeVCard body |

---

### Data-Flow Trace (Level 4)

Not applicable for this phase. Phase 12 covers: a constants module (tierLimits.ts — no UI rendering), an API route (save.ts — server-side enforcement, not a data-rendering component), static copy files (Header.astro, Hero.astro, pricing.astro — no dynamic data state), a form component (VCardTab.tsx — user input state, not fetched data), and an encoding utility (qrEncoding.ts). None of these are data-fetching UI components requiring a data-flow trace.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| tierLimits exports correct values | `node -e "const t = require('./src/lib/tierLimits'); console.log(JSON.stringify(t.TIER_LIMITS))"` | N/A — TypeScript module, not CJS | SKIP (TS module) |
| TypeScript compiles clean | `npx tsc --noEmit` | No output (exit 0) | PASS |
| save.ts imports TIER_LIMITS | `grep "import { TIER_LIMITS" src/pages/api/qr/save.ts` | Line 8 match | PASS |
| save.ts uses limits.totalQr | `grep "limits.totalQr" src/pages/api/qr/save.ts` | 2 matches (lines 73, 148) | PASS |
| Hero has no "no limits" | `grep "no limits" src/components/Hero.astro` | 0 matches | PASS |
| Pricing has no "No ads" | `grep "No ads" src/pages/pricing.astro` | 0 matches | PASS |
| Pricing Free card has "3 dynamic" | `grep "3 dynamic" src/pages/pricing.astro` | 0 matches | FAIL |
| escapeVCard exported | `grep "export function escapeVCard" src/lib/qrEncoding.ts` | Line 37 match | PASS |
| foldLine exported | `grep "export function foldLine" src/lib/qrEncoding.ts` | Line 49 match | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COPY-01 | 12-02 | Homepage hero, FAQs, features reflect freemium model accurately (no "no limits" claims) | SATISFIED | Hero "no limits" removed; FAQ has no unqualified unlimited claims |
| COPY-02 | 12-02 | Header shows visible Register/Sign Up button next to Sign In | SATISFIED | "Sign Up" outlined button in Header.astro with href="/signup" |
| COPY-03 | 12-02 | Header has clear navigation link to /pricing | SATISFIED | "Pricing" text link with href="/pricing" present in Header.astro |
| TIER-01 | 12-02 | Pricing page shows accurate dynamic QR limits per tier (Free: 3, Starter: 10, Pro: 100) | BLOCKED | Starter (10) and Pro (100) present. Free card omits dynamic QR row entirely — "3 dynamic QR codes" not shown. |
| TIER-02 | 12-02 | Pricing page shows accurate total QR limits per tier (Free: 5, Starter: 100, Pro: 250) | SATISFIED | "5 QR codes" on Free, "100 QR codes" on Starter, "250 QR codes" on Pro |
| TIER-03 | 12-01 | Tier limits enforced server-side, centralized in one module | SATISFIED | src/lib/tierLimits.ts is the single source of truth; save.ts imports and uses TIER_LIMITS |
| TIER-04 | 12-02 | "No ads" benefit removed from Starter/Pro | SATISFIED | grep for "No ads" returns 0 matches in pricing.astro |
| VCARD-01 | 12-03 | vCard tab supports Title, Company, Work Phone, Address, Website, LinkedIn | SATISFIED | All 6 fields present in VCardTab.tsx with correct input types and labels |
| VCARD-02 | 12-03 | vCard encoding properly escapes special characters in all fields | SATISFIED | escapeVCard() and foldLine() present and applied in encodeVCard() |

**Orphaned requirements check:** No requirements assigned to Phase 12 in REQUIREMENTS.md that are absent from the plans above.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/data/faq.ts` | 37 | "requires no signup or account" — absolute claim | INFO | Accurate for anonymous static QR generation (the question asked is "Do I need an account?"); saving QR codes does require an account. This could mislead Pro users but is technically accurate for the primary anonymous use case. Not a blocker. |

No TODO/FIXME/PLACEHOLDER comments found in any modified files. No hardcoded magic limit integers remain in save.ts (the `tier !== 'pro'` guards on lines 156 and 166 are Pro feature gates, not limit-count gates — they are intentional and correct per plan spec). No empty implementations.

---

### Human Verification Required

#### 1. Header Signed-Out State

**Test:** Open the site in a browser while not signed in. Observe the header.
**Expected:** Three elements appear in order left-to-right: "Pricing" text link (gray, no border), "Sign Up" button (outlined blue border), "Sign In" button (filled blue). Clicking Pricing goes to /pricing. Clicking Sign Up goes to /signup.
**Why human:** Clerk `<Show when="signed-out">` requires an authenticated browser context to verify the conditional rendering fires correctly.

#### 2. Hero Subtext Visual

**Test:** Open the homepage and inspect the hero paragraph beneath the h1.
**Expected:** Text reads "No signup required — download as PNG or SVG instantly." with no "no limits" or "unlimited" text visible anywhere on the page.
**Why human:** Visual confirmation that the paragraph renders and is not hidden by a CSS rule or overridden by another component.

#### 3. vCard Tab — All 10 Fields Visible and Wired

**Test:** Open the QR generator, click the vCard tab. Fill in all 10 fields including Title, Company, Work Phone, Address, Website, and LinkedIn. Generate and download the QR code. Scan with a QR reader.
**Expected:** The decoded vCard contains all 10 filled values; no field is dropped or corrupted.
**Why human:** React island rendering and QR encode-then-decode cycle cannot be verified by static analysis.

#### 4. vCard Special Character Encoding

**Test:** In the vCard Name field, enter "O'Brien;Jr". Generate and download the QR. Decode the QR (use a QR scanner app or online decoder).
**Expected:** The raw vCard text shows `FN:O'Brien\;Jr` (semicolon escaped), and the contact app displays the name as "O'Brien;Jr" without splitting.
**Why human:** Requires a QR scanner to decode the generated code and inspect the raw vCard content.

---

### Gaps Summary

**1 gap blocks full TIER-01 compliance:**

TIER-01 requires the pricing page to show dynamic QR limits for all three tiers: Free (3), Starter (10), Pro (100). The implementation correctly added "10 dynamic QR codes" to the Starter card and "100 dynamic QR codes" to the Pro card. However, the Free card omits a dynamic QR row entirely.

The UI-SPEC (line 127) introduced a product decision to omit the dynamic QR row from the Free card ("Free users cannot use dynamic QRs"), but the REQUIREMENTS.md specification explicitly lists "Free: 3" as part of TIER-01. The plan executor followed the UI-SPEC default without flagging the contradiction.

**Fix required:** Add `<li class="flex items-center gap-2">` with the standard SVG checkmark and text "3 dynamic QR codes" to the Free card `<ul>` in `src/pages/pricing.astro`, immediately after the "5 QR codes" list item. This is a single-line content addition consistent with the existing pattern.

**Note on FAQ "no signup or account" claim:** The FAQ item answering "Do I need to create an account to use QRCraft?" states "No. QRCraft is fully free and requires no signup or account." This is accurate for the anonymous static QR generation flow (the primary use case). However, saving QR codes does require account creation. This is not classified as a blocker for COPY-01 since the answer is technically accurate for the question asked and the plan explicitly reviewed and approved it without change.

---

_Verified: 2026-03-31_
_Verifier: Claude (gsd-verifier)_
