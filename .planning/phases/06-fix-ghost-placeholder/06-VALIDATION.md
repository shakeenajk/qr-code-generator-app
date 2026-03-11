---
phase: 6
slug: fix-ghost-placeholder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test --grep @smoke` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --grep @smoke`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 0 | PREV-03 | e2e stub | `npx playwright test --grep @smoke` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | PREV-03 | unit | `npx playwright test --grep @smoke` | ✅ | ⬜ pending |
| 06-02-02 | 02 | 1 | PREV-03 | e2e | `npx playwright test --grep @smoke` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 2 | SEO-09 | manual | Lighthouse CLI or DevTools audit | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/generator.spec.ts` — add failing @smoke stubs for WiFi and vCard empty-state (PREV-03)

*Existing Playwright infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lighthouse mobile score ≥ 90 | SEO-09 | Lighthouse requires a real browser/DevTools run; no CLI automation in project | Run `npx astro build && npx astro preview`, open DevTools → Lighthouse → Mobile → Generate report. Record score. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
