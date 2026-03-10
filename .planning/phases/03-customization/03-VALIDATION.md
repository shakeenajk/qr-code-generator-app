---
phase: 3
slug: customization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npm run test:smoke` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds (smoke), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:smoke`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | 01 | 0 | CUST-01–07, LOGO-01–04 | smoke stubs | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 3-01-01 | 01 | 1 | CUST-01 | smoke | `npx playwright test --grep CUST-01` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | CUST-02 | smoke | `npx playwright test --grep CUST-02` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | CUST-07 | smoke | `npx playwright test --grep CUST-07` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | CUST-03 | smoke | `npx playwright test --grep CUST-03` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 2 | CUST-04 | smoke | `npx playwright test --grep CUST-04` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 2 | CUST-05 | smoke | `npx playwright test --grep CUST-05` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 2 | CUST-06 | smoke | `npx playwright test --grep CUST-06` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 3 | LOGO-01 | smoke | `npx playwright test --grep LOGO-01` | ❌ W0 | ⬜ pending |
| 3-04-02 | 04 | 3 | LOGO-02 | smoke | `npx playwright test --grep LOGO-02` | ❌ W0 | ⬜ pending |
| 3-04-03 | 04 | 3 | LOGO-04 | smoke | `npx playwright test --grep LOGO-04` | ❌ W0 | ⬜ pending |
| 3-04-04 | 04 | 3 | LOGO-03 | manual | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/customization.spec.ts` — stubs for CUST-01 through CUST-07, LOGO-01 through LOGO-04 with `@smoke` tag

**`data-*` selector contract — new components must expose:**
- `data-testid="color-fg"` — foreground color picker container
- `data-testid="color-bg"` — background color picker container
- `data-testid="gradient-toggle"` — gradient enable/disable toggle
- `data-testid="gradient-type"` — linear/radial selector
- `data-testid="low-contrast-warning"` — warning banner
- `data-testid="dot-shape-{type}"` — each shape thumbnail button (e.g. `data-testid="dot-shape-rounded"`)
- `data-testid="corner-frame-{type}"` — each frame thumbnail button
- `data-testid="corner-pupil-{type}"` — each pupil thumbnail button
- `data-testid="logo-dropzone"` — drag-and-drop zone
- `data-testid="logo-thumbnail"` — shown after upload
- `data-testid="logo-remove"` — remove button
- `data-testid="logo-ecl-notice"` — "Error correction set to H" info note

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Logo size capped at 25% of QR area | LOGO-03 | Size ratio not inspectable via DOM/Playwright | Upload a large image, visually verify logo does not exceed ~1/4 of QR area |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
