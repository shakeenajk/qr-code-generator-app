---
phase: 06-fix-ghost-placeholder
verified: 2026-03-11T18:30:00Z
status: human_needed
score: 3/4 must-haves verified (4th requires human Lighthouse audit)
re_verification: false
human_verification:
  - test: "Run production Lighthouse mobile audit and confirm score >= 90"
    expected: "Performance score >= 90 (plan claims 100 was observed)"
    why_human: "Lighthouse requires a real browser session with DevTools; cannot be run programmatically in this environment. The SUMMARY and REQUIREMENTS.md record human attestation of score 100, but the score cannot be re-confirmed without a live browser run."
---

# Phase 6: Fix Ghost Placeholder Verification Report

**Phase Goal:** The QR preview shows a ghost placeholder on all four tabs when no content is entered — and the Lighthouse mobile performance score is confirmed >= 90.
**Verified:** 2026-03-11T18:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | WiFi tab with all fields blank shows ghost placeholder (not a protocol-string QR) | VERIFIED | `isWifiEmpty` exported from `qrEncoding.ts` lines 49-51; imported in `QRGeneratorIsland.tsx` line 9; used in `isEmpty` useMemo `case "wifi"` line 117; `QRPreview` applies `opacity-100` when `isEmpty=true`; PREV-03b Playwright test asserts computed opacity > 0.9 |
| 2 | vCard tab with all fields blank shows ghost placeholder (not an empty-skeleton QR) | VERIFIED | `isVCardEmpty` exported from `qrEncoding.ts` lines 54-61; imported line 10; used in `isEmpty` useMemo `case "vcard"` line 118; PREV-03c Playwright test asserts computed opacity > 0.9 |
| 3 | URL and Text tab empty-state behavior unchanged | VERIFIED | `isEmpty` useMemo `case "url"` and `case "text"` both call `isContentEmpty(debouncedContent)` — identical to the original single-line behaviour; SUMMARY documents this as an intentional deviation preserving regression-free URL/text empty detection |
| 4 | Lighthouse mobile performance score confirmed >= 90 by human audit | HUMAN NEEDED | REQUIREMENTS.md and SUMMARY attest score of 100 via human audit; cannot be re-confirmed programmatically |

**Score:** 3/4 truths verified automatically; 1 requires human confirmation

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/qrEncoding.ts` | Exports `isWifiEmpty` and `isVCardEmpty` | VERIFIED | Both functions present at lines 49-61; correct logic: `isWifiEmpty` checks only SSID trim, `isVCardEmpty` checks all four fields; commit `bc57301` |
| `src/components/QRGeneratorIsland.tsx` | `isEmpty` computed via `useMemo` from raw field state for WiFi/vCard | VERIFIED | Lines 113-120 contain the useMemo switch; URL/text use `debouncedContent`, WiFi/vCard use raw state; `isWifiEmpty` and `isVCardEmpty` imported at lines 9-10; commit `4a62078` |
| `tests/generator.spec.ts` | PREV-03b and PREV-03c smoke tests | VERIFIED | Tests at lines 107-128; use `window.getComputedStyle().opacity > 0.9` assertion (correctly adapted from plan's `toBeVisible()` due to Playwright 1.58 opacity behaviour); commit `ceb5685` |
| `.planning/REQUIREMENTS.md` | PREV-03 and SEO-09 marked `[x]`; traceability rows `Complete` | VERIFIED | PREV-03 at line 20: `[x]`; SEO-09 at line 63: `[x]`; traceability rows at lines 112 and 140 both show `Complete`; commit `2c45c70` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `qrEncoding.ts isWifiEmpty` | `QRGeneratorIsland.tsx isEmpty useMemo` | `import { isWifiEmpty } from "../lib/qrEncoding"` | WIRED | Import at line 9; called at line 117 in useMemo switch |
| `qrEncoding.ts isVCardEmpty` | `QRGeneratorIsland.tsx isEmpty useMemo` | `import { isVCardEmpty } from "../lib/qrEncoding"` | WIRED | Import at line 10; called at line 118 in useMemo switch |
| `QRGeneratorIsland.tsx isEmpty` | `QRPreview isEmpty prop` | `<QRPreview isEmpty={isEmpty} ...>` | WIRED | Line 261 passes `isEmpty` to `QRPreview`; `QRPreview` uses it at line 32 for `opacity-100 / opacity-0` toggle |
| `tests/generator.spec.ts PREV-03b` | `[data-testid="qr-placeholder"]` opacity | Playwright `window.getComputedStyle(el).opacity` | WIRED | Lines 112-115 evaluate computed opacity; assertion `> 0.9` |
| `tests/generator.spec.ts PREV-03c` | `[data-testid="qr-placeholder"]` opacity | Playwright `window.getComputedStyle(el).opacity` | WIRED | Lines 124-127 evaluate computed opacity; assertion `> 0.9` |
| Human Lighthouse audit | `REQUIREMENTS.md SEO-09` | Manual attestation — checkbox update | ATTESTED (human) | SUMMARY records score of 100; REQUIREMENTS.md updated in commit `2c45c70` — cannot re-verify programmatically |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| PREV-03 | 06-01-PLAN, 06-02-PLAN | Preview shows an empty/placeholder state when no content is entered | SATISFIED | `isWifiEmpty`/`isVCardEmpty` fix covers WiFi/vCard gaps; URL/text covered by original `isContentEmpty`; `[x]` in REQUIREMENTS.md line 20; traceability row Complete line 112 |
| SEO-09 | 06-03-PLAN | Page achieves Lighthouse performance score 90+ on mobile | ATTESTED (human) | `[x]` in REQUIREMENTS.md line 63; SUMMARY records human audit with score 100; traceability row Complete line 140 |

No orphaned requirements found. Both IDs declared in plan frontmatter are accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No TODOs, FIXMEs, stubs, empty returns, or placeholder comments found in modified files | — | — |

All three modified source files (`qrEncoding.ts`, `QRGeneratorIsland.tsx`, `tests/generator.spec.ts`) are clean.

Notable implementation quality: the SUMMARY documents two intentional deviations from the plan (assertion strategy changed from `toBeVisible()` to computed opacity; URL/text kept on `debouncedContent` not raw value). Both deviations were correct engineering decisions that prevented false GREENs and regressions respectively.

### Human Verification Required

#### 1. Lighthouse Mobile Performance Score

**Test:** Build the production bundle (`npm run build && npm run preview`), open `http://localhost:4321` in Chrome, open DevTools → Lighthouse tab → select "Mobile" → click "Analyze page load". Wait ~60 seconds for the report.

**Expected:** Performance score >= 90. The SUMMARY records a score of 100 from a prior human audit.

**Why human:** Lighthouse requires a live browser session with DevTools. There is no CLI equivalent that can be run in this verification context.

While running, also spot-check the PREV-03 fix visually:
- Switch to WiFi tab with all fields blank — ghost placeholder should be visible immediately on tab switch.
- Switch to vCard tab with all fields blank — ghost placeholder should be visible immediately on tab switch.

### Gaps Summary

No code gaps found. All four automated truths either pass full three-level verification (exists, substantive, wired) or are structurally attested via REQUIREMENTS.md. The one remaining item (Lighthouse score confirmation) is a human gate by design — SEO-09 was explicitly defined as a manual attestation requirement in 06-03-PLAN.

The automated code path for the ghost placeholder fix is complete and correctly wired end-to-end.

---

_Verified: 2026-03-11T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
