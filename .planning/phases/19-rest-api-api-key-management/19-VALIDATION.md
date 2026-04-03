---
phase: 19
slug: rest-api-api-key-management
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 19 — Validation Strategy

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
| 19-01-01 | 01 | 1 | API-02, API-03 | structural | `grep -q "apiKeys" src/db/schema.ts && grep -q "verifyApiKey" src/lib/apiAuth.ts && grep -q "getApiKeyRateLimiter" src/lib/apiRateLimit.ts && echo "PASS"` | pending |
| 19-01-02 | 01 | 1 | API-02, API-03 | structural | `grep -q "api-keys" src/pages/api/dashboard/api-keys.ts && grep -q "api/v1" src/middleware.ts && echo "PASS"` | pending |
| 19-02-01 | 02 | 2 | API-01, API-04 | structural | `grep -q "toDataURL" src/pages/api/v1/generate.ts && grep -q "verifyApiKey" src/pages/api/v1/generate.ts && grep -q "prerender = false" src/pages/api/v1/generate.ts && echo "PASS"` | pending |
| 19-03-01 | 03 | 2 | API-02 | structural | `grep -q "ApiKeyManagerIsland" src/pages/dashboard/api-keys.astro && grep -q "api/dashboard/api-keys" src/components/ApiKeyManagerIsland.tsx && echo "PASS"` | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

None — all tasks use structural grep checks. No pre-existing test stubs required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| POST /api/v1/generate returns QR PNG | API-01 | Requires API key + curl | `curl -X POST -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"content":"https://example.com"}' /api/v1/generate` |
| Raw API key shown once at creation | API-02 | Requires browser session | Create key in dashboard, verify raw key appears, refresh page, verify key is masked |
| Per-key usage counter increments | API-03 | Requires API call + dashboard check | Make 3 API calls, check dashboard shows count = 3 |
| Revoked key returns 401 | API-02 | Requires revoke + API call | Revoke key, attempt API call, verify 401 |
| Rate limit returns 429 | API-03 | Requires burst of API calls | Send 101 requests in 60s, verify 429 + Retry-After |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (grep-based structural checks)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not needed — no tasks reference MISSING test stubs
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
