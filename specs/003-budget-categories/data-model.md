# Phase 1: Data Model

## Schema Changes

The data model simplifies the category system by removing the `categories` table entirely.

### 1. `expenses` Table (Modified)

- **Removed Fields**:
  - `categoryId` (uuid, foreign key)
- **Added Fields**:
  - `category` (text, not null)
- **Constraints**:
  - Add check constraint: `category IN ('Needs', 'Wants', 'Savings')`
  - Update `expenses_duplicate_idx` to use `category` instead of `categoryId` if applicable (currently it uses `expenseDate, amountCents, merchantNormalized`, so no change needed).
  - Add index `expenses_category_idx` on `category`.

### 2. `categories` Table (Deleted)

- Table is dropped completely.

### 3. `merchant_corrections` Table (Modified)

- **Removed Fields**:
  - `categoryId` (uuid, foreign key)
- **Added Fields**:
  - `category` (text, not null)

## Data Migration Steps

1. Add the new `category` text columns to `expenses` and `merchant_corrections` (nullable initially).
2. Run an update script to map existing `categoryId` references to one of the three new string values ('Needs', 'Wants', 'Savings') based on a predefined mapping of historical categories.
3. Make the `category` columns `notNull()`.
4. Drop the `categoryId` foreign keys and columns.
5. Drop the `categories` table.
