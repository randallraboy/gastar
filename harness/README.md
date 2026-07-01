# Receipt Harness CLI

Local CLI for downloading pending receipt images and posting parsed results back to gastar.

## Environment

```bash
export GASTAR_URL=http://localhost:3000
export HARNESS_TOKEN=your-token
```

## Commands

```bash
npm run harness -- list
npm run harness -- pull ./receipts-out
npm run harness -- push ./receipts-out/results.json
```

## results.json format

```json
[
  {
    "id": "receipt-uuid",
    "outcome": "parsed",
    "amountCents": 4523,
    "expenseDate": "2026-06-28",
    "merchant": "Metro",
    "categoryHint": "Groceries"
  },
  {
    "id": "other-uuid",
    "outcome": "unreadable",
    "errorNote": "blurry, no total visible"
  }
]
```

Re-running `push` for an already-processed receipt returns HTTP 409 (safe to retry).

Use the `.claude/skills/receipt-harness` skill for AI-driven extraction.
