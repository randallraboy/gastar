# Research: Receipt Notes for Guided Parsing

Phase 0 — resolving unknowns before design. No external tech research was required (no new
dependencies); the open questions were all "how does this fit the existing gastar pipeline."

## Decision 1 — Where the note is stored

**Decision**: Add a nullable `note text` column to **both** `pending_receipts` (source of truth
at capture, editable while pending) and `expenses` (carried over at draft creation, retained
permanently). Do **not** reuse `expenses.description`.

**Rationale**: The clarified spec (Session 2026-07-05) says the note persists permanently onto
the confirmed expense (FR-005). `expenses.description` already exists but is a distinct,
user-editable field the harness parse may also fill; overloading it would let a later
description edit silently destroy the note and conflate two meanings. A dedicated column is one
line of schema per table and keeps the model honest.

**Alternatives considered**:
- *Reuse `expenses.description`* — rejected (conflation + accidental overwrite, above).
- *Note only on `pending_receipts`, not carried to expense* — rejected; violates FR-005
  permanent persistence.
- *Separate `receipt_notes` table* — rejected; YAGNI, a one-to-one nullable string needs no
  new table.

## Decision 2 — How the note reaches the parsing prompt

**Decision**: The note rides the existing harness pull path. `GET /api/receipts?status=pending`
(already used by both `harness list` and `harness pull`) returns `note` via
`PendingReceiptDto`. `harness/cli.ts` `pull()` writes `note` into each `manifest.json` entry.
`receipt-harness/SKILL.md` step 3 is updated to read the note from the manifest and include it
as guidance in the multimodal parsing prompt.

**Rationale**: Reuses the one endpoint the harness already calls; no new harness command or
endpoint. The note is guidance only — the skill instruction makes explicit it does not override
readable image content and never invents data for an unreadable receipt (FR-003, FR-008).

**Alternatives considered**:
- *A dedicated `GET /api/receipts/:id/note` endpoint* — rejected; the list endpoint already
  carries everything the harness needs.
- *Pass note back in the `result` POST* — unnecessary; the note is server-side already and
  isn't produced by the parse.

## Decision 3 — Editing the note while pending

**Decision**: Add `PATCH /api/receipts/:id` (session-auth, owner) accepting `{ note }` where
note is a trimmed string ≤250 chars or empty/null to clear. Only receipts in `pending` status
are editable; others return 409. `receipts.ts` gets `updateReceiptNote(id, note)`.

**Rationale**: FR-006 requires view/edit/clear while pending, with the latest version used at
parse time. The harness reads the note at `pull` time, so "latest wins" falls out naturally —
whatever is stored when the harness pulls is what it uses. No locking needed for a 1–2 user
personal app (concurrent edit during an active pull is an accepted, ignorable race — noted as
out of scope).

**Alternatives considered**:
- *Allow editing after processing* — rejected; out of scope per clarified assumptions (note is
  read-only once a draft exists; further changes go through normal expense editing).

## Decision 4 — Note length enforcement

**Decision**: Single source of truth `receiptNoteSchema = z.string().trim().max(250)` (nullable/
optional) in `src/lib/validation.ts`, reused by the POST create and PATCH routes. DB adds a
defensive `char_length(note) <= 250` check constraint. Whitespace-only trims to empty → treated
as no note.

**Rationale**: FR-007 pins 250 chars with a clear message (Zod message surfaces to the UI). The
DB check is defense-in-depth, mirroring the existing `merchant`/`description` max patterns.

## Decision 5 — Carry note onto draft and manual-convert paths

**Decision**: `createDraftFromHarness` sets `note` from the source receipt when inserting the
draft expense. `createExpense` (the "convert to manual" path via `pendingReceiptId`, used for
unreadable receipts) also copies the receipt's note onto the expense. `confirmExpense` leaves
`note` untouched, so it persists unchanged through confirmation.

**Rationale**: Guarantees FR-005 (present on pending, draft, and saved expense 100% of the
time — SC-005) across every path a receipt can become an expense.

## Non-functional confirmations

- **Security (FR-010)**: note is written/read only through already-authenticated routes; the
  harness GET stays `Bearer`-token gated (`requireHarness`). No new secret, no new exposure.
- **No-regression (FR-004)**: note is optional and nullable everywhere; omitting it reproduces
  today's exact insert values (`note: null`), so existing behavior is byte-for-byte unchanged.
