# Phase 7: SSR Foundation + Auth - Research

**Researched:** 2026-03-15
**Domain:** Astro 5 SSR / Vercel adapter / Clerk auth
**Confidence:** HIGH (all critical paths verified against official docs and Clerk SDK reference)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase Boundary**
Wire the app for server-side rendering (Vercel adapter, per-route `prerender = false`) and add Clerk auth — sign up, sign in (email + Google/GitHub OAuth), session persistence, sign out, and a protected `/dashboard` route. No QR library, no billing, no Pro gates — those are Phases 8–9.

**Header auth UI**
- Logged-out state: replace the existing "Create QR Code" CTA with a "Sign In" button on the right side of the header
- Logged-in state: avatar with profile photo (fallback to initials circle) + user name + chevron dropdown on the right
- Dropdown contains three items: "My Dashboard", "Account Settings" (links to Clerk's hosted account page), "Sign Out"
- No separate "Dashboard" nav link in the header — dropdown is the only route to dashboard from the header
- Avatar uses Clerk's profile photo (from Google/GitHub OAuth) with initials fallback

**Auth flow style**
- Dedicated pages: `/login` renders Clerk's `<SignIn>` component, `/signup` renders Clerk's `<SignUp>` component
- Both pages use the full site header and footer (not a minimal centered layout)
- Separate pages — no combined tab page; each page links to the other ("Don't have an account? Sign up")
- No modal overlay

**Dashboard layout**
- Build the full dashboard shell now (sidebar + content area) so Phase 9 fills it in without rework
- Sidebar nav items with icons + labels: My QR Codes, Analytics, Settings
- Content area shows empty/disabled state for each section in Phase 7
- On mobile: bottom tab bar (icons only) replaces the sidebar — native mobile feel, thumb-friendly

**Post-auth redirects**
- After sign-up: redirect to `/dashboard`
- After sign-in: redirect to `/dashboard`
- After sign-out: redirect to `/` (homepage)
- Unauthenticated visit to `/dashboard`: middleware redirects to `/login`

### Claude's Discretion
- Exact icon set for sidebar (Heroicons, Lucide, or inline SVG — whichever is lightest)
- Empty/disabled state copy for Analytics and Settings sections
- Exact Tailwind styling for dashboard sidebar (colors, spacing) — consistent with existing site aesthetic
- Clerk component appearance customization (match site's blue `#2563EB` accent)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | Clerk `<SignUp>` component on `/signup` page with `prerender = false`; email/password is the default Clerk provider |
| AUTH-02 | User can sign in with email and password | Clerk `<SignIn>` component on `/login` page; email/password always included unless disabled in Clerk Dashboard |
| AUTH-03 | User can sign in with Google or GitHub (OAuth) | Clerk OAuth providers configured in Clerk Dashboard; same `<SignIn>` component surfaces them automatically |
| AUTH-04 | User session persists across browser refresh | Clerk manages session cookies server-side; `Astro.locals.auth()` reads them on every SSR request; no extra work needed |
| AUTH-05 | User can sign out | `<SignOutButton>` from `@clerk/astro/components` or `signOut()` from Clerk stores; redirect to `/` via `afterSignOutUrl` prop |
</phase_requirements>

---

## Summary

Phase 7 introduces server-side rendering into what is currently a fully static Astro 5 site. The approach keeps `output: 'static'` as the global default (protecting the homepage's Vercel CDN cache / `x-vercel-cache: HIT`) and uses `export const prerender = false` on individual pages (`/login`, `/signup`, `/dashboard`) to opt those routes into on-demand SSR. This is the Astro 5 way — `output: 'hybrid'` was removed in Astro 5 and its behaviour folded into `output: 'static'` with per-route opt-outs.

Clerk's `@clerk/astro` SDK wires authentication through Astro middleware (`src/middleware.ts`). The middleware runs on every request and injects `Astro.locals.auth` with auth state. Route protection is done via `createRouteMatcher` + `redirectToSignIn()`. One critical deployment caveat: Clerk's middleware is incompatible with Vercel's *edge* middleware mode (serialization issue with `Astro.locals.auth` functions + Async Local Storage). The fix is to NOT enable `edgeMiddleware` / `middlewareMode: 'edge'` in the Vercel adapter — leave it at the default serverless mode. Astro middleware in `/src` still runs on all SSR routes.

The dashboard shell (sidebar + content) is built in full this phase with empty/placeholder content so Phase 9 is purely additive. Icons should use `lucide-astro` (Astro-native package, zero JS shipped, tree-shakeable SVG) rather than `lucide-react`.

**Primary recommendation:** Install `@astrojs/vercel` + `@clerk/astro`, keep `output: 'static'`, add `export const prerender = false` to auth and dashboard pages, wire `src/middleware.ts` with `clerkMiddleware()`, and do NOT set `middlewareMode: 'edge'` in the Vercel adapter config.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@astrojs/vercel` | ^8.x (latest) | Vercel deployment adapter for SSR routes | Official Astro adapter; required for on-demand rendering on Vercel |
| `@clerk/astro` | ^2.16.2 | Auth SDK — sign-up, sign-in, session, middleware | Official Clerk Astro SDK; first-party, actively maintained |
| `lucide-astro` | latest | Sidebar icons (Astro-native SVG) | Zero runtime JS; tree-shakeable; lighter than lucide-react in Astro |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@clerk/testing` | latest | Playwright testing utilities for Clerk auth | Writing E2E tests that need authenticated state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `lucide-astro` | `lucide-react` | lucide-react ships JS to client; lucide-astro renders inline SVG at SSR time — no JS |
| `lucide-astro` | Inline SVG | Inline SVG avoids a dependency but scales poorly across 3+ icons |
| `@clerk/astro` | Auth.js (formerly NextAuth) | Auth.js Astro support is community-maintained and less polished; Clerk is purpose-built |

**Installation:**
```bash
npm install @astrojs/vercel @clerk/astro lucide-astro
```

---

## Architecture Patterns

### Recommended Project Structure

New files this phase (additions to existing `src/`):

```
src/
├── middleware.ts            # clerkMiddleware() — protects /dashboard
├── pages/
│   ├── index.astro          # UNCHANGED — stays fully static (CDN hit)
│   ├── login.astro          # NEW — export const prerender = false
│   ├── signup.astro         # NEW — export const prerender = false
│   └── dashboard/
│       └── index.astro      # NEW — export const prerender = false
├── components/
│   ├── Header.astro         # REWRITE — auth-aware (SignedIn/SignedOut)
│   ├── UserMenu.tsx         # NEW — React island for avatar dropdown
│   └── dashboard/
│       ├── DashboardLayout.astro  # NEW — sidebar + content shell
│       ├── Sidebar.astro          # NEW — desktop sidebar nav
│       └── MobileTabBar.astro     # NEW — mobile bottom tabs
└── layouts/
    └── Layout.astro         # WRAP with ClerkProvider (or leave — @clerk/astro integration handles it)
```

### Pattern 1: Astro 5 Hybrid Static + SSR (output: static + prerender = false)

**What:** Global default is static (all pages prerendered). Per-route `export const prerender = false` opts individual pages into on-demand SSR.
**When to use:** Any page that needs auth state, cookies, or server-side user data.

```typescript
// src/pages/dashboard/index.astro
---
export const prerender = false;  // This page is SSR, not static
import { auth } from '@clerk/astro/server';
// Middleware already redirects unauthenticated users, but defensive check:
const { userId } = auth(Astro);
---
<DashboardLayout>
  <!-- content -->
</DashboardLayout>
```

```typescript
// src/pages/index.astro — NO CHANGE
// No prerender = false → stays static → x-vercel-cache: HIT on Vercel CDN
---
import Layout from '../layouts/Layout.astro';
---
<!-- identical to current -->
```

### Pattern 2: Clerk Middleware — Protecting /dashboard

**What:** `src/middleware.ts` runs on every request. Uses `createRouteMatcher` to identify protected routes and redirects unauthenticated users to `/login`.
**When to use:** Any route that requires authentication.

```typescript
// src/middleware.ts
// Source: https://clerk.com/docs/reference/astro/clerk-middleware
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
  const { redirectToSignIn, userId } = auth();
  if (!userId && isProtectedRoute(context.request)) {
    return redirectToSignIn();
  }
});
```

### Pattern 3: astro.config.mjs — Vercel Adapter (NO edgeMiddleware)

**What:** Add Vercel adapter with serverless mode (default). Do NOT set `middlewareMode: 'edge'` — this breaks Clerk middleware.

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';

export default defineConfig({
  site: 'https://qr-code-generator-app.com',
  output: 'static',              // Keep static — per-route prerender=false handles SSR
  adapter: vercel(),             // NO edgeMiddleware option — leave at serverless default
  integrations: [clerk(), react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

> **Critical:** Do not set `edgeMiddleware: true` or `middlewareMode: 'edge'`. Clerk's middleware uses Async Local Storage and populates `Astro.locals.auth` with a function — neither survives serialization to Vercel Edge. The serverless default works correctly.

### Pattern 4: Auth-Aware Header

**What:** Header reads auth state at SSR time (on auth pages) or shows static version (on homepage). Uses Clerk's control components.

```astro
---
// src/components/Header.astro
import { SignedIn, SignedOut } from '@clerk/astro/components';
import UserMenu from './UserMenu.tsx';
import Logo from './Logo.astro';
---
<header class="bg-white border-b border-gray-200 sticky top-0 z-50 dark:bg-slate-900 dark:border-slate-700">
  <nav class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 group" aria-label="QRCraft home">
      <Logo size={32} />
      <span class="text-xl font-bold text-gray-900 tracking-tight dark:text-white">QRCraft</span>
    </a>
    <div class="flex items-center gap-3">
      <SignedOut>
        <a href="/login" class="bg-[#2563EB] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Sign In
        </a>
      </SignedOut>
      <SignedIn>
        <UserMenu client:load />
      </SignedIn>
    </div>
  </nav>
</header>
```

> Note: `<SignedIn>` / `<SignedOut>` on static pages (like the homepage) render correctly — Clerk injects auth state client-side for static pages. Use `isStatic={false}` on these components only when the page has `prerender = false` (SSR pages). This ensures Clerk reads auth from `Astro.locals` (server) rather than waiting for client hydration.

### Pattern 5: Clerk Component Appearance Theming

**What:** Match Clerk's prebuilt sign-in/sign-up UI to site blue `#2563EB`.

```astro
---
// src/pages/login.astro
export const prerender = false;
import { SignIn } from '@clerk/astro/components';
---
<Layout title="Sign In — QRCraft" description="Sign in to your QRCraft account">
  <Header slot="before-content" />
  <main class="flex flex-col items-center justify-center py-16 px-4">
    <SignIn
      forceRedirectUrl="/dashboard"
      signUpUrl="/signup"
      appearance={{
        variables: {
          colorPrimary: '#2563EB',
          colorBackground: '#ffffff',
          borderRadius: '0.5rem',
        }
      }}
    />
  </main>
  <Footer />
</Layout>
```

### Anti-Patterns to Avoid

- **Setting `middlewareMode: 'edge'` in Vercel adapter:** Breaks Clerk middleware — `Astro.locals.auth` cannot be serialized across edge/serverless runtimes.
- **Setting `output: 'server'` globally:** Causes homepage to be SSR'd on every request, killing CDN cache (`x-vercel-cache: MISS`). Use per-route `prerender = false` instead.
- **Using `lucide-react` icons in Astro components:** Ships unnecessary JS. Use `lucide-astro` for Astro components; reserve `lucide-react` only if icons must be inside a React island.
- **Protecting routes only client-side:** Auth state must be checked server-side in middleware; client-only guards can be bypassed.
- **`<UserMenu>` with `client:visible`:** Use `client:load` for the header dropdown — it's always in the viewport, and `client:visible` would cause a flash of the wrong state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth session management | Custom JWT/cookie system | `@clerk/astro` | Sessions, refresh tokens, device management, concurrent sessions — enormous surface area |
| OAuth flow | Custom Google/GitHub OAuth | Clerk Dashboard OAuth providers | OAuth PKCE, state params, token exchange, refresh — dozens of edge cases |
| User avatar with fallback | Custom initials logic | `<UserButton>` from Clerk or read `user.imageUrl` + `user.fullName[0]` | Clerk handles photo from OAuth + initials fallback; also handles image CDN |
| Route protection | Custom middleware from scratch | `clerkMiddleware()` + `createRouteMatcher` | Already handles redirect URL preservation, public routes, auth state |
| Sign-out redirect | Manual cookie clear + redirect | `<SignOutButton afterSignOutUrl="/">` | Clerk clears all session state correctly |

**Key insight:** Auth is the most security-critical part of the app. Every custom solution introduces subtle vulnerabilities (CSRF, session fixation, token leakage). Clerk's SDK has been hardened against these; the only safe choice is to use it as designed.

---

## Common Pitfalls

### Pitfall 1: Clerk Edge Middleware Incompatibility with Vercel

**What goes wrong:** If `middlewareMode: 'edge'` is set in `@astrojs/vercel`, Clerk middleware silently fails in production. Auth state is lost; all routes appear unauthenticated or the build crashes.
**Why it happens:** Vercel Edge middleware serializes `Astro.locals` across runtimes. Clerk populates `locals.auth` with a function object, which cannot be serialized. Async Local Storage used by `clerkMiddleware` also does not persist across runtimes.
**How to avoid:** Never set `middlewareMode: 'edge'`. Leave the Vercel adapter at its default serverless configuration.
**Warning signs:** Local dev works but production auth fails; `Astro.locals.auth` is undefined on deployed SSR pages.

### Pitfall 2: Static Homepage Gains SSR (Cache Miss)

**What goes wrong:** Setting `output: 'server'` globally causes the homepage to be SSR'd, destroying `x-vercel-cache: HIT`. Lighthouse performance drops; CDN serves nothing.
**Why it happens:** `output: 'server'` makes every route SSR by default.
**How to avoid:** Keep `output: 'static'`. Only auth/dashboard pages get `export const prerender = false`.
**Warning signs:** Response headers on `/` show `x-vercel-cache: MISS` instead of `HIT`.

### Pitfall 3: Clerk Control Components on Static Pages Need `isStatic` Awareness

**What goes wrong:** `<SignedIn>` / `<SignedOut>` on a static page (like `/`) may flash incorrect state briefly if rendered on SSR pages without `isStatic={false}`.
**Why it happens:** On SSR pages (`prerender = false`), Clerk needs to read from `Astro.locals.auth` (server-side). Without `isStatic={false}`, it falls back to client hydration, causing a flash.
**How to avoid:** On pages with `prerender = false`, add `isStatic={false}` prop to control components: `<SignedIn isStatic={false}>`. On static pages, omit it (client-side is the only option anyway).
**Warning signs:** Header flickers between signed-in and signed-out states on dashboard or login pages.

### Pitfall 4: `UserMenu` React Island Hydration Strategy

**What goes wrong:** Using `client:visible` or `client:idle` for the header UserMenu causes a flash of "Sign In" button before auth state is confirmed.
**Why it happens:** `client:visible` only hydrates when the element enters the viewport; `client:idle` waits for browser idle time — both cause delay.
**How to avoid:** Use `client:load` for the header UserMenu. It's above the fold and always visible.
**Warning signs:** Brief flash of "Sign In" button for logged-in users on page load.

### Pitfall 5: Playwright Tests Fail Against SSR Server

**What goes wrong:** Existing Playwright config runs `npm run preview` which serves a static build. After adding SSR, `preview` no longer works for auth routes.
**Why it happens:** `astro preview` only serves fully prerendered static output; SSR routes need a real server.
**How to avoid:** For auth E2E tests, run `astro dev` instead. Update `playwright.config.ts` `webServer.command` for the auth test project, or create a separate playwright project configuration for SSR routes.
**Warning signs:** 404 or empty responses for `/login`, `/signup`, `/dashboard` in Playwright tests.

### Pitfall 6: Missing Environment Variables at Build Time

**What goes wrong:** Build succeeds locally but Clerk throws `Missing publishableKey` error on Vercel.
**Why it happens:** Clerk requires `PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` as environment variables. Vercel environment must have these set.
**How to avoid:** Before any build, add both keys to Vercel project settings (Environment Variables tab). Use `.env.local` locally.
**Warning signs:** Build succeeds but runtime throws 500 errors; Clerk DevTools shows "Missing key" warning.

---

## Code Examples

### Middleware: Protect /dashboard

```typescript
// Source: https://clerk.com/docs/reference/astro/clerk-middleware
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export const onRequest = clerkMiddleware((auth, context) => {
  const { redirectToSignIn, userId } = auth();
  if (!userId && isProtectedRoute(context.request)) {
    return redirectToSignIn();
  }
});
```

### astro.config.mjs: Full Updated Config

```typescript
// astro.config.mjs — FINAL for Phase 7
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import clerk from '@clerk/astro';

export default defineConfig({
  site: 'https://qr-code-generator-app.com',
  output: 'static',
  adapter: vercel(),        // serverless default — do NOT add edgeMiddleware or middlewareMode
  integrations: [clerk(), react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### SignIn Page

```astro
---
// src/pages/login.astro
export const prerender = false;
import Layout from '../layouts/Layout.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import { SignIn } from '@clerk/astro/components';
---
<Layout title="Sign In — QRCraft" description="Sign in to your QRCraft account">
  <Header />
  <main class="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4">
    <SignIn
      forceRedirectUrl="/dashboard"
      signUpUrl="/signup"
      appearance={{ variables: { colorPrimary: '#2563EB' } }}
    />
  </main>
  <Footer />
</Layout>
```

### Dashboard Page: Defensive Auth Check

```astro
---
// src/pages/dashboard/index.astro
export const prerender = false;
import { auth } from '@clerk/astro/server';
import DashboardLayout from '../../components/dashboard/DashboardLayout.astro';

// Middleware already redirects, but belt-and-suspenders:
const { userId } = auth(Astro);
if (!userId) {
  return Astro.redirect('/login');
}
---
<DashboardLayout activeSection="my-qr-codes">
  <!-- Phase 7: empty state placeholder content -->
</DashboardLayout>
```

### Sidebar with lucide-astro Icons

```astro
---
// src/components/dashboard/Sidebar.astro
import { LayoutGrid, BarChart2, Settings } from 'lucide-astro';

const navItems = [
  { href: '/dashboard', label: 'My QR Codes', Icon: LayoutGrid },
  { href: '/dashboard/analytics', label: 'Analytics', Icon: BarChart2 },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
];
---
<aside class="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 min-h-screen hidden md:flex flex-col py-6">
  <nav class="flex flex-col gap-1 px-3">
    {navItems.map(({ href, label, Icon }) => (
      <a href={href} class="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium">
        <Icon class="w-5 h-5" />
        {label}
      </a>
    ))}
  </nav>
</aside>
```

### .env.local (Keys Required)

```bash
# src: Clerk Dashboard → API Keys
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output: 'hybrid'` for mixed static/SSR | `output: 'static'` + per-route `prerender = false` | Astro 5.0 (Nov 2024) | `hybrid` keyword removed; same behavior now lives under `static` |
| `@astrojs/vercel/serverless` import | `@astrojs/vercel` (unified) | ~Astro 4.x | Old sub-path imports still work but are deprecated; use root import |
| Community `astro-clerk-auth` package | Official `@clerk/astro` | July 2024 | Clerk shipped official SDK; community package should not be used |
| `edgeMiddleware: true` option | `middlewareMode: 'edge'` (if needed) | Recent | `edgeMiddleware` deprecated in favor of `middlewareMode`; but for Clerk, do NOT use either |

**Deprecated/outdated:**
- `output: 'hybrid'`: Removed in Astro 5; replace with `output: 'static'`
- `@astrojs/vercel/serverless` sub-path: Use `@astrojs/vercel` directly
- `astro-clerk-auth` (community package): Replaced by `@clerk/astro` official SDK

---

## Open Questions

1. **Environment variable prefix for Vercel**
   - What we know: Clerk requires `PUBLIC_CLERK_PUBLISHABLE_KEY` (public, Astro-exposed) and `CLERK_SECRET_KEY` (server-only). Astro exposes `PUBLIC_` vars to client.
   - What's unclear: Whether Clerk reads `CLERK_PUBLISHABLE_KEY` or `PUBLIC_CLERK_PUBLISHABLE_KEY` — docs show `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for Next.js; Astro equivalent not explicitly confirmed in current docs.
   - Recommendation: Check Clerk Astro quickstart env var names during Wave 0 setup; most likely `PUBLIC_CLERK_PUBLISHABLE_KEY` based on Astro conventions.

2. **Header auth state on static homepage (flash prevention)**
   - What we know: `<SignedIn>` / `<SignedOut>` on a static page are hydrated client-side — there will be a brief flash.
   - What's unclear: Whether this is noticeable or Clerk has a SSR-in-static workaround.
   - Recommendation: Accept minor flash on homepage (common for static + auth); if unacceptable, use Server Islands (Astro 5 feature) to partially SSR the header — but this is out of scope for Phase 7.

3. **Playwright tests against SSR routes**
   - What we know: Current `playwright.config.ts` uses `npm run preview` which only serves static output.
   - What's unclear: Best test command for SSR routes (dev server vs preview with Vercel adapter locally).
   - Recommendation: Wave 0 task should update `webServer.command` to `astro dev` for auth-related specs, OR use `@clerk/testing` to mock auth state and test against preview.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright `^1.58.2` |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npm run test -- --grep AUTH` |
| Full suite command | `npm run test` |

**Wave 0 note on webServer:** Current `webServer.command` is `npm run preview -- --port 4321`. SSR routes (`/login`, `/signup`, `/dashboard`) are not served by `astro preview`. The Wave 0 task must update `webServer.command` to `npm run dev -- --port 4321` or restructure to run the dev server for auth tests.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Sign-up form renders and submits with email/password → lands on /dashboard | e2e | `npm test -- --grep "AUTH-01"` | ❌ Wave 0 |
| AUTH-02 | Sign-in form renders and accepts email/password → lands on /dashboard | e2e | `npm test -- --grep "AUTH-02"` | ❌ Wave 0 |
| AUTH-03 | OAuth buttons (Google, GitHub) visible on sign-in/sign-up pages | e2e (smoke) | `npm test -- --grep "AUTH-03"` | ❌ Wave 0 |
| AUTH-04 | After sign-in, refresh /dashboard → stays on /dashboard (no redirect) | e2e | `npm test -- --grep "AUTH-04"` | ❌ Wave 0 |
| AUTH-05 | Sign-out from UserMenu → redirected to / | e2e | `npm test -- --grep "AUTH-05"` | ❌ Wave 0 |
| (success criteria) | Unauthenticated /dashboard → redirects to /login | e2e | `npm test -- --grep "redirect"` | ❌ Wave 0 |
| (success criteria) | Homepage / returns x-vercel-cache: HIT | smoke/manual | Manual curl check on Vercel deployment | manual |

> **OAuth testing (AUTH-03):** Full OAuth flow cannot be automated in a standard Playwright E2E test (requires real Google/GitHub session). AUTH-03 is verified by asserting the OAuth buttons are rendered on the sign-in page. Full flow is verified manually during deployment validation.

> **AUTH-01/02 in CI:** Real Clerk sign-up creates actual accounts. For CI, use `@clerk/testing` with `setupClerkTestingToken` to bypass the Clerk UI and inject a signed-in state directly. This requires a Clerk test API key.

### Sampling Rate

- **Per task commit:** `npm run test -- --grep @smoke`
- **Per wave merge:** `npm run test -- --grep AUTH`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/auth.spec.ts` — covers AUTH-01 through AUTH-05 + redirect behavior
- [ ] `playwright.config.ts` update — change `webServer.command` from `preview` to `dev` (or add separate SSR project config)
- [ ] `.env.local` with Clerk test keys — required before any auth test can run
- [ ] Optional: `playwright.config.ts` `storageState` setup for reusing auth sessions across tests

---

## Sources

### Primary (HIGH confidence)

- `https://docs.astro.build/en/guides/on-demand-rendering/` — Astro 5 output: static + prerender = false behavior, hybrid removal
- `https://clerk.com/docs/reference/astro/clerk-middleware` — `clerkMiddleware()`, `createRouteMatcher`, `redirectToSignIn()`, `auth()` locals
- `https://clerk.com/docs/astro/reference/components/authentication/sign-in` — `<SignIn>` component props, `forceRedirectUrl`, `signUpUrl`, `appearance`
- `https://docs.astro.build/en/guides/integrations-guide/vercel/` — `@astrojs/vercel` v10, output modes, middlewareMode option
- `https://community.vercel.com/t/astro-middleware-only-works-in-vercel-dev-but-not-when-deployed/6828` — Confirmed: keep middleware in `/src`, do NOT use edgeMiddleware for Clerk

### Secondary (MEDIUM confidence)

- `https://clerk.com/docs/guides/development/deployment/astro` — Vercel Edge middleware incompatibility (Async Local Storage + serialization issue confirmed)
- `https://clerk.com/docs/guides/development/hybrid-rendering` — `isStatic={false}` prop requirement on SSR pages for Clerk control components
- `https://lucide.dev/guide/packages/lucide-astro` — `lucide-astro` as Astro-native zero-JS icon solution

### Tertiary (LOW confidence)

- `https://www.trevorlasn.com/blog/astro-and-clerk` — Community blog showing Astro 5 + Clerk setup; patterns align with official docs but not authoritative

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@clerk/astro`, `@astrojs/vercel` are official packages; versions from npm/docs
- Architecture: HIGH — `output: static` + `prerender = false` is the documented Astro 5 approach; Clerk middleware pattern from official SDK reference
- Pitfalls: HIGH — Edge middleware incompatibility confirmed by both Clerk deployment docs and Vercel community thread; other pitfalls derived from official docs
- Validation: MEDIUM — Test structure is clear but AUTH-01/02 full flow requires real Clerk account or `@clerk/testing` setup not yet confirmed for this stack

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (Clerk and Astro are active; re-verify if either ships a major version)
