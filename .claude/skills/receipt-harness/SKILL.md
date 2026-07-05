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
2. **Pull images**: `npm run harness -- pull ./receipts-work` — writes `manifest.json`, e.g.:

```json
[
  { "id": "3f2a…", "filename": "3f2a….jpg", "note": "the $40 fan is a Wants item, rest is groceries" },
  { "id": "9c81…", "filename": "9c81….jpg" }
]
```

Entries without a user note omit the `note` field.
3. **Read each image** in `./receipts-work/` using multimodal vision:
   - Check the receipt's `note` in `manifest.json`. When present, include it in the
     parsing prompt as **user guidance** (e.g. "the $40 fan is a Wants item, rest is
     groceries"). The note *guides* interpretation — it does **not** override what the
     image actually shows, and you must **never** fabricate amount/date/merchant data for
     an unreadable receipt just because a note exists.
   - Extract `amountCents` (integer cents, CAD)
   - Extract `expenseDate` (ISO `YYYY-MM-DD`)
   - Extract `merchant` (store name)
   - Optional `categoryHint` (category name if obvious — let the note inform this when it
     clarifies how to categorize a mixed purchase)
   - If unreadable (blank, blurry, no total): use `outcome: "unreadable"` with `errorNote`
     (the note stays on the receipt for reference; do not invent data)
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
