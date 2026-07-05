# API Contract Deltas: Receipt Notes

Only deltas from the existing feature-001/002 receipt API are shown.

## POST /api/receipts  (session auth — create pending receipt)

**Change**: accept an optional `note` form field alongside the existing `file` and `clientKey`.

Request: `multipart/form-data`
- `file` (required) — image, unchanged
- `clientKey` (optional) — UUID, unchanged
- `note` (optional) — string, trimmed, **≤250 chars**; empty/whitespace treated as no note

Validation:
- Note failing `receiptNoteSchema` → `400 { error: { code: "VALIDATION_ERROR", message: "Note must be 250 characters or fewer" } }`

Response: unchanged shape, now includes `note`:
```json
{ "id": "...", "status": "pending", "imageUrl": "/api/receipts/{id}/image",
  "errorNote": null, "draftExpenseId": null, "uploadedBy": "...",
  "uploadedAt": "2026-07-05T...", "note": "the $40 fan is a Wants item, rest groceries" }
```
- `201` when created, `200` when idempotent `clientKey` match (unchanged). On idempotent match
  the **existing** receipt (and its existing note) is returned — the note is not overwritten.

## PATCH /api/receipts/:id  (session auth — NEW: edit/clear note while pending)

Request: `application/json`
```json
{ "note": "updated guidance" }   // or { "note": "" } / { "note": null } to clear
```

Behaviour:
- Receipt not found → `404 { error: { code: "NOT_FOUND", ... } }`
- Receipt status ≠ `pending` → `409 { error: { code: "NOT_PENDING", message: "Only pending receipts can be edited" } }`
- Note > 250 chars → `400 VALIDATION_ERROR`
- Success → `200` with the updated `PendingReceiptDto`

Guarantee: whatever note is stored when the harness next `pull`s is the version used at parse
time (FR-006 "latest version wins").

## GET /api/receipts?status=pending  (session OR harness Bearer token)

**Change**: each returned receipt now includes `note: string | null`. This is the field the
harness consumes. No change to auth, status filter, or list semantics.

## POST /api/receipts/:id/result  (harness Bearer token — parse result)

**No request change.** The harness does **not** send the note back; it is already stored
server-side. Server behaviour changes only in that draft creation copies the receipt's note
onto the new draft expense (see below). `outcome: "unreadable"` is unchanged and retains the
note on the (now unreadable) receipt (FR-008).

## Expense responses  (GET /api/expenses, /api/expenses/:id, confirm)

**Change**: `ExpenseDto` now includes `note: string | null`.
- Drafts created from a receipt carry the receipt's note.
- `confirm` leaves `note` unchanged → present on the confirmed expense permanently (FR-005).
- Manual expenses with no receipt have `note: null`.

## Harness manifest.json  (local file written by `harness pull`)

**Change**: each entry gains an optional `note`:
```json
[ { "id": "…", "filename": "….jpg", "note": "the fan is a household Wants item" } ]
```
Entries without a note omit the field (or set `null`). The `receipt-harness` skill reads this
and folds it into the parsing prompt as guidance.
