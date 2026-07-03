# Quickstart: Validation Guide

This guide describes how to validate the Budget Categories Simplification feature once implemented.

## Prerequisites

- Local development environment running (`npm run dev`)
- Local Neon Postgres database running and migrated (`npm run db:push` or similar)
- Authenticated as an allowlisted user

## Validation Scenarios

### Scenario 1: Expense Creation restricted to 3 categories

1. Navigate to the Add Expense form in the application UI.
2. Open the Category dropdown.
3. **Verify**: The only options available are "Needs", "Wants", and "Savings".
4. Select "Needs" and submit the expense.
5. **Verify**: The expense is saved successfully and appears in the list with the category "Needs".

### Scenario 2: Database constraints

1. Open a database connection to your local Postgres instance.
2. Attempt to insert a raw expense record with an invalid category:
   ```sql
   INSERT INTO expenses (amount_cents, currency, expense_date, merchant, merchant_normalized, category, status, source, created_by)
   VALUES (1000, 'CAD', CURRENT_DATE, 'Test', 'test', 'InvalidCategory', 'confirmed', 'manual', 'your-user-id');
   ```
3. **Verify**: The database rejects the insert due to the check constraint on the `category` column.

### Scenario 3: Expense Aggregation

1. Navigate to the dashboard or spending summary view.
2. **Verify**: The summary charts and totals group spending exclusively into "Needs", "Wants", and "Savings".
3. **Verify**: No legacy categories (like "Housing" or "Utilities") appear in any UI grouping.
