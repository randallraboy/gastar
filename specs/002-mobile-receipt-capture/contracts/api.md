# API Contract Changes: Mobile-Friendly Receipt Capture

**Feature**: 002-mobile-receipt-capture | **Date**: 2026-07-02

Only one endpoint changes. All other feature-001 endpoints
(`specs/001-expense-tracking/contracts/api.md`) are unchanged. All user endpoints remain
behind session auth + allowlist (`requireUser()`); harness endpoints remain Bearer-token
only.

## Changed: `POST /api/receipts`

Create a pending receipt from an uploaded image. Multipart form data.

### Request

| Field | Type | Required | New? | Notes |
|-------|------|----------|------|-------|
| `file` | image file | yes | no | JPEG/PNG/WebP/HEIC, ≤ 10 MB (unchanged validation) |
| `clientKey` | string (UUID) | no | **yes** | Idempotency key, one per capture. Invalid (non-UUID) values → 400 `VALIDATION_ERROR`. |

### Behavior

1. Without `clientKey`: identical to today — validate, upload blob, insert row, return
   **201** with the pending-receipt DTO.
2. With `clientKey`, no existing row with that key: same as (1), row stores the key.
   Returns **201**.
3. With `clientKey`, an existing row already has that key (lost-response retry): do **not**
   insert or upload a second blob; return **200** with the existing pending-receipt DTO.
   Insert races resolve via the unique index: on conflict, fetch and return the existing
   row (200).

### Responses

| Status | Body | When |
|--------|------|------|
| 201 | PendingReceipt DTO | New receipt created |
| 200 | PendingReceipt DTO | Idempotent replay — receipt for this `clientKey` already exists |
| 400 | `{ error: { code: "VALIDATION_ERROR", message } }` | Missing/invalid file, bad type/size, malformed `clientKey` |
| 401/403 | error envelope | Not signed in / not allowlisted (unchanged) |

DTO shape unchanged from feature 001 (`toPendingReceiptDto`): `id`, `status`, `imageUrl`,
`errorNote`, …. Clients treat 200 and 201 identically ("capture is safely queued").

## Client upload contract (`src/lib/upload.ts`)

Not an HTTP contract, but the internal interface the capture UI depends on:

```ts
uploadWithProgress(opts: {
  url: string;                     // "/api/receipts"
  formData: FormData;              // file + clientKey
  onProgress: (fraction: number) => void; // 0..1, monotonic
  signal?: AbortSignal;
}): Promise<{ status: number; json: unknown }>;
// rejects on network error / abort; resolves on any HTTP response
```

- HTTP error statuses resolve (caller inspects `status`); only transport failures reject —
  so the UI can distinguish "server said no" (show message, no retry loop) from "network
  died" (offer retry, keep file).
