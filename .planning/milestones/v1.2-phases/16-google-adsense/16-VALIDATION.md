---
phase: 16
slug: google-adsense
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Structural grep checks (per-task) + `npm run build` (per-wave) |
| **Config file** | N/A — grep-based verification inline in each task |
| **Quick run command** | Per-task `<automated>` grep commands (see map below) |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~5 seconds per task verify, ~30 seconds for full build |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` grep command
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full build must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 16-01-01 | 01 | 1 | ADS-01, ADS-02 | structural | `grep -q "AdUnit" src/components/AdUnit.tsx && grep -q "adsbygoogle" src/components/AdUnit.tsx && echo "PASS"` | pending |
| 16-01-02 | 01 | 1 | ADS-01, ADS-02 | structural | `grep -q "AdUnit" src/components/QRGeneratorIsland.tsx && grep -q 'userTier.*free' src/components/QRGeneratorIsland.tsx && echo "PASS"` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

None — all tasks use structural grep checks. No pre-existing test stubs required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ad renders for free-tier user | ADS-01 | Requires AdSense account approval + signed-in session | Sign in as free-tier user, scroll below fold, verify ad displays |
| Ad hidden for paid users | ADS-02 | Requires signed-in Starter/Pro session | Sign in as Starter/Pro, verify no ad container in DOM |
| Ad hidden for anonymous | ADS-02 | Requires unauthenticated session | Visit generator page signed out, verify no ad code loaded |
| Lighthouse >= 90 | ADS-01 | Requires Lighthouse CI run | `npx lhci autorun` or Chrome DevTools Lighthouse audit |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (grep-based structural checks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not needed — no tasks reference MISSING test stubs
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
