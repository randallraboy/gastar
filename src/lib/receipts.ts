import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pendingReceipts } from "@/lib/db/schema";
import type { PendingReceipt, User } from "@/lib/db/schema";
import { uploadStagingBlob, deleteBlob } from "@/lib/blob";
import { validateUploadFile } from "@/lib/validation";
import { canDiscardReceipt, type ReceiptStatus } from "@/lib/receipt-state";

export type CreatePendingReceiptResult = {
  receipt: PendingReceipt;
  created: boolean;
};

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes("unique") ||
      err.message.includes("duplicate key") ||
      (err as { code?: string }).code === "23505")
  );
}

export async function createPendingReceipt(
  user: User,
  file: File,
  clientKey?: string,
): Promise<CreatePendingReceiptResult> {
  const db = getDb();

  if (clientKey) {
    const [existing] = await db
      .select()
      .from(pendingReceipts)
      .where(eq(pendingReceipts.clientKey, clientKey))
      .limit(1);
    if (existing) {
      return { receipt: existing, created: false };
    }
  }

  const validationError = validateUploadFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "jpg";
  const blobKey = await uploadStagingBlob(
    `${user.id}-${Date.now()}.${ext}`,
    buffer,
    file.type,
  );

  try {
    const [receipt] = await db
      .insert(pendingReceipts)
      .values({
        blobKey,
        uploadedBy: user.id,
        clientKey: clientKey ?? null,
      })
      .returning();

    return { receipt, created: true };
  } catch (err) {
    if (clientKey && isUniqueViolation(err)) {
      const [existing] = await db
        .select()
        .from(pendingReceipts)
        .where(eq(pendingReceipts.clientKey, clientKey))
        .limit(1);
      if (existing) {
        try {
          await deleteBlob(blobKey);
        } catch {
          // best effort — orphaned blob acceptable on race
        }
        return { receipt: existing, created: false };
      }
    }
    throw err;
  }
}

export async function listReceiptsByStatus(
  status: "pending" | "processed" | "unreadable" | "converted",
): Promise<PendingReceipt[]> {
  const db = getDb();
  return db.select().from(pendingReceipts).where(eq(pendingReceipts.status, status));
}

export async function getReceiptById(id: string): Promise<PendingReceipt | null> {
  const db = getDb();
  const [receipt] = await db
    .select()
    .from(pendingReceipts)
    .where(eq(pendingReceipts.id, id))
    .limit(1);
  return receipt ?? null;
}

export async function markUnreadable(
  id: string,
  errorNote: string,
): Promise<PendingReceipt | null> {
  const db = getDb();
  const [updated] = await db
    .update(pendingReceipts)
    .set({
      status: "unreadable",
      errorNote,
      resolvedAt: new Date(),
    })
    .where(and(eq(pendingReceipts.id, id), eq(pendingReceipts.status, "pending")))
    .returning();
  return updated ?? null;
}

export type DeleteReceiptResult = "deleted" | "not_found" | "invalid_status";

export async function deleteReceipt(id: string): Promise<DeleteReceiptResult> {
  const db = getDb();
  const [receipt] = await db
    .select()
    .from(pendingReceipts)
    .where(eq(pendingReceipts.id, id))
    .limit(1);

  if (!receipt) {
    return "not_found";
  }

  if (!canDiscardReceipt(receipt.status as ReceiptStatus)) {
    return "invalid_status";
  }

  try {
    await deleteBlob(receipt.blobKey);
  } catch {
    // best effort
  }

  await db.delete(pendingReceipts).where(eq(pendingReceipts.id, id));
  return "deleted";
}
