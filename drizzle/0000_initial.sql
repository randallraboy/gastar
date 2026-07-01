CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "google_sub" text NOT NULL,
  "email" text NOT NULL,
  "display_name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub"),
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "keywords" text[] DEFAULT '{}'::text[] NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "categories_name_nonempty" CHECK (length(trim("name")) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_lower_idx" ON "categories" (lower("name"));

CREATE TABLE IF NOT EXISTS "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "amount_cents" integer NOT NULL,
  "currency" char(3) DEFAULT 'CAD' NOT NULL,
  "expense_date" date NOT NULL,
  "merchant" text NOT NULL,
  "merchant_normalized" text NOT NULL,
  "description" text,
  "category_id" uuid NOT NULL,
  "status" text DEFAULT 'confirmed' NOT NULL,
  "source" text NOT NULL,
  "receipt_blob_key" text,
  "category_was_auto" boolean DEFAULT false NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id"),
  CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id"),
  CONSTRAINT "expenses_amount_positive" CHECK ("amount_cents" > 0),
  CONSTRAINT "expenses_date_not_future" CHECK ("expense_date" <= CURRENT_DATE),
  CONSTRAINT "expenses_status_check" CHECK ("status" IN ('draft', 'confirmed')),
  CONSTRAINT "expenses_source_check" CHECK ("source" IN ('manual', 'photo')),
  CONSTRAINT "expenses_merchant_nonempty" CHECK (length(trim("merchant")) > 0)
);

CREATE INDEX IF NOT EXISTS "expenses_expense_date_idx" ON "expenses" ("expense_date");
CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses" ("category_id");
CREATE INDEX IF NOT EXISTS "expenses_status_idx" ON "expenses" ("status");
CREATE INDEX IF NOT EXISTS "expenses_duplicate_idx" ON "expenses" ("expense_date","amount_cents","merchant_normalized");

CREATE TABLE IF NOT EXISTS "pending_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blob_key" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "error_note" text,
  "draft_expense_id" uuid,
  "uploaded_by" uuid NOT NULL,
  "uploaded_at" timestamptz DEFAULT now() NOT NULL,
  "resolved_at" timestamptz,
  CONSTRAINT "pending_receipts_draft_expense_id_expenses_id_fk" FOREIGN KEY ("draft_expense_id") REFERENCES "expenses"("id"),
  CONSTRAINT "pending_receipts_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id"),
  CONSTRAINT "pending_receipts_status_check" CHECK ("status" IN ('pending', 'processed', 'unreadable', 'converted'))
);

CREATE TABLE IF NOT EXISTS "merchant_corrections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "merchant_normalized" text NOT NULL,
  "category_id" uuid NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "merchant_corrections_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id"),
  CONSTRAINT "merchant_corrections_merchant_normalized_unique" UNIQUE("merchant_normalized")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_idx" ON "users" ("google_sub");
CREATE UNIQUE INDEX IF NOT EXISTS "merchant_corrections_merchant_idx" ON "merchant_corrections" ("merchant_normalized");
