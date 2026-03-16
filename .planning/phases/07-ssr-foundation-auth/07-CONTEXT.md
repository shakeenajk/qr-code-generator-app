# Phase 7: SSR Foundation + Auth - Context

**Gathered:** 2026-03-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the app for server-side rendering (Vercel adapter, per-route `prerender = false`) and add Clerk auth — sign up, sign in (email + Google/GitHub OAuth), session persistence, sign out, and a protected `/dashboard` route. No QR library, no billing, no Pro gates — those are Phases 8–9.

</domain>

<decisions>
## Implementation Decisions

### Header auth UI
- Logged-out state: replace the existing "Create QR Code" CTA with a "Sign In" button on the right side of the header
- Logged-in state: avatar with profile photo (fallback to initials circle) + user name + chevron dropdown on the right
- Dropdown contains three items: "My Dashboard", "Account Settings" (links to Clerk's hosted account page), "Sign Out"
- No separate "Dashboard" nav link in the header — dropdown is the only route to dashboard from the header
- Avatar uses Clerk's profile photo (from Google/GitHub OAuth) with initials fallback

### Auth flow style
- Dedicated pages: `/login` renders Clerk's `<SignIn>` component, `/signup` renders Clerk's `<SignUp>` component
- Both pages use the full site header and footer (not a minimal centered layout)
- Separate pages — no combined tab page; each page links to the other ("Don't have an account? Sign up")
- No modal overlay

### Dashboard layout
- Build the full dashboard shell now (sidebar + content area) so Phase 9 fills it in without rework
- Sidebar nav items with icons + labels: My QR Codes, Analytics, Settings
- Content area shows empty/disabled state for each section in Phase 7
- On mobile: bottom tab bar (icons only) replaces the sidebar — native mobile feel, thumb-friendly

### Post-auth redirects
- After sign-up: redirect to `/dashboard`
- After sign-in: redirect to `/dashboard`
- After sign-out: redirect to `/` (homepage)
- Unauthenticated visit to `/dashboard`: middleware redirects to `/login`

### Claude's Discretion
- Exact icon set for sidebar (Heroicons, Lucide, or inline SVG — whichever is lightest)
- Empty/disabled state copy for Analytics and Settings sections
- Exact Tailwind styling for dashboard sidebar (colors, spacing) — consistent with existing site aesthetic
- Clerk component appearance customization (match site's blue `#2563EB` accent)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/layouts/Layout.astro`: Current site layout — needs Clerk provider wrapper and will be used by /login and /signup pages
- `src/components/Header.astro`: Needs auth-aware rewrite — currently static with no user state
- `src/components/Logo.astro`: Can be reused on auth pages and dashboard header

### Established Patterns
- Tailwind v4 utility classes throughout — dashboard should match (bg-white, dark:bg-slate-900, border-gray-200, etc.)
- Dark mode support via `dark:` variants — dashboard shell must support dark mode
- `client:visible` hydration used in QRGeneratorIsland — any React components on dashboard should use appropriate Astro hydration directive
- Sticky header pattern already in place (`sticky top-0 z-50`) — dashboard layout will be different (sidebar-based)

### Integration Points
- `astro.config.mjs`: Add `@astrojs/vercel` adapter and keep `output: 'static'`; auth routes use `export const prerender = false`
- `src/layouts/Layout.astro`: Wrap with Clerk's `<ClerkProvider>` or use Astro middleware approach
- `src/pages/`: Add `index.astro` siblings: `login.astro`, `signup.astro`, `dashboard.astro` (or `dashboard/index.astro`)
- Astro middleware (`src/middleware.ts`): Protect `/dashboard` — redirect unauthenticated users to `/login`

</code_context>

<specifics>
## Specific Ideas

- Dashboard sidebar layout chosen over top-nav for the dashboard — anticipates a multi-section app (QR library, analytics, settings) where sidebar scales better than a top nav
- Full shell layout built in Phase 7 so Phase 9 (Saved QR Library) is purely additive — no structural rework

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-ssr-foundation-auth*
*Context gathered: 2026-03-15*
