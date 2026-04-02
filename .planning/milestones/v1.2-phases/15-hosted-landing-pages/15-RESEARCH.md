# Phase 15: Hosted Landing Pages - Research

**Researched:** 2026-03-31
**Domain:** Vercel Blob file storage, Drizzle DB migration, Astro SSR landing pages, QR generator tab extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** PDF form fields: cover photo upload, title, description, website URL, social sharing buttons (Facebook, Twitter, LinkedIn), PDF file upload, company name, CTA button text
- **D-02:** Hosted page renders embedded PDF viewer (first pages visible) with download button and metadata sidebar (title, description, company, website link, social buttons)
- **D-03:** PDF file stored via Vercel Blob; cover photo also via Vercel Blob
- **D-04:** Two store URLs only: iOS App Store + Google Play
- **D-05:** Always show landing page with both store buttons visible — no OS auto-redirect
- **D-06:** App Store form fields: app name, app icon upload, iOS URL, Google Play URL, description, screenshot/trailer URL, company name, CTA button text
- **D-07:** App icon stored via Vercel Blob
- **D-08:** Claude's discretion — decide whether QR encodes `/r/[slug]` (scan tracking) or `/p/[slug]` (direct)
- **D-09:** Full editing — user can update all fields including re-uploading cover photo, PDF file, and app icon from dashboard
- **D-10:** Edit flow accessible from QR library (dashboard)
- **D-11:** PDF and App Store landing pages count toward same QR code limits (Free: 5, Starter: 100, Pro: 250) — enforced via existing `tierLimits.ts`
- **D-12:** File upload size limits: product decision needed (research suggests 10MB free, 25MB Pro)

### Claude's Discretion

- QR routing approach (through `/r/[slug]` for scan tracking vs direct `/p/[slug]`)
- `landingPages` DB table schema design
- Landing page slug generation approach
- Social sharing button implementation
- PDF viewer library/approach (embedded iframe vs canvas-based)
- File size limits per tier

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | User can generate a QR code for a PDF with hosted landing page (cover photo, title, description, social buttons, website URL) | Vercel Blob for file storage, `landingPages` DB table, `/p/[slug].astro` SSR page, PdfTab form |
| CONT-02 | User can generate a QR code for an App Store listing with hosted landing page (all store links, app name, description, branding) | Same infrastructure as CONT-01, AppStoreTab form, platform store buttons |
| CONT-03 | PDF/App Store landing pages follow same QR code limits per tier (Free: 5, Starter: 100, Pro: 250) | Existing `TIER_LIMITS` in `src/lib/tierLimits.ts` — `totalQr` field governs, check is in `/api/landing/create.ts` |
</phase_requirements>

---

## Summary

Phase 15 extends QRCraft with two new content types (PDF and App Store) that generate QR codes linking to hosted, branded `/p/[slug]` landing pages. The architecture is well-understood from the prior v1.2 research: Vercel Blob handles file storage, a new `landingPages` Turso table stores content, two new API routes handle CRUD, and two new QRGeneratorIsland tabs drive the creation form. The `/p/[slug].astro` SSR route renders the public landing page and sets OG meta tags server-side.

The primary technical risks are the Drizzle migration (new table against a live production database), the Vercel Blob client-upload pattern (files must never pass through the serverless function body), and the two-step save flow in the generator tabs (upload files first, then POST metadata with returned Blob URLs). The slug namespace conflict between `/r/[slug]` and `/p/[slug]` is a non-issue because they are separate routes and separate slug pools.

The recommended routing decision (D-08) is `/r/[slug]` encoding — QR codes should always route through the dynamic redirect infrastructure. This reuses existing scan tracking, pause/unpause, and analytics for landing pages at zero additional implementation cost.

**Primary recommendation:** Follow the ARCHITECTURE.md data flow exactly — upload files to Blob, POST to `/api/landing/create` with returned URLs, create linked `dynamicQrCodes` row with `destinationUrl = /p/[landingSlug]`, QR encodes `/r/[dynamicSlug]`. The landing page DB slug and the dynamic QR slug are independent and generated separately.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@vercel/blob` | 2.3.2 (current as of 2026-03-31) | File storage for PDF, cover photo, app icon | Already in Vercel ecosystem; client-upload bypasses 4.5MB serverless body limit; public CDN URLs returned |
| `drizzle-orm` | ^0.45.1 (already installed) | New `landingPages` table + migration | Already the project ORM — `drizzle-kit generate` → SQL file → apply |
| `nanoid` | 5.1.7 (already used in save.ts) | Slug generation for `landingPages.slug` | Already used for `dynamicQrCodes.slug` — consistent pattern |
| Astro SSR (`prerender = false`) | Astro 5.17.1 (already installed) | `/p/[slug].astro` server-rendered landing page | Required for Turso read + dynamic OG tags at request time |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` | ^2.0.7 (already installed) | Toast notifications for upload/save errors and success | Already used throughout the generator; same toast pattern |
| `lucide-react` | ^1.7.0 (already installed) | `Loader2` spinner for upload in-progress state, `FileIcon` for empty upload zone | Already the icon library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@vercel/blob` client-upload | Upload through API route body | API route enforces Vercel's 4.5MB body limit — PDF files will exceed this; client-upload is mandatory |
| `iframe` for PDF viewer | PDF.js (`pdfjs-dist`) | iframe is zero-dependency and sufficient for "first pages visible" requirement; PDF.js adds ~1MB bundle but enables page navigation — defer unless iframe proves insufficient |
| nanoid(8) for both slug pools | UUID or cuid | nanoid(8) is already the established pattern in this codebase; URL-safe, short, sufficient uniqueness |
| Full-page edit route `/dashboard/edit/[id]` | Modal edit | Full-page route is simpler for complex multi-file forms; avoids modal z-index and scroll complexity |

**Installation:**
```bash
npm install @vercel/blob
```

**Version verification:** `@vercel/blob` 2.3.2 confirmed via `npm view @vercel/blob version` (2026-03-31). `nanoid` 5.1.7 confirmed via `npm view nanoid version` (2026-03-31).

---

## Architecture Patterns

### Recommended Project Structure (new additions only)

```
src/
├── components/
│   ├── tabs/
│   │   ├── PdfTab.tsx              # NEW — PDF landing page form + file upload
│   │   └── AppStoreTab.tsx         # NEW — App Store form + icon upload
│   └── dashboard/
│       └── QRLibrary.tsx           # MODIFIED — add PdfCardBody, AppStoreCardBody
├── pages/
│   ├── p/
│   │   └── [slug].astro            # NEW — prerender=false, public SSR landing page
│   ├── dashboard/
│   │   └── edit-landing/
│   │       └── [id].astro          # NEW — prerender=false, auth-protected edit page
│   └── api/
│       └── landing/
│           ├── create.ts           # NEW — POST: create landingPages row + dynamicQrCodes row
│           ├── [id].ts             # NEW — GET/PUT/DELETE landing page record
│           └── upload.ts           # NEW — POST: proxy file to Vercel Blob, return URL
└── db/
    └── schema.ts                   # MODIFIED — add landingPages table
drizzle/
└── 0001_landing_pages.sql          # NEW — migration from drizzle-kit generate
```

### Pattern 1: Vercel Blob Client-Upload

**What:** Files are uploaded from the browser directly to Vercel Blob — not via the serverless function body. The API route generates a client token; the browser calls `upload()` with that token directly to Blob's edge.

**When to use:** Any file upload that could exceed 4.5MB (PDFs, images).

**Example:**
```typescript
// /api/landing/upload.ts — server side (token exchange)
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

export const POST: APIRoute = async ({ locals, request }) => {
  const { userId } = locals.auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const body = await request.json() as HandleUploadBody;
  const jsonResponse = await handleUpload({
    body,
    request: request as unknown as Request,
    onBeforeGenerateToken: async (pathname) => ({
      allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      maximumSizeInBytes: 26_214_400, // 25MB ceiling — server enforces per-tier logic separately
    }),
    onUploadCompleted: async ({ blob }) => {
      // Optionally record blob.url for audit purposes
    },
  });
  return new Response(JSON.stringify(jsonResponse), { status: 200 });
};

// Browser side (inside PdfTab.tsx / AppStoreTab.tsx)
import { upload } from '@vercel/blob/client';
const blob = await upload(filename, file, {
  access: 'public',
  handleUploadUrl: '/api/landing/upload',
});
// blob.url is the permanent public CDN URL
```

Source: Vercel Blob client upload documentation — https://vercel.com/docs/vercel-blob/client-upload

### Pattern 2: Landing Page Two-Step Save Flow

**What:** Generator tabs perform two sequential API calls on save: (1) upload files to Blob, get back CDN URLs; (2) POST metadata including Blob URLs to `/api/landing/create`.

**When to use:** Any content type that includes file uploads before saving metadata.

**Example (pseudocode, inside tab's save handler):**
```typescript
// Step 1: Upload files (parallel if multiple files)
const [coverUrl, pdfUrl] = await Promise.all([
  coverPhotoFile ? uploadToBlob(coverPhotoFile) : Promise.resolve(existingCoverUrl),
  pdfFile        ? uploadToBlob(pdfFile)        : Promise.resolve(existingPdfUrl),
]);

// Step 2: Create landing page record
const res = await fetch('/api/landing/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'pdf',
    title, description, companyName, websiteUrl, ctaButtonText,
    coverImageUrl: coverUrl,
    pdfUrl,
    socialLinks: enabledSocials, // ['facebook','twitter','linkedin'] subset
    // QR style data (passed from parent Island)
    name, styleData, logoData, thumbnailData,
  }),
});
const { landingPageId, dynamicSlug } = await res.json();
// QR encodes REDIRECT_BASE + dynamicSlug
```

### Pattern 3: `/api/landing/create` Server Route

**What:** Single API route creates three rows atomically — `landingPages`, `dynamicQrCodes`, and `savedQrCodes` — then returns the slug so the Island can encode the QR.

**When to use:** Only when creating a new landing page QR. Edit uses `PUT /api/landing/[id]`.

**Critical implementation detail:** The tier limit check uses the same `savedQrCodes` count query and `TIER_LIMITS.totalQr` as `api/qr/save.ts`. Landing page QRs count against `totalQr`, not `dynamicQr`. Do NOT count them against `dynamicQr` — the user context says "same limits as other QR codes," not "same limits as dynamic QR codes." The `dynamicQrCodes` row is an implementation detail of the redirect infrastructure, not what drives the limit.

```typescript
// /api/landing/create.ts — key enforcement pattern
const [{ value: totalCount }] = await db
  .select({ value: count() })
  .from(savedQrCodes)
  .where(eq(savedQrCodes.userId, userId));

if (totalCount >= limits.totalQr) {
  return new Response(JSON.stringify({ error: 'total_limit_reached' }), { status: 403 });
}
```

### Pattern 4: `/p/[slug].astro` SSR Landing Page

**What:** Server-rendered Astro page that reads `landingPages` from Turso and sets OG tags in `<head>` at request time. No client JS needed for the landing page itself.

**When to use:** The publicly accessible scan-facing page. Must be SSR (not static) because content is user-generated and unique per slug.

```astro
---
// /p/[slug].astro
export const prerender = false;
import { db } from '../../db/index';
import { landingPages } from '../../db/schema';
import { eq } from 'drizzle-orm';

const { slug } = Astro.params;
const [page] = await db.select().from(landingPages).where(eq(landingPages.slug, slug)).limit(1);
if (!page) return Astro.redirect('/404');
---
<html>
  <head>
    <meta property="og:title" content={page.title} />
    <meta property="og:description" content={page.description ?? ''} />
    <meta property="og:image" content={page.coverImageUrl ?? '/og-image.png'} />
    <!-- Cache at edge for 5 minutes -->
  </head>
  <!-- No navigation, standalone branded page -->
</html>
```

**Cache-Control header:** Add `Cache-Control: public, s-maxage=300, stale-while-revalidate=60` to the SSR response — landing page content rarely changes mid-campaign, and this prevents a Turso read on every QR scan.

### Pattern 5: DB Schema — `landingPages` Table

**What:** New Drizzle table alongside existing tables. FK to `savedQrCodes` via `savedQrCodeId`.

```typescript
// src/db/schema.ts addition
import { nanoid } from 'nanoid';

export const landingPages = sqliteTable('landing_pages', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:         text('user_id').notNull(),
  savedQrCodeId:  text('saved_qr_code_id').references(() => savedQrCodes.id, { onDelete: 'cascade' }),
  slug:           text('slug').notNull().unique(),
  type:           text('type').notNull(),                 // 'pdf' | 'appstore'
  title:          text('title').notNull(),
  description:    text('description'),
  companyName:    text('company_name'),
  websiteUrl:     text('website_url'),
  ctaButtonText:  text('cta_button_text'),
  coverImageUrl:  text('cover_image_url'),
  // PDF-specific
  pdfUrl:         text('pdf_url'),
  // App Store-specific
  appStoreUrl:    text('app_store_url'),
  googlePlayUrl:  text('google_play_url'),
  appIconUrl:     text('app_icon_url'),
  screenshotUrl:  text('screenshot_url'),
  // Social links — stored as JSON array of enabled platform strings
  socialLinks:    text('social_links'),                   // e.g. '["facebook","twitter"]'
  isPaused:       integer('is_paused', { mode: 'boolean' }).notNull().default(false),
  createdAt:      integer('created_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
  updatedAt:      integer('updated_at').notNull().$defaultFn(() => Math.floor(Date.now() / 1000)),
}, (table) => [
  index('landing_pages_user_id_idx').on(table.userId),
  index('landing_pages_saved_qr_id_idx').on(table.savedQrCodeId),
]);
```

**Migration procedure:** `npx drizzle-kit generate` → inspect generated SQL → apply to staging → apply to production. Never use `drizzle-kit push` against the production Turso database.

### Pattern 6: QRLibrary Extension — New Card Body Variants

**What:** Two new sub-components (`PdfCardBody`, `AppStoreCardBody`) follow the `DynamicCardBody` pattern exactly. The `SavedQR` interface extends with new `contentType` values.

**When to use:** When `savedQR.contentType === 'pdf'` or `'appstore'` — render the respective card body variant instead of `DynamicCardBody`.

### Pattern 7: Edit Landing Page Route

**What:** Full-page SSR edit route at `/dashboard/edit-landing/[id]` (auth-protected). Loads existing `landingPages` record, renders pre-filled form, submits `PUT /api/landing/[id]`.

**Why full-page (not modal):** Multi-file upload forms with drag-and-drop, file preview, and textarea inputs are unwieldy inside a modal. Full-page is the established pattern for complex edits in this codebase (the QR generator itself is a full page).

### Anti-Patterns to Avoid

- **Uploading files through the serverless function body:** Vercel hard limit is 4.5MB. Use `@vercel/blob/client` `upload()` for browser-direct upload.
- **Checking `dynamicQr` limit for landing pages:** Landing pages count against `totalQr` only. They are not "dynamic QR codes" from a product limit perspective even though they create a `dynamicQrCodes` row internally.
- **Setting OG tags in a React island:** OG meta tags must be in server-rendered `<head>` to be visible to social crawlers. `/p/[slug].astro` must render them in SSR, not in a client component.
- **Using `drizzle-kit push` on production:** Generates SQL and applies immediately without review. Always use `generate` → inspect → apply manually.
- **Slug namespace collision:** `landingPages.slug` and `dynamicQrCodes.slug` are independent pools (different tables, different routes `/p/` vs `/r/`). Do not reuse the same value for both — generate separately with `nanoid(8)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File storage | Custom S3 or base64 in DB | `@vercel/blob` | Already in Vercel ecosystem; CDN edge delivery; public URL returned after upload; no infra account |
| Client-side upload with presigned tokens | Custom presigned URL endpoint | `handleUpload` + `upload()` from `@vercel/blob/client` | Token exchange and CORS handled; secure; browser-direct avoids 4.5MB body limit |
| PDF rendering | Custom PDF-to-image converter | HTML `<iframe src="...">` or link to Blob URL | Sufficient for "show first pages" requirement; zero dependency; browser handles rendering |
| Slug uniqueness check | Custom hash or timestamp | `nanoid(8)` with 3-attempt retry loop | Exactly what `api/qr/save.ts` already does — copy the pattern |
| Tier limit enforcement | New limit constants | `TIER_LIMITS` from `src/lib/tierLimits.ts` | Single source of truth already established in Phase 12 |
| IDOR prevention | Ad hoc userId checks | `AND userId = :userId` in every WHERE clause | Already the established pattern in `api/qr/[id].ts` |

**Key insight:** Every major infrastructure problem in this phase is already solved in the existing codebase. The implementation work is composing existing patterns (Drizzle, nanoid, tierLimits, Clerk auth, sonner toasts, Tailwind UI) into new files — not building new capabilities.

---

## Routing Decision (D-08)

**Recommendation: QR encodes `/r/[slug]` (scan tracking).**

Rationale:
1. Scan tracking, analytics, and pause/unpause all work automatically via the existing `/r/[slug]` redirect infrastructure — zero additional implementation.
2. The landing page slug and the dynamic redirect slug are independent: `landingPages` gets its own `nanoid(8)` slug for `/p/`, and `dynamicQrCodes` gets a separate `nanoid(8)` slug for `/r/`.
3. If landing pages ever need to be paused (broken PDF file, takedown request), `isPaused` on `dynamicQrCodes` works immediately.
4. Direct `/p/[slug]` encoding would require a separate scan counter implementation.

**Data flow:**
```
QR encodes: https://qr-code-generator-app.com/r/[dynamicSlug]
Scan → GET /r/[dynamicSlug] → 307 → https://qr-code-generator-app.com/p/[landingSlug]
     → GET /p/[landingSlug] (SSR) → render landing page
```

---

## PDF Viewer Decision (Claude's Discretion)

**Recommendation: HTML `<iframe>` for the landing page PDF viewer.**

Rationale:
- D-02 requires "first pages visible" and a download button — `<iframe src="{pdfUrl}">` achieves this natively in Chrome, Firefox, and Edge with zero dependencies and zero bundle cost.
- Safari on iOS has inconsistent `<iframe>` PDF rendering (shows blank or download prompt). Mitigation: render a prominent "Download PDF" button below the iframe as the primary CTA; the iframe is enhancement, not the gate.
- PDF.js (`pdfjs-dist`) adds ~1MB to the landing page bundle, requires a service worker, and is overkill for "show first pages." Defer to v2 if users request page navigation.
- The Blob URL is already public (Vercel Blob `access: 'public'`), so no CORS issue with the iframe src.

---

## File Size Limits Decision (D-12)

**Recommendation: 10MB for Free/Starter, 25MB for Pro.**

Rationale:
- Vercel Blob supports up to 500MB per file on all plans — the limit must be enforced by QRCraft, not by Blob.
- 10MB covers most cover photos (JPEG/PNG at print resolution) and short single-page PDFs.
- 25MB accommodates multi-page brochures and high-resolution app screenshots.
- Enforce in `/api/landing/upload.ts` via `maximumSizeInBytes` in the `handleUpload` token — check user tier before generating the token and set the cap accordingly.
- Client-side validation (pre-upload file size check) gives immediate UX feedback before the Blob round-trip.

---

## Common Pitfalls

### Pitfall 1: Files Through Serverless Function Body

**What goes wrong:** Uploading PDF or image files via `fetch('/api/landing/upload', { body: formData })` passes the binary through Vercel's serverless function. Vercel enforces a hard 4.5MB body limit — larger files return 413 or silently fail.

**Why it happens:** The default mental model is "upload to my API route." The Vercel limit is not a configuration option — it is a platform hard cap.

**How to avoid:** Use `@vercel/blob/client`'s `upload()` function. It exchanges a token with the `/api/landing/upload` server route, then uploads directly from the browser to Vercel Blob's edge. The serverless function never sees the file bytes.

**Warning signs:** `413 Payload Too Large` errors in production, works fine in dev (localhost has no 4.5MB limit).

### Pitfall 2: `drizzle-kit push` on Production

**What goes wrong:** `npx drizzle-kit push` compares the schema to the live DB and applies changes immediately — it can DROP columns or tables if the schema no longer declares them.

**Why it happens:** `push` is a development convenience tool. The project uses Turso (production SQLite) as its only database.

**How to avoid:** Always use `npx drizzle-kit generate` to produce a SQL migration file in `drizzle/`. Inspect the SQL. Apply via `turso db shell <db> < drizzle/0001_landing_pages.sql` against staging first, then production.

**Warning signs:** Any invocation of `drizzle-kit push` should be treated as a red flag in this phase.

### Pitfall 3: OG Tags in Client Component

**What goes wrong:** Setting `og:title`, `og:description`, `og:image` inside a React island means social crawlers (Facebook, Twitter, LinkedIn, Slack) never see the tags — they do not execute JavaScript.

**Why it happens:** Islands render client-side; `<head>` meta tags set from `useEffect` or `useLayoutEffect` arrive after the initial HTML is sent.

**How to avoid:** OG tags must be in the server-rendered `<head>` of `/p/[slug].astro`. The Astro SSR page reads `landingPages` from Turso at request time and writes the meta tags to the HTML response before any JS runs.

**Warning signs:** Social preview shows blank image or the site's default OG image instead of the landing page's `coverImageUrl`.

### Pitfall 4: Counting Against `dynamicQr` Limit

**What goes wrong:** Landing page saves create a `dynamicQrCodes` row (for redirect infrastructure). If the tier check counts this row against `dynamicQr` limit, users on Free tier can only create 3 landing pages total — contradicting D-11 and CONT-03.

**Why it happens:** Copy-paste from `save.ts` dynamic QR path which checks BOTH `totalQr` and `dynamicQr`.

**How to avoid:** `/api/landing/create.ts` checks ONLY `totalQr` — same limit as static QR codes. The `dynamicQrCodes` row for the landing page redirect is an implementation detail, not a product-tier gate.

### Pitfall 5: Stale Blob URLs After Edit

**What goes wrong:** When a user re-uploads a PDF or cover photo on edit, the old Blob URL remains in Vercel Blob storage — it is never deleted. Over time, orphaned files accumulate storage cost.

**Why it happens:** Vercel Blob has no automatic cleanup on PUT. The old URL must be explicitly deleted.

**How to avoid:** In `PUT /api/landing/[id]`, when a new `pdfUrl` or `coverImageUrl` is provided (different from the stored one), call `del(oldUrl)` from `@vercel/blob` before committing the update. Read the current URL from the DB row first, then delete the old, then write the new.

**Warning signs:** Blob storage costs growing disproportionately after user edits.

### Pitfall 6: Missing `savedQrCodeId` FK on Delete

**What goes wrong:** Deleting a `savedQrCodes` row (via existing `/api/qr/[id].ts` DELETE) cascades to `dynamicQrCodes` via the existing FK — but `landingPages` also has `savedQrCodeId` FK. If the FK cascade is not in the migration SQL, the `landingPages` row orphans.

**Why it happens:** Turso's HTTP driver does not always enforce FK constraints by default unless `PRAGMA foreign_keys = ON` is set.

**How to avoid:** (1) Declare `onDelete: 'cascade'` on the `savedQrCodeId` FK in the Drizzle schema. (2) In the landing page DELETE API route, explicitly delete the `landingPages` row before (or instead of) relying on cascade — same safety-belt pattern already used in `api/qr/[id].ts` DELETE.

---

## Code Examples

### Verified Pattern: Blob Client Upload (from `@vercel/blob` official docs)

```typescript
// Browser side — inside PdfTab.tsx
import { upload } from '@vercel/blob/client';

async function uploadFile(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/landing/upload',
  });
  return blob.url; // permanent public CDN URL
}
```

Source: https://vercel.com/docs/vercel-blob/client-upload

### Verified Pattern: Blob Delete (for edit cleanup)

```typescript
// Server side — inside /api/landing/[id].ts PUT
import { del } from '@vercel/blob';

// Before writing new URL, delete old file
if (body.pdfUrl && body.pdfUrl !== existingRow.pdfUrl && existingRow.pdfUrl) {
  await del(existingRow.pdfUrl);
}
```

Source: `@vercel/blob` npm package README

### Verified Pattern: QR Library SavedQR Type Extension

```typescript
// Extend existing SavedQR interface in QRLibrary.tsx
interface SavedQR {
  // ... existing fields ...
  contentType: 'url' | 'text' | 'wifi' | 'vcard' | 'pdf' | 'appstore'; // add pdf, appstore
  landingPageId?: string | null;     // populated for pdf/appstore types
  landingPageSlug?: string | null;   // populated for pdf/appstore types
  landingPageTitle?: string | null;  // for card display
}
```

### Verified Pattern: Existing Slug Generation with Retry

```typescript
// From src/pages/api/qr/save.ts — copy this pattern for landingPages slug
let slug: string | null = null;
for (let attempt = 0; attempt < 3; attempt++) {
  const candidate = nanoid(8);
  const [existing] = await db
    .select({ slug: landingPages.slug })
    .from(landingPages)
    .where(eq(landingPages.slug, candidate))
    .limit(1);
  if (!existing) { slug = candidate; break; }
}
if (!slug) return new Response(JSON.stringify({ error: 'Slug generation failed' }), { status: 500 });
```

Source: `src/pages/api/qr/save.ts` (codebase)

### Verified Pattern: IDOR Prevention

```typescript
// From src/pages/api/qr/[id].ts — copy for /api/landing/[id].ts
const result = await db
  .update(landingPages)
  .set(updates)
  .where(and(eq(landingPages.id, id), eq(landingPages.userId, userId)));
// Never filter by id alone — always AND with userId
```

Source: `src/pages/api/qr/[id].ts` (codebase)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Upload files through API route body | Browser-direct `@vercel/blob/client` upload | Vercel Blob client upload added ~2023 | Bypasses 4.5MB serverless body limit; enables large file uploads |
| `drizzle-kit push` for schema changes | `drizzle-kit generate` → inspect SQL → apply | Drizzle ORM best practice for production | Prevents accidental data loss on live databases |

---

## Open Questions

1. **Are landing pages available to all tiers or Pro-only?**
   - What we know: D-11 says "same limits as other QR codes (Free: 5, Starter: 100, Pro: 250)" — implying Free and Starter users CAN create landing pages.
   - What's unclear: The earlier ARCHITECTURE.md research noted this as an open product decision; the prior v1.2 research flag said "the gate is inherited from `dynamicQrCodes` Pro check — confirm intent."
   - Recommendation: D-11 is explicit and locked. Treat landing pages as available to all tiers, capped by `totalQr` limit. No Pro gate. The planner should confirm this interpretation before coding begins.

2. **Edit landing page route location**
   - What we know: D-10 says "edit flow accessible from QR library." D-09 says "full editing."
   - What's unclear: Should the edit route be `/dashboard/edit-landing/[id]` (new page) or should it reuse the main generator at `/?edit=[id]` (existing edit-mode pattern)?
   - Recommendation: New dedicated route `/dashboard/edit-landing/[id]`. The existing generator edit-mode at `/?edit=[id]` hydrates the QRGeneratorIsland with saved data — landing pages have a fundamentally different multi-file form structure that would pollute QRGeneratorIsland significantly if merged. A dedicated edit page is cleaner.

3. **`api/qr/list.ts` — does it need to include landing pages?**
   - What we know: `QRLibrary.tsx` fetches from `/api/qr/list` to populate the card grid.
   - What's unclear: The list API does a LEFT JOIN between `savedQrCodes` and `dynamicQrCodes`. Landing pages also create a `savedQrCodes` row (with `contentType: 'pdf'` or `'appstore'`). They will appear in the list automatically — but the card rendering logic needs to handle the new `contentType` values and JOIN to `landingPages` for the title and landing page slug.
   - Recommendation: Modify `api/qr/list.ts` to add a LEFT JOIN on `landingPages` by `savedQrCodeId`, returning `landingPageId`, `landingPageSlug`, `landingPageTitle` alongside existing fields.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@vercel/blob` | File uploads | Must install | 2.3.2 | None — required for all file storage |
| `BLOB_READ_WRITE_TOKEN` env var | `@vercel/blob` auth | Not yet set (new) | — | None — must be provisioned in Vercel dashboard before deploy |
| `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` | Drizzle / `db` | Already set | — | None |
| `nanoid` | Slug generation | Already in project (used in save.ts) | 5.1.7 | — |
| Clerk auth (`locals.auth()`) | All API routes | Already set | — | — |

**Missing dependencies with no fallback:**
- `@vercel/blob` — must be installed (`npm install @vercel/blob`)
- `BLOB_READ_WRITE_TOKEN` — must be created in Vercel Storage dashboard and added to project environment variables (Vercel → Project → Settings → Environment Variables). Wave 0 task.

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright ^1.58.2 |
| Config file | `playwright.config.ts` (root) |
| Quick run command | `npm run test:smoke` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | PDF landing page form creates QR + `/p/[slug]` page with cover, title, description, social buttons | e2e smoke | `npm run test:smoke` (tag `@smoke`) | ❌ Wave 0 |
| CONT-02 | App Store landing page form creates QR + `/p/[slug]` page with store buttons | e2e smoke | `npm run test:smoke` | ❌ Wave 0 |
| CONT-03 | Free user at 5-QR limit receives `total_limit_reached` error on landing page create | API integration | `npm run test:smoke` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:smoke` (smoke tag only, < 30 seconds)
- **Per wave merge:** `npm run test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/landing-pages.spec.ts` — covers CONT-01, CONT-02, CONT-03
- [ ] `tests/api/landing-create.spec.ts` — API-level tier limit enforcement (CONT-03)

---

## Sources

### Primary (HIGH confidence)

- Vercel Blob documentation — https://vercel.com/docs/vercel-blob — client upload pattern, `handleUpload`, `upload()`, `del()`
- Vercel Blob client upload guide — https://vercel.com/docs/vercel-blob/client-upload — token exchange, `HandleUploadBody` type
- `@vercel/blob` npm — version 2.3.2 confirmed via `npm view @vercel/blob version` (2026-03-31)
- `nanoid` npm — version 5.1.7 confirmed via `npm view nanoid version` (2026-03-31)
- Existing codebase: `src/pages/api/qr/save.ts` — slug generation pattern, tier limit checks, Drizzle insert pattern
- Existing codebase: `src/pages/api/qr/[id].ts` — IDOR prevention pattern, GET/PUT/DELETE structure
- Existing codebase: `src/db/schema.ts` — table definition conventions (integer timestamps, UUID PKs, cascade FK)
- Existing codebase: `src/lib/tierLimits.ts` — `TIER_LIMITS` interface and values
- Existing codebase: `src/pages/r/[slug].ts` — `prerender = false` pattern, 307 redirect, scan tracking
- `.planning/research/ARCHITECTURE.md` — `landingPages` schema, data flow, component boundaries
- `.planning/phases/15-hosted-landing-pages/15-CONTEXT.md` — locked decisions D-01 through D-12

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md` — Vercel 4.5MB body limit, `@vercel/blob` client-upload rationale, pitfall documentation
- `.planning/phases/15-hosted-landing-pages/15-UI-SPEC.md` — component visual contracts, copy strings, interaction states

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@vercel/blob` version confirmed against npm registry; all other packages already installed and in use
- Architecture: HIGH — all patterns extend verified existing code; `landingPages` schema and data flow drawn from ARCHITECTURE.md
- Pitfalls: HIGH — Vercel 4.5MB limit documented by Vercel; Drizzle push risk documented by Drizzle; OG crawler behavior is well-established; other pitfalls confirmed by codebase inspection
- Open questions: MEDIUM — product decision on tier gate (D-11 is clear but prior research flagged ambiguity); edit route location (implementation choice, not technical unknown)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable Vercel Blob and Drizzle APIs; 30-day horizon)
