# Quickstart: Receipt Notes for Guided Parsing

Validation guide proving the note flows capture → parse → expense end-to-end. Assumes the
gastar app runs locally and the harness env (`GASTAR_URL`, `HARNESS_TOKEN`) is set, per the
existing receipt pipeline.

## Prerequisites

- App running: `npm run dev`
- DB migrated: `npm run db:migrate` (applies `0004_receipt_notes.sql`)
- Gates green: `npm run lint`, `npm run build`, `npm test`

## Scenario 1 — Note guides the parse (FR-001, FR-002, FR-003) — P1

1. In the app, capture or upload a grocery receipt that includes a non-grocery item.
2. In the preview, type a note: `the ~$40 fan is a household Wants item, the rest is groceries`.
3. Submit. Confirm the pending receipt appears with the note shown.
4. Run the harness:
   - `npm run harness -- list` → the receipt JSON includes your `note`.
   - `npm run harness -- pull ./receipts-work` → `receipts-work/manifest.json` entry has `note`.
5. Read the image per `receipt-harness` SKILL.md (note is included in the parsing prompt) and
   `npm run harness -- push ./receipts-work/results.json`.
6. **Expected**: the produced draft reflects the guidance (e.g. sensible category given the
   mixed purchase), and the draft shows the note as reference.

## Scenario 2 — Edit the note while pending (FR-006) — P2

1. Capture a receipt with note `wrong note`.
2. On the Receipts page, edit the pending receipt's note to `correct guidance`; save.
3. `npm run harness -- pull ./receipts-work` → manifest shows `correct guidance` (latest wins).
4. **Expected**: the version used at parse time is the edited one.

## Scenario 3 — Note persists onto the confirmed expense (FR-005, SC-005)

1. Take a receipt-with-note through parse → draft (Scenario 1).
2. Confirm the draft expense.
3. Open the expense in history.
4. **Expected**: the note is still visible on the confirmed expense, unchanged.

## Scenario 4 — No-note path unchanged (FR-004) — regression

1. Capture/upload a receipt **without** a note; process it.
2. **Expected**: identical behavior to before this feature — draft created normally, no note
   shown, no errors.

## Scenario 5 — Length limit (FR-007)

1. Attempt a note longer than 250 characters at capture and via `PATCH /api/receipts/:id`.
2. **Expected**: a clear "Note must be 250 characters or fewer" message; nothing stored
   truncated silently.

## Scenario 6 — Unreadable receipt keeps its note (FR-008)

1. Submit a blank/blurry receipt with a note; harness pushes `outcome: "unreadable"`.
2. **Expected**: receipt is flagged unreadable, no fabricated expense, note retained on it.

## Automated coverage

- `tests/validation.test.ts` — `receiptNoteSchema` trims, enforces 250, treats whitespace as none.
- `tests/receipts.test.ts` — note persisted on create; `updateReceiptNote` only while pending;
  PATCH 409 on non-pending.
- `tests/expenses.test.ts` — `createDraftFromHarness` and manual-convert carry the note;
  `confirmExpense` leaves it intact.
