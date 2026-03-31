---
phase: 15
slug: hosted-landing-pages
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-31
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Structural grep checks (per-task) + `npm run build` (per-wave) |
| **Config file** | N/A — grep-based verification inline in each task |
| **Quick run command** | Per-task `<automated>` grep commands (see map below) |
| **Full suite command** | `npm run build` (catches TypeScript and Astro build errors) |
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
| 15-01-01 | 01 | 1 | CONT-01, CONT-02, CONT-03 | structural | `grep -q "landingPages" src/db/schema.ts && grep -q "@vercel/blob" package.json && ls drizzle/*.sql \| head -1 && echo "PASS"` | pending |
| 15-01-02 | 01 | 1 | CONT-01, CONT-02, CONT-03 | structural | `grep -q "handleUpload" src/pages/api/landing/upload.ts && grep -q "total_limit_reached" src/pages/api/landing/create.ts && grep -q "del(" "src/pages/api/landing/[id].ts" && echo "PASS"` | pending |
| 15-02-01 | 02 | 2 | CONT-01 | structural | `grep -q "FileUploadZone" src/components/FileUploadZone.tsx && grep -q "onSave" src/components/tabs/PdfTab.tsx && grep -q "socialLinks" src/components/tabs/PdfTab.tsx && echo "PASS"` | pending |
| 15-02-02 | 02 | 2 | CONT-02 | structural | `grep -q "AppStoreTab" src/components/tabs/AppStoreTab.tsx && grep -q '"pdf"' src/components/QRGeneratorIsland.tsx && grep -q '"appstore"' src/components/QRGeneratorIsland.tsx && grep -q "PdfTab" src/components/QRGeneratorIsland.tsx && echo "PASS"` | pending |
| 15-03-01 | 03 | 2 | CONT-01, CONT-02, CONT-03 | structural | `grep -q "prerender = false" src/pages/p/\[slug\].astro && grep -q "og:title" src/pages/p/\[slug\].astro && grep -q "og:image" src/pages/p/\[slug\].astro && grep -q "Cache-Control" src/pages/p/\[slug\].astro && echo "PASS"` | pending |
| 15-03-02 | 03 | 2 | CONT-01, CONT-02 | structural | `grep -q "landingPageId" src/pages/api/qr/list.ts && grep -q "landingPages" src/pages/api/qr/list.ts && grep -q "isLandingPage" src/pages/api/qr/list.ts && echo "PASS"` | pending |
| 15-04-01 | 04 | 3 | CONT-01, CONT-02 | structural | `grep -q "PdfCardBody\|PdfBadge" src/components/dashboard/QRLibrary.tsx && grep -q "AppStoreBadge\|AppStoreCardBody" src/components/dashboard/QRLibrary.tsx && grep -q "landingPageId" src/components/dashboard/QRLibrary.tsx && grep -q "edit-landing" src/components/dashboard/QRLibrary.tsx && echo "PASS"` | pending |
| 15-04-02 | 04 | 3 | CONT-01, CONT-02 | structural | `grep -q "prerender = false" "src/pages/dashboard/edit-landing/[id].astro" && grep -q "EditLandingPageForm" src/components/EditLandingPageForm.tsx && grep -q "api/landing" src/components/EditLandingPageForm.tsx && echo "PASS"` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

None — all tasks use structural grep checks that verify file contents after creation. No pre-existing test stubs required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OG meta tags render for social crawlers | CONT-03 | Requires external crawler or curl inspection | `curl -s /p/[slug] \| grep 'og:title'` |
| PDF viewer renders uploaded file | CONT-01 | Visual verification of embedded PDF | Open /p/[slug] in browser, confirm PDF displays |
| App Store buttons link correctly | CONT-02 | External store URL validation | Click each store button, verify redirect |
| File re-upload replaces old Blob correctly | CONT-01, CONT-02 | Requires Blob storage interaction | Edit a landing page, re-upload a file, verify old URL no longer resolves |

*Plan 04 Task 3 (checkpoint:human-verify) covers all manual verifications end-to-end.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (grep-based structural checks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not needed — no tasks reference MISSING test stubs
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
