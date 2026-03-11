---
phase: 04
slug: export-and-launch
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` (exists) |
| **Quick run command** | `npm run build && npx playwright test --grep @smoke tests/export.spec.ts` |
| **Full suite command** | `npm run build && npm run test` |
| **Estimated runtime** | ~30 seconds (smoke only), ~90 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build && npx playwright test --grep @smoke tests/export.spec.ts`
- **After every plan wave:** Run `npm run build && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | EXPO-01, EXPO-02, EXPO-03, EXPO-04, BRAND-04 | smoke stubs | `npx playwright test --grep @smoke tests/export.spec.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | EXPO-01, EXPO-02 | smoke | `npx playwright test --grep @smoke tests/export.spec.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | EXPO-03, EXPO-04 | smoke | `npx playwright test --grep @smoke tests/export.spec.ts` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | BRAND-04 | smoke | `npx playwright test --grep @smoke tests/export.spec.ts` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | SEO-09 | manual | `npm run build && npm run preview` then Lighthouse | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/export.spec.ts` — failing smoke stubs for EXPO-01, EXPO-02, EXPO-03, EXPO-04, BRAND-04

*Existing Playwright infrastructure covers this phase — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lighthouse mobile performance score ≥ 90 | SEO-09 | Playwright cannot run Lighthouse audits; score varies by environment | Run `npm run build && npm run preview`, open DevTools → Lighthouse → Mobile, run audit, confirm score ≥ 90 |
| Downloaded PNG is 3x resolution (768px or 900px+ side) | EXPO-01 | Playwright can confirm download fires and filename, but not image dimensions without extra tooling | Download PNG, check file properties for width/height ≥ 900px |
| Downloaded SVG contains `<path>` / `<rect>` elements (true vector) | EXPO-02 | Playwright's download handler doesn't parse SVG content in smoke tests | Open downloaded SVG in text editor, confirm `<path>` or `<rect>` elements present, no `<image>` wrapper with base64 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
