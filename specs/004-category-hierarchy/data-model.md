# Data Model: Category Hierarchy (004)

**Date**: 2026-07-03 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Postgres (Neon) via Drizzle ORM. Greenfield migration — empty database, no backfill from flat `category` column.

## Entity Relationship Overview

```text
categories *──1 categories          (parent_id self-FK, nullable for L1 buckets)
categories 1──* expenses            (category_id)
categories 1──* merchant_corrections (category_id)
users 1──* expenses
users 1──* pending_receipts
pending_receipts 1──0..1 expenses
```

## Tables

### categories (new)

Hierarchical category tree. Level 1 = fixed buckets; levels 2–4 = user-managed subcategories.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| parent_id | uuid | NULL for L1 buckets only; else FK → categories(id) ON DELETE RESTRICT |
| name | text | NOT NULL, non-empty; UNIQUE (parent_id, lower(name)) — siblings unique case-insensitive |
| bucket | text | NOT NULL, CHECK IN ('Needs','Wants','Savings') — denormalized top-level bucket |
| is_bucket | boolean | NOT NULL, default false — true only for the three L1 rows |
| display_order | integer | NOT NULL, default 0 — sibling sort order |
| keywords | text[] | NOT NULL, default '{}' — auto-categorization patterns (primarily on leaves) |
| created_at | timestamptz | NOT NULL, default now() |

**Invariants (app layer)**:
- Exactly three rows with `is_bucket = true` and `parent_id IS NULL` (FR-001).
- `depth(node)` ≤ 4 (bucket = depth 1; max three subcategory tiers below) (FR-008).
- User-created nodes MUST have `parent_id NOT NULL` (FR-001).
- `bucket` on a child MUST equal its ancestor bucket (set on insert from parent).
- Bucket rows: not renameable, deletable, or keyword-editable via user API (FR-001).
- Reparenting not supported — no `parent_id` update endpoint (clarify session).

**Indexes**: `(parent_id, display_order)`, `(bucket)`, unique on `(parent_id, lower(name))` via expression index or app-enforced.

### expenses (modified)

| Change | Detail |
|--------|--------|
| Remove | `category` text + `expenses_category_check` |
| Add | `category_id` uuid NOT NULL, FK → categories(id) ON DELETE RESTRICT |
| Index | Replace `expenses_category_idx` with index on `category_id` |

All other columns unchanged.

**Display**: API derives `categoryPath` (array of names root → assigned node) and `bucket` from joined category row(s).

### merchant_corrections (modified)

| Change | Detail |
|--------|--------|
| Remove | `category` text + check constraint |
| Add | `category_id` uuid NOT NULL, FK → categories(id) ON DELETE RESTRICT |

**Rules**: Upsert when user manually sets/changes category on save (FR-014). Correction stores the specific node id chosen.

### pending_receipts, users

Unchanged.

## Depth Calculation

```text
depth(bucket) = 1
depth(child)  = depth(parent) + 1
max depth     = 4  → reject insert when parent.depth >= 4
```

## Cascade Delete (branch)

When deleting category node `N`:

1. `targets` = { N } ∪ all descendants (BFS).
2. If ∃ expense with `category_id ∈ targets` and no `reassignTo` → **409** with count.
3. If `reassignTo` provided → UPDATE expenses SET category_id = reassignTo WHERE category_id ∈ targets; validate reassignTo ∉ targets and same bucket (or any valid node — spec allows parent or other category).
4. DELETE merchant_corrections WHERE category_id ∈ targets.
5. DELETE categories WHERE id ∈ targets (children first or single DELETE with known id set).

## Rollup Rules

- Expense amount counts toward assigned node and every ancestor up to bucket (FR-005).
- Filter by node `X`: include expenses where `category_id ∈ subtree(X)`.
- Bucket total = sum of expenses whose assigned node's `bucket` = that bucket (equivalent to subtree sum of L1 node).

## Seed Data

See spec **Default Seed Tree**. Seed creates:

- 3 bucket rows (L1)
- Mid-tier groups under each bucket where specified (L2)
- Leaf subcategories with keywords (L3)
- Savings leaves directly under bucket (L2, no mid-tier)

Implemented in `scripts/seed.ts`; run after migrate.

## Validation (Zod)

- `categoryId`: uuid on expense create/update when provided.
- Category create: `{ parentId: uuid, name: string.min(1).max(80), keywords?: string[] }`.
- Category update: `{ name?, keywords?, displayOrder? }` — not `parentId`.
- Delete query: optional `reassignTo` uuid when branch has expenses.

## State Transitions

Categories have no status field. Lifecycle: **created → (renamed/reordered) → deleted (cascade)**.

Expenses and drafts continue to use existing `draft | confirmed` transitions; only `category_id` reference changes.

## Migration Notes (greenfield)

1. Drop `expenses.category`, add `expenses.category_id`.
2. Drop `merchant_corrections.category`, add `merchant_corrections.category_id`.
3. Create `categories` table.
4. `npm run seed` populates tree.
5. No script to map old flat strings (DB empty per FR-010).
