# Tasks: Mobile-Friendly Receipt Capture

**Input**: Design documents from `/specs/002-mobile-receipt-capture/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, contracts/ui.md, quickstart.md

**Tests**: Included — constitution Principle II requires new behavioral logic to ship with Vitest tests (capture state machine, upload helper, idempotent create). Layout/touch verification is manual via quickstart.md (jsdom can't assert layout).

**Organization**: Grouped by user story. US1 (camera capture) is the MVP; US2 (whole-app mobile) and US3 (flaky-network reliability) layer on independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = camera capture, US2 = app on phone, US3 = flaky connection

## Phase 1: Setup

**Purpose**: Confirm a green baseline before touching anything (all later gate failures are then attributable to this feature).

- [X] T001 Run `npm run lint && npm run build && npm test` at repo root; record baseline green (fix nothing new here — if baseline is red, stop and report)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens and the responsive navigation shell that both US1 (≤ 2-tap capture entry) and US2 (mobile layouts) build on. Per contracts/ui.md design-system declaration.

**⚠️ CRITICAL**: No user story work until this phase completes.

- [X] T002 Extend design tokens in `app/globals.css` per contracts/ui.md: spacing scale `--space-1..6` (4/8/12/16/24/32px), fluid type `--fs-body`/`--fs-h1` via clamp(), `--tap-min: 44px`, `--shadow-sheet`, motion durations wrapped in `@media (prefers-reduced-motion: no-preference)`; no new hues, no gradients (skill anti-cliché rules)
- [X] T003 Responsive nav shell in `app/(app)/layout.tsx` + styles in `app/globals.css`: bottom tab bar < 768px (Expenses · Capture · Receipts · Categories; Capture links to /receipts, visually primary, active states, `env(safe-area-inset-bottom)` padding, content bottom-padding = bar height + safe area); existing top bar unchanged ≥ 768px; email/sign-out reachable on mobile (compact row); tab targets ≥ `--tap-min`

**Checkpoint**: App navigable on a phone-sized viewport; capture entry 1 tap from anywhere.

---

## Phase 3: User Story 1 - Snap a Receipt with the Phone Camera (Priority: P1) 🎯 MVP

**Goal**: Camera opens ≤ 2 taps from app open; preview → retake/submit; submitted photo lands in existing pending queue with confirmation; file-upload fallback always available; immediate next capture.

**Independent Test**: On a phone (HTTPS context per quickstart.md): sign in → Capture tab → Take photo → preview → Use this photo → "Receipt queued" appears and receipt is in the pending list. Retake discards without upload. Choose-file path works with no camera.

### Tests for User Story 1

> Write first; must fail before implementation.

- [X] T004 [US1] Component tests in `tests/receipt-capture.test.tsx` (new): idle renders Take photo + Choose file; file selection → preview with Retake/Use this photo; Retake returns to idle, revokes object URL, uploads nothing; submit success → success confirmation then idle reset (multi-capture, FR-009); submit renders uploading state; fallback input has no `capture` attribute, camera input has `capture="environment"` (mock fetch; jsdom `URL.createObjectURL` stub in `tests/setup.ts` if needed)

### Implementation for User Story 1

- [X] T005 [US1] Create `src/components/ReceiptCapture.tsx`: state machine idle → preview → uploading → success → idle per data-model.md; two hidden file inputs (camera: `accept` image types + `capture="environment"`; fallback: same without `capture`, always-visible "Choose file" secondary action — FR-004); preview via `URL.createObjectURL` with revoke on every preview exit; submit posts FormData `file` to `/api/receipts` via fetch (progress/retry arrive in US3); plain-language errors from API surfaced; success shows "Receipt queued", calls `onUploaded` callback, auto-resets; buttons ≥ `--tap-min`
- [X] T006 [US1] Wire into `app/(app)/receipts/page.tsx`: replace the current upload button/input block with `<ReceiptCapture onUploaded={load} />`; keep pending/unreadable lists and convert/discard flows working; add capture-flow styles (preview image sizing, action row) to `app/globals.css`; verify T004 tests pass

**Checkpoint**: US1 fully functional — MVP. Validate Story 1 section of quickstart.md on a real phone.

---

## Phase 4: User Story 2 - Use the Whole App Comfortably on a Phone (Priority: P2)

**Goal**: Every primary screen usable at 360–430px wide: no horizontal scroll, no pinch zoom, ≥ 44px touch targets, sheets instead of modals, cards instead of tables; desktop keeps full parity (FR-012).

**Independent Test**: Quickstart Story 2 walkthrough — complete filter/edit/draft-confirm/category tasks on a phone; re-run feature-001 flows on desktop unchanged.

### Implementation for User Story 2

- [X] T007 [P] [US2] Sheet + card-list styles in `app/globals.css`: `.modal` becomes bottom sheet < 768px (full width, max-height 92vh, slide-up 150–200ms ease-out under reduced-motion guard, `--shadow-sheet`, safe-area padding, scrollable body), centered dialog ≥ 768px unchanged; `.card-list`/`.expense-card` styles (amount prominent, merchant, date, category badge); `.toolbar` stacks vertically < 768px with full-width ≥ `--tap-min` controls; base font in inputs ≥ 16px (blocks iOS focus zoom)
- [X] T008 [P] [US2] Touch-friendly `src/components/ExpenseForm.tsx`: amount input `inputmode="decimal"`, date input native date type, all inputs/selects/buttons ≥ `--tap-min` via `.input`/`.btn` token updates, labels tappable, error text legible on small screens
- [X] T009 [US2] Responsive `app/(app)/expenses/page.tsx`: table → card list < 768px (desktop table retained ≥ 768px); filtered total always visible (sticky summary row acceptable); filters use stacked toolbar; create/edit/draft-confirm/duplicate-warning modals render as sheets; draft review incl. receipt image viewable on phone (depends on T007, T008)
- [X] T010 [P] [US2] Responsive `app/(app)/receipts/page.tsx`: pending/unreadable grids single-column < 768px; convert-to-manual sheet; receipt images `image-orientation: from-image` guard (FR-010); action buttons ≥ `--tap-min`
- [X] T011 [P] [US2] Responsive `app/(app)/categories/page.tsx`: single-column list, add/rename/delete touch targets ≥ `--tap-min`, forms in sheets where modal is used
- [X] T012 [US2] Desktop parity sweep: walk feature-001 acceptance scenarios at ≥ 768px on expenses/receipts/categories; fix any regression introduced by T007–T011 (SC-006, FR-012)

**Checkpoint**: US1 + US2 both work; whole app phone-friendly; desktop unchanged.

---

## Phase 5: User Story 3 - Reliable Submission on a Flaky Mobile Connection (Priority: P3)

**Goal**: Visible upload progress; failure keeps the photo and offers retry; retries never duplicate a pending receipt (server-side idempotency via `clientKey`).

**Independent Test**: Quickstart Story 3 — airplane-mode mid-upload → plain-language error + Retry with photo retained → reconnect → retry succeeds → exactly one pending receipt. Curl spot-check: same `clientKey` twice → 201 then 200, same id.

### Tests for User Story 3

> Write first; must fail before implementation.

- [X] T013 [P] [US3] Extend `tests/receipts.test.ts`: `createPendingReceipt` with clientKey creates row storing key; same clientKey second call returns existing receipt without new insert/blob upload; no clientKey → always inserts; unique-index conflict path returns existing row (mock db per existing test patterns)
- [X] T014 [P] [US3] Create `tests/upload.test.ts`: `uploadWithProgress` reports monotonic 0..1 progress; resolves with `{status, json}` on HTTP responses incl. 4xx/5xx; rejects on network error and abort; respects AbortSignal (mock XMLHttpRequest)

### Implementation for User Story 3

- [X] T015 [US3] Schema + migration: add `clientKey: uuid("client_key")` with unique index to `pendingReceipts` in `src/lib/db/schema.ts`; generate additive migration in `drizzle/` via `npm run db:generate`; apply locally with `npm run db:migrate` (data-model.md — nullable, unique ignores NULLs, harness untouched)
- [X] T016 [US3] Idempotent create in `src/lib/receipts.ts`: `createPendingReceipt` accepts optional `clientKey`; if provided, look up existing row by key first and return it (skip blob upload); insert stores key; on unique-violation race, fetch and return existing row; make T013 pass
- [X] T017 [US3] Route handling in `app/api/receipts/route.ts`: read optional `clientKey` form field; malformed non-UUID → 400 VALIDATION_ERROR; replay (existing receipt returned) → 200, new receipt → 201, both with the DTO (contracts/api.md)
- [X] T018 [US3] Create `src/lib/upload.ts`: `uploadWithProgress({url, formData, onProgress, signal})` XHR wrapper per contracts/api.md client contract — HTTP responses resolve, transport failures/abort reject; make T014 pass
- [X] T019 [US3] Upgrade `src/components/ReceiptCapture.tsx`: submit via `uploadWithProgress` with determinate progress bar + cancel; add error state (plain-language message, Retry with same File + same clientKey, Retake alternative); `clientKey = crypto.randomUUID()` generated per capture (stable across retries, fresh per new capture); File only cleared on confirmed success (data-model.md invariants); treat 200 and 201 as success
- [X] T020 [US3] Extend `tests/receipt-capture.test.tsx`: failure retains file + preview and shows Retry; retry re-posts same clientKey; new capture gets new clientKey; progress bar reflects callback values; cancel returns to preview

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T021 [P] Design polish pass per contracts/ui.md and skill 5-dimension critique (hierarchy, craft, consistency) across capture flow, expenses, receipts, categories; replace remaining ad-hoc inline `style` spacing with tokens on touched screens; no gradients/emoji-icons introduced
- [X] T022 [P] Accessibility & platform audit: visible focus states on all new interactive elements; real `<button>` elements; `prefers-reduced-motion` respected by every new transition; dark mode via tokens only; no horizontal scroll at 360×640 and 430×932; form inputs ≥ 16px font
- [X] T023 Execute quickstart.md end-to-end: automated gates + phone walkthrough (Stories 1–3) + desktop parity + harness regression (`npm run harness` round-trip with a phone-captured receipt)
- [X] T024 Final gates at repo root: `npm run lint && npm run build && npm test` all green (constitution II/III)
- [X] T025 Update `specs/002-mobile-receipt-capture/spec.md` status → `complete` with completion note (constitution I workflow)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none — start immediately
- **Phase 2 (Foundational)**: after T001; T003 depends on T002 — BLOCKS all stories
- **Phase 3 (US1)**: after Phase 2
- **Phase 4 (US2)**: after Phase 2; independent of US1 (touches receipts page too — if US1 done first, T010 restyles the capture component's surroundings, no logic overlap)
- **Phase 5 (US3)**: after US1 (upgrades ReceiptCapture); server tasks T013–T017 only need Phase 2
- **Phase 6 (Polish)**: after all desired stories

### User Story Dependencies

- **US1 (P1)**: Foundational only — MVP
- **US2 (P2)**: Foundational only; independently testable (manual flows exist without US1)
- **US3 (P3)**: extends US1's component; server-side idempotency slice (T013–T017) is independent of US1

### Within Each Story

- Tests written and failing before implementation (T004 → T005–T006; T013/T014 → T015–T019)
- Schema (T015) → service (T016) → route (T017) → client (T019)

### Parallel Opportunities

- T007 ∥ T008 (different files); then T010 ∥ T011 after T007
- T013 ∥ T014 (different test files)
- T021 ∥ T022
- Cross-story (two people): US2 (T007–T012) ∥ US3 server slice (T013–T017)

---

## Parallel Example: User Story 3

```bash
# Failing tests first, in parallel:
Task: "Extend tests/receipts.test.ts with clientKey idempotency cases"
Task: "Create tests/upload.test.ts for uploadWithProgress"

# Then sequential chain: T015 schema → T016 receipts.ts → T017 route
# T018 upload.ts can run parallel to T015–T017 (different files)
```

---

## Implementation Strategy

### MVP First (US1 only)

1. T001 → T002–T003 (foundation)
2. T004 → T005–T006 (capture flow)
3. **STOP and VALIDATE**: quickstart Story 1 on a real phone (preview deploy / HTTPS tunnel — camera needs secure context)
4. Ship — phone capture works even with desktop-ish inner screens

### Incremental Delivery

1. Foundation → US1 → validate on phone → deploy (MVP)
2. US2 → validate phone walkthrough + desktop parity → deploy
3. US3 → validate airplane-mode drill + idempotency spot-check → deploy
4. Polish (T021–T025) → mark spec complete

### Notes

- Commit after each task or logical group (constitution: focused commits)
- T009 and T006 both edit `receipts`/`expenses` pages' shared CSS — sequence within phases as listed to avoid churn
- Camera capture untestable on plain-HTTP LAN — use Vercel preview or HTTPS tunnel for every phone checkpoint (quickstart.md prerequisite)

---

## Phase 7: Convergence

- [X] T026 CRITICAL: Restore the `npm run lint` gate to green — exclude harness runtime output from formatting by adding `receipts-work/` to `.gitignore` and to a new `.prettierignore` (or prettier ignore config), then verify `npm run lint && npm run build && npm test` all pass per Constitution III (contradicts)
- [X] T027 Reopen the camera directly when the user taps Retake in `src/components/ReceiptCapture.tsx` — remember which input (camera or fallback) produced the current photo and re-trigger that input after reset; extend `tests/receipt-capture.test.tsx` accordingly per US1/AC4 (partial)
- [X] T028 Provide a way to view the attached receipt image for a confirmed expense in `app/(app)/expenses/page.tsx` (image in the edit sheet and/or a View-receipt action on the expense card and table row) using the existing `receiptImageUrl` and the `.capture-preview` orientation guard per FR-010 / edge case "correct orientation in the saved expense" (partial)
- [X] T029 Reject too-large captures client-side with a plain-language message stating the limit in `src/components/ReceiptCapture.tsx` before upload, and reconcile the 10 MB app limit in `src/lib/validation.ts` with the deployed platform's request-body cap (Vercel serverless ~4.5 MB) so no in-limit photo fails with a generic error per edge case "very large photo — never a silent failure" and SC-004 (partial)
- [X] T030 Review the uncommitted modifications to `harness/cli.ts` (not called for by any feature 002 artifact) — justify and commit them under the appropriate spec, or revert them per plan constraint "harness endpoints untouched" (unrequested). Reviewed: benign hardening — CLI switch wrapped in `main().catch` so failures exit nonzero with an error message; logic unchanged; kept and committed separately
