# API Contract: Category Hierarchy (004)

**Date**: 2026-07-03 | **Base contract**: [001-expense-tracking/contracts/api.md](../../001-expense-tracking/contracts/api.md)

Deltas to the 001 API. Auth unchanged (session + allowlist; harness bearer token on receipt result routes).

## Categories (restored + hierarchical)

### GET /api/categories

Query: `format=tree` (default) | `format=flat`

**200 (tree)**:

```json
[
  {
    "id": "uuid",
    "name": "Needs",
    "parentId": null,
    "bucket": "Needs",
    "isBucket": true,
    "depth": 1,
    "displayOrder": 0,
    "keywords": [],
    "children": [
      {
        "id": "uuid",
        "name": "Food",
        "parentId": "uuid",
        "bucket": "Needs",
        "isBucket": false,
        "depth": 2,
        "displayOrder": 0,
        "keywords": [],
        "children": [
          {
            "id": "uuid",
            "name": "Groceries",
            "parentId": "uuid",
            "bucket": "Needs",
            "isBucket": false,
            "depth": 3,
            "displayOrder": 0,
            "keywords": ["grocery", "supermarket", "metro"],
            "children": []
          }
        ]
      }
    ]
  }
]
```

**200 (flat)**: `CategoryNode[]` without nested `children` (management/debug).

### POST /api/categories

Body: `{ "parentId": "uuid", "name": "string", "keywords"?: string[] }`

- `parentId` MUST NOT be null (top-level buckets are seeded only).
- Rejects when new node would exceed depth 4 → **400**.
- Duplicate sibling name (case-insensitive) → **400**.

**201**: flat `CategoryNode`.

### PATCH /api/categories/{id}

Body: `{ "name"?: string, "keywords"?: string[], "displayOrder"?: number }`

- Bucket rows (`isBucket: true`) → **400** (immutable).
- `parentId` not accepted (reparenting out of scope).

**200**: flat `CategoryNode`.

### DELETE /api/categories/{id}

Query: `reassignTo` (uuid, optional) — required when branch has assigned expenses.

- Bucket rows → **400**.
- No expenses on branch → cascade delete node + all descendants → **204**.
- Expenses on branch, no `reassignTo` → **409** `{ error, expenseCount }`.
- With `reassignTo` → reassign all expenses on branch, delete branch → **204**.

## Expenses (updated)

### GET /api/expenses

Query changes:

| Param | Behavior |
|-------|----------|
| `categoryId` | Filter to expenses assigned to this node **or any descendant** (FR-005) |
| `bucket` | Filter to expenses whose assigned node's `bucket` matches (`Needs` \| `Wants` \| `Savings`) — optional convenience |

Removed: `category` string query param.

**200** — extended response:

```json
{
  "items": [ "Expense" ],
  "total": 0,
  "sumCents": 0,
  "categoryTotals": [
    { "categoryId": "uuid", "name": "Needs", "bucket": "Needs", "depth": 1, "sumCents": 0, "children": [ "...nested CategoryTotal..." ] }
  ]
}
```

`categoryTotals` is a three-root tree mirroring bucket structure with rolled-up `sumCents` at each node (FR-005, SC-003).

### POST /api/expenses

Body: `{ ..., "categoryId"?: uuid }` — replaces `category` string.

- No `categoryId` → auto-categorization pipeline assigns deepest match or bucket (FR-011).
- **201**: `Expense`.

### PATCH /api/expenses/{id}

Body: `{ ..., "categoryId"?: uuid }`

- Manual `categoryId` change sets `categoryWasAuto: false` and upserts merchant correction to that node (FR-014, US4).
- **200**: `Expense`.

### POST /api/expenses/{id}/confirm

Same body fields as PATCH; `categoryId` supported on draft confirm.

## Receipt harness (unchanged wire format)

`POST /api/receipts/{id}/result` body still includes optional `categoryHint: string` (e.g. `"Groceries"`). Server resolves hint to category node by case-insensitive name match within tree; falls back to keyword/deepest-match pipeline (research R4).

## Schemas (abbreviated)

```ts
CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  bucket: 'Needs' | 'Wants' | 'Savings';
  isBucket: boolean;
  depth: number;          // 1–4
  displayOrder: number;
  keywords: string[];
  children?: CategoryNode[];  // tree responses only
}

Expense = {
  id: string;
  amountCents: number;
  currency: 'CAD';
  expenseDate: string;
  merchant: string;
  description: string | null;
  categoryId: string;
  categoryPath: string[];   // e.g. ['Needs','Food','Groceries']
  bucket: 'Needs' | 'Wants' | 'Savings';
  categoryWasAuto: boolean;
  subcategoryResolved: boolean;  // true when assigned node depth > 1
  status: 'draft' | 'confirmed';
  source: 'manual' | 'photo';
  receiptImageUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

CategoryTotal = {
  categoryId: string;
  name: string;
  bucket: 'Needs' | 'Wants' | 'Savings';
  depth: number;
  sumCents: number;
  children: CategoryTotal[];
}
```

## Error codes (additions)

| Code | When |
|------|------|
| `CATEGORY_DEPTH_EXCEEDED` | Create child when parent at depth 4 |
| `CATEGORY_BUCKET_IMMUTABLE` | PATCH/DELETE on bucket row |
| `CATEGORY_DUPLICATE_SIBLING` | Same name under same parent |
| `CATEGORY_BRANCH_HAS_EXPENSES` | DELETE without reassignTo |
| `CATEGORY_INVALID_PARENT` | POST with null parentId |

All errors: `{ "error": { "code": string, "message": string } }` (plain language, FR-015 pattern).
