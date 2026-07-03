# Tasks: Budget Categories Simplification

**Input**: Design documents from `/specs/003-budget-categories/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

*(No shared infrastructure setup needed for this feature as it modifies an existing Next.js project).*

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Update Drizzle schema in `src/lib/db/schema.ts` (Add `category` string to `expenses` and `merchant_corrections`, drop `categories` table and `categoryId` FKs)
- [X] T002 Generate database migration using Drizzle Kit (e.g., `npm run db:generate`)
- [X] T003 Create custom migration script to populate `category` from old `categories` table before dropping it, then run the migration.
- [X] T004 Update TypeScript types across the codebase to remove `Category` entity and update `Expense` type to use the new string literal union `'Needs' | 'Wants' | 'Savings'`.

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Assign budget category to an expense (Priority: P1) 🎯 MVP

**Goal**: Users adding or modifying an expense must assign it to one of exactly three main categories (Needs, Wants, Savings).

**Independent Test**: Can be fully tested by creating a new expense and verifying the category dropdown only offers the three allowed choices.

### Implementation for User Story 1

- [X] T005 [P] [US1] Update API routes/server actions for creating expenses to validate and save the new string `category`.
- [X] T006 [P] [US1] Update API routes/server actions for editing expenses to validate and save the new string `category`.
- [X] T007 [US1] Refactor expense forms (add/edit) in the UI to use a static dropdown for `category` instead of fetching from the DB.
- [X] T008 [US1] Update Vitest tests for expense creation and editing to pass the new `category` string format.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View expenses grouped by the three categories (Priority: P2)

**Goal**: Users reviewing their spending should see their expenses aggregated into Needs, Wants, and Savings to understand their budget allocation.

**Independent Test**: Can be fully tested by viewing the expense list or dashboard and verifying totals are grouped by the three allowed categories.

### Implementation for User Story 2

- [X] T009 [P] [US2] Update dashboard data fetching logic to group expenses by the new `category` string column (removing joins to `categories` table).
- [X] T010 [P] [US2] Update transaction list view to display the static category strings correctly.
- [X] T011 [US2] Remove category management UI (pages/components for adding/editing custom categories) since categories are now fixed.
- [X] T012 [US2] Update Vitest tests for dashboard and transaction list to reflect the new data structure.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T013 [P] Remove any dead code related to the old `Category` service or fetching logic.
- [X] T014 Run quickstart.md validation scenarios to verify end-to-end functionality.
- [X] T015 Run `npm run lint` and `npm run build` to ensure all type errors are resolved.
- [X] T016 Run `npm test` to ensure all tests pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: N/A
- **Foundational (Phase 2)**: Starts immediately - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 and User Story 2 can proceed in parallel (if staffed)
- **Polish (Final Phase)**: Depends on all user stories being complete

### Parallel Opportunities

- Updating API routes (T005, T006) and Dashboard fetching logic (T009, T010) can run in parallel.
- User Story 1 and User Story 2 can be worked on in parallel by different team members after Foundation is complete.

---

## Phase 5: Convergence

**Purpose**: Close gaps found by `/speckit-converge` on 2026-07-02

- [X] T017 CRITICAL: Restore the `npm run lint` quality gate to passing — `prettier --check .` fails on 10 unformatted `.agents/skills/speckit-*/SKILL.md` files; format them with Prettier or exclude `.agents/` via `.prettierignore` per Constitution III (contradicts)
