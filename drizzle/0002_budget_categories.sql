ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "category" text;--> statement-breakpoint
ALTER TABLE "merchant_corrections" ADD COLUMN IF NOT EXISTS "category" text;--> statement-breakpoint
UPDATE "expenses" e
SET "category" = CASE lower(c."name")
  WHEN 'groceries' THEN 'Needs'
  WHEN 'dining' THEN 'Wants'
  WHEN 'transport' THEN 'Needs'
  WHEN 'housing' THEN 'Needs'
  WHEN 'utilities' THEN 'Needs'
  WHEN 'health' THEN 'Needs'
  WHEN 'entertainment' THEN 'Wants'
  WHEN 'shopping' THEN 'Wants'
  WHEN 'travel' THEN 'Wants'
  WHEN 'uncategorized' THEN 'Needs'
  ELSE 'Needs'
END
FROM "categories" c
WHERE e."category_id" = c."id" AND e."category" IS NULL;--> statement-breakpoint
UPDATE "merchant_corrections" mc
SET "category" = CASE lower(c."name")
  WHEN 'groceries' THEN 'Needs'
  WHEN 'dining' THEN 'Wants'
  WHEN 'transport' THEN 'Needs'
  WHEN 'housing' THEN 'Needs'
  WHEN 'utilities' THEN 'Needs'
  WHEN 'health' THEN 'Needs'
  WHEN 'entertainment' THEN 'Wants'
  WHEN 'shopping' THEN 'Wants'
  WHEN 'travel' THEN 'Wants'
  WHEN 'uncategorized' THEN 'Needs'
  ELSE 'Needs'
END
FROM "categories" c
WHERE mc."category_id" = c."id" AND mc."category" IS NULL;--> statement-breakpoint
UPDATE "expenses" SET "category" = 'Needs' WHERE "category" IS NULL;--> statement-breakpoint
UPDATE "merchant_corrections" SET "category" = 'Needs' WHERE "category" IS NULL;--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "merchant_corrections" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_category_id_categories_id_fk";--> statement-breakpoint
ALTER TABLE "merchant_corrections" DROP CONSTRAINT IF EXISTS "merchant_corrections_category_id_categories_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "expenses_category_id_idx";--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN IF EXISTS "category_id";--> statement-breakpoint
ALTER TABLE "merchant_corrections" DROP COLUMN IF EXISTS "category_id";--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_check" CHECK ("category" IN ('Needs', 'Wants', 'Savings'));--> statement-breakpoint
ALTER TABLE "merchant_corrections" ADD CONSTRAINT "merchant_corrections_category_check" CHECK ("category" IN ('Needs', 'Wants', 'Savings'));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses" ("category");--> statement-breakpoint
DROP TABLE IF EXISTS "categories";
