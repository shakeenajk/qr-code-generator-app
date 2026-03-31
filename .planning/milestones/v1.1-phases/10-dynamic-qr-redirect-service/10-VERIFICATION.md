---
phase: 10-dynamic-qr-redirect-service
verified: 2026-03-30T20:43:17Z
status: gaps_found
score: 4/5 must-haves verified
re_verification: false
gaps:
  - truth: "Free authenticated user attempting to create a 4th dynamic QR code is blocked with an upgrade prompt (limit: 3)"
    status: partial
    reason: "Server-side 403 gate is correct and fires the upgrade toast. However the client-side preemptive lock (showing the Lock icon before the user attempts to save) is broken: QRGeneratorIsland reads `data.items` from the list API response, but the API returns a plain array — `data.items` is always undefined, falls back to `[]`, and dynamicCount is always initialised to 0 on page load. The lock icon will never show after a page reload unless the user creates 3 QRs in the same session."
    artifacts:
      - path: "src/components/QRGeneratorIsland.tsx"
        issue: "Line 127-129: `data.items ?? []` — the list API at /api/qr/list returns a plain JSON array, not `{ items: [...] }`. The isDynamic count filter always produces 0."
      - path: "src/pages/api/qr/list.ts"
        issue: "Returns `JSON.stringify(response)` where `response` is a plain array, not wrapped in `{ items: response }`."
    missing:
      - "Fix QRGeneratorIsland to read the count directly from the array: `const items = Array.isArray(data) ? data : (data.items ?? [])` (or simpler, just `data as Array<...>`)."
      - "Alternatively, wrap list API response in `{ items: response }` — but this would also require fixing QRLibrary.tsx which already reads it as a plain array."
human_verification:
  - test: "Scan a dynamic QR code (active)"
    expected: "Browser follows 307 redirect to the destination URL; redirect completes under 2 seconds in Network tab"
    why_human: "Cannot test 307 redirect with a real DB slug without a live Clerk session"
  - test: "Scan a paused dynamic QR code"
    expected: "200 response with branded holding page, dark mode applied via prefers-color-scheme"
    why_human: "Requires real authenticated session to create and pause a QR"
  - test: "Edit destination URL and re-scan"
    expected: "Next scan resolves to the new URL without reprinting"
    why_human: "End-to-end state change requires live session and physical or simulated scan"
---

# Phase 10: Dynamic QR Redirect Service Verification Report

**Phase Goal:** Pro users can create dynamic QR codes whose destination URL is editable post-print; scanning the QR code redirects with low latency via a serverless function
**Verified:** 2026-03-30T20:43:17Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Pro user can create a dynamic QR code that encodes a short /r/[slug] redirect URL | VERIFIED | `save.ts` inserts to `dynamicQrCodes` with nanoid(8) slug; QRGeneratorIsland encodes `https://qr-code-generator-app.com/r/{slug}` in qrData when isDynamic+url tab active; commits 2381a68, 66309ea confirmed |
| 2 | Pro user can change the destination URL of a dynamic QR code and the next scan redirects to the new destination without reprinting | VERIFIED | PATCH `/api/qr/[id]` updates `destinationUrl` with IDOR-safe compound WHERE; `/r/[slug]` uses 307 (not 301) so browsers never cache; QRLibrary InlineDestinationEditor calls PATCH and applies optimistic update; commits 1f1bed8, 5c3a625 confirmed |
| 3 | Scanning a dynamic QR code resolves to the destination via a Vercel serverless function; redirect latency verified human-in-the-loop | VERIFIED (human-confirmed) | `/r/[slug].ts` is a serverless Astro API route with `prerender = false`; queries Turso via Drizzle; returns 307 redirect; human verification checklist item 5 and 6 approved on 2026-03-30 |
| 4 | Pro user can toggle a dynamic QR code to paused; scanning a paused code shows a holding page rather than the destination | VERIFIED | `/r/[slug].ts` checks `row.isPaused` and returns branded 200 holding page; QRLibrary `togglePause` calls PATCH `{ isPaused: !currentlyPaused }` and shows toast; human verification items 4 and 7 approved |
| 5 | Free authenticated user attempting to create a 4th dynamic QR code is blocked with an upgrade prompt (limit: 3) | PARTIAL | Server-side gate in `save.ts` (lines 66-78) correctly returns 403 `dynamic_limit_reached`; QRGeneratorIsland handles this with upgrade toast (line 344-347). BUT client-side preemptive lock is broken: line 127-129 reads `data.items` from list API response which returns a plain array — `data.items` is always `undefined`, dynamicCount initialises to 0 on every page load, Lock icon never shows preemptively |

**Score:** 4/5 truths verified (1 partial)

---

### Required Artifacts

| Artifact | Description | Status | Details |
|----------|-------------|--------|---------|
| `src/db/schema.ts` | dynamicQrCodes table with slug UNIQUE, FK to savedQrCodes, isPaused, userId index | VERIFIED | All columns present; `onDelete: 'cascade'` FK; userId index; commit f3b9b84 |
| `src/pages/r/[slug].ts` | Serverless redirect endpoint — 307 active, 200 paused, 404 invalid | VERIFIED | `prerender = false`; GET handler with 3 cases; branded holding page with dark mode, `<main>`, `<h1>`, QRCraft logo; commit e28c078 |
| `src/pages/api/qr/save.ts` | POST handler extended for isDynamic path with slug generation and tier limit | VERIFIED | isDynamic fork at line 49; tier check at line 66; nanoid(8) with retry loop; dual-table insert; returns `{ id, slug }`; commit 2381a68 |
| `src/pages/api/qr/[id].ts` | GET with leftJoin dynamic metadata; PATCH for destinationUrl/isPaused; DELETE with explicit cascade | VERIFIED | GET leftJoin at line 44 returning `isDynamic`, `slug`, `destinationUrl`, `isPaused`; PATCH with compound WHERE IDOR prevention; explicit DELETE of dynamicQrCodes before savedQrCodes; commit 1f1bed8, cfefaac |
| `src/pages/api/qr/list.ts` | GET with LEFT JOIN returning isDynamic computed field | VERIFIED | leftJoin at line 33; `isDynamic: row.slug !== null` computed field; returns plain array; commit 1f1bed8 |
| `src/components/tabs/UrlTab.tsx` | Dynamic QR toggle with 3 states (normal, greyed, locked) | VERIFIED | `role="switch"` button; `aria-checked`; Lock icon for locked state; opacity-40 for non-URL tab; commit 2ef5a70 |
| `src/components/QRGeneratorIsland.tsx` | isDynamic state, count fetch, handleToggleDynamic, qrData encoding, canSaveDynamic | PARTIAL | All logic present and wired; **BUG: `data.items ?? []` on line 128 reads wrong key from list API** — dynamicCount fetch always returns 0; everything else wired correctly |
| `src/components/SaveQRModal.tsx` | isDynamic prop — changes heading and button label to "Save Dynamic QR" | VERIFIED | `isDynamic` prop received; heading and button label conditionally rendered; commit 66309ea |
| `src/components/dashboard/QRLibrary.tsx` | DynamicBadge, DynamicCardBody, InlineDestinationEditor, PauseToggle | VERIFIED | DynamicBadge renders for isDynamic cards; DynamicCardBody sub-component with status dot, truncated URL, pencil edit, pause toggle; togglePause calls PATCH and updates optimistic state; commit 5c3a625 |
| `tests/dynamic/` (4 files) | Smoke tests + test.fixme stubs | VERIFIED | 15 smoke tests pass (unauthenticated 401/404 cases); session-dependent tests remain test.fixme per project convention; commit b01afe6 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `QRGeneratorIsland` | `UrlTab` | isDynamic + onToggleDynamic + dynamicLocked props | WIRED | Lines 563-570 pass all props; toggle wired back via handleToggleDynamic callback |
| `QRGeneratorIsland` | `POST /api/qr/save` | fetch with isDynamic+destinationUrl in body | WIRED | Lines 331-334 append isDynamic and destinationUrl when toggle on; line 344 handles dynamic_limit_reached |
| `QRGeneratorIsland` | `GET /api/qr/list` | fetch on mount for dynamicCount | PARTIAL | Fetch exists (line 125); response parsed incorrectly — `data.items` always undefined; count always 0 |
| `QRGeneratorIsland` | `GET /api/qr/[id]` | edit-mode fetch restores isDynamic+slug | WIRED | Lines 242-245 read `data.isDynamic` and `data.slug` from GET response; setSavedSlug and setIsDynamic called |
| `QRLibrary` | `PATCH /api/qr/[id]` | togglePause and saveDestination | WIRED | togglePause (line 329): PATCH `{ isPaused: !currentlyPaused }`; saveDestination (line 309): PATCH `{ destinationUrl }`; both with optimistic update |
| `/r/[slug].ts` | `dynamicQrCodes` table | Drizzle select by slug | WIRED | Query at lines 12-16; branches on isPaused; 307 redirect uses destinationUrl from DB |
| `save.ts` | `dynamicQrCodes` table | Drizzle insert after savedQrCodes insert | WIRED | Lines 115-121; slug returned in response; userId denormalized for count query |
| `[id].ts PATCH` | `dynamicQrCodes` table | Drizzle update with compound WHERE | WIRED | Lines 211-214; compound WHERE (savedQrCodeId + userId) prevents IDOR |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `/r/[slug].ts` | `row.destinationUrl` | `dynamicQrCodes` table via Drizzle select | Yes — DB query with real slug lookup | FLOWING |
| `QRLibrary.tsx` | `qrCodes` (isDynamic, destinationUrl, isPaused) | `GET /api/qr/list` via fetch on mount; list does leftJoin on dynamicQrCodes | Yes — DB query returns real rows | FLOWING |
| `QRGeneratorIsland` | `dynamicCount` | `GET /api/qr/list` via fetch on mount | No — `data.items` misread; always 0 | STATIC (bug) |
| `QRGeneratorIsland` | `savedSlug` | POST /api/qr/save response + GET /api/qr/[id] edit-mode | Yes — DB-generated nanoid returned from insert | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Invalid slug returns 404 holding page | `tests/dynamic/redirect.spec.ts` smoke test | 15 passed, 0 failed (b01afe6) | PASS |
| POST unauthenticated returns 401 | `tests/dynamic/create-api.spec.ts` smoke test | Pass confirmed in 10-05 summary | PASS |
| PATCH unauthenticated returns 401 | `tests/dynamic/update-api.spec.ts` smoke test | Pass confirmed in 10-05 summary | PASS |
| TypeScript compilation | `tsc --noEmit` | No output (clean) | PASS |
| 307 redirect for active slug (real session) | Requires Clerk session | N/A — human-verified 2026-03-30 | SKIP (human-verified) |
| 4th dynamic QR blocked | Requires Clerk session | Human-verified (server-side 403 toast fires); client-side preemptive lock does NOT work | PARTIAL |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| DYN-01 | Pro user can create a dynamic QR code that encodes a short redirect URL | SATISFIED | isDynamic save path in save.ts; QRGeneratorIsland encodes /r/{slug}; UrlTab toggle |
| DYN-02 | Pro user can change the destination URL without reprinting | SATISFIED | PATCH /api/qr/[id] updates destinationUrl; 307 redirect ensures no browser caching; InlineDestinationEditor in QRLibrary |
| DYN-03 | Scanning redirects via serverless function with low latency | SATISFIED (human-confirmed) | /r/[slug].ts serverless route; Turso HTTP API; human verification checklist items 5+6 passed |
| DYN-04 | Pro user can toggle active/paused; paused shows holding page | SATISFIED | isPaused field; PATCH endpoint; /r/[slug].ts returns 200 holding page when paused; PauseToggle in QRLibrary |
| DYN-05 | Free user limited to 3 dynamic QRs | PARTIAL | Server-side count gate in save.ts is correct and fires upgrade toast on 403. Client-side preemptive lock (Lock icon in toggle) broken due to `data.items` bug in list fetch |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/QRGeneratorIsland.tsx` | 127-129 | `data.items ?? []` reads from `{ items?: Array<...> }` type but list API returns a plain array — type annotation is wrong and `items` is always `undefined` | Warning | DYN-05 client-side preemptive lock never engages after page reload; server-side gate still blocks at API level |

No TODO/FIXME/placeholder comments found in any phase 10 source files. No empty `return null` or stub handlers found. All dark mode variants applied.

---

### Human Verification Required

The following items were already approved by the user on 2026-03-30 per the 10-05-SUMMARY.md checklist. They are retained here for completeness and to document which behaviors cannot be asserted programmatically.

#### 1. Active Slug Redirect Latency

**Test:** Open browser DevTools Network tab; scan or navigate to `/r/[real-active-slug]`
**Expected:** 307 response followed by destination URL load; total round-trip under 2 seconds
**Why human:** Cannot automate a live 307 redirect with a real DB slug without a Clerk session; latency verification requires a real network request
**Human verdict:** APPROVED 2026-03-30

#### 2. Paused Code Holding Page

**Test:** Pause a dynamic QR from the dashboard, then navigate to `/r/[that-slug]`
**Expected:** 200 response with branded "This QR code is temporarily paused" page; dark mode applies via OS preference
**Why human:** Requires authenticated session to pause a real QR
**Human verdict:** APPROVED 2026-03-30

#### 3. Destination URL Change Reflects on Next Scan

**Test:** Edit destination URL via pencil icon in library, save, then navigate to the same `/r/[slug]`
**Expected:** Redirect now goes to the new destination without a new QR code
**Why human:** Requires real session, real DB row, and real redirect check in sequence
**Human verdict:** APPROVED 2026-03-30

---

### Gaps Summary

One gap blocks full DYN-05 goal achievement:

**DYN-05 Client-Side Preemptive Lock is Broken**

`QRGeneratorIsland.tsx` fetches `/api/qr/list` to count existing dynamic QRs and set `dynamicCount`. The fetch result is parsed as `data.items ?? []`, but the list API returns a plain JSON array — not an object with an `items` key. As a result `data.items` is always `undefined`, the fallback `[]` is always used, and `dynamicCount` is always 0 after page load.

Consequence: the Lock icon in the UrlTab toggle never appears preemptively. The server-side 403 gate in `save.ts` still fires correctly, so the upgrade toast will appear when a free user tries to save a 4th dynamic QR. The human verification checklist item 8 passed because the 403 path works — but the visual lock state that should appear before the user even tries to save does not work.

Fix: Change `data.items ?? []` to simply `Array.isArray(data) ? data : []` in `QRGeneratorIsland.tsx` lines 127-128.

This is classified as a Warning (not a Blocker) because the server-side enforcement is intact and the user does receive the upgrade prompt — but the UX is degraded since the Lock icon never shows preemptively.

---

_Verified: 2026-03-30T20:43:17Z_
_Verifier: Claude (gsd-verifier)_
