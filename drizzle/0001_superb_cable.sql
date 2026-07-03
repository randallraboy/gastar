ALTER TABLE "pending_receipts" ADD COLUMN IF NOT EXISTS "client_key" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_receipts_client_key_idx" ON "pending_receipts" USING btree ("client_key");
