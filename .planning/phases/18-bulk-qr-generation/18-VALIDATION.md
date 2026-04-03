---
phase: 18
slug: bulk-qr-generation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 18 — Validation Strategy

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
| 18-01-01 | 01 | 1 | BULK-01, BULK-03 | structural | `grep -q "papaparse" package.json && grep -q "BULK_TIER_LIMITS" src/lib/bulkLimits.ts && echo "PASS"` | pending |
| 18-01-02 | 01 | 1 | BULK-01, BULK-03 | structural | `grep -q "BulkGenerateIsland" src/pages/dashboard/bulk.astro && grep -q "bulkLimits" src/components/BulkGenerateIsland.tsx && echo "PASS"` | pending |
| 18-02-01 | 02 | 2 | BULK-02, BULK-04 | structural | `grep -q "jszip" src/components/BulkGenerateIsland.tsx && grep -q "generateAll" src/components/BulkGenerateIsland.tsx && grep -q "URL.createObjectURL" src/components/BulkGenerateIsland.tsx && echo "PASS"` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

None — all tasks use structural grep checks. No pre-existing test stubs required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CSV upload parses 500 rows without freezing | BULK-01 | Requires real browser with large CSV | Upload a 500-row CSV, verify progress bar and no tab crash |
| ZIP download contains correct PNGs | BULK-02 | Requires browser download inspection | Download ZIP, extract, verify QR images match CSV rows |
| Free tier upgrade CTA shows correctly | BULK-03 | Requires signed-in free-tier session | Sign in as free user, navigate to /dashboard/bulk, verify CTA |
| Thumbnail preview grid renders all rows | BULK-04 | Visual verification | Generate batch, verify thumbnail count matches row count |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (grep-based structural checks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not needed — no tasks reference MISSING test stubs
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
