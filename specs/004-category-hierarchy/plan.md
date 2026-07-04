# Implementation Plan: Category Hierarchy

**Branch**: `[004-category-hierarchy]` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-category-hierarchy/spec.md`

## Summary

Reintroduce a persistent **category tree** under the three fixed budget buckets (Needs, Wants, Savings). Replace the flat `expenses.category` string and hardcoded keyword map with a `categories` table (adjacency list, max depth 4), `category_id` foreign keys on expenses and merchant corrections, a seed script for the approved default tree, hierarchical expense assignment UI, rollup reporting, subcategory management (no reparenting), and deepest-match auto-categorization. Greenfield deploy — empty database, no legacy migration.

## Technical Context

**Language/Version**: TypeScript / Next.js 15 (App Router)

**Primary Dependencies**: Next.js, Drizzle ORM, Neon serverless driver, Auth.js, Zod

**Storage**: Neon Postgres — new `categories` table; `expenses.category` → `category_id`; `merchant_corrections.category` → `category_id`

**Testing**: Vitest (`tests/categories.test.ts`, `tests/categorize.test.ts`, `tests/expenses.test.ts`, new tree/rollup tests)

**Target Platform**: Vercel serverless

**Project Type**: Web application (UI + API routes, single repo)

**Performance Goals**: Category tree loads in one query (<50 nodes); expense list and rollup remain snappy for personal ledger volume

**Constraints**: Auth unchanged; harness `categoryHint` still plain string; no reparenting; cascade delete branches

**Scale/Scope**: 1–2 allowlisted users; ~30 seeded nodes; 4-level max depth

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-design | Post-design |
|-----------|------------|-------------|
| **I Spec-Driven** | ✅ Spec + clarifications complete | ✅ Plan/data-model/contracts align to spec FRs |
| **II Quality Gates** | ✅ Vitest for categorize, tree ops, API validation | ✅ Regression tests for deepest-match, cascade delete, rollup |
| **III Style** | ✅ Prettier + ESLint | ✅ No new untyped JS |
| **IV Security** | ✅ Session + allowlist unchanged; category APIs auth-guarded | ✅ Same |
| **V Simplicity** | ⚠️ Reverses 003 flat enum — justified (see Complexity Tracking) | ✅ Adjacency list + in-memory tree ops; no closure table / materialized path |

## Project Structure

### Documentation (this feature)

```text
specs/004-category-hierarchy/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 validation guide
├── contracts/
│   ├── api.md           # REST contract deltas
│   └── ui.md            # Category picker + management UI
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/lib/
├── db/schema.ts              # categories table; category_id FKs
├── categories.ts             # tree load, CRUD, depth checks, cascade delete, rollups
├── categorize.ts             # deepest keyword match + merchant corrections by node id
├── budget-categories.ts      # BUDGET_CATEGORIES enum only (L1 bucket names)
├── expenses.ts               # category_id, hierarchical filters/totals
└── validation.ts             # categoryId UUID schemas

scripts/seed.ts               # idempotent default tree + keywords (spec Default Seed Tree)

app/
├── (app)/categories/page.tsx # subcategory management (restore nav link)
├── (app)/expenses/page.tsx   # hierarchical filter, path display, drill-down totals
└── api/categories/           # GET tree, POST/PATCH/DELETE nodes

src/components/
├── CategoryPicker.tsx        # drill-down selector for expense forms
└── ExpenseForm.tsx           # wire CategoryPicker

tests/
├── categories.test.ts        # tree CRUD, depth limit, cascade delete
├── categorize.test.ts        # deepest match, correction by node id
└── category-rollups.test.ts  # bucket + subcategory aggregation
```

**Structure Decision**: Extend existing Next.js layout; restore `/categories` route removed in feature 003. Domain logic in `src/lib/categories.ts` (single module, no extra service layer).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Reintroduce `categories` table after 003 removed it | Spec requires editable 2–3 tier subcategories, per-node keywords, merchant corrections by subcategory node | Flat `Needs`/`Wants`/`Savings` string column cannot represent hierarchy, CRUD, or deepest keyword match (FR-002–FR-014) |
| In-memory tree aggregation for rollups/filters | Personal scale (~30 nodes); avoids recursive SQL in every list query | Recursive CTE on every request adds query complexity for negligible gain at this scale |

## Phase 0 Output

See [research.md](./research.md) — all technical unknowns resolved.

## Phase 1 Output

- [data-model.md](./data-model.md)
- [contracts/api.md](./contracts/api.md)
- [contracts/ui.md](./contracts/ui.md)
- [quickstart.md](./quickstart.md)
