# Research: Mobile-Friendly Receipt Capture

**Feature**: 002-mobile-receipt-capture | **Date**: 2026-07-02

All Technical Context unknowns resolved. Decisions below.

## 1. Camera capture mechanism

**Decision**: Keep the HTML file input with `capture="environment"` (already present in
`app/(app)/receipts/page.tsx`) as the camera entry point, wrapped in a new `ReceiptCapture`
component that adds preview → retake/submit before anything uploads.

**Rationale**:
- `<input type="file" accept="image/*" capture="environment">` opens the native camera app
  on iOS Safari and Android Chrome — best capture quality, zero permission plumbing in our
  code, flash/HDR/focus handled by the OS camera.
- The OS-level flow already degrades gracefully: on desktop or devices without a camera the
  same input becomes a file picker, which directly satisfies FR-004 (upload fallback) with
  one code path.
- Browser camera permission denial is handled by the OS camera app / photo picker, not by
  us; the user can always pick from the gallery. No raw browser errors surface (edge case
  covered).

**Alternatives considered**:
- **getUserMedia in-page viewfinder**: full control over framing UI, but requires permission
  handling, torch/focus/resolution management, canvas frame grabbing, and produces worse
  photos than the native camera app. Significant complexity for negative quality gain —
  rejected (Principle V).
- **Native app / PWA camera plugins**: out of scope per spec assumptions (web app only).

## 2. Preview / retake before submit (FR-002)

**Decision**: After the input's `change` event, hold the `File` in component state, render a
preview via `URL.createObjectURL`, and show Retake / Submit actions. Nothing is uploaded
until Submit. Retake re-triggers the input; the discarded object URL is revoked.

**Rationale**: Simple, offline-safe (preview needs no network), and satisfies acceptance
scenarios 2–4 of Story 1. Object URLs avoid base64 memory bloat for 10 MB photos.

**Alternatives considered**: auto-upload on selection (current behavior) — rejected: violates
FR-002; blurry shots waste uploads and pollute the pending queue.

## 3. Upload progress (FR-007, Story 3)

**Decision**: New `src/lib/upload.ts` helper using `XMLHttpRequest` with
`upload.onprogress`, wrapping it in a small promise-based API
(`uploadWithProgress(url, formData, onProgress, signal)`).

**Rationale**: `fetch()` has no standard upload-progress events in shipped browsers
(request-body streams still aren't usable for multipart progress across iOS Safari/Chrome).
XHR is the boring, universally supported answer. No dependency added.

**Alternatives considered**:
- `fetch` + ReadableStream request body: not reliably supported on iOS Safari; requires
  duplex hints; rejected.
- Third-party upload library: dependency for one progress bar — rejected (Principle V).

## 4. Retry without recapture + no duplicates (FR-007, FR-008)

**Decision**: Two-part:
1. **Client**: on upload failure, keep the `File` and preview in state, show a plain-language
   error and a Retry button that re-posts the same file. State is only cleared on confirmed
   success (HTTP 201/200 with JSON body).
2. **Server idempotency**: client generates `clientKey = crypto.randomUUID()` per capture
   (not per attempt) and sends it as a form field. `pending_receipts` gains a nullable
   `client_key` column with a unique index. `createPendingReceipt` checks for an existing
   row with the same key first and returns it (200) instead of inserting a duplicate; unique
   index closes the race window (on conflict → fetch existing).

**Rationale**: The dangerous failure mode is "server created the receipt but the response
was lost on the flaky network" — client-side dedup alone cannot fix that. An idempotency key
is the minimal server-side mechanism; the column is additive and nullable so existing rows
and the harness path are untouched. Directly satisfies Story 3 scenario 4.

**Alternatives considered**:
- Client-only single-flight guard: doesn't cover lost-response duplicates — rejected as
  insufficient alone (it is still implemented as the first line of defense).
- Content-hash dedup on the server: hashing 10 MB uploads per request, and legitimately
  photographing the same receipt twice is a *warning* case (feature 001 FR-016), not a
  hard block — rejected.

## 5. Image orientation and formats (FR-010, edge cases)

**Decision**: Rely on EXIF-honoring rendering (`image-orientation: from-image` is the CSS
default in all target browsers) and add it explicitly to receipt image styles as a guard.
No server-side re-encoding. Keep existing validation (JPEG/PNG/WebP/HEIC, ≤ 10 MB) from
`src/lib/validation.ts`.

**Rationale**: Modern iOS Safari and Android Chrome render EXIF orientation correctly in
`<img>`. When capturing via file input, iOS transcodes HEIC → JPEG by default for web forms,
so cross-browser HEIC display is a corner case (direct HEIC *file uploads* from an iPhone
gallery on a desktop Chrome viewer may not render — acceptable for a 1–2 user personal app;
the harness reads the original blob regardless).

**Alternatives considered**: client-side canvas re-encode to JPEG (strips EXIF, normalizes
orientation, could downscale) — adds failure modes and quality loss; revisit only if a real
device shows wrong orientation. Server-side sharp/image pipeline — new dependency, rejected.

## 6. Responsive strategy (Story 2, FR-005/006/012)

**Decision**: Mobile-first refactor of existing plain CSS (custom properties in
`globals.css`), no CSS framework. Key moves:
- **Navigation**: bottom tab bar (Expenses / Capture / Receipts / Categories) fixed on
  viewports < 768px with safe-area inset padding; existing top bar retained ≥ 768px. The
  center **Capture** tab is the ≤ 2-tap camera entry (FR-001, SC-002).
- **Tables → cards**: expense rows render as stacked cards under 768px (CSS only where
  possible; component-level list variant where needed).
- **Modals → sheets**: existing `.modal` becomes a full-height bottom sheet on small
  screens; centered dialog on desktop.
- **Touch targets**: token `--tap-min: 44px`; buttons/inputs/links in nav and forms get
  min-height 44px and adequate spacing (FR-006).
- **Type/spacing**: fluid type via `clamp()`, spacing scale tokens (4/8-based) replacing
  ad-hoc inline `style` values as screens are touched.
- **Viewport meta**: Next.js App Router emits `width=device-width, initial-scale=1` by
  default — verify, don't duplicate.

**Rationale**: The app is small (5 screens); a token-level refactor of the existing system
is cheaper and more consistent than introducing Tailwind (new dependency, full rewrite of
class usage — Principle V). Bottom tab bar is the standard one-thumb pattern and makes the
camera reachable in 1 tap from anywhere in the app.

**Alternatives considered**: Tailwind CSS (rejected: new dependency + churn, no capability
gain for 5 screens); separate mobile routes (rejected: two UIs to maintain); hamburger menu
(rejected: hides the capture action, costs taps against SC-002).

## 7. Applying the web-design-engineer skill (spec assumption)

**Decision**: Adopt the skill's *process*, not its artifact mechanics:
- Declare the design system before coding → captured as tokens/contract in
  [contracts/ui.md](./contracts/ui.md); implemented in `globals.css`.
- "Adding to an existing UI" mode: match the existing visual vocabulary (quiet neutral
  palette, single blue primary `#2563eb`/`#3b82f6` dark, system font stack, 6–8px radii,
  hairline borders) so new mobile UI is indistinguishable from the original.
- Anti-cliché rules honored: no gradient slop, no emoji-as-icons, no fake data;
  placeholders where assets are missing.
- v0-before-polish sequencing carried into tasks (skeleton responsive pass first, then
  refinement).
- `prefers-color-scheme` already supported; `prefers-reduced-motion` respected for any new
  transitions (skill CSS best practices).

**Rationale**: The skill targets standalone HTML/CDN-React deliverables; gastar is a
Next.js app, so its Babel/CDN/file-management rules don't apply. Its transferable value is
the design discipline: system-first, existing-vocabulary-first, cliché-free. The skill's
system-font warning ("reads as demo page") is consciously overridden by Principle V:
system-ui is already the app's established vocabulary and a webfont adds weight for a
2-user personal tool.

**Alternatives considered**: full skill workflow with brand-spec.md and style recipes —
overkill for extending an existing 5-screen personal app; rejected.

## 8. Multi-capture in succession (FR-009)

**Decision**: After a successful submit, `ReceiptCapture` resets to its idle state in place
(with a brief success confirmation) and the camera can be reopened with one tap; the pending
list refreshes in the background. Each capture gets a fresh `clientKey`.

**Rationale**: Satisfies Story 1 scenario 6 with no navigation; matches "queue at the
counter" usage.

## 9. Testing approach

**Decision**:
- `tests/receipts.test.ts`: extend with idempotency cases (same clientKey → same receipt,
  no clientKey → always insert, conflict race → returns existing).
- `tests/upload.test.ts` (new): upload helper — progress callbacks, success/failure/abort
  paths (mock XHR).
- `tests/receipt-capture.test.tsx` (new): component state machine — idle → preview →
  uploading → error(retry keeps file) → success(reset); fallback rendering.
- Responsive/touch verification is manual via [quickstart.md](./quickstart.md) (real phone
  through LAN/tunnel) — jsdom cannot meaningfully assert layout.

**Rationale**: Constitution II — new behavioral logic ships with tests; visual/layout
correctness is validated by the quickstart walkthrough against spec acceptance scenarios.
