# Feature Specification: Budget Categories Simplification

**Feature Branch**: `[003-budget-categories]`

**Created**: 2026-07-02

**Status**: complete

**Input**: User description: "categories shoud only have 3 categories: needs, wants, and savings"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assign budget category to an expense (Priority: P1)

Users adding or modifying an expense must assign it to one of exactly three main categories (Needs, Wants, Savings).

**Why this priority**: Core requirement for data entry in a 50/30/20 style budget model.

**Independent Test**: Can be fully tested by creating a new expense and verifying the category dropdown only offers the three allowed choices.

**Acceptance Scenarios**:

1. **Given** a user is creating a new expense, **When** they open the category selector, **Then** they see exactly three options: Needs, Wants, and Savings.
2. **Given** an existing expense, **When** the user edits the expense, **Then** they can reassign it to any of the three allowed categories.

---

### Edge Cases

- What happens to an expense if it was previously categorized under a deleted category during the migration process? (It should be mapped to the closest new category or left as uncategorized/Needs until manually updated, depending on migration logic).
- How does the system handle category reporting for periods prior to this change? (It should map historical data to the new categories to provide consistent historical reporting).

---

### User Story 2 - View expenses grouped by the three categories (Priority: P2)

Users reviewing their spending should see their expenses aggregated into Needs, Wants, and Savings to understand their budget allocation.

**Why this priority**: Essential for analyzing spending against the 50/30/20 budget framework.

**Independent Test**: Can be fully tested by viewing the expense list or dashboard and verifying totals are grouped by the three allowed categories.

**Acceptance Scenarios**:

1. **Given** a populated list of expenses, **When** the user views their spending summary, **Then** the totals are broken down into Needs, Wants, and Savings buckets.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST restrict the top-level expense categories to exactly three options: "Needs", "Wants", and "Savings".
- **FR-002**: The system MUST prevent the creation of any custom top-level categories by the user.
- **FR-003**: The system MUST handle the migration of existing expenses to the new category structure. Existing categories will be completely replaced by the three main categories (Needs, Wants, Savings). Existing expenses will be mapped to the appropriate new category based on a predefined mapping, and their granular historical category data will be discarded.
- **FR-004**: System MUST update any existing UI filtering or aggregation to group exclusively by the three categories.

### Key Entities

- **Category**: A strict enumeration consisting of exactly three values: Needs, Wants, Savings.
- **Expense**: An individual transaction that must be linked to exactly one Category.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly created expenses are assigned to either Needs, Wants, or Savings.
- **SC-002**: 100% of legacy expenses are successfully mapped to the new category structure without data loss.
- **SC-003**: Users can successfully filter their historical and current expenses using the three new categories.

## Assumptions

- Users want to follow a simplified budgeting framework (like 50/30/20) and no longer require custom top-level categories.
- Existing expenses will be migrated to the new schema during deployment.
- The UI will be updated to remove any custom category management pages.
