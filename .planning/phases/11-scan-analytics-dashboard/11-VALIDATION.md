---
phase: 11
slug: scan-analytics-dashboard
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (E2E) + vitest (unit) |
| **Config file** | `playwright.config.ts` (existing) / `vitest.config.ts` (if present) |
| **Quick run command** | `npx playwright test tests/analytics --reporter=line` |
| **Full suite command** | `npx playwright test --reporter=line` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test tests/analytics --reporter=line`
- **After every plan wave:** Run `npx playwright test --reporter=line`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | ANAL-01 | schema | `npx drizzle-kit generate && node -e "require('./src/db/schema')"` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | ANAL-01 | E2E | `npx playwright test tests/analytics/scan-events.spec.ts` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | ANAL-01/02/03/04 | E2E | `npx playwright test tests/analytics/analytics-api.spec.ts` | ❌ W0 | ⬜ pending |
| 11-04-01 | 03 | 3 | ANAL-01/02/03/04 | E2E | `npx playwright test tests/analytics/analytics-page.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/analytics/scan-events.spec.ts` — stubs for redirect-side scan event writes (ANAL-01 bot-filter, device detection)
- [ ] `tests/analytics/analytics-api.spec.ts` — stubs for GET /api/analytics/[slug] response shape
- [ ] `tests/analytics/analytics-page.spec.ts` — stubs for analytics page load, stat display, chart render

*Existing Playwright infrastructure covers framework — only new spec files required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bot traffic filtered from counts | ANAL-01 | Requires real UA strings and live DB | Access analytics page after scanning with curl UA; confirm count does not increment |
| Fire-and-forget insert on redirect | ANAL-01 | Edge function timing — hard to assert async write | Scan QR, wait 2s, check analytics page shows +1 count |
| Dark mode chart rendering | ANAL-02 | Visual — Recharts SVG color correctness | Toggle dark mode, confirm chart fill uses indigo-400 |
| Geography top-N list | ANAL-04 | Requires real IP geolocation headers | Use VPN or test IP header injection in dev |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
