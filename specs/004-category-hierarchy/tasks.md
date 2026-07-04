# Tasks: Category Hierarchy

**Input**: Design documents from `/specs/004-category-hierarchy/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Constitution Principle II — new behavioral logic in `src/lib/categories.ts`, `src/lib/categorize.ts`, and rollup helpers SHOULD ship with Vitest coverage. UI layout verification is manual via quickstart.md.

**Organization**: Tasks grouped by user story (P1–P4) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 (hierarchical assign), US2 (rollups/filter), US3 (manage subcategories), US4 (auto-categorize)

## Path Conventions

Single Next.js project at repository root per plan.md: `app/`, `src/lib/`, `src/components/`, `scripts/`, `tests/`, `drizzle/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm green baseline before schema changes.

- [X] T001 Run `npm run lint && npm run build && npm test` at repo root; stop and report if baseline is red

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, seed, category tree module, and read API — blocks all user stories.

**⚠️ CRITICAL**: No user story work until this phase completes.

- [X] T002 Add `categories` table and replace `expenses.category` / `merchant_corrections.category` text columns with `category_id` UUID FKs in `src/lib/db/schema.ts` per data-model.md
- [X] T003 Generate Drizzle migration with `npm run db:generate` and verify SQL in `drizzle/` (greenfield — no backfill script)
- [X] T004 Implement idempotent default tree + leaf keywords in `scripts/seed.ts` matching spec **Default Seed Tree**; wire `npm run seed` to populate buckets and subcategories
- [X] T005 Create `src/lib/categories.ts` with tree helpers: `loadCategoryFlat`, `buildTree`, `getCategoryPath`, `getDescendantIds`, `getNodeDepth`, `findBucketNodeId`
- [X] T006 [P] Add Zod schemas for `categoryId` on expenses and category CRUD bodies in `src/lib/validation.ts` per contracts/api.md
- [X] T007 Implement `GET /api/categories` (tree + flat formats) in `app/api/categories/route.ts` with session auth
- [X] T008 Run `npm run db:migrate && npm run seed` locally and verify three bucket roots with nested children exist

**Checkpoint**: Category tree persisted and readable via API; migrations apply on empty DB.

---

## Phase 3: User Story 1 - Assign a specific subcategory when recording an expense (Priority: P1) 🎯 MVP

**Goal**: Users create/edit expenses with hierarchical category selection; saved expenses show full category path and roll up to the correct bucket.

**Independent Test**: Create expense via Needs → Food → Groceries; verify path display and Needs bucket total (quickstart Scenario 1).

### Implementation for User Story 1

- [X] T009 [P] [US1] Extend `Expense` API type in `src/lib/api-types.ts` with `categoryId`, `categoryPath`, `bucket`, `subcategoryResolved`
- [X] T010 [US1] Update `src/lib/expenses.ts` create/update/confirm to accept `categoryId`, join category for path/bucket in responses, and require valid node id (depends on T005)
- [X] T011 [P] [US1] Update `POST /api/expenses` and `PATCH /api/expenses/[id]/route.ts` to parse `categoryId` from validation schemas and return enriched expense shape
- [X] T012 [P] [US1] Update `POST /api/expenses/[id]/confirm/route.ts` to accept optional `categoryId` on draft confirm
- [X] T013 [US1] Create drill-down `CategoryPicker` component in `src/components/CategoryPicker.tsx` per contracts/ui.md (breadcrumb, leaf select, intermediate select)
- [X] T014 [US1] Replace flat category `<select>` with `CategoryPicker` in `src/components/ExpenseForm.tsx`; pass `categoryId` on submit
- [X] T015 [US1] Update `app/(app)/expenses/page.tsx` to display `categoryPath.join(' → ')` on expense rows/cards and in edit sheet
- [X] T016 [P] [US1] Update expense validation tests in `tests/expenses.test.ts` for `categoryId` UUID instead of flat `category` string

**Checkpoint**: Manual hierarchical assignment works end-to-end; MVP deployable.

---

## Phase 4: User Story 2 - View spending rolled up by hierarchy level (Priority: P2)

**Goal**: Spending summary shows Needs/Wants/Savings totals with drill-down; filters include subcategory subtrees.

**Independent Test**: Two Needs subcategory expenses sum to Needs total; filter by mid-tier shows only branch expenses (quickstart Scenario 4).

### Tests for User Story 2

- [X] T017 [P] [US2] Add rollup unit tests in `tests/category-rollups.test.ts` for descendant filtering and ancestor bubble sums using fixture tree data

### Implementation for User Story 2

- [X] T018 [US2] Implement hierarchical `getCategoryTotals` and subtree filter in `src/lib/expenses.ts` using `getDescendantIds` from `src/lib/categories.ts`
- [X] T019 [P] [US2] Update `GET /api/expenses` in `app/api/expenses/route.ts` to support `categoryId` and `bucket` query params; return nested `categoryTotals` tree per contracts/api.md
- [X] T020 [US2] Replace flat bucket filter with bucket quick-filter + optional subcategory drill-down filter in `app/(app)/expenses/page.tsx`
- [X] T021 [US2] Add expandable per-bucket breakdown (nested `CategoryTotal` tree) to summary section in `app/(app)/expenses/page.tsx` per contracts/ui.md

**Checkpoint**: Rollups and subtree filters match spec FR-005 / SC-003.

---

## Phase 5: User Story 3 - Manage subcategories under each budget bucket (Priority: P3)

**Goal**: Users add, rename, reorder keywords, and cascade-delete subcategories; top-level buckets remain immutable.

**Independent Test**: Add subcategory under Wants, use on expense, rename, delete empty branch; API rejects fourth top-level bucket (quickstart Scenarios 5–6).

### Tests for User Story 3

- [X] T022 [P] [US3] Extend `tests/categories.test.ts` for depth limit, sibling duplicate rejection, bucket immutability, and cascade delete with/without expenses (mock db or test helpers)

### Implementation for User Story 3

- [X] T023 [US3] Implement create/rename/reorder/delete branch logic in `src/lib/categories.ts` including cascade delete + optional `reassignTo` per data-model.md
- [X] T024 [P] [US3] Implement `POST /api/categories` in `app/api/categories/route.ts` for subcategory create (reject null `parentId`)
- [X] T025 [P] [US3] Implement `PATCH /api/categories/[id]/route.ts` for rename, keywords, displayOrder (reject bucket rows)
- [X] T026 [US3] Implement `DELETE /api/categories/[id]/route.ts` with `reassignTo` query param and 409 when branch has expenses
- [X] T027 [US3] Create category management page in `app/(app)/categories/page.tsx` per contracts/ui.md (per-bucket tree, add/rename/keywords/delete flows)
- [X] T028 [P] [US3] Restore **Categories** nav link in `src/components/AppNav.tsx` (desktop + bottom tab)

**Checkpoint**: Full subcategory CRUD without reparenting.

---

## Phase 6: User Story 4 - Auto-categorize to the most specific matching subcategory (Priority: P4)

**Goal**: Keyword rules and merchant corrections assign deepest matching subcategory; bucket-only fallback shows indicator.

**Independent Test**: Metro → Groceries auto; unknown merchant → bucket with "Bucket only" badge; manual correction remembered (quickstart Scenarios 2–3).

### Tests for User Story 4

- [X] T029 [P] [US4] Rewrite `tests/categorize.test.ts` for deepest keyword match, merchant correction by `categoryId`, `categoryHint` name resolution, and bucket fallback

### Implementation for User Story 4

- [X] T030 [US4] Rewrite `src/lib/categorize.ts` to load category tree, pick deepest keyword match, resolve `categoryHint` by name, fall back to bucket node; return `{ categoryId, categoryWasAuto, subcategoryResolved }`
- [X] T031 [US4] Update `src/lib/expenses.ts` and `upsertMerchantCorrection` to store `category_id` on merchant corrections; upsert specific subcategory on manual category change (FR-014)
- [X] T032 [P] [US4] Update `createDraftFromHarness` in `src/lib/expenses.ts` to use new categorizer output
- [X] T033 [US4] Show **Bucket only** badge on expenses page in `app/(app)/expenses/page.tsx` when `categoryWasAuto && !subcategoryResolved`
- [X] T034 [P] [US4] Trim `src/lib/budget-categories.ts` to bucket enum + legacy hint mapping only; remove hardcoded `CATEGORY_KEYWORDS` (now in DB seed)

**Checkpoint**: Auto-categorization lands on leaves when keywords match (SC-004).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, validation, spec status.

- [X] T035 [P] Remove dead flat-`category` references across `src/` and `tests/` (grep for `BudgetCategory` on expense writes, old check constraints)
- [X] T036 Run quickstart.md Scenarios 1–7 manually (or spot-check) and fix gaps
- [X] T037 Run `npm run lint && npm run build && npm test` — all green per constitution III/II
- [X] T038 Set `specs/004-category-hierarchy/spec.md` **Status** to `in-progress` before T002; `complete` after T037

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on Foundational + US1 expense `categoryId` wiring (display/filter builds on US1 types)
- **US3 (Phase 5)**: Depends on Foundational only (can parallel with US1/US2 after Phase 2)
- **US4 (Phase 6)**: Depends on Foundational + US1 expense pipeline (categorizer feeds create/confirm)
- **Polish (Phase 7)**: After desired stories complete

### User Story Dependencies

| Story | Can start after | Notes |
|-------|-----------------|-------|
| US1 P1 | Phase 2 | No dependency on US2–US4 |
| US2 P2 | US1 | Needs `categoryId` on expenses and list API |
| US3 P3 | Phase 2 | Independent of US1/US2/US4 |
| US4 P4 | US1 | Needs expense create/update accepting `categoryId` |

### Parallel Opportunities

```text
Phase 2: T006 ∥ T007 after T005; T004 after T002–T003
US1:   T009 ∥ T011 ∥ T012; T013 after T007; T016 ∥ T011
US2:   T017 ∥ T019 after T018; T020 ∥ T021 after T019
US3:   T022 ∥ T024 ∥ T025; T028 ∥ T027
US4:   T029 ∥ T032; T034 after T030
Polish: T035 ∥ T037
```

### Parallel Example: User Story 3

```bash
# After T023 completes:
Task T024: POST /api/categories in app/api/categories/route.ts
Task T025: PATCH /api/categories/[id]/route.ts
Task T028: AppNav Categories link in src/components/AppNav.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 → Phase 2 → Phase 3
2. **STOP and VALIDATE**: quickstart Scenario 1
3. Usable hierarchical expense entry

### Incremental Delivery

1. Foundation → US1 → validate → deploy (MVP)
2. US2 → rollup drill-down → validate Scenario 4
3. US3 → category management → validate Scenarios 5–6
4. US4 → auto-categorize → validate Scenarios 2–3
5. Polish → full quickstart + quality gates

### Spec Status (constitution Principle I)

- `in-progress` before T002
- `complete` after T037

---

## Notes

- Greenfield DB: run `npm run db:migrate && npm run seed` — no legacy migration script
- Reparenting out of scope — do not add `parentId` to PATCH
- Commit after each task or logical group; focused commits per constitution workflow
