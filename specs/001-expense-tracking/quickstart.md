# Quickstart & Validation: Expense Tracking System (001)

**Date**: 2026-07-01 | **Contracts**: [contracts/api.md](./contracts/api.md)

Validation guide — proves the feature end-to-end. Not an implementation guide.

## Prerequisites

- Node.js 22+, npm
- Neon project (dev branch) — `DATABASE_URL`
- Google OAuth client (Web) — `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Vercel Blob store — `BLOB_READ_WRITE_TOKEN`
- `.env.local` (never committed — constitution Principle IV):

```env
DATABASE_URL=postgres://...neon.tech/gastar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_SECRET=...            # npx auth secret
ALLOWED_EMAILS=you@gmail.com,partner@gmail.com
HARNESS_TOKEN=...          # long random string
BLOB_READ_WRITE_TOKEN=...
```

## Setup

```bash
npm install
npm run db:migrate     # drizzle migrations + category seed
npm run dev            # http://localhost:3000
```

## Gates (constitution v2.0.0 — all must pass before done)

```bash
npm run lint
npm run build          # includes type check
npm test               # Vitest
```

## Validation Scenarios

### V1. Access control (US1 scenario 5, FR-001, FR-014, SC-006)

1. Open app signed out → only sign-in page; direct `GET /api/expenses` → 401.
2. Sign in with an allowlisted Google account → expenses view loads.
3. Sign in with a non-allowlisted Google account → rejected with clear "not authorized"
   message; API returns 403.

### V2. Manual expense lifecycle (US1, FR-002–FR-004, FR-015; SC-001)

1. Create expense (amount, date, merchant, description) → appears in list in <30s
   end-to-end.
2. Filter by date range and category → list + `sumCents` total match expectations (FR-003).
3. Edit amount/category → updates everywhere; delete with confirm → gone.
4. Negative amount or future date → plain-language validation error, nothing saved.

### V3. Receipt photo → staging → harness → draft (US2, FR-005–FR-009; SC-002, SC-003)

1. Upload clear receipt photo → pending receipt visible in queue in <15s.
2. Run harness (or `/receipt-harness` skill): `harness list` shows it; `pull` downloads
   image; write results; `push`.
3. Draft expense appears with amount/date/merchant pre-filled; review, correct one field,
   confirm → expense saved, image viewable from expense, staged copy cleaned up.
4. Upload unreadable image (e.g., blank wall) → after harness run, receipt marked
   unreadable with note; convert to manual entry → expense saved with image attached.
5. Upload receipt, skip harness, use "convert to manual" immediately → works (scenario 6).

### V4. Auto-categorization (US3, FR-010–FR-012; SC-004)

1. Create expense, merchant "Metro", no category → auto-assigned Groceries (keyword rule),
   marked as auto.
2. Create expense with gibberish merchant → "Uncategorized" (FR-011).
3. Change the "Metro" expense to "Dining" → next "Metro" expense auto-assigns "Dining"
   (correction memory, FR-012).

### V5. Duplicates & category management (FR-013, FR-016; edge cases)

1. Post the same photo result twice (same date/amount/merchant) → 409 duplicate warning;
   override flag saves it anyway.
2. Delete a category that has expenses → expenses land in "Uncategorized"; "Uncategorized"
   itself cannot be renamed/deleted (400).

## Deployment check (Vercel)

1. Push to `main` → Vercel deploys; env vars set in project settings.
2. Repeat V1 against the deployed URL (allowlist + 403 behavior identical).
3. Harness against production: `GASTAR_URL=https://<app>.vercel.app harness list` with
   `HARNESS_TOKEN` → 200; wrong token → 401.
