---
phase: 9
slug: saved-qr-library-pro-gates
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Playwright ^1.58.2 |
| **Config file** | `playwright.config.ts` (root) |
| **Quick run command** | `npm run test:smoke` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~30 seconds (smoke), ~90 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:smoke`
- **After every plan wave:** Run `npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | LIB-01 | smoke API | `npm run test:smoke -- --grep "Save API"` | ❌ Wave 0 | ⬜ pending |
| 9-01-02 | 01 | 0 | LIB-02 | smoke API | `npm run test:smoke -- --grep "QR List API"` | ❌ Wave 0 | ⬜ pending |
| 9-01-03 | 01 | 0 | LIB-03 | smoke API | `npm run test:smoke -- --grep "QR Update API"` | ❌ Wave 0 | ⬜ pending |
| 9-01-04 | 01 | 0 | LIB-04 | smoke API | `npm run test:smoke -- --grep "QR Delete API"` | ❌ Wave 0 | ⬜ pending |
| 9-01-05 | 01 | 0 | GATE-01,GATE-02,GATE-03 | smoke UI | `npm run test:smoke -- --grep "Pro gates"` | ❌ Wave 0 | ⬜ pending |
| 9-02-01 | 02 | 1 | LIB-01 | smoke API | `npm run test:smoke -- --grep "Save API"` | ✅ Wave 0 | ⬜ pending |
| 9-02-02 | 02 | 1 | GATE-01,GATE-02 | smoke UI | `npm run test:smoke -- --grep "Pro gates"` | ✅ Wave 0 | ⬜ pending |
| 9-03-01 | 03 | 2 | LIB-02 | smoke UI | `npm run test:smoke -- --grep "QR Library"` | ❌ Wave 0 | ⬜ pending |
| 9-04-01 | 04 | 2 | LIB-03,LIB-04 | smoke UI | `npm run test:smoke -- --grep "Edit|Delete"` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/library/save-api.spec.ts` — stubs for LIB-01 (unauthenticated 401 + non-Pro 403 cases)
- [ ] `tests/library/list-api.spec.ts` — stubs for LIB-02 (unauthenticated 401)
- [ ] `tests/library/update-api.spec.ts` — stubs for LIB-03 (unauthenticated 401)
- [ ] `tests/library/delete-api.spec.ts` — stubs for LIB-04 (unauthenticated 401)
- [ ] `tests/gates/pro-gates.spec.ts` — stubs for GATE-01, GATE-02, GATE-03 (anonymous user sees no locks, no save button)

*All test files are new — no existing test infrastructure covers these features.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pro user saves QR code with custom name and sees it in library | LIB-01, LIB-02 | Requires real Pro Clerk session + live Turso write | Log in as Pro user, generate QR, click Save to Library, enter name, verify card appears on /dashboard |
| Pro user edits saved QR and Save Changes updates DB record | LIB-03 | Requires real session + DB mutation | From library card, click Edit, modify settings, click Save Changes, verify library card reflects update |
| Pro user deletes QR and it's removed from library | LIB-04 | Requires real session + DB delete | From library card, click Delete, confirm, verify card disappears |
| Authenticated non-Pro sees lock overlay on classy shapes | GATE-02 | Requires seeded non-Pro Clerk session | Log in as free/starter user, visit homepage generator, verify classy and classy-rounded have lock overlay |
| Authenticated non-Pro sees save button disabled (greyed, lock icon) | LIB-01 (gate) | Requires real auth state | Log in as free/starter, verify Save to Library button is greyed out with lock icon and click shows upgrade prompt |
| Anonymous user sees all features unlocked, no save button | GATE-03 | Complementary E2E UX check | Open homepage in private window, verify no lock overlays, no Save button visible |
| Edit mode banner shows "Editing: [QR Name]" with Save Changes + Cancel | LIB-03 | Requires live DB record and navigation | From library, click Edit on a saved QR, verify URL has ?edit=[id] param and edit banner is shown |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
