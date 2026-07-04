# Feature Specification: Category Hierarchy

**Feature Branch**: `[004-category-hierarchy]`

**Created**: 2026-07-02

**Status**: complete

**Input**: User description: "amend categories, there's the 3 high level categories but i want to further subcategorize at least 2-3 levels."

## Clarifications

### Session 2026-07-03

- Q: Must existing expenses and bucket-only assignments be preserved via migration? → A: No — database is empty; greenfield deploy with fresh schema and seed data is acceptable (no legacy migration required).
- Q: What default subcategory tree should be seeded on first use? → A: Use the approved three-tier tree below (mid-tier groups with leaf subcategories and distributed keywords).
- Q: When a user manually corrects a category, what should merchant corrections remember? → A: The specific subcategory node the user chose (not bucket-only).
- Q: What happens when deleting a subcategory that still has child subcategories? → A: Cascade delete — remove the node and all descendants after expenses on affected nodes are reassigned or moved to a parent.
- Q: Should users be able to move/reparent subcategories to a different parent? → A: Out of scope — no reparenting in this feature; users add, rename, reorder, or delete instead.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assign a specific subcategory when recording an expense (Priority: P1)

A signed-in user creating or editing an expense selects a category from a hierarchical list. The top level is always one of Needs, Wants, or Savings; beneath that they choose progressively more specific subcategories (two or three tiers deep under the bucket) so each expense reflects where the money went in detail while still rolling up to the budget bucket.

**Why this priority**: Expense entry is the primary touchpoint. Without granular assignment at save time, subcategories provide no value.

**Independent Test**: Can be fully tested by creating an expense, drilling into Needs → Food → Groceries (or equivalent), saving, and confirming the expense displays the full path and reports under Needs.

**Acceptance Scenarios**:

1. **Given** a user is creating a new expense, **When** they open the category selector, **Then** they first see the three top-level options (Needs, Wants, Savings) and can expand each to reveal nested subcategories.
2. **Given** a category branch with child subcategories, **When** the user selects a subcategory that has further children, **Then** they can continue selecting through up to three subcategory tiers beneath the bucket until they reach a leaf or stop at an intermediate node.
3. **Given** a saved expense assigned to a deep subcategory (e.g., Needs → Food → Groceries), **When** the user views the expense, **Then** the full category path from top-level bucket through each subcategory level is visible.
4. **Given** an existing expense assigned only to a top-level bucket (from before this feature), **When** the user edits it, **Then** they can optionally refine it to a subcategory without losing the original top-level assignment.

---

### User Story 2 - View spending rolled up by hierarchy level (Priority: P2)

A user reviewing their spending sees totals at the top-level Needs / Wants / Savings buckets for budget tracking, and can drill down into subcategory totals to understand detail within each bucket.

**Why this priority**: The 50/30/20 budget view depends on top-level rollups; subcategories add value only when users can see aggregated spending at each level.

**Independent Test**: Can be fully tested by recording several expenses under different subcategories within Needs, then verifying the Needs total equals the sum of its subcategory totals and that drilling into Needs shows each subcategory breakdown.

**Acceptance Scenarios**:

1. **Given** expenses assigned to various subcategories under Needs, **When** the user views the spending summary, **Then** Needs shows the combined total of all descendant subcategories.
2. **Given** a populated expense list filtered by a subcategory, **When** the user applies the filter, **Then** only expenses assigned to that subcategory or its descendants are shown.
3. **Given** expenses assigned directly to a top-level bucket (no subcategory), **When** the user views period totals, **Then** those expenses still contribute correctly to their bucket totals alongside subcategory-assigned expenses.

---

### User Story 3 - Manage subcategories under each budget bucket (Priority: P3)

A signed-in user adds, renames, reorders, or removes subcategories under Needs, Wants, or Savings. Reparenting (moving a subcategory to a different parent) is out of scope. The three top-level buckets remain fixed; only subcategories beneath them are user-managed.

**Why this priority**: Personal spending patterns differ; users need control over their own taxonomy without reopening the three-bucket model from feature 003.

**Independent Test**: Can be fully tested by adding a new subcategory under Wants, assigning an expense to it, then renaming it and confirming existing expenses reflect the updated name.

**Acceptance Scenarios**:

1. **Given** a user on category management, **When** they add a subcategory under Wants, **Then** it appears in the expense category selector under Wants and nowhere else.
2. **Given** a subcategory with no expenses assigned (directly or on descendants), **When** the user deletes it, **Then** it and all descendant subcategories are removed from the hierarchy and selector.
3. **Given** a subcategory with assigned expenses (on itself or any descendant), **When** the user attempts to delete it, **Then** the system blocks deletion until expenses on all affected nodes are reassigned or the user confirms moving them to a parent category; then the node and all descendants are removed.
4. **Given** a user attempts to create a fourth top-level category, **When** they save, **Then** the system rejects the action and only allows subcategories under Needs, Wants, or Savings.

---

### User Story 4 - Auto-categorize to the most specific matching subcategory (Priority: P4)

When an expense is auto-categorized (manual keyword rules or receipt harness), the system assigns the most specific subcategory whose keyword rules match, falling back to the top-level bucket when no subcategory matches.

**Why this priority**: Auto-categorization already exists at the bucket level; extending it to subcategories reduces manual drill-down after import.

**Independent Test**: Can be fully tested by entering a merchant known to match a Groceries subcategory keyword and verifying the expense lands on that subcategory rather than only Needs.

**Acceptance Scenarios**:

1. **Given** keyword rules on a leaf subcategory Groceries under Needs → Food, **When** a new expense description contains a matching grocery keyword, **Then** the expense is auto-assigned to Groceries (not merely Needs).
2. **Given** no subcategory keyword matches, **When** auto-categorization runs, **Then** the expense is assigned to the matching top-level bucket only, with a visible indicator that subcategory was not resolved.
3. **Given** a user manually overrides an auto-assigned subcategory, **When** they save, **Then** the manual choice is retained and marked as user-selected, and future expenses from the same merchant auto-assign to that subcategory.

---

### Edge Cases

- What happens when deleting a subcategory that has child subcategories? Deletion cascades to all descendants once no expenses remain on the deleted branch (or after the user reassigns/moves expenses on affected nodes to a parent); child nodes are not orphaned.
- What happens when a user tries to move a subcategory to a different parent? Not supported — users delete and recreate, or adjust names/order instead.
- What happens when hierarchy depth would exceed three subcategory tiers under a bucket? The system prevents creating or nesting beyond three subcategory levels beneath Needs, Wants, or Savings (four levels total including the bucket).
- What happens when two sibling subcategories share the same display name? Allowed under different parents; disallowed as duplicates under the same parent.
- What happens when filtering by a parent subcategory? Expenses assigned to that node and all descendants are included.
- What happens to expenses on a deleted subcategory after confirmed reassignment? They move to the chosen parent (or sibling) and retain correct top-level rollup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST preserve exactly three fixed top-level budget categories: Needs, Wants, and Savings. Users MUST NOT create, rename, or delete these top-level buckets.
- **FR-002**: The system MUST support a category hierarchy with Needs, Wants, or Savings at level 1 and up to three additional subcategory tiers beneath each bucket (four levels total).
- **FR-003**: Each expense MUST be assigned to exactly one category node in the hierarchy (a top-level bucket or any subcategory within it).
- **FR-004**: The system MUST display the full ancestor path (e.g., Needs → Food → Groceries) wherever an expense's category is shown.
- **FR-005**: Spending summaries and filters MUST roll up totals from descendant subcategories into ancestor categories and ultimately into the three top-level buckets.
- **FR-006**: Users MUST be able to create, rename, reorder, and delete subcategories under each top-level bucket via category management. Reparenting (changing a subcategory's parent) is out of scope.
- **FR-007**: The system MUST prevent deletion of a subcategory branch while any node in that branch (the node or a descendant) has assigned expenses, unless the user reassigns those expenses to another category or confirms moving them to a parent category. Once clear, deletion MUST cascade to all descendant subcategories.
- **FR-008**: The system MUST prevent nesting deeper than three subcategory tiers under any top-level bucket (four levels total including the bucket).
- **FR-009**: The system MUST seed the default subcategory tree defined in **Default Seed Tree** on first use, including leaf-level keyword rules derived from the prior flat keyword mapping.
- **FR-010**: Deployment MAY use a greenfield database reset when no production data exists; no backward-compatibility migration from the flat `Needs`/`Wants`/`Savings` string column is required. Expenses MAY be assigned to any hierarchy level (bucket, mid-level, or leaf).
- **FR-011**: Auto-categorization MUST assign the deepest matching subcategory when keyword rules match; otherwise it MUST fall back to the appropriate top-level bucket.
- **FR-012**: Subcategories MUST support keyword rules for auto-categorization, inheriting the pattern used for top-level buckets today.
- **FR-013**: Category selection in expense forms MUST allow hierarchical navigation (expand parent, select child) without requiring more than four selections to reach any assignable node (bucket plus up to three subcategory picks).
- **FR-014**: Merchant corrections MUST store and apply the specific category node (including subcategory) the user selected when correcting a category, not merely the top-level bucket.

### Key Entities

- **Category node**: A named entry in a tree. Level-1 nodes are the fixed buckets Needs, Wants, Savings. Levels 2–4 are user-managed subcategories (up to three tiers under each bucket). Each node has a parent reference (null for top-level), display order among siblings, optional keyword rules, and a denormalized top-level bucket for fast rollup.
- **Expense**: A transaction linked to exactly one category node. Displays full path from bucket to assigned node. Retains whether the category was auto-assigned or user-chosen.
- **Category keyword rule**: Text patterns associated with a category node used by auto-categorization to pick the most specific match.
- **Merchant correction**: A learned mapping from normalized merchant name to a specific category node; updated when the user manually sets or changes an expense category.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can assign an expense to a four-level category path (bucket plus three subcategory tiers) in under 20 seconds after becoming familiar with the default tree.
- **SC-002**: 100% of expenses remain attributable to exactly one Needs, Wants, or Savings bucket via rollup, including those assigned to deep subcategories.
- **SC-003**: Top-level bucket totals on the spending summary match the sum of all descendant subcategory totals with zero discrepancy.
- **SC-004**: At least 80% of auto-categorized expenses with matching subcategory keywords land on a subcategory deeper than the top-level bucket alone (measured after default seed keywords are in place).
- **SC-005**: Users can add a new subcategory and use it on an expense within one session without administrative assistance.
- **SC-006**: After seeding, all new expenses appear in lists, filters, and bucket totals with correct rollup (greenfield deploy; no legacy data to preserve).

## Assumptions

- Feature 003 (three top-level buckets) remains the budget framework; this feature adds granularity beneath it, not new top-level buckets.
- The app serves one or two allowlisted users sharing a single category tree and expense ledger.
- Default subcategories are seeded once using the **Default Seed Tree** below; users may customize afterward.
- Database is currently empty; implementation may reset schema and seed without migration scripts.
- Expenses may sit at any hierarchy level (top bucket only, mid-level, or leaf); leaf assignment is encouraged but not strictly required when a branch has no children yet.
- Category management is a settings-style flow, not required on every expense entry.
- Auto-categorization keyword maintenance is acceptable at the subcategory level for a personal app; no external taxonomy service is required.
- Reordering subcategories affects display order only, not rollup math or expense assignments.

## Default Seed Tree

Seeded on first deploy (greenfield). Mid-tier nodes group related leaves; keywords live on leaf nodes only.

**Needs**

- **Food** → Groceries *(grocery, supermarket, metro, loblaws, sobeys)*
- **Transport** → Rideshare *(uber, lyft)* · Public Transit *(transit, presto)* · Fuel & Parking *(gas, parking)*
- **Housing** → Rent *(rent)* · Mortgage *(mortgage, property)*
- **Utilities** → Hydro & Electric *(hydro, electric)* · Water *(water)* · Internet & Phone *(internet, bell, rogers)*
- **Health** → Pharmacy *(pharmacy, shoppers)* · Medical *(doctor, dental, medical)*

**Wants**

- **Food & Drink** → Dining *(restaurant, cafe)* · Coffee *(coffee, tim hortons, starbucks)*
- **Entertainment** → Streaming *(netflix, spotify)* · Movies & Games *(cinema, movie, game)*
- **Shopping** → General Retail *(amazon, walmart, costco, retail, store)*
- **Travel** → Flights *(airline, flight)* · Lodging *(hotel, airbnb)* · Vacation *(vacation)*

**Savings**

- **Investments** *(investment, rrsp, tfsa)*
- **Contributions** *(savings, contribution)*

## Dependencies

- **003-budget-categories**: Provides the three fixed top-level buckets and bucket-level keyword rules that this feature extends.
- **001-expense-tracking**: Expense CRUD, filtering, auto-categorization, and receipt harness integration must consume the hierarchical category model.
