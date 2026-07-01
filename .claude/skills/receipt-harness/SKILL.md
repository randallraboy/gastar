---
name: receipt-harness
description: Pull pending receipt images from gastar, extract amount/date/merchant via multimodal reading, and push results back via the harness CLI.
---

# Receipt Harness Skill

Drive the local `harness/cli.ts` to process pending receipt photos asynchronously.

## Prerequisites

- `GASTAR_URL` and `HARNESS_TOKEN` set in the environment
- gastar app running with pending receipts in the queue

## Workflow

1. **List pending**: `npm run harness -- list`
2. **Pull images**: `npm run harness -- pull ./receipts-work`
3. **Read each image** in `./receipts-work/` using multimodal vision:
   - Extract `amountCents` (integer cents, CAD)
   - Extract `expenseDate` (ISO `YYYY-MM-DD`)
   - Extract `merchant` (store name)
   - Optional `categoryHint` (category name if obvious)
   - If unreadable (blank, blurry, no total): use `outcome: "unreadable"` with `errorNote`
4. **Write** `./receipts-work/results.json` — array of entries:

```json
{
  "id": "<from manifest.json>",
  "outcome": "parsed",
  "amountCents": 4523,
  "expenseDate": "2026-06-28",
  "merchant": "Metro",
  "categoryHint": "Groceries"
}
```

5. **Push results**: `npm run harness -- push ./receipts-work/results.json`

## Unreadable criteria

Mark `unreadable` when: image is blank, severely cropped, no readable total, or confidence is too low to trust the amount.

## Re-run safety

Posting results for a non-pending receipt returns 409 — safe to re-run `list`/`pull` without duplicating drafts.
