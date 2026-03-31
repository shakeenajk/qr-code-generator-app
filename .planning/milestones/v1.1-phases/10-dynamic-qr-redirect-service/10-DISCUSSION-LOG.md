# Phase 10: Dynamic QR Redirect Service - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-29
**Phase:** 10 — Dynamic QR Redirect Service

---

## Area 1: Creation Flow

**Q: How does a Pro user create a dynamic QR code?**
Options: Generator toggle / Dashboard 'New Dynamic QR' / Save modal checkbox
**Selected:** Generator toggle — add a "Dynamic QR" toggle in the URL content section of QRGeneratorIsland

**Q: What happens when non-URL tab is active and user tries to enable the toggle?**
Options: Toggle disabled (greyed out with tooltip) / Auto-switch to URL tab / Show inline error
**Selected:** Toggle disabled — greyed out with tooltip "Dynamic QR only works with URL content."

**Q: Should the user be able to customize the slug?**
Options: Auto only (recommended) / Optional custom slug
**Selected:** Auto only — nanoid ~8 chars, generated at save time, no user customization

---

## Area 2: Dashboard Integration

**Q: Where do dynamic QRs live in the dashboard?**
Options: Mixed grid with badge / Separate sidebar section
**Selected:** Mixed grid with "Dynamic" badge on card — unified library, same grid as static QRs

**Q: How does the user edit the destination URL?**
Options: Inline on card / Detail panel or modal
**Selected:** Inline on card — edit icon makes URL field inline-editable, saves on Save/Cancel

**Q: Is the pause action a direct toggle or requires confirmation?**
Options: Toggle on card (direct) / Confirm before pausing
**Selected:** (defaulted to recommended) Toggle on card — immediate, with toast feedback

---

## Area 3: Tier Access (DYN-05)

**Q: DYN-05 vs Phase 8 Pro-only — what's the intent?**
Options: Free users get 3 as a trial / Pro-only no trial / Starter gets some Pro gets unlimited
**Selected:** Free users get 3 as a freemium trial — classic freemium hook, upgrade to Pro for unlimited

**Q: What happens to free users' existing dynamic QRs when they hit the limit?**
Options: Keep working, just can't create more / Deactivated after 30 days
**Selected:** Keep working indefinitely — consistent with Phase 8 principle "gate create/edit, not read"

---

## Area 4: Paused State Page

**Q: What does a scanner see when they scan a paused QR?**
Options: Branded holding page / Redirect to homepage / Plain 'Link unavailable'
**Selected:** Branded holding page — QRCraft logo + "This QR code is temporarily paused. The owner has disabled this link."

**Q: What about an invalid or deleted slug?**
Options: Same branded page with different copy / 404 response
**Selected:** Same branded page with different copy — "This QR code is no longer active."
