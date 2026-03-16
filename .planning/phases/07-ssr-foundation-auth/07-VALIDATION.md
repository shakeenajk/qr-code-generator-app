---
phase: 7
slug: ssr-foundation-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright (existing) |
| **Config file** | `playwright.config.ts` |
| **Quick run command** | `npx playwright test --grep @smoke` |
| **Full suite command** | `npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --grep @smoke`
- **After every plan wave:** Run `npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 0 | AUTH-01 | e2e | `npx playwright test --grep @smoke` | ❌ W0 | ⬜ pending |
| 7-01-02 | 01 | 1 | AUTH-01 | e2e | `npx playwright test auth/signup.spec.ts` | ❌ W0 | ⬜ pending |
| 7-01-03 | 01 | 1 | AUTH-02 | e2e | `npx playwright test auth/signin.spec.ts` | ❌ W0 | ⬜ pending |
| 7-02-01 | 02 | 1 | AUTH-03 | e2e | `npx playwright test auth/session.spec.ts` | ❌ W0 | ⬜ pending |
| 7-02-02 | 02 | 1 | AUTH-04 | e2e | `npx playwright test auth/signout.spec.ts` | ❌ W0 | ⬜ pending |
| 7-03-01 | 03 | 1 | AUTH-05 | e2e | `npx playwright test auth/redirect.spec.ts` | ❌ W0 | ⬜ pending |
| 7-03-02 | 03 | 2 | AUTH-05 | e2e | `npx playwright test auth/static-homepage.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/auth/signup.spec.ts` — stubs for AUTH-01 (email/password signup)
- [ ] `tests/auth/signin.spec.ts` — stubs for AUTH-02 (OAuth + email signin)
- [ ] `tests/auth/session.spec.ts` — stubs for AUTH-03 (session persistence)
- [ ] `tests/auth/signout.spec.ts` — stubs for AUTH-04 (sign out redirect)
- [ ] `tests/auth/redirect.spec.ts` — stubs for AUTH-05 (unauthenticated redirect)
- [ ] `tests/auth/static-homepage.spec.ts` — stubs for AUTH-05 (homepage cache hit)
- [ ] Update `playwright.config.ts` webServer to `astro dev` for SSR routes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Google OAuth redirect flow | AUTH-02 | OAuth requires browser + real external provider | Open /login, click "Sign in with Google", complete flow |
| GitHub OAuth redirect flow | AUTH-02 | OAuth requires browser + real external provider | Open /login, click "Sign in with GitHub", complete flow |
| `x-vercel-cache: HIT` on homepage | AUTH-05 | Requires deployed Vercel environment, not local | Deploy to Vercel preview, `curl -I https://<url>/` and inspect headers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
