---
description: "Task list for Receipt Notes for Guided Parsing"
---

# Tasks: Receipt Notes for Guided Parsing

**Input**: Design documents from `/specs/005-receipt-parse-notes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — the gastar constitution (Principle II) requires regression tests for
behavioral changes, and plan.md/quickstart.md name the specific test files.

**Organization**: Tasks are grouped by user story (US1 = P1, US2 = P2) so each can be
implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 (Setup, Foundational, Polish carry no story label)

## Path Conventions

Single Next.js repo: hosted app in `app/` + `src/`, owner-run harness in `harness/`, driving
skill in `.claude/skills/receipt-harness/`, migrations in `drizzle/`, tests in `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new scaffolding needed — this feature extends an existing, running app.

- [X] T001 Confirm baseline gates pass before changes: run `npm run lint`, `npm run build`, `npm test` and note current green state. (Baseline `npm test` green — 61 tests. `lint`/`build` blocked by fresh-install toolchain drift: no committed lockfile, so `npm install` pulled ESLint/Prettier/Next minors newer than the code was authored against — see completion report.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, validation, and DTO surface that BOTH user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add nullable `note` column to `pendingReceipts` and `expenses` in `src/lib/db/schema.ts` (text, nullable).
- [X] T003 Create migration `drizzle/0004_receipt_notes.sql` adding `note text` to `pending_receipts` and `expenses`, each with a `CHECK (note IS NULL OR char_length(note) <= 250)` constraint (`pending_receipts_note_len`, `expenses_note_len`); apply with `npm run db:migrate`. (Migration file + `meta/_journal.json` entry created; **apply deferred** — no `DATABASE_URL` in this environment. Owner runs `npm run db:migrate`.)
- [X] T004 Add shared `receiptNoteSchema` (`z.string().trim().max(250, "Note must be 250 characters or fewer")`, optional/nullable; whitespace-only → treated as no note) in `src/lib/validation.ts`.
- [X] T005 Add `note: string | null` to `PendingReceiptDto` and `ExpenseDto` and populate it in `toPendingReceiptDto` and `toExpenseDto` in `src/lib/api-types.ts`.

**Checkpoint**: Schema, validation, and DTOs carry the note — user stories can now begin.

---

## Phase 3: User Story 1 - Guide the Parse with a Note at Capture Time (Priority: P1) 🎯 MVP

**Goal**: A user attaches an optional note at capture; it is stored on the pending receipt,
handed to the harness in `manifest.json`, included in the parsing prompt, and carried onto the
resulting draft expense.

**Independent Test**: Capture a mixed-purchase receipt with a note ("the $40 fan is a Wants
item, rest is groceries"), run `harness list`/`pull` and confirm the note is in the manifest,
process it, and verify the draft reflects the guidance and shows the note (quickstart Scenario 1).

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL)

- [X] T006 [P] [US1] Validation tests for `receiptNoteSchema` (trims, rejects >250 with message, whitespace→none) in `tests/validation.test.ts`.
- [X] T007 [P] [US1] Test that `createPendingReceipt` persists a note and omitting it stores `null` (no-regression) in `tests/receipts.test.ts`.
- [X] T008 [P] [US1] Test that `createDraftFromHarness` and the manual-convert path in `createExpense` copy the receipt's note onto the expense in `tests/expenses.test.ts`.

### Implementation for User Story 1

- [X] T009 [US1] Extend `createPendingReceipt` in `src/lib/receipts.ts` to accept an optional `note` and insert it into `pending_receipts`.
- [X] T010 [US1] In `app/api/receipts/route.ts` `POST`, read `note` from `formData`, validate with `receiptNoteSchema` (400 on failure), and pass to `createPendingReceipt`.
- [X] T011 [US1] Add an optional note `textarea` (label "Note (optional)", `maxLength=250`, live remaining-char count) to the preview state in `src/components/ReceiptCapture.tsx`; send it via `formData.set("note", ...)` on submit only when non-empty; clear it on retake/reset.
- [X] T012 [US1] In `src/lib/expenses.ts`, set `note` from the source receipt in `createDraftFromHarness`, and copy the receipt's note onto the expense in the `pendingReceiptId` convert branch of `createExpense`.
- [X] T013 [US1] In `harness/cli.ts` `pull()`, read each receipt's `note` from the API response and write it into `manifest.json` entries (`{ id, filename, note? }`).
- [X] T014 [US1] Update `.claude/skills/receipt-harness/SKILL.md` step 3 to read the note from `manifest.json` and include it as guidance in the parsing prompt, stating it guides but does not override readable content and never fabricates data for unreadable receipts.

**Checkpoint**: US1 fully functional — note captured, threaded to the prompt, and carried onto drafts.

---

## Phase 4: User Story 2 - Review, Edit, and Keep the Note for Reference (Priority: P2)

**Goal**: A user can view/edit/clear the note on a pending receipt before processing (latest
version wins), and the note is displayed read-only on drafts and confirmed expenses.

**Independent Test**: Edit a pending receipt's note and confirm the harness pull reflects the
latest text; process it and confirm the note stays visible on the confirmed expense
(quickstart Scenarios 2 & 3).

### Tests for User Story 2 ⚠️ (write first, ensure they FAIL)

- [X] T015 [P] [US2] Test that `updateReceiptNote` edits/clears a note only while status is `pending` (rejects/no-ops otherwise) in `tests/receipts.test.ts`.
- [X] T016 [P] [US2] Test that `confirmExpense` leaves `note` unchanged through draft→confirmed in `tests/expenses.test.ts`.

### Implementation for User Story 2

- [X] T017 [US2] Add `updateReceiptNote(id, note)` in `src/lib/receipts.ts` that updates the note only when status is `pending`, returning a not-found / invalid-status signal otherwise.
- [X] T018 [US2] Add `PATCH` handler to `app/api/receipts/[id]/route.ts` (session auth) accepting `{ note }`, validating with `receiptNoteSchema`; 404 not found, 409 when not `pending`, 200 with updated `PendingReceiptDto` on success.
- [X] T019 [US2] In `app/(app)/receipts/page.tsx`, display each pending receipt's note and add an inline edit/clear editor (textarea ≤250, save/cancel) calling `PATCH /api/receipts/:id`; show the note read-only for non-pending receipts.
- [X] T020 [US2] Display the note read-only as reference context on the draft-review and saved-expense views in `src/components/ExpenseForm.tsx` and `app/(app)/expenses/page.tsx` (from `ExpenseDto.note`).

**Checkpoint**: US1 + US2 both work independently — note is editable while pending and persists visibly onto the expense.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup across both stories.

- [X] T021 [P] Update `.claude/skills/receipt-harness/SKILL.md` example `manifest.json`/`results.json` snippets to show the `note` field end-to-end (if not already covered by T014).
- [X] T022 Walk quickstart.md Scenarios 1–6 manually (note guides parse, edit-while-pending, persist-on-confirm, no-note regression, 250-char limit, unreadable-keeps-note). (Owner-verified live against the deployed app after the `0004` prod migration; all scenarios also backed by automated tests in `tests/validation.test.ts`, `tests/receipts.test.ts`, `tests/expenses.test.ts`.)
- [X] T023 Run full gates: `npm run lint`, `npm run build`, `npm test` — all green. (`npm test` green — 76 tests. `tsc --noEmit` clean; changed files Prettier-clean under the pinned 3.4.2. `npm run lint`/`npm run build` blocked by fresh-install toolchain drift — see completion report.)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately.
- **Foundational (Phase 2)**: depends on Setup; **BLOCKS both user stories** (schema/validation/DTO).
- **User Story 1 (Phase 3)**: depends on Foundational; no dependency on US2.
- **User Story 2 (Phase 4)**: depends on Foundational; independent of US1 (touches shared test files — see note).
- **Polish (Phase 5)**: depends on the user stories being implemented.

### User Story Dependencies

- **US1 (P1)**: after Phase 2. Delivers the core value (note → parse prompt → draft) as the MVP.
- **US2 (P2)**: after Phase 2. Independently testable; adds edit-while-pending and reference display.

### Within Each User Story

- Tests first (must FAIL before implementation).
- Lib functions before API routes before UI.
- `createPendingReceipt` (T009) before POST route (T010); `updateReceiptNote` (T017) before PATCH (T018).

### Parallel Opportunities

- Foundational: T002 must precede T003; T004 and T005 are [P] with each other and with T002.
- US1 tests T006–T008 are [P] (different files). US2 tests T015–T016 are [P].
- **Cross-story caution**: US1 (T007) and US2 (T015) both edit `tests/receipts.test.ts`; US1 (T008)
  and US2 (T016) both edit `tests/expenses.test.ts`. If US1 and US2 are worked in parallel,
  serialize edits to those two files.

---

## Parallel Example: User Story 1 tests

```bash
# Launch US1 tests together (different files):
Task: "Validation tests for receiptNoteSchema in tests/validation.test.ts"   # T006
Task: "createPendingReceipt persists note in tests/receipts.test.ts"          # T007
Task: "Draft/convert carry note in tests/expenses.test.ts"                    # T008
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational (schema, migration, validation, DTOs).
2. Phase 3 US1 → note captured, threaded to the harness prompt, carried onto drafts.
3. **STOP and VALIDATE**: quickstart Scenario 1 + Scenario 4 (no-note regression).
4. Ship the MVP.

### Incremental Delivery

1. Foundational → US1 (MVP: guided parsing) → validate → deploy.
2. Add US2 (edit-while-pending + reference display) → validate Scenarios 2, 3 → deploy.
3. Polish → run all six quickstart scenarios and gates.

---

## Notes

- [P] = different files, no incomplete-task dependency.
- No-note path must stay byte-for-byte unchanged (FR-004) — verified by T007 and Scenario 4.
- The note column is nullable and additive; the migration needs no backfill.
- Commit after each task or logical group; keep the harness endpoint token-gated (no auth changes).
