---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Growth & Content
status: Ready to execute
stopped_at: Completed 13-01-PLAN.md
last_updated: "2026-03-31T08:25:16.210Z"
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 4
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-31)

**Core value:** Anyone can generate a visually stunning, fully customized QR code and download it immediately — no signup, no friction.
**Current focus:** Phase 13 — SEO and Homepage Content

## Current Position

Phase: 13 (SEO and Homepage Content) — EXECUTING
Plan: 2 of 4

## Accumulated Context

### Decisions

All v1.0 + v1.1 decisions archived in PROJECT.md Key Decisions table.

Recent decisions affecting current work:

- Phase 12 must create `src/lib/tierLimits.ts` as the very first task — all other phases import from it
- vCard encoding: add `escapeVCard()` and `foldLine()` before adding new fields (RFC 6350 compliance)
- Phase 15 depends on Phase 12 (tier limits centralized) but not Phase 13 or 14 — can overlap
- Phase 16 (AdSense) depends on Phase 13 SEO pages being live and indexed — apply for AdSense after Phase 13 ships
- [Phase 12-foundation-improvements]: Pricing nav link uses text style not accent color — navigation item not CTA (12-02)
- [Phase 12-foundation-improvements]: Starter No ads replaced by 10 dynamic QR codes to satisfy both TIER-04 and TIER-01 simultaneously (12-02)
- [Phase 12-foundation-improvements]: TIER_LIMITS as single source of truth for all QR count enforcement — all limit checks import from src/lib/tierLimits.ts
- [Phase 12-foundation-improvements]: escapeVCard escapes backslash first to avoid double-escaping; company maps to ORG;TYPE=work to distinguish from legacy org field
- [Phase 13-seo-and-homepage-content]: Keep Layout.astro manual OG block; use astro-seo only on new Phase 13 pages via slot
- [Phase 13-seo-and-homepage-content]: SoftwareApplication is the correct schema.org type for QRCraft (not WebApplication)

### Pending Todos

- Upgrade from Google AdSense to self-promo banner ads later
- Phase 15 product decision: confirm whether PDF/App Store landing pages are Pro-only or available to free/Starter (gate inherits from dynamicQrCodes Pro check — verify intent before task planning)
- Phase 15 product decision: per-user Vercel Blob file size limits (suggested: 10MB free, 25MB Pro)
- Phase 16: capture Lighthouse CI baseline before writing any AdSense code; set <90 block gate

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-03-31T08:25:16.206Z
Stopped at: Completed 13-01-PLAN.md
Resume file: None
