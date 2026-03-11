---
phase: 5
slug: complete-dark-mode
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (installed) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test tests/export.spec.ts --grep "@smoke" --project=chromium` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~10 seconds (smoke, single browser) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/export.spec.ts --grep "@smoke" --project=chromium`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | BRAND-04 | smoke stub | `npx playwright test tests/export.spec.ts --grep "features.*dark" --project=chromium` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | BRAND-04 | smoke stub | `npx playwright test tests/export.spec.ts --grep "faq.*dark" --project=chromium` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | BRAND-04 | smoke | `npx playwright test tests/export.spec.ts --grep "features.*dark" --project=chromium` | ✅ after W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | BRAND-04 | smoke | `npx playwright test tests/export.spec.ts --grep "faq.*dark" --project=chromium` | ✅ after W0 | ⬜ pending |
| 05-03-01 | 03 | 3 | BRAND-04 | smoke (full) | `npx playwright test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/export.spec.ts` — two new @smoke stubs in existing Dark Mode describe block: `features section has dark background in dark mode` and `faq section has dark background in dark mode` (will fail until Features.astro and FAQ.astro receive dark: classes)

*Existing test infrastructure in export.spec.ts is in place. Only the two new failing stub tests need to be added as Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual continuity — Features cards look cohesive in dark mode | BRAND-04 | Automated test asserts bg color, not visual quality (card depth, text legibility, overall look) | Run `npm run build && npm run preview`, toggle OS dark mode, confirm Features and FAQ sections look correct |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
