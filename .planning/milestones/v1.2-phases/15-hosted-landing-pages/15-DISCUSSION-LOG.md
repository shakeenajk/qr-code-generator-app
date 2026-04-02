# Phase 15: Hosted Landing Pages - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 15-hosted-landing-pages
**Areas discussed:** PDF landing page content, App Store landing page content, QR routing, Landing page editing

---

## PDF Landing Page Content

### Creation Form
| Option | Description | Selected |
|--------|-------------|----------|
| Basic set | Cover photo, title, description, website URL, social buttons | |
| Extended set | All basic + PDF file upload, company name, CTA button text | ✓ |
| Let me describe | Custom ideas | |

**User's choice:** Extended set
**Notes:** Actual PDF file uploaded and displayed on the landing page

### Hosted Page Layout
| Option | Description | Selected |
|--------|-------------|----------|
| Cover-focused | Large cover photo, metadata below, download button | |
| PDF viewer | Embedded PDF preview with download button and metadata sidebar | ✓ |
| Card style | Compact card, minimal link-in-bio style | |

**User's choice:** PDF viewer with embedded preview

---

## App Store Landing Page Content

### Store Links
| Option | Description | Selected |
|--------|-------------|----------|
| iOS + Google Play only | Two fields, covers 95%+ | ✓ |
| iOS + Google Play + Huawei | Three stores | |
| Flexible list | Any number of store links | |

**User's choice:** iOS + Google Play only

### OS Detection
| Option | Description | Selected |
|--------|-------------|----------|
| Auto-redirect | iPhone → App Store, Android → Play Store | |
| Always show landing page | Both buttons visible, user taps their store | ✓ |
| Auto-redirect with delay | Redirects with "View all" link | |

**User's choice:** Always show landing page with both buttons

### Creation Form
| Option | Description | Selected |
|--------|-------------|----------|
| Basic | App name, icon, iOS URL, Play URL | |
| Extended | All basic + description, screenshot/trailer URL, company name, CTA text | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Extended

---

## QR Routing

| Option | Description | Selected |
|--------|-------------|----------|
| Through /r/[slug] | Scan tracking analytics | |
| Direct to /p/[slug] | No tracking, simpler | |
| You decide | Claude's discretion | ✓ |

**User's choice:** Claude's discretion

---

## Landing Page Editing

| Option | Description | Selected |
|--------|-------------|----------|
| Full editing | Update everything including file re-uploads | ✓ |
| Metadata only | Update text fields but not files | |
| Create-once | Delete and recreate for changes | |

**User's choice:** Full editing

---

## Claude's Discretion

- QR routing approach (scan tracking vs direct)
- DB table schema
- Slug generation
- Social sharing implementation
- PDF viewer approach
- File size limits per tier

## Deferred Ideas

None
