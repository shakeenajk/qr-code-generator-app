# Phase 14: QR Frames and Templates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 14-qr-frames-and-templates
**Areas discussed:** Frame styles, CTA text input, Preset templates, Frame + existing features

---

## Frame Styles

| Option | Description | Selected |
|--------|-------------|----------|
| Simple border + text below | Clean rectangular border with CTA text centered below | |
| Rounded border + text below | Same but with rounded corners | |
| Badge style | Colored banner/ribbon at bottom with white text | |
| All three | Ship all 3 styles | |
| Let me describe | User has specific ideas | ✓ |

**User's choice:** Shared competitor screenshot showing ~20 frame thumbnails in a grid. Wants 8-10 frame designs covering: no frame, simple borders, bottom banner, top+bottom text, shopping bag, clipboard, phone mockup, badge shapes.
**Notes:** Visual thumbnail grid picker, not a dropdown.

---

## CTA Text Input

| Option | Description | Selected |
|--------|-------------|----------|
| Field in the Frame section | Text input appears below frame picker when frame selected | |
| Below the QR preview | Always visible under live preview when frame active | |
| Pre-filled per frame, editable | Each frame has default CTA text user can edit | ✓ |

**User's choice:** Pre-filled per frame, editable
**Notes:** Less friction — each frame comes with a sensible default like "Scan Me"

---

## Preset Templates

### Picker UX

| Option | Description | Selected |
|--------|-------------|----------|
| Visual grid of previews | Small QR thumbnails showing actual combo result | |
| Named cards with description | Cards like "Business Professional" with name + preview | |
| Carousel/slider | Horizontal scroll of preset previews | |

**User's choice:** "You pick this" — Claude's discretion

### Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Separate "Templates" tab | Alongside Frame, Logo, Color & Shape tabs | |
| Top of customization panel | "Start from a template" section before individual settings | ✓ |
| Modal/overlay | "Browse templates" button opens fullscreen picker | |

**User's choice:** Top of customization panel

---

## Frame + Existing Features

### Frame Color

| Option | Description | Selected |
|--------|-------------|----------|
| Follows QR foreground color | Automatically matches QR dot color | ✓ |
| Independent color | Separate color picker for frame | |
| Black/white only | Always black or white based on mode | |

**User's choice:** Follows QR foreground color

### Frame + Logo

| Option | Description | Selected |
|--------|-------------|----------|
| Both allowed | Logo in center + frame around outside coexist | ✓ |
| Frame replaces logo area | Frame active hides logo upload | |

**User's choice:** Both allowed

### SVG Export with Frame

| Option | Description | Selected |
|--------|-------------|----------|
| Download frameless SVG + toast | Toast: "SVG exported without frame — use PNG" | |
| Disable SVG button | Grey out with tooltip | |

**User's choice:** "You pick the right one" — Claude's discretion

---

## Claude's Discretion

- Template picker UX (visual grid vs cards vs carousel)
- SVG export behavior when frame is active
- Exact frame dimensions, padding ratios
- Number and names of preset templates
- Template categories

## Deferred Ideas

None
