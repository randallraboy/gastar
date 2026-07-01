import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pendingReceipts } from "@/lib/db/schema";
import type { PendingReceipt, User } from "@/lib/db/schema";
import { uploadStagingBlob, deleteBlob } from "@/lib/blob";
import { validateUploadFile } from "@/lib/validation";

export async function createPendingReceipt(
  user: User,
  file: File,
): Promise<PendingReceipt> {
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

  const db = getDb();
  const [receipt] = await db
    .insert(pendingReceipts)
    .values({
      blobKey,
      uploadedBy: user.id,
    })
    .returning();

  return receipt;
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

export async function deleteReceipt(id: string): Promise<boolean> {
  const db = getDb();
  const [receipt] = await db
    .select()
    .from(pendingReceipts)
    .where(eq(pendingReceipts.id, id))
    .limit(1);

  if (!receipt) {
    return false;
  }

  try {
    await deleteBlob(receipt.blobKey);
  } catch {
    // best effort
  }

  await db.delete(pendingReceipts).where(eq(pendingReceipts.id, id));
  return true;
}
