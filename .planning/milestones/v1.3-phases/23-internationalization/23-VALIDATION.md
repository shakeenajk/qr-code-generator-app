---
phase: 23
slug: internationalization
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Structural grep checks (per-task) + `npm run build` (per-wave) + Playwright smoke |
| **Config file** | N/A — grep-based verification inline in each task |
| **Quick run command** | Per-task `<automated>` grep/build commands (see map below) |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~5 seconds per task verify, ~30 seconds for full build |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full build must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 23-01-01 | 01 | 1 | I18N-02, I18N-03 | structural | `grep -q "i18n:" astro.config.mjs && grep -q "useTranslations" src/i18n/utils.ts && npx astro check && echo "PASS"` | pending |
| 23-01-02 | 01 | 1 | I18N-02, I18N-03 | structural | `grep -q "hreflang" src/layouts/Layout.astro && grep -q "LanguageSwitcher" src/components/Header.astro && npx astro build && echo "PASS"` | pending |
| 23-02-01 | 02 | 2 | I18N-01 | structural | `ls src/pages/es/index.astro src/pages/fr/index.astro src/pages/de/index.astro && npx astro build && echo "PASS"` | pending |
| 23-02-02 | 02 | 2 | I18N-01, I18N-02, I18N-03 | smoke | `npx playwright test tests/i18n.spec.ts --reporter=list` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

None — all tasks use structural checks or create test files inline (Plan 02 Task 2 creates tests/i18n.spec.ts).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Translation quality (ES/FR/DE) | I18N-01 | Requires human language review | Read each translated page, verify natural language quality |
| Language switcher visual placement | I18N-02 | Visual verification | Check header shows language dropdown on all pages |
| Sitemap contains all locale URLs | I18N-03 | Requires inspecting built sitemap | `cat dist/client/sitemap-0.xml \| grep xhtml:link` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not needed — test file created within plan execution
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
