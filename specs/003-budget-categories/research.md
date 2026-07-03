# Phase 0: Research

## Data Migration Strategy

**Decision**: Existing `categories` will be completely replaced. We will drop the `categories` table and add a `category` text column to the `expenses` table with a check constraint restricting it to exactly three values: 'Needs', 'Wants', and 'Savings'.

**Rationale**: The user chose Option A (Complete Replacement) to enforce a strict 3-category model (Needs, Wants, Savings). Since categories will no longer be user-defined, maintaining a separate `categories` table and managing foreign keys is unnecessary complexity. A text column with a check constraint on `expenses` adheres to Principle V (Simplicity First) by reducing the number of tables and simplifying queries.

**Alternatives considered**: 
- Keeping the `categories` table and seeding it with 3 system categories. Rejected because it maintains unnecessary relational complexity for what is now a static enumeration.
- Using a Postgres ENUM type. Rejected because Drizzle ORM string check constraints are often easier to manage and migrate than native Postgres ENUMs, which can be difficult to alter later if the 50/30/20 model ever expands.
