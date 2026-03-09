---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (latest) |
| **Config file** | `playwright.config.ts` — Wave 0 installs |
| **Quick run command** | `npx playwright test --project=chromium --grep @smoke` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --project=chromium --grep @smoke`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | — | setup | `npx playwright test --list` | ❌ W0 | ⬜ pending |
| 1-xx-BRAND-01 | TBD | 1 | BRAND-01 | smoke | `npx playwright test --grep "logo"` | ❌ W0 | ⬜ pending |
| 1-xx-BRAND-02 | TBD | 1 | BRAND-02 | smoke | `npx playwright test --grep "brand colors"` | ❌ W0 | ⬜ pending |
| 1-xx-BRAND-03 | TBD | 1 | BRAND-03 | smoke | `npx playwright test --grep "mobile"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-01 | TBD | 1 | SEO-01 | smoke | `npx playwright test --grep "meta tags"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-02 | TBD | 1 | SEO-02 | smoke | `npx playwright test --grep "open graph"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-03 | TBD | 1 | SEO-03 | smoke | `npx playwright test --grep "webapplication schema"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-04 | TBD | 1 | SEO-04 | smoke | `npx playwright test --grep "faqpage schema"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-05 | TBD | 1 | SEO-05 | smoke | `npx playwright test --grep "faq section"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-06 | TBD | 1 | SEO-06 | smoke | `npx playwright test --grep "sitemap"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-07 | TBD | 1 | SEO-07 | smoke | `npx playwright test --grep "robots"` | ❌ W0 | ⬜ pending |
| 1-xx-SEO-08 | TBD | 1 | SEO-08 | smoke | `npx playwright test --grep "semantic html"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/foundation.spec.ts` — smoke tests for all BRAND-01 through SEO-08 requirements
- [ ] `playwright.config.ts` — base config with `webServer` pointing to `npm run preview`
- [ ] Playwright install: `npm init playwright@latest` (if not present)
- [ ] `package.json` scripts: `"test": "playwright test"` and `"test:smoke": "playwright test --grep @smoke"`

*All tests run against the built static site (`npm run build && npm run preview`). The `webServer` config starts the preview server automatically.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

*All phase behaviors have automated verification via Playwright smoke tests.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
