# Data Model: Expense Tracking System (001)

**Date**: 2026-07-01 | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Postgres (Neon) via Drizzle ORM. Single shared ledger — no per-user row filtering, only
created-by attribution (spec Clarifications). All timestamps `timestamptz`, UTC.

## Entity Relationship Overview

```text
users 1──* expenses            (created_by attribution)
users 1──* pending_receipts    (uploaded_by attribution)
categories 1──* expenses
categories 1──* merchant_corrections
pending_receipts 1──0..1 expenses   (draft created from a processed receipt)
```

## Tables

### users

Attribution only — authorization lives in the `ALLOWED_EMAILS` env allowlist (research R3).
Row created on first successful allowlisted sign-in.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| google_sub | text | UNIQUE, NOT NULL (stable Google subject id) |
| email | text | UNIQUE, NOT NULL |
| display_name | text | NOT NULL |
| created_at | timestamptz | NOT NULL, default now() |

### categories

Shared across the ledger. Seeded defaults: Groceries, Dining, Transport, Housing,
Utilities, Health, Entertainment, Shopping, Travel, Uncategorized.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| name | text | UNIQUE (case-insensitive via lower() index), NOT NULL, non-empty |
| is_system | boolean | NOT NULL, default false — `true` only for "Uncategorized" |
| keywords | text[] | NOT NULL, default '{}' — seed words for rule-based categorization |
| created_at | timestamptz | NOT NULL, default now() |

**Rules**: "Uncategorized" (`is_system = true`) cannot be renamed or deleted (FR-011,
FR-013). Deleting any other category reassigns its expenses and merchant corrections to
"Uncategorized" in the same transaction — no orphans (FR-013, edge case).

### expenses

One row per spending record. Draft expenses (from receipt processing) live here with
`status = 'draft'` until confirmed (research R5).

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| amount_cents | integer | NOT NULL, CHECK (amount_cents > 0) (FR-015) |
| currency | char(3) | NOT NULL, default 'CAD' (future-proofing hook, research R7) |
| expense_date | date | NOT NULL, CHECK (expense_date <= CURRENT_DATE) (FR-015) |
| merchant | text | NOT NULL, non-empty |
| merchant_normalized | text | NOT NULL — lowercase/trim/strip-punctuation of merchant; kept in sync by app layer |
| description | text | NULL |
| category_id | uuid | NOT NULL, FK → categories(id) |
| status | text | NOT NULL, CHECK (status IN ('draft','confirmed')), default 'confirmed' |
| source | text | NOT NULL, CHECK (source IN ('manual','photo')) |
| receipt_blob_key | text | NULL — Vercel Blob key of attached receipt image (FR-008) |
| category_was_auto | boolean | NOT NULL, default false — true when categorizer assigned it (US3 telemetry / SC-004) |
| created_by | uuid | NOT NULL, FK → users(id) (attribution, FR-014) |
| created_at | timestamptz | NOT NULL, default now() |
| updated_at | timestamptz | NOT NULL, default now() |

**Indexes**: `(expense_date)`, `(category_id)`, `(status)`,
`(expense_date, amount_cents, merchant_normalized)` for duplicate detection (FR-016, R9).

**State transitions**: `draft → confirmed` (user reviews and saves; FR-007). Draft deletion
allowed (user discards a bad extraction) → attached staged blob deleted too.

### pending_receipts

The staging queue (research R5). Temporary by design (FR-006, FR-008).

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| blob_key | text | NOT NULL — staged image in Vercel Blob |
| status | text | NOT NULL, CHECK (status IN ('pending','processed','unreadable','converted')), default 'pending' |
| error_note | text | NULL — harness's reason when unreadable (FR-009) |
| draft_expense_id | uuid | NULL, FK → expenses(id) — set when status = 'processed' |
| uploaded_by | uuid | NOT NULL, FK → users(id) |
| uploaded_at | timestamptz | NOT NULL, default now() |
| resolved_at | timestamptz | NULL — set on any terminal status |

**State transitions**:

```text
pending ──harness result──▶ processed (draft expense created)
pending ──harness failure──▶ unreadable (user offered manual entry, FR-009)
pending | unreadable ──user action──▶ converted (manual expense created, image attached)
```

Rows in a terminal state are deleted (and staged blob cleaned up) once their draft is
confirmed/discarded or the manual conversion saves (FR-008).

### merchant_corrections

Correction memory for auto-categorization (FR-012, research R6). Shared across the ledger.

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, default gen_random_uuid() |
| merchant_normalized | text | UNIQUE, NOT NULL |
| category_id | uuid | NOT NULL, FK → categories(id) |
| updated_at | timestamptz | NOT NULL, default now() |

**Rules**: Upserted whenever a user sets/changes a category on an expense whose category was
auto-assigned or differs from the current suggestion. On category delete, corrections
reassign to "Uncategorized" (same transaction as expenses).

## Validation Rules (app layer, Zod — FR-015)

- `amount_cents`: positive integer; UI accepts dollars.cents and converts.
- `expense_date`: valid calendar date, not in the future.
- `merchant`: required, 1–200 chars.
- `category_id`: must reference an existing category, else defaults through the
  categorization pipeline (corrections → keywords → Uncategorized).
- Image upload: content-type in {jpeg, png, webp, heic}, size ≤ 10 MB — clear message
  listing accepted formats/limits on violation (edge case).

## Categorization Pipeline (pure function, R6)

```text
input: { merchant_normalized, description, category_hint? }
1. merchant_corrections[merchant_normalized]        → category (source: correction)
2. keyword match over categories.keywords            → category (source: rule)
3. category_hint (harness), if it names a category   → category (source: hint)
4. fallback                                          → Uncategorized
output: { category_id, category_was_auto: true }
```
