# Data Model: Mobile-Friendly Receipt Capture

**Feature**: 002-mobile-receipt-capture | **Date**: 2026-07-02

No new entities. One additive change to an existing table. All feature-001 entities
(Expense, Category, Receipt Image, Pending Receipt, Categorization Correction) are reused
unchanged except as noted below.

## Changed: `pending_receipts`

Existing table (see `src/lib/db/schema.ts`) gains one column:

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `client_key` | `uuid` | NULLable, UNIQUE index | Client-generated idempotency key, one per *capture* (not per upload attempt). Prevents duplicate pending receipts when a flaky-network retry re-posts a capture whose first attempt actually succeeded server-side (FR-008). |

### Rules

- **Nullable**: existing rows and any submission path that does not send a key (e.g., older
  clients, direct API use) behave exactly as today — every POST inserts a new row.
- **Unique when present**: partial/standard unique index on `client_key`. On insert
  conflict, the API returns the existing row instead of erroring (idempotent create).
- **Lifetime**: the key has no meaning after the pending receipt is resolved; it is never
  reused because the client generates a fresh `crypto.randomUUID()` per capture.
- **No harness impact**: harness endpoints (`GET /api/receipts` with Bearer,
  `POST /api/receipts/{id}/result`) never read or write `client_key`.

### Migration

Additive Drizzle migration:

```sql
ALTER TABLE pending_receipts ADD COLUMN client_key uuid;
CREATE UNIQUE INDEX pending_receipts_client_key_idx
  ON pending_receipts (client_key);
```

(Postgres unique indexes ignore NULLs, so multiple key-less rows remain legal.)

## Client-side transient state (not persisted)

`ReceiptCapture` component state machine — exists only in browser memory; documented here
because tasks and tests are derived from it:

| State | Data held | Transitions |
|-------|-----------|-------------|
| `idle` | — | choose photo → `preview` |
| `preview` | `File`, object URL, `clientKey` | retake → `idle` (revoke URL, **new** clientKey on next capture); submit → `uploading` |
| `uploading` | same + progress % | success → `success`; failure → `error` |
| `error` | same + message | retry → `uploading` (same File, **same** clientKey); retake → `idle` |
| `success` | receipt DTO | auto/ack → `idle` (fresh capture possible immediately, FR-009) |

Invariants:

- A `File` is never dropped except on explicit retake or confirmed success (Story 3).
- `clientKey` is stable across retries of one capture and never shared across captures.
- Object URLs are revoked on every exit from `preview`/`error` to avoid memory leaks with
  10 MB photos.
