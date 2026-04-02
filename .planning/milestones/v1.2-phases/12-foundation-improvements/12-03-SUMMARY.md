---
phase: 12-foundation-improvements
plan: "03"
subsystem: ui
tags: [react, typescript, vcard, rfc6350, encoding, form]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: project scaffold and TypeScript config
provides:
  - escapeVCard RFC 6350 character escaping for vCard property values
  - foldLine RFC 6350 75-byte line folding with CRLF+space
  - VCardState extended with 6 optional contact fields
  - encodeVCard updated with escaping and new field support
  - VCardTab UI showing 10 total contact fields
affects: [vcard-tab, qr-encoding, QRGeneratorIsland]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - escapeVCard-before-encode: always escape vCard property values before encoding to prevent delimiter corruption
    - foldLine-every-line: apply RFC 6350 folding to every vCard line to handle long addresses/names

key-files:
  created:
    - tests/vcard-encoding.spec.ts
  modified:
    - src/lib/qrEncoding.ts
    - src/components/tabs/VCardTab.tsx

key-decisions:
  - "escapeVCard escapes backslash first to avoid double-escaping when chained with other replacements"
  - "foldLine uses TextEncoder for byte-accurate UTF-8 splitting at 75-byte boundary"
  - "New VCardTab fields use font-normal labels per UI-SPEC (existing fields keep font-medium unchanged)"
  - "company maps to ORG;TYPE=work to distinguish from org (legacy plain ORG) avoiding duplicate property"

patterns-established:
  - "RFC 6350 escaping: all vCard property values must be passed through escapeVCard before embedding in output"
  - "RFC 6350 folding: all vCard lines must be passed through foldLine to handle long values"

requirements-completed:
  - VCARD-01
  - VCARD-02

# Metrics
duration: 20min
completed: 2026-03-31
---

# Phase 12 Plan 03: vCard RFC 6350 Escaping + 6 New Contact Fields Summary

**escapeVCard/foldLine RFC 6350 safety functions added to qrEncoding.ts; VCardState extended with title/company/workPhone/address/website/linkedin; VCardTab shows all 10 fields**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-31T05:53:39Z
- **Completed:** 2026-03-31T06:13:00Z
- **Tasks:** 2 (+ 1 TDD RED test commit)
- **Files modified:** 3

## Accomplishments
- Added `escapeVCard()` that escapes backslash, semicolons, commas, and newlines per RFC 6350 — prevents delimiter corruption from user-entered special characters
- Added `foldLine()` using TextEncoder for byte-accurate UTF-8 splitting at 75-byte boundaries with CRLF+space folding
- Extended `VCardState` interface with 6 optional fields; updated `encodeVCard()` to apply escaping to all values and emit correct RFC 6350 property names (TITLE, ORG;TYPE=work, TEL;TYPE=work, ADR;TYPE=work, URL, X-SOCIALPROFILE;TYPE=linkedin)
- Updated `isVCardEmpty()` to check all 10 fields including the new optional ones
- Added 6 new form fields to `VCardTab.tsx` with correct input types (tel, url, text) and font-normal labels per UI-SPEC

## Task Commits

Each task was committed atomically:

1. **TDD RED: Failing tests for escapeVCard/foldLine** - `e41b695` (test)
2. **Task 1: escapeVCard, foldLine, VCardState extension, encodeVCard rewrite** - `b4e9453` (feat)
3. **Task 2: 6 new fields in VCardTab** - `448f425` (feat)

## Files Created/Modified
- `tests/vcard-encoding.spec.ts` - Unit-style Playwright tests for escapeVCard, foldLine, encodeVCard, isVCardEmpty
- `src/lib/qrEncoding.ts` - Added escapeVCard, foldLine; extended VCardState + encodeVCard + isVCardEmpty
- `src/components/tabs/VCardTab.tsx` - 6 new input fields (Title, Company, Work Phone, Address, Website, LinkedIn)

## Decisions Made
- `escapeVCard` escapes backslash first (before semicolon/comma) to avoid double-escaping when replacements chain
- `foldLine` uses `TextEncoder` for correct byte counting on multi-byte Unicode characters (not `.length` which counts code units)
- `company` maps to `ORG;TYPE=work` (not plain `ORG`) to distinguish from the legacy `org` field — avoids ambiguous duplicate ORG properties in output
- New VCardTab labels use `font-normal` per UI-SPEC for Phase 12; existing 4 fields kept as `font-medium` (no back-compat change)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all 10 fields are wired to live state and encoding.

## Next Phase Readiness
- vCard encoding is now RFC 6350 compliant; all special characters safe
- VCardTab UI complete with 10 fields; ready for Phase 12 remaining plans
- `QRGeneratorIsland` initial `vcardValue` state only initializes 4 required fields — optional fields default to `undefined` which is correct TypeScript behavior

---
*Phase: 12-foundation-improvements*
*Completed: 2026-03-31*

## Self-Check: PASSED

- FOUND: .planning/phases/12-foundation-improvements/12-03-SUMMARY.md
- FOUND: src/lib/qrEncoding.ts (with escapeVCard, foldLine, extended VCardState)
- FOUND: src/components/tabs/VCardTab.tsx (with 6 new fields)
- FOUND: tests/vcard-encoding.spec.ts (TDD RED test file)
- Commits verified: e41b695 (test RED), b4e9453 (feat Task 1), 448f425 (feat Task 2)
