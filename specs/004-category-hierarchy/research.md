# Phase 0: Research — Category Hierarchy

**Date**: 2026-07-03 | **Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## R1 — Tree storage model

**Decision**: Adjacency list (`parent_id` nullable FK → `categories.id`) with denormalized `bucket` column (`Needs` | `Wants` | `Savings`) on every row.

**Rationale**: Max depth 4 and ~30 nodes make recursive queries or in-memory walks trivial. Adjacency list is the simplest model to implement CRUD, cascade delete, and depth validation (Principle V). Denormalized `bucket` avoids walking ancestors for every expense rollup and filter.

**Alternatives considered**:
- *Flat string only (003)* — cannot satisfy hierarchy FRs.
- *Nested set / closure table* — faster subtree queries but heavy write logic for CRUD; YAGNI at this scale.
- *Materialized path (`/needs/food/groceries`)* — useful for display but redundant with path builder in app layer.

## R2 — Expense category reference

**Decision**: Replace `expenses.category` text with `expenses.category_id` UUID FK → `categories.id`. Drop the `expenses_category_check` enum constraint.

**Rationale**: Matches original 001 model; single source of truth for assignment. Bucket for 50/30/20 view derived from joined `categories.bucket`.

**Alternatives considered**:
- *Keep text bucket + optional subcategory id* — dual fields risk drift; violates FR-003 single-node assignment.
- *Store bucket redundantly on expense* — faster filters but sync burden on tree moves (reparenting out of scope anyway); rejected.

## R3 — Merchant corrections

**Decision**: `merchant_corrections.category_id` FK → `categories.id` (any node depth). Upsert on manual category change per FR-014.

**Rationale**: Clarification session chose specific subcategory memory. Lookup is O(1) before keyword scan.

**Alternatives considered**:
- *Bucket-only corrections* — rejected in clarify Q3.

## R4 — Auto-categorization algorithm

**Decision**: Load all categories once; for each expense, (1) apply merchant correction by `category_id` if present; (2) else scan all nodes with non-empty `keywords`, pick the match at **greatest depth**; (3) else match `categoryHint` to leaf/mid node by case-insensitive name; (4) else match bucket-level keywords on L1 nodes only; (5) else default to Needs bucket node.

**Rationale**: FR-011 deepest match; tree is tiny so in-memory scan is fine. Tie at same depth: first keyword hit in stable sort order (display_order, name).

**Alternatives considered**:
- *Bucket-first then subcategory* — violates deepest-match FR.
- *External ML categorizer* — constitution forbids hosted AI/OCR.

## R5 — Rollup and filtering

**Decision**: Build an in-memory adjacency map from one `SELECT * FROM categories ORDER BY display_order`. Filter `categoryId=X` → include expenses where `category_id` ∈ {X} ∪ descendants(X). Totals: group expenses by assigned node, bubble sums up the parent chain to bucket.

**Rationale**: Personal ledger size; keeps SQL simple. Dashboard still shows three bucket totals (SC-003); optional drill-down shows child breakdown.

**Alternatives considered**:
- *Postgres recursive CTE per request* — correct but unnecessary complexity.
- *Pre-aggregated rollup table* — YAGNI.

## R6 — Category picker UX

**Decision**: **Drill-down panel** in expense forms: show current level as a list; tap parent row to descend; breadcrumb to go up; selecting a node with children allows "Use this level" or continue drilling. Management page uses expandable tree list.

**Rationale**: FR-013 max four picks; mobile-friendly (feature 002 patterns); no third-party tree component.

**Alternatives considered**:
- *Single long indented `<select>`* — poor on mobile.
- *Three cascading `<select>`s* — rigid when branches have uneven depth.

## R7 — Greenfield migration

**Decision**: New Drizzle migration: create `categories`; add `category_id` to `expenses` and `merchant_corrections`; drop old `category` columns and check constraints. Document `npm run db:migrate && npm run seed` for empty DB. No data backfill script.

**Rationale**: Clarification — database empty; owner approved reset.

**Alternatives considered**:
- *Dual-write transition* — unnecessary without production data.

## R8 — Cascade delete

**Decision**: Application-layer transaction: collect descendant ids via BFS; if any expense on those ids, block unless `reassignTo` provided; reassign expenses + delete merchant corrections pointing at deleted ids; `DELETE FROM categories WHERE id IN (...)` (FK ON DELETE RESTRICT on expenses prevents accidents).

**Rationale**: FR-007 branch delete + clarify cascade. Postgres `ON DELETE CASCADE` on parent_id would orphan expense handling logic.

**Alternatives considered**:
- *Block if children exist* — rejected in clarify Q4 (user chose cascade).

## R9 — Fixed top-level buckets

**Decision**: Seed three L1 rows (`is_bucket = true`, `parent_id = NULL`, names Needs/Wants/Savings). App rejects POST with `parent_id = NULL` for user-created nodes. PATCH/DELETE on bucket rows → 400.

**Rationale**: FR-001 immutable buckets.

## R10 — Seed source

**Decision**: `scripts/seed.ts` encodes the spec **Default Seed Tree** verbatim (mid-tiers + leaves + leaf keywords). Idempotent: upsert by `(parent_id, lower(name))`.

**Rationale**: FR-009; keywords on leaves only per spec.

## R11 — API shape for clients

**Decision**: `CategoryNode` includes `id`, `name`, `parentId`, `bucket`, `depth`, `displayOrder`, `keywords`, `children?`. `Expense` includes `categoryId`, `categoryPath: string[]`, `bucket`, `categoryWasAuto`, `subcategoryResolved: boolean` (true when assigned node depth > 1).

**Rationale**: FR-004 full path display; FR-011 indicator when only bucket matched (depth === 1 after auto).
