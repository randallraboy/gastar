# Quickstart: Category Hierarchy Validation

**Feature**: 004-category-hierarchy | **Contracts**: [api.md](./contracts/api.md), [ui.md](./contracts/ui.md)

## Prerequisites

- `.env.local` configured (DATABASE_URL, auth vars)
- Dependencies installed: `npm install`
- Empty or reset Neon database

## Setup

```bash
npm run db:migrate
npm run seed
npm run dev
```

Sign in as an allowlisted user at `http://localhost:3000`.

Verify seed:

```bash
# Optional: curl with session cookie, or use UI Categories page
curl -s http://localhost:3000/api/categories?format=tree -b "your-session-cookie"
```

Expect three roots (Needs, Wants, Savings) with nested children matching spec **Default Seed Tree** (e.g. Needs → Food → Groceries).

## Scenario 1 — Hierarchical expense assignment (US1, P1)

1. Go to **Expenses** → add expense.
2. Open category picker → choose **Needs** → **Food** → **Groceries**.
3. Merchant `Metro`, amount any valid value → save.
4. **Verify**: expense row shows path `Needs → Food → Groceries`.
5. **Verify**: Needs bucket total includes this expense.

## Scenario 2 — Auto-categorize to leaf (US4, P4)

1. Add expense merchant `Metro`, leave category unset (or let auto-categorize run).
2. **Verify**: assigned to **Groceries** (not merely Needs); `categoryWasAuto: true`, `subcategoryResolved: true`.
3. Add expense merchant `Unknown Shop XYZ` with no keyword match.
4. **Verify**: lands on a bucket node only; UI shows **Bucket only** badge when auto.

## Scenario 3 — Merchant correction remembers subcategory (FR-014)

1. Create expense merchant `TestCoffee`, manually set **Wants → Food & Drink → Coffee** → save.
2. Create another expense merchant `TestCoffee` without picking category.
3. **Verify**: auto-assigned to **Coffee** subcategory.

## Scenario 4 — Rollup and filter (US2, P2)

1. Create at least two expenses under different Needs subcategories (e.g. Groceries + Rent).
2. On Expenses page, **Verify**: Needs total = sum of both.
3. Expand Needs breakdown → **Verify**: subcategory lines match individual totals.
4. Filter by **Food** (mid-tier) → **Verify**: only Food-branch expenses shown (Groceries, not Rent).

## Scenario 5 — Manage subcategories (US3, P3)

1. Go to **Categories** under Wants.
2. Add subcategory **Hobbies** under **Entertainment**.
3. Create expense assigned to **Hobbies** → save.
4. Rename **Hobbies** → **Gaming** → **Verify**: expense path updates.
5. Delete **Gaming** with no other expenses on branch → **Verify**: removed from picker.
6. Attempt add fourth top-level bucket via API → **Verify**: 400 rejected.

## Scenario 6 — Cascade delete with reassignment (FR-007)

1. Ensure an expense exists under **Needs → Transport → Rideshare**.
2. Delete **Transport** branch in Categories UI.
3. **Verify**: blocked until reassignment target chosen.
4. Reassign to **Needs** bucket → confirm.
5. **Verify**: expense now under Needs; Transport + Rideshare nodes gone.

## Scenario 7 — Depth limit (FR-008)

1. Try to add a child under a depth-4 node via UI or API.
2. **Verify**: rejected with plain-language error.

## Quality gates

Before marking feature complete:

```bash
npm run lint
npm run build
npm test
```

All must pass (constitution II).

## Harness spot-check (optional)

After receipt flow works with new categories:

1. Stage a receipt; run harness with `"categoryHint": "Groceries"`.
2. **Verify**: draft expense category path ends at Groceries.

See [receipt-harness skill](../../../.claude/skills/receipt-harness/SKILL.md) for CLI steps.
