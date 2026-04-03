# Phase 18: Bulk QR Generation - Research

**Researched:** 2026-03-31
**Domain:** Client-side CSV parsing, batch QR generation, in-browser ZIP assembly, tier enforcement
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BULK-01 | User can upload a CSV with URL, text, or WiFi columns to generate QR codes in batch (up to 500 per batch) | papaparse `header:true` parses named columns; row-by-row step callback feeds generation loop |
| BULK-02 | User can download all generated QR codes as a single ZIP file (client-side assembly via JSZip) | jszip `zip.file() / generateAsync({type:'blob'})` confirmed; client-side avoids Vercel 4.5 MB limit |
| BULK-03 | Bulk generation respects tier limits; user sees clear error if batch would exceed limit | `/api/subscription/status` pattern already in codebase; enforce row cap before processing begins |
| BULK-04 | User can preview the batch before downloading (thumbnail grid of generated QR codes) | `getRawData('png')` returns Blob → `URL.createObjectURL()` → `<img>` thumbnail; grid rendered during generation loop |
</phase_requirements>

---

## Summary

Phase 18 adds bulk QR code generation: a user uploads a CSV, the browser parses it, generates each QR code using the existing `qr-code-styling` library, shows a thumbnail preview grid, and assembles a ZIP for download — all without a server round-trip for the actual generation.

The architecture is entirely client-side for the generation and ZIP assembly steps. This is the correct approach for two independent reasons: (1) Vercel serverless functions have a hard 4.5 MB response body limit that a ZIP of even 25 QR codes can exceed, and (2) `qr-code-styling` is DOM-dependent and cannot run in a Web Worker — it must execute on the main thread. The confirmed architecture is a sequential generation loop with a progress counter, chunked via `setTimeout` to yield the event loop between batches and keep the UI reactive.

The tier limit is enforced by checking the row count against a cap derived from `/api/subscription/status` (the same endpoint already used in `QRGeneratorIsland.tsx`) before any generation begins. Since generation happens client-side, this check is UX-only; it is sufficient because bulk generation is not a server resource. The caps are: Free: 0 rows (no bulk access), Starter: 50 rows, Pro: 500 rows.

**Primary recommendation:** Build `BulkGenerateIsland.tsx` as a pure client-side React island. Parse with `papaparse`, generate with `qr-code-styling` in a chunked `setTimeout` loop on the main thread, render thumbnails via `URL.createObjectURL`, assemble with `jszip`, and download via `URL.createObjectURL` + anchor click. No new API routes required.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `papaparse` | ^5.5.3 | CSV parsing in the browser | Industry standard (5M weekly downloads); auto-detects delimiters; `header:true` maps rows to named-key objects; handles malformed input gracefully; zero dependencies |
| `jszip` | ^3.10.1 | In-browser ZIP assembly | Established (4M+ weekly downloads); simple `.file()` / `.generateAsync({type:'blob'})` API; accepts `Blob` and `Uint8Array` inputs — exactly what `getRawData('png')` returns |
| `qr-code-styling` | ^1.9.2 (already installed) | QR code rendering | Already powers the single-QR generator; `getRawData('png')` returns `Promise<Blob>` — same call used in `ExportButtons.tsx` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | already installed | Progress spinner, icons | Use `Loader2` for per-row progress indicator; already in project |
| `sonner` | already installed | Toast notifications | Error toasts for malformed CSV rows; already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `jszip` | `fflate` | fflate is 40x faster on throughput benchmarks but adds API complexity; at 500 QR codes (~50 KB each), jszip finishes in < 2 seconds — throughput is irrelevant |
| `jszip` | `client-zip` | client-zip uses WHATWG Streams; Chrome performs *worse* with stream-based zippers in benchmarks; jszip async API is simpler |
| `papaparse` | `csv-parse` | `csv-parse` is Node-only; papaparse works in browser and Node with identical API |

**Installation:** Both libraries are NOT yet in `package.json`. Must be installed:

```bash
npm install papaparse jszip
npm install --save-dev @types/papaparse @types/jszip
```

**Version verification (confirmed 2026-03-31):**
- `papaparse`: 5.5.3 (current)
- `jszip`: 3.10.1 (current)
- `fflate`: 0.8.2 (noted for reference; not used)

---

## Architecture Patterns

### Recommended Component Structure

```
src/
├── components/
│   └── BulkGenerateIsland.tsx   # New: main React island, client:only
├── lib/
│   └── bulkLimits.ts            # New: BULK_TIER_LIMITS constant (extends tierLimits pattern)
└── pages/
    └── bulk.astro               # New: page that mounts BulkGenerateIsland
```

No new API routes are needed. Tier check reuses the existing `/api/subscription/status` endpoint.

### Pattern 1: Sequential Chunked Generation Loop

**What:** Generate QR codes one-at-a-time in a `setTimeout`-yielding loop rather than a `Promise.all()` burst.

**When to use:** Any time you need to run 50-500 synchronous-ish operations on the main thread without blocking the UI. `qr-code-styling` cannot be moved to a Web Worker (see Pitfall 1), so yielding via `setTimeout(fn, 0)` between batches is the correct approach.

**Why not `Promise.all()`:** Launching 500 concurrent `getRawData('png')` calls simultaneously allocates all 500 canvas contexts at once, which causes visible jank and can exhaust GPU memory on mobile. Sequential with yielding keeps memory footprint constant.

```typescript
// Source: established browser pattern; verified against MDN requestIdleCallback docs
async function generateBatch(
  rows: ParsedRow[],
  onProgress: (current: number, total: number) => void,
  onComplete: (blobs: { name: string; blob: Blob }[]) => void
) {
  const results: { name: string; blob: Blob }[] = [];
  const CHUNK_SIZE = 10; // yield every 10 rows

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const qr = new QRCodeStyling({
      width: 512,
      height: 512,
      type: "canvas",
      data: row.url ?? row.text ?? encodeWifi(row),
      dotsOptions: { type: "rounded", color: "#1e293b" },
      backgroundOptions: { color: "#ffffff" },
    });

    const blob = await qr.getRawData("png") as Blob;
    results.push({ name: `${row.name ?? `qr-${i + 1}`}.png`, blob });
    onProgress(i + 1, rows.length);

    // Yield main thread every CHUNK_SIZE rows
    if ((i + 1) % CHUNK_SIZE === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  onComplete(results);
}
```

### Pattern 2: papaparse File Parsing

**What:** Parse an uploaded CSV `File` object into an array of row objects.

**When to use:** All CSV ingestion in the bulk island.

```typescript
// Source: https://www.papaparse.com/docs
import Papa from "papaparse";

function parseCSV(file: File): Promise<Papa.ParseResult<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,           // rows become objects keyed by column header
      skipEmptyLines: true,   // ignore blank rows
      complete: (results) => resolve(results),
      error: (err) => reject(err),
    });
  });
}
```

**Column expectations:** The CSV must have at minimum one of: `url`, `text`, `ssid`/`password` (WiFi). The island validates columns after parsing and shows a clear error if none of the supported columns are present.

### Pattern 3: JSZip Assembly and Download Trigger

**What:** Collect all generated `Blob` objects into a ZIP and trigger a browser download.

```typescript
// Source: https://stuk.github.io/jszip/
import JSZip from "jszip";

async function downloadZip(files: { name: string; blob: Blob }[]) {
  const zip = new JSZip();
  for (const { name, blob } of files) {
    zip.file(name, blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "qrcodes.zip";
  a.click();
  URL.revokeObjectURL(url); // always revoke to prevent memory leak
}
```

### Pattern 4: Thumbnail Preview Grid

**What:** Display each generated QR as a `<img>` element sourced from `URL.createObjectURL(blob)`.

**When to use:** During/after the generation loop (BULK-04).

```typescript
// Append to results array as blobs arrive, React re-renders grid incrementally
const [previews, setPreviews] = useState<{ name: string; src: string }[]>([]);

// Inside generation loop after each getRawData():
setPreviews(prev => [...prev, {
  name: row.name ?? `qr-${i + 1}`,
  src: URL.createObjectURL(blob),
}]);
```

**Cleanup:** Revoke all object URLs when the island unmounts (`useEffect` return function) or when a new CSV is loaded.

### Pattern 5: Tier Limit Enforcement

**What:** Fetch the user's tier from `/api/subscription/status` (existing endpoint), derive row cap, reject CSV if `rows.length > cap`.

```typescript
// Same pattern as QRGeneratorIsland.tsx lines 234-237
const [userTier, setUserTier] = useState<TierKey | null>(null);

useEffect(() => {
  fetch("/api/subscription/status")
    .then(r => r.json())
    .then(d => setUserTier(d.tier))
    .catch(() => setUserTier("free"));
}, [isLoaded, isSignedIn]);

// Before generation:
const cap = BULK_TIER_LIMITS[userTier ?? "free"];
if (parsedRows.length > cap) {
  toast.error(`Your ${userTier} plan supports up to ${cap} rows. Upload a smaller CSV or upgrade.`);
  return;
}
```

### Anti-Patterns to Avoid

- **`Promise.all()` for all 500 QR codes simultaneously:** Allocates all canvas contexts at once; causes jank and possible GPU/memory exhaustion on mobile.
- **Web Worker for `qr-code-styling`:** The library calls `document.createElementNS()` and `document.createElement('canvas')` internally. Web Workers have no `document` global — the library throws at instantiation time. Confirmed by source inspection and library maintainer notes.
- **Server-side ZIP streaming:** Violates the 4.5 MB Vercel response body limit. Any approach that generates the ZIP in a serverless function and streams it back will fail in production for batches > ~20 codes.
- **No `prerender = false` on new API routes:** If any supporting endpoint is added (e.g., a CSV validation route), it must include `export const prerender = false` or it will silently return stale/empty data in production while working in dev.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom split/regex parser | `papaparse` | RFC 4180 has edge cases: quoted fields with commas, embedded newlines, BOM characters, Windows CRLF — all handled by papaparse |
| ZIP assembly | Manual ZIP byte construction | `jszip` | ZIP format has CRC-32 checksums, local file headers, central directory — 100+ lines of binary manipulation that jszip handles correctly |
| Delimiter detection | Asking user to specify delimiter | `papaparse` auto-detect | papaparse sniffs the delimiter from the first few rows; no user input needed |

**Key insight:** CSV and ZIP both have non-obvious binary edge cases. The libraries handle them correctly; hand-rolled solutions fail on real-world files.

---

## Common Pitfalls

### Pitfall 1: Attempting to Run `qr-code-styling` in a Web Worker

**What goes wrong:** The library is put in a Web Worker hoping to avoid blocking the main thread. At instantiation (`new QRCodeStyling({...})`), the library internally calls `document.createElementNS('http://www.w3.org/2000/svg', 'svg')` and `document.createElement('canvas')`. Web Workers have no `document` global — these calls throw `ReferenceError: document is not defined` immediately.

**Why it happens:** The library was designed for the browser main thread. Its Node.js path requires explicitly injecting `jsdom` and `nodeCanvas` as constructor parameters — which is not available in a Web Worker context.

**How to avoid:** Keep `qr-code-styling` on the main thread. Use the chunked `setTimeout` loop (Pattern 1) to yield the event loop between batches. For 500 QR codes at ~30ms/code, total generation time is ~15 seconds — acceptable with a progress bar. The UI remains responsive because yielding gives the browser time to handle input events between chunks.

**Warning signs:** Any import of `qr-code-styling` inside a `new Worker(...)` call or a file loaded as a Worker module.

---

### Pitfall 2: Vercel 4.5 MB Response Body Limit (Confirmed Hard Limit)

**What goes wrong:** A serverless route generates QR PNGs, assembles a ZIP, and returns it as the response body. At ~50 KB per PNG, a 100-row batch produces a ~5 MB ZIP. Vercel returns `413: FUNCTION_PAYLOAD_TOO_LARGE`. Local dev works fine (no limit in Vite dev server).

**Why it happens:** This is an AWS Lambda constraint that Vercel inherits — it applies to ALL plans, not just Hobby. The 4.5 MB limit applies to both request and response body.

**How to avoid:** The entire generation and ZIP assembly flow is client-side. The server never sees binary QR data. The only server interaction is the tier check via `/api/subscription/status`, which returns a small JSON response.

**Warning signs:** Any import of `qr-code-styling` in an `src/pages/api/` file; any API route that returns binary ZIP data.

---

### Pitfall 3: Object URL Memory Leak in the Preview Grid

**What goes wrong:** Each `URL.createObjectURL(blob)` allocates a reference in the browser's memory that persists until explicitly released. Generating 500 QR codes without revoking the URLs leaves 500 blob references alive. On mobile, this can contribute to OOM pressure and slow down the tab.

**Why it happens:** `createObjectURL` is not automatically garbage-collected when the `<img>` unmounts.

**How to avoid:** 
1. On component unmount (`useEffect` cleanup), call `URL.revokeObjectURL(src)` on every preview `src` in state.
2. When the user loads a new CSV (replacing the current batch), revoke the old URLs before clearing state.
3. After `downloadZip()` completes and the ZIP blob URL is created/used, revoke the ZIP URL immediately (already shown in Pattern 3).

---

### Pitfall 4: JSZip Memory at 500 QR Codes

**What goes wrong:** jszip accumulates all file Blobs in memory before calling `generateAsync()`. At 500 QR codes × ~50 KB each = ~25 MB of QR data in memory simultaneously, plus jszip's working memory during compression. On low-end mobile (1 GB RAM) with a 4 KB thumbnail grid also in memory, this risks OOM.

**Why it happens:** jszip holds complete results in memory. The documented JSZip limitation is: for files exceeding available memory, use the `StreamHelper` API. However, streaming ZIP output to a Service Worker for download without holding the full ZIP in memory adds significant complexity.

**How to avoid for v1.3:** Cap Pro tier at 500 rows (not 1,000). At 500 × 50 KB = 25 MB, this is well within desktop and modern mobile limits. Add a UI warning for users on mobile if `window.navigator.deviceMemory < 4` (Device Memory API). Do not implement streaming ZIP for v1.3 — the 500-row cap makes it unnecessary.

**Warning signs:** Removing the tier row cap; setting the cap above 1,000.

---

### Pitfall 5: Tier Cap Bypassed by Client-Side Manipulation

**What goes wrong:** The row count is checked in the React island before generation. A user opens DevTools, edits the JavaScript, and removes the cap check. They generate 5,000 QR codes, potentially crashing their own browser tab.

**Why it's acceptable for v1.3:** Client-side generation consumes only the user's own browser resources — there is no server cost to protect. The tier cap here is a UX guardrail and a product entitlement gate, not a security boundary. A user who bypasses it harms only themselves. This is explicitly documented in `REQUIREMENTS.md`: "Server-side bulk QR with full styling" is out of scope.

**How to handle:** Document in code comments that this check is a UX/product gate, not a security gate. Accept the risk for v1.3.

---

### Pitfall 6: CSV Column Name Assumptions

**What goes wrong:** The island expects a column named `url`. The user uploads a CSV with columns `URL`, `URL Address`, or `link`. papaparse with `header:true` preserves exact column names — `url` !== `URL`.

**How to avoid:** Normalize column names to lowercase before checking: `Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]))`. Accept `url`, `text`, `ssid`, `password`, `wifi_password`, `network_name` as case-insensitive matches. Show the user a sample CSV template with exact expected headers.

---

## Code Examples

### Verified: papaparse `header:true` result shape

```typescript
// Source: https://www.papaparse.com/docs
// Input CSV:
// url,name
// https://example.com,Example
// https://foo.com,Foo

Papa.parse(file, { header: true, skipEmptyLines: true, complete: (results) => {
  // results.data = [
  //   { url: "https://example.com", name: "Example" },
  //   { url: "https://foo.com", name: "Foo" },
  // ]
  // results.errors = [] (or per-row error objects if malformed)
  // results.meta.fields = ["url", "name"]
}});
```

### Verified: `getRawData` return type in browser context

```typescript
// Source: ExportButtons.tsx (existing codebase) — confirmed pattern
const rawBlob = await tempQr.getRawData("png");
// Returns: Promise<Blob> in browser context
// Type annotation in qr-code-styling: Promise<Blob | Buffer>
// In browser: always Blob
const buffer = await (rawBlob as Blob).arrayBuffer(); // if Uint8Array needed for jszip
```

### Verified: jszip file addition from Blob

```typescript
// Source: https://stuk.github.io/jszip/ — confirmed API
const zip = new JSZip();
zip.file("qr-1.png", blob);  // Blob directly accepted
// OR if you have ArrayBuffer:
zip.file("qr-1.png", arrayBuffer);
const zipBlob = await zip.generateAsync({ type: "blob" });
```

---

## Bulk Tier Limits

The existing `TIER_LIMITS` in `src/lib/tierLimits.ts` covers saved QR count limits. Bulk generation needs a separate constant:

```typescript
// src/lib/bulkLimits.ts (new file)
export const BULK_TIER_LIMITS: Record<"free" | "starter" | "pro", number> = {
  free: 0,       // bulk not available on free tier
  starter: 50,
  pro: 500,
};
```

This mirrors the pattern in `tierLimits.ts` and is the single source of truth for row caps.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 18 is entirely client-side (React island + browser APIs). No external services, databases, or CLI tools are required beyond the existing npm registry.

`papaparse` and `jszip` must be installed (`npm install`), but no external service credentials or environment variables are needed for bulk generation itself.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (existing) |
| Config file | `playwright.config.ts` |
| Quick run command | `npx playwright test --grep @bulk` |
| Full suite command | `npx playwright test` |
| Unit test runner | `node --loader ts-node/esm src/lib/__tests__/bulkLimits.test.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BULK-01 | CSV upload parses URL/text/WiFi rows | unit (papaparse integration) | `node --loader ts-node/esm src/lib/__tests__/bulkLimits.test.ts` | Wave 0 |
| BULK-01 | Malformed CSV shows error, does not crash | unit | same | Wave 0 |
| BULK-02 | ZIP download triggers for valid batch | smoke (Playwright) | `npx playwright test --grep @bulk` | Wave 0 |
| BULK-03 | Free user sees "upgrade" message, no generation | smoke (Playwright, mocked tier) | `npx playwright test --grep @bulk` | Wave 0 |
| BULK-03 | Starter user blocked above 50 rows | unit | `node --loader ts-node/esm src/lib/__tests__/bulkLimits.test.ts` | Wave 0 |
| BULK-04 | Thumbnail grid renders after generation | smoke (Playwright) | `npx playwright test --grep @bulk` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node --loader ts-node/esm src/lib/__tests__/bulkLimits.test.ts`
- **Per wave merge:** `npx playwright test --grep @bulk`
- **Phase gate:** Full Playwright suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/__tests__/bulkLimits.test.ts` — covers BULK-03 row cap logic, CSV column normalization
- [ ] `tests/bulk/bulk-generation.spec.ts` — covers BULK-01, BULK-02, BULK-03, BULK-04 smoke tests

---

## Open Questions

1. **CSV template format — what column names to support?**
   - What we know: `url`, `text`, `ssid`/`password` are the natural names matching the existing tab types
   - What's unclear: Whether to support `wifi_ssid`, `wifi_password`, `network`, `link` as aliases
   - Recommendation: Support exact names `url`, `text`, `ssid`, `password` with case-insensitive matching. Provide a downloadable template CSV from the UI. Document aliases in the UI help text.

2. **Should free users see the bulk page at all?**
   - What we know: `BULK_TIER_LIMITS.free = 0`, so they'd see an immediate upgrade prompt
   - What's unclear: Whether to gate the page route entirely (Clerk middleware redirect) or show the page with an upgrade CTA
   - Recommendation: Show the page with a prominent upgrade CTA. Gating the route entirely means free users never discover the feature. The CTA is the conversion opportunity.

3. **Name column: required or optional?**
   - What we know: If absent, filenames default to `qr-1.png`, `qr-2.png`, etc.
   - What's unclear: User expectation — do they want auto-numbered names or named files?
   - Recommendation: Make `name` optional. If present, use it; if absent, auto-number. Both cases shown in the CSV template.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side ZIP generation | Client-side ZIP via jszip | Vercel 4.5MB limit recognized ~2022 | ZIP must be assembled in the browser |
| Web Worker for canvas | Main thread chunked loop | qr-code-styling DOM dependency | Cannot use Worker; yield with setTimeout instead |
| `Promise.all()` for batch | Sequential chunked loop | Memory pressure research | Prevents simultaneous canvas allocation spike |

---

## Sources

### Primary (HIGH confidence)

- `ExportButtons.tsx` and `QRGeneratorIsland.tsx` — existing `getRawData('png')` usage pattern confirmed in codebase
- `src/lib/tierLimits.ts` — tier constant pattern to extend
- `src/pages/api/subscription/status.ts` — tier fetch pattern already established
- [papaparse official docs](https://www.papaparse.com/docs) — `header:true`, `skipEmptyLines`, `complete` callback, `worker:true` behavior
- [JSZip limitations doc](https://stuk.github.io/jszip/documentation/limitations.html) — memory behavior with large files
- npm registry — verified versions: papaparse 5.5.3, jszip 3.10.1 (confirmed 2026-03-31)

### Secondary (MEDIUM confidence)

- [qr-code-styling GitHub README](https://github.com/kozakdenys/qr-code-styling/blob/master/README.md) — confirmed `getRawData()` returns `Promise<Blob>` in browser; confirmed DOM dependency via `document.getElementById` and `document.createElementNS` usage in documented API
- [JSZip memory issue #446](https://github.com/Stuk/jszip/issues/446) — 20,000 files OOM; 500 files is well within safe range
- [web.dev OffscreenCanvas article](https://web.dev/articles/offscreen-canvas) — confirms OffscreenCanvas works in Workers but requires canvas API, not DOM API; qr-code-styling uses DOM, not just canvas

### Tertiary (LOW confidence / noted for validation)

- fflate vs jszip performance benchmark — search result claim that jszip finishes 500 small files in < 2 seconds on modern hardware; not independently verified but consistent with file sizes and documented jszip performance improvements in 3.x

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — papaparse and jszip are the only reasonable choices; both verified against npm registry
- Architecture (client-side): HIGH — Vercel 4.5 MB limit is a hard constraint; qr-code-styling DOM dependency is confirmed
- Web Worker verdict: HIGH — DOM dependency is structurally incompatible with Worker context; no workaround exists without replacing the library
- Tier enforcement: HIGH — exact same pattern already used in `QRGeneratorIsland.tsx`
- JSZip memory at 500 rows: MEDIUM — 25 MB estimate based on typical QR PNG size; actual size depends on complexity/color; safe under 500-row cap

**Research date:** 2026-03-31
**Valid until:** 2026-06-30 (jszip and papaparse are mature, slow-moving libraries)
