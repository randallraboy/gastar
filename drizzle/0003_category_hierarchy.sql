CREATE TABLE IF NOT EXISTS "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"bucket" text NOT NULL,
	"is_bucket" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"keywords" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_bucket_check" CHECK ("bucket" IN ('Needs', 'Wants', 'Savings')),
	CONSTRAINT "categories_name_nonempty" CHECK (length(trim("name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_parent_order_idx" ON "categories" USING btree ("parent_id","display_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_bucket_idx" ON "categories" USING btree ("bucket");
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT IF EXISTS "expenses_category_check";
--> statement-breakpoint
DROP INDEX IF EXISTS "expenses_category_idx";
--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN IF EXISTS "category";
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "category_id" uuid;
--> statement-breakpoint
ALTER TABLE "merchant_corrections" DROP CONSTRAINT IF EXISTS "merchant_corrections_category_check";
--> statement-breakpoint
ALTER TABLE "merchant_corrections" DROP COLUMN IF EXISTS "category";
--> statement-breakpoint
ALTER TABLE "merchant_corrections" ADD COLUMN IF NOT EXISTS "category_id" uuid;
--> statement-breakpoint
DELETE FROM "expenses";
--> statement-breakpoint
DELETE FROM "merchant_corrections";
--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "merchant_corrections" ALTER COLUMN "category_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "merchant_corrections" ADD CONSTRAINT "merchant_corrections_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_category_id_idx" ON "expenses" USING btree ("category_id");
