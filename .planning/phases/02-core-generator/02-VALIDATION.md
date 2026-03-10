---
phase: 2
slug: core-generator
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 2 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright 1.58.2 |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npm run test:smoke` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~20 seconds |

## Sampling Rate

- **After every task commit:** Run `npm run test:smoke`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~20 seconds

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 0 | — | infra | `npm run build` | ✅ | ⬜ pending |
| 2-01-02 | 01 | 0 | CONT-01..PREV-03 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 1 | PREV-01 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 1 | CONT-03, CONT-04 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02 | 1 | PREV-02, PREV-03 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 2-02-04 | 02 | 2 | CONT-01 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-02-05 | 02 | 2 | CONT-02 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-02-06 | 02 | 2 | CONT-03 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-02-07 | 02 | 2 | CONT-04 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | CONT-01..PREV-03 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-03-02 | 03 | 3 | CONT-01..PREV-03 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-03-03 | 03 | 3 | CONT-01..PREV-03 | smoke | `npm run test:smoke` | ❌ W0 | ⬜ pending |
| 2-03-04 | 03 | 3 | All | manual | — | — | ⬜ pending |

## Wave 0 Requirements

- [ ] `tests/generator.spec.ts` — 8 @smoke stubs for CONT-01 through PREV-03

*No new framework install — Playwright already configured.*

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ghost QR placeholder looks correct visually | PREV-03 | Visual appearance can't be asserted programmatically | Load page, confirm preview shows a faded QR-like pattern before any input |
| Pulse animation during debounce window | PREV-01 | CSS animation timing is visual | Type in URL field, observe preview briefly dims/pulses before QR appears |
| vCard scans as contact on phone | CONT-04 | Requires physical QR scan | Scan vCard QR with iOS/Android camera, confirm contact fields populate |
| WiFi QR connects to network | CONT-03 | Requires physical network + scan | Scan WiFi QR, confirm device joins the network |

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
