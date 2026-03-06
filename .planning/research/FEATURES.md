# Feature Landscape

**Domain:** QR Code Generator Website
**Project:** QRCraft
**Researched:** 2026-03-06
**Confidence note:** Web research tools unavailable during this session. Analysis based on training knowledge of the QR generator ecosystem through mid-2025. Confidence is MEDIUM — core table stakes are stable and well-established, newer differentiator trends should be verified before deprioritizing.

---

## Table Stakes

Features users expect. Missing = product feels incomplete, users leave immediately.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| URL QR code generation | Primary use case for ~80% of users | Low | Must work instantly, no friction |
| Live preview as you type | Every major competitor has this; users won't submit a form to preview | Low-Med | Real-time re-render on input change |
| PNG download | Universal format; required for print, social, email | Low | Minimum viable export |
| Free, no signup required | Users will immediately bounce if login is required for basic generation | Low | Auth-wall = abandonment |
| Mobile-friendly / responsive UI | ~50%+ of QR generator traffic is mobile; users test their own QR on-device | Med | Critical for SEO too (Core Web Vitals) |
| Foreground color customization | Users expect to change at least the QR color to match brand | Low | Simple color picker |
| Background color customization | Transparent or white background is expected | Low | Simple color picker |
| Error correction level selection | Power users and anyone embedding logos needs this | Low | Four levels: L, M, Q, H |
| Plain text QR code | Second most common use case after URL | Low | Trivial content type addition |
| QR code actually scans reliably | Table stakes of table stakes — if it doesn't scan it's worthless | Low | Use error correction H when logo is embedded |
| Fast page load | SEO-critical; slow tools lose to faster ones in search rankings | Med | Keep JS bundle lean |

## Differentiators

Features that set a product apart. Not universally expected, but create competitive advantage and SEO-rankable differentiation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Logo / image embed in QR center | Branded QR codes — extremely popular with marketers and businesses | Med | Requires error correction H; needs resize/crop logic |
| Dot/module shape customization | Visual uniqueness — "designer" QR codes vs plain black squares | Med | Square, rounded, dots, classy, extra-rounded |
| Corner/eye style customization | Fine-grained visual control; differentiates from basic generators | Med | Eyes are the three corner squares; independently styleable |
| Color gradients (foreground) | Premium-looking QR codes without design software | Med | Linear/radial gradient on modules |
| SVG download | Vector export for print at any size — valued by designers and agencies | Low | High value for low complexity given client-side generation |
| WiFi credential QR codes | Popular for home/office/cafe use cases; generates WIFI: URI scheme | Low | Good SEO target ("wifi qr code generator") |
| vCard / contact info QR codes | Business card use case; generates vCard 3.0 or MeCard format | Med | Multiple fields = more UI complexity |
| Copy to clipboard | Convenience for embedding in presentations, docs, Slack | Low | ClipboardAPI; high UX value for near-zero effort |
| Frame / border around QR with call-to-action text | "Scan Me" text below QR — popular in print materials | Med | Increases perceived polish considerably |
| Batch / bulk QR generation | Agency and developer use case; large-volume needs | High | Likely out of scope for v1 |
| QR code history (without account) | localStorage-based session history of recent codes | Med | Useful UX but adds complexity |
| Dark mode UI | User comfort; increasingly expected | Low | CSS variables make this straightforward |
| Presets / templates | One-click starting styles; lowers friction for non-designers | Med | Requires curating good defaults |
| Transparency support (PNG with alpha) | Designers need transparent background | Low | Standard in most canvas/SVG export libraries |
| SMS / phone number QR codes | Additional content types; broadens SEO surface area | Low | tel: and sms: URI schemes |
| Email QR code | mailto: URI; niche but searchable | Low | Easy addition once content-type architecture exists |
| Geo / location QR code | geo: URI; maps coordinates | Low | Low user volume but easy to implement |
| Calendar event QR code | VEVENT format; event promotion use case | Med | Field-heavy UI; decent search volume |
| API access | Developer audience; generates revenue if paid | High | Out of scope for v1 |
| Share link (URL to recreate QR settings) | Shareability; encode settings in URL hash | Med | Useful for collaboration |

## Anti-Features

Features to explicitly NOT build — they add complexity, undermine the core value proposition, or are strategically wrong for this product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| User accounts / saved QR codes (v1) | Auth adds backend complexity, friction, GDPR surface area, infra cost | Use localStorage for session persistence; add accounts only if analytics justify it |
| Dynamic QR codes (redirect URLs) | Requires server, database, redirect infrastructure, auth — massive scope increase | Static QR codes only for v1; dynamic is a separate product tier if monetization is pursued |
| QR code scanner / reader | Different product category entirely; dilutes brand focus | Keep "generator" as the identity |
| Advertisement injection (early) | Ads require minimum traffic to be worth it; premature ads harm SEO (bounce rate) and brand perception | Build traffic first; implement ad slots as CSS placeholders only |
| Social login (Google/GitHub OAuth) | Adds third-party dependency, privacy concerns, complexity — for zero benefit with no-auth approach | Stay friction-free |
| Analytics dashboard per QR code | Requires dynamic QR infrastructure and backend — completely different product | Not until dynamic QR is built |
| Blockchain / NFT QR features | No user demand; gimmick with maintenance cost | Skip entirely |
| Overly complex wizard UI | Multi-step forms hurt conversion; users want instant results | Single-page, immediate preview — no steps |
| Watermarks on free tier | Destroys value proposition; users immediately leave for competitors | The free tool IS the product |
| Paid-only SVG export | SVG is expected free by users; paywalling it drives users to competitors | SVG free, gate on more advanced features if monetization is needed |

---

## Feature Dependencies

```
Error Correction Level Selection
  └─→ Logo/Image Embed (logo requires H-level correction to ensure scanability)

Content Type Selection (URL, Text, WiFi, vCard, etc.)
  └─→ Dynamic form fields per type
  └─→ QR data encoding (different encoding per type)

Color Customization (foreground/background)
  └─→ Gradient Support (gradient is an extension of color customization)

Module Shape Customization
  └─→ Eye/Corner Shape Customization (separate control surface for same concept)
  └─→ Frame/CTA Text (builds on styled QR)

Live Preview
  └─→ All of the above (preview re-renders whenever any upstream changes)

PNG Export
  └─→ SVG Export (SVG is generated first; PNG rasterized from it OR canvas-based)
  └─→ Copy to Clipboard (uses same canvas/blob as PNG export)

WiFi QR Code
  └─→ (No dependencies, standalone content type)

vCard QR Code
  └─→ (More fields = more UI; otherwise independent)
```

---

## Typical UX Flow (Industry Standard)

Based on analysis of qrcode-monkey.com, qr-code-generator.com, the-qrcode-generator.com, and canva.com/qr-code-generator:

1. **Content type selector** — tabs or dropdown: URL / Text / WiFi / vCard / (more)
2. **Input fields** — immediately visible, large, above the fold
3. **Live QR preview** — updates as user types, positioned right of or below input on desktop
4. **Customize section** — collapsible or always-visible: colors, shapes, logo upload
5. **Download buttons** — PNG / SVG / Copy — prominent, ideally fixed or sticky
6. **(Optional) Frame/CTA section** — add border text
7. **SEO content below the fold** — "What is a QR code", "How to use", FAQ

**Critical UX principles from competitive analysis:**
- Preview must be instantaneous (< 100ms perceived) — debounced re-render
- Download button must be reachable without scrolling on desktop
- Mobile: stacked layout, preview below inputs, large tap targets
- No loading spinners for standard generation — it's all client-side and fast

---

## MVP Recommendation

Prioritize for launch:

1. **URL QR generation** — table stakes, primary use case
2. **Plain text QR** — trivial to add, covers second largest segment
3. **Live preview** — non-negotiable UX
4. **Foreground / background color** — basic customization
5. **Logo embed** — single biggest differentiator vs "just works" tools
6. **Dot shape + eye style** — visually stunning results; drives social sharing
7. **Gradient foreground** — high visual impact, low-medium complexity
8. **PNG download** — required
9. **SVG download** — high value, aligns with client-side architecture
10. **Copy to clipboard** — small effort, noticeable UX improvement
11. **WiFi QR** — good SEO keyword; simple content type
12. **vCard QR** — business card use case; slightly more UI work

Defer to post-MVP:
- **Frame / CTA text** — nice to have, not critical for launch
- **SMS / email / geo / calendar content types** — expand SEO surface area post-launch
- **Presets / templates** — requires curating quality defaults; deprioritize
- **Share link** — encoding settings in URL hash; useful but not blocking

---

## Competitive Differentiation Opportunities (2025-2026)

These are gaps or under-served areas in the current ecosystem that QRCraft can own:

| Opportunity | Current Gap | QRCraft Approach |
|-------------|-------------|-----------------|
| Speed + cleanliness | Many generators are cluttered, ad-heavy, or slow | QRCraft's clean white + accent design is the product itself |
| No-friction instant generation | Some competitors still require form submission | Instantaneous live preview — no submit button needed |
| SVG-first quality | Many tools export blurry PNGs at fixed resolution | SVG export as first-class citizen; resolution-independent |
| WCAG AA accessibility | Most generators have poor accessibility | Keyboard navigable, screen-reader labeled, WCAG AA colors |
| SEO + performance | Heavy React SPAs rank poorly; content generators need fast FCP | Lean JS, semantic HTML, structured data, fast load |
| Logo + gradient combination | Some tools have one but not both | Full combination: gradient background + logo center |

---

## Sources

- Training knowledge: competitive landscape of QR generator ecosystem through mid-2025 (MEDIUM confidence)
- Web research tools were unavailable during this session; findings should be spot-checked against current competitor feature sets before phase planning is finalized
- Competitors to manually verify against: qrcode-monkey.com, qr-code-generator.com, the-qrcode-generator.com, canva.com/qr-code-generator, me-qr.com, uqr.me
