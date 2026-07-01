# API Contract: Expense Tracking System (001)

**Date**: 2026-07-01 | **Data model**: [../data-model.md](../data-model.md)

Base: Next.js route handlers under `/api`. JSON everywhere except image upload/download.

## Authentication

Two principals (see research R3, R5):

| Principal | Mechanism | Access |
|-----------|-----------|--------|
| User | Auth.js session cookie (Google sign-in, JWT strategy). Every API route re-checks the session email against `ALLOWED_EMAILS`. | All endpoints except harness-only |
| Harness | `Authorization: Bearer <HARNESS_TOKEN>` | Harness endpoints only (marked 🔧) |

Failures: `401` no/invalid session or token; `403` authenticated Google account not on
allowlist (edge case: clear "not authorized" body).

Errors use one shape: `{ "error": { "code": string, "message": string } }` — `message` is
plain language (FR-015).

## Expenses

### GET /api/expenses

Query: `from`, `to` (ISO dates), `categoryId`, `status` (`draft|confirmed`, default
`confirmed`), `page`, `pageSize` (default 50).

`200`: `{ items: Expense[], total: number, sumCents: number }` — `sumCents` is the filtered
total (FR-003).

### POST /api/expenses

Body: `{ amountCents, expenseDate, merchant, description?, categoryId?, pendingReceiptId? }`

- No `categoryId` → categorization pipeline assigns one (FR-010).
- `pendingReceiptId` present → manual conversion: attaches the staged image, marks the
  pending receipt `converted` (FR-006, US2 scenario 6).
- Duplicate check (date + amount + normalized merchant): if matched and
  `overrideDuplicate !== true`, returns `409` with `{ error, duplicateOf: Expense }`
  (FR-016). Retry with `overrideDuplicate: true` to save anyway.

`201`: `Expense`.

### PATCH /api/expenses/{id}

Body: any subset of `{ amountCents, expenseDate, merchant, description, categoryId }`.
Changing `categoryId` upserts `merchant_corrections` (FR-012). `200`: `Expense`.

### POST /api/expenses/{id}/confirm

Draft review complete (FR-007). Optional body = same fields as PATCH (apply corrections and
confirm in one call). Transitions `draft → confirmed`, resolves the linked pending receipt,
cleans up staging. Runs duplicate check like POST. `200`: `Expense`.

### DELETE /api/expenses/{id}

Deletes expense; deletes attached blob if present. Deleting a draft also resolves its linked
pending receipt (terminal state, staged blob cleaned up) — discarding a bad extraction is a
one-step action. `204`.

## Categories

### GET /api/categories → `200`: `Category[]`
### POST /api/categories — body `{ name, keywords? }` → `201`: `Category`
### PATCH /api/categories/{id} — rename / edit keywords. `is_system` rows: `400`. → `200`
### DELETE /api/categories/{id}

Reassigns expenses and merchant corrections to "Uncategorized" transactionally (FR-013).
`is_system` rows: `400`. `204`.

## Receipts (staging)

### POST /api/receipts

`multipart/form-data` with `file`. Validates type/size (jpeg/png/webp/heic, ≤10 MB). Stores
to Vercel Blob staging prefix, inserts `pending_receipts` row. `201`: `PendingReceipt`
(FR-005, FR-006). Target: completes well inside SC-002's 15s budget.

### GET /api/receipts?status=pending

User UI (queue view) and harness both use this. `200`: `PendingReceipt[]`.

### GET /api/receipts/{id}/image 🔧 (also session)

Streams the staged image. Used by harness download and UI preview. `200`: binary.

### POST /api/receipts/{id}/result 🔧 harness-only

Body (one of):

```json
{ "outcome": "parsed",
  "amountCents": 4523, "expenseDate": "2026-06-28",
  "merchant": "Metro", "categoryHint": "Groceries" }
```

```json
{ "outcome": "unreadable", "errorNote": "blurry, no total visible" }
```

- `parsed` → creates draft expense (categorization pipeline runs; `categoryHint` used per
  R6), links it, sets receipt `processed` (FR-007). `201`: `{ draftExpense: Expense }`.
- `unreadable` → sets status `unreadable` + note (FR-009). `200`: `PendingReceipt`.
- Receipt not `pending` → `409` (idempotency guard for re-runs).

### DELETE /api/receipts/{id}

User discards a staged/unreadable receipt; blob deleted. `204`.

## Schemas (abbreviated)

```ts
Expense = {
  id: string; amountCents: number; currency: 'CAD'; expenseDate: string; // ISO date
  merchant: string; description: string | null;
  categoryId: string; categoryWasAuto: boolean;
  status: 'draft' | 'confirmed'; source: 'manual' | 'photo';
  receiptImageUrl: string | null; // derived from receipt_blob_key
  createdBy: string; createdAt: string; updatedAt: string;
}
Category = { id: string; name: string; isSystem: boolean; keywords: string[] }
PendingReceipt = {
  id: string; status: 'pending' | 'processed' | 'unreadable' | 'converted';
  imageUrl: string; errorNote: string | null; draftExpenseId: string | null;
  uploadedBy: string; uploadedAt: string;
}
```

## Harness CLI contract (`harness/cli.ts`)

Commands (env: `GASTAR_URL`, `HARNESS_TOKEN`):

| Command | Behavior |
|---------|----------|
| `harness list` | GET pending receipts; prints JSON array |
| `harness pull <dir>` | Downloads every pending image to `<dir>/<id>.<ext>`; writes `manifest.json` |
| `harness push <results.json>` | Posts each entry to `/api/receipts/{id}/result` |

`results.json` format: `[{ "id": "...", "outcome": "parsed" | "unreadable", ...fields }]`
— exactly the result body above, plus `id`. The `.claude/skills/receipt-harness` skill wraps
this: pull → read images → write results.json → push.
