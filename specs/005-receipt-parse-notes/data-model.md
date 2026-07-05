# Data Model: Receipt Notes for Guided Parsing

Two existing tables gain one nullable column each. No new tables, no relationship changes.

## `pending_receipts` (extended)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `note` | `text` | yes | User-authored guidance captured at submission; editable while status = `pending`. NULL or empty = no note. |

**Constraints**:
- `pending_receipts_note_len` — `note IS NULL OR char_length(note) <= 250` (FR-007).

**Lifecycle**:
- Written on insert by `createPendingReceipt` (optional arg).
- Mutable via `updateReceiptNote` **only while `status = 'pending'`** (FR-006).
- Read by the harness at `pull` time and surfaced in `manifest.json` (FR-003).
- Copied to the resulting expense at draft creation / manual convert, then the receipt row is
  eventually deleted as today (note already preserved on the expense).

## `expenses` (extended)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `note` | `text` | yes | Copied from the originating receipt; read-only reference. Distinct from `description`. Persists permanently through draft → confirmed (FR-005). |

**Constraints**:
- `expenses_note_len` — `note IS NULL OR char_length(note) <= 250`.

**Lifecycle**:
- Set by `createDraftFromHarness` (from receipt) and by `createExpense` when converting a
  pending receipt to a manual expense.
- `confirmExpense` does **not** modify `note` → it survives confirmation untouched.
- Manual (`source = 'manual'`, no receipt) expenses have `note = NULL`.

## Validation (shared)

`receiptNoteSchema` in `src/lib/validation.ts`:
- `z.string().trim().max(250, "Note must be 250 characters or fewer")`, optional/nullable.
- Whitespace-only → trims to `""` → stored as `NULL` (treated as no note).

## DTO surface

- `PendingReceiptDto` gains `note: string | null` (fed from `pending_receipts.note`).
- `ExpenseDto` gains `note: string | null` (fed from `expenses.note`).
- `manifest.json` entry (harness) gains `note?: string` (omitted/empty when absent).

## Entity relationships (unchanged)

```text
pending_receipts.draft_expense_id → expenses.id   (existing)
expenses.category_id              → categories.id (existing)
```

The note is a plain scalar attribute on each row — no foreign keys, no join tables.

## Migration

`drizzle/0004_receipt_notes.sql`:
1. `ALTER TABLE pending_receipts ADD COLUMN note text;`
2. `ALTER TABLE pending_receipts ADD CONSTRAINT pending_receipts_note_len CHECK (note IS NULL OR char_length(note) <= 250);`
3. `ALTER TABLE expenses ADD COLUMN note text;`
4. `ALTER TABLE expenses ADD CONSTRAINT expenses_note_len CHECK (note IS NULL OR char_length(note) <= 250);`

Additive and backfill-free (existing rows get `NULL`), so no data migration is needed.
