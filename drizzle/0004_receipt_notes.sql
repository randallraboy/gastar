ALTER TABLE "pending_receipts" ADD COLUMN IF NOT EXISTS "note" text;
--> statement-breakpoint
ALTER TABLE "pending_receipts" ADD CONSTRAINT "pending_receipts_note_len" CHECK ("note" IS NULL OR char_length("note") <= 250);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "note" text;
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_note_len" CHECK ("note" IS NULL OR char_length("note") <= 250);
