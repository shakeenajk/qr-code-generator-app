---
phase: 07-ssr-foundation-auth
plan: "03"
subsystem: auth-ui
tags: [clerk, auth, header, react-island, astro]
dependency_graph:
  requires: [07-02]
  provides: [login-page, signup-page, auth-aware-header]
  affects: [all-pages-via-header]
tech_stack:
  added: ["@clerk/shared/react (useUser, useClerk hooks)"]
  patterns: ["Clerk SignIn/SignUp components", "Clerk SignedIn/SignedOut control components", "React island with client:load hydration", "Astro prerender=false per-route SSR"]
key_files:
  created:
    - src/pages/login.astro
    - src/pages/signup.astro
    - src/components/UserMenu.tsx
  modified:
    - src/components/Header.astro
decisions:
  - "Import useUser and useClerk from @clerk/shared/react — @clerk/astro/react does not export these hooks"
  - "client:load hydration on UserMenu prevents flash of wrong state (not client:visible)"
  - "openUserProfile() and signOut() destructured from useClerk() at top of component"
  - "Header replaces Create QR Code CTA with Sign In button per locked design decision"
metrics:
  duration: "434s (~7 min)"
  completed_date: "2026-03-16"
  tasks: 2
  files: 4
---

# Phase 7 Plan 03: Login/Signup Pages + Auth-Aware Header Summary

Clerk-integrated /login and /signup pages with auth-aware header and UserMenu React island.

## What Was Built

### /login and /signup pages
- `src/pages/login.astro`: SSR page (`prerender = false`) with Clerk `SignIn` component, blue #2563EB accent, redirects to `/dashboard` after auth, cross-links to `/signup`
- `src/pages/signup.astro`: SSR page (`prerender = false`) with Clerk `SignUp` component, blue #2563EB accent, redirects to `/dashboard` after auth, cross-links to `/login`
- Both pages use the full Layout, Header, and Footer

### Auth-Aware Header
- `src/components/Header.astro`: Rewritten to use `SignedIn`/`SignedOut` Clerk control components
- Logged-out state: Shows "Sign In" button linking to `/login` (replaces old "Create QR Code" CTA)
- Logged-in state: Shows `UserMenu` React island with `client:load` hydration

### UserMenu React Island
- `src/components/UserMenu.tsx`: React TSX island with avatar (profile photo from OAuth or blue initials fallback), user display name, chevron indicator
- Dropdown menu: My Dashboard (→ `/dashboard`), Account Settings (opens Clerk user profile modal via `openUserProfile()`), Sign Out (calls `signOut({ redirectUrl: '/' })`)
- Click-outside-to-close behavior via `useRef` + `useEffect` mouse event listener
- All JSX uses `className=` (no `class=` attributes)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect import path for Clerk React hooks**
- **Found during:** Task 2 (TypeScript check)
- **Issue:** Plan specified `import { useUser, useClerk } from '@clerk/astro/react'` but `@clerk/astro/react` does not export `useUser` or `useClerk` — it only exports UI components (SignInButton, SignOutButton, etc.)
- **Fix:** Changed import to `import { useUser, useClerk } from '@clerk/shared/react'` which is where these hooks are actually typed and exported
- **Files modified:** `src/components/UserMenu.tsx`
- **Commit:** 67378eb

## Verification Results

- TypeScript check (`npx tsc --noEmit`): no errors on any modified files
- Playwright smoke tests: 3/3 passed (sign-in page loads, sign-up page loads, OAuth buttons visible check)
- Server emits "Publishable key not valid" errors at startup (expected — Clerk env vars not set); pages still render correctly

## Self-Check: PASSED

All files created/modified exist on disk. All 3 task commits (8d56d1a, e56ee31, 67378eb) confirmed in git log.
