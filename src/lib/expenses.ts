import { and, eq, gte, lte, sql, desc, count, sum } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  expenses,
  categories,
  merchantCorrections,
  pendingReceipts,
} from "@/lib/db/schema";
import type { Expense, User } from "@/lib/db/schema";
import { normalizeMerchant } from "@/lib/normalize";
import { canConvertToManual, type ReceiptStatus } from "@/lib/receipt-state";
import { expenseCreateSchema, expenseUpdateSchema } from "@/lib/validation";
import { categorizeExpense, getUncategorizedId } from "@/lib/categorize";
import { deleteBlob } from "@/lib/blob";
import { z } from "zod";

export type ListExpensesFilters = {
  from?: string;
  to?: string;
  categoryId?: string;
  status?: "draft" | "confirmed";
  page?: number;
  pageSize?: number;
};

async function loadCategorizationContext() {
  const db = getDb();
  const allCategories = await db.select().from(categories);
  const correctionsRows = await db.select().from(merchantCorrections);
  const corrections = new Map(
    correctionsRows.map((r) => [r.merchantNormalized, r.categoryId]),
  );
  return { allCategories, corrections };
}

export async function findDuplicate(
  expenseDate: string,
  amountCents: number,
  merchantNormalized: string,
  excludeId?: string,
): Promise<Expense | null> {
  const db = getDb();
  const conditions = [
    eq(expenses.expenseDate, expenseDate),
    eq(expenses.amountCents, amountCents),
    eq(expenses.merchantNormalized, merchantNormalized),
    eq(expenses.status, "confirmed"),
  ];

  if (excludeId) {
    conditions.push(sql`${expenses.id} != ${excludeId}`);
  }

  const [match] = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .limit(1);

  return match ?? null;
}

export async function upsertMerchantCorrection(
  merchantNormalized: string,
  categoryId: string,
): Promise<void> {
  const db = getDb();
  await db
    .insert(merchantCorrections)
    .values({ merchantNormalized, categoryId })
    .onConflictDoUpdate({
      target: merchantCorrections.merchantNormalized,
      set: { categoryId, updatedAt: new Date() },
    });
}

export async function listExpenses(filters: ListExpensesFilters = {}) {
  const db = getDb();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const status = filters.status ?? "confirmed";

  const conditions = [eq(expenses.status, status)];

  if (filters.from) {
    conditions.push(gte(expenses.expenseDate, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(expenses.expenseDate, filters.to));
  }
  if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }

  const where = and(...conditions);

  const [items, [{ total }], [{ sumCents }]] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(where)
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(expenses).where(where),
    db
      .select({ sumCents: sum(expenses.amountCents) })
      .from(expenses)
      .where(where),
  ]);

  return {
    items,
    total: Number(total),
    sumCents: Number(sumCents ?? 0),
  };
}

export type CreateExpenseInput = z.infer<typeof expenseCreateSchema> & {
  source?: "manual" | "photo";
  status?: "draft" | "confirmed";
  receiptBlobKey?: string | null;
  categoryWasAuto?: boolean;
};

export async function createExpense(user: User, input: CreateExpenseInput) {
  const parsed = expenseCreateSchema.parse(input);
  const db = getDb();
  const merchantNormalized = normalizeMerchant(parsed.merchant);
  const { allCategories, corrections } = await loadCategorizationContext();

  let categoryId = parsed.categoryId;
  let categoryWasAuto = input.categoryWasAuto ?? false;

  if (!categoryId) {
    const result = categorizeExpense(
      { merchantNormalized, description: parsed.description },
      allCategories,
      corrections,
    );
    categoryId = result.categoryId;
    categoryWasAuto = result.categoryWasAuto;
  }

  if (!parsed.overrideDuplicate) {
    const duplicate = await findDuplicate(
      parsed.expenseDate,
      parsed.amountCents,
      merchantNormalized,
    );
    if (duplicate) {
      return { duplicate };
    }
  }

  if (parsed.pendingReceiptId) {
    const [receipt] = await db
      .select()
      .from(pendingReceipts)
      .where(eq(pendingReceipts.id, parsed.pendingReceiptId))
      .limit(1);

    if (!receipt || !canConvertToManual(receipt.status as ReceiptStatus)) {
      throw new Error("Pending receipt not found");
    }

    const [created] = await db
      .insert(expenses)
      .values({
        amountCents: parsed.amountCents,
        expenseDate: parsed.expenseDate,
        merchant: parsed.merchant,
        merchantNormalized,
        description: parsed.description ?? null,
        categoryId,
        status: "confirmed",
        source: "manual",
        receiptBlobKey: receipt.blobKey,
        categoryWasAuto,
        createdBy: user.id,
      })
      .returning();

    await db.delete(pendingReceipts).where(eq(pendingReceipts.id, receipt.id));

    return { expense: created };
  }

  const [created] = await db
    .insert(expenses)
    .values({
      amountCents: parsed.amountCents,
      expenseDate: parsed.expenseDate,
      merchant: parsed.merchant,
      merchantNormalized,
      description: parsed.description ?? null,
      categoryId,
      status: input.status ?? "confirmed",
      source: input.source ?? "manual",
      receiptBlobKey: input.receiptBlobKey ?? null,
      categoryWasAuto,
      createdBy: user.id,
    })
    .returning();

  return { expense: created };
}

export async function updateExpense(
  id: string,
  input: z.infer<typeof expenseUpdateSchema>,
  options?: { learnCategory?: boolean },
) {
  const parsed = expenseUpdateSchema.parse(input);
  const db = getDb();

  const [existing] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  if (!existing) {
    return null;
  }

  const merchantNormalized = parsed.merchant
    ? normalizeMerchant(parsed.merchant)
    : existing.merchantNormalized;

  const updates: Partial<typeof expenses.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.amountCents !== undefined) updates.amountCents = parsed.amountCents;
  if (parsed.expenseDate !== undefined) updates.expenseDate = parsed.expenseDate;
  if (parsed.merchant !== undefined) {
    updates.merchant = parsed.merchant;
    updates.merchantNormalized = merchantNormalized;
  }
  if (parsed.description !== undefined) updates.description = parsed.description;
  if (parsed.categoryId !== undefined) {
    updates.categoryId = parsed.categoryId;
    updates.categoryWasAuto = false;
    if (options?.learnCategory !== false) {
      await upsertMerchantCorrection(merchantNormalized, parsed.categoryId);
    }
  }

  const [updated] = await db
    .update(expenses)
    .set(updates)
    .where(eq(expenses.id, id))
    .returning();

  return updated;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  if (!existing) {
    return false;
  }

  if (existing.receiptBlobKey) {
    try {
      await deleteBlob(existing.receiptBlobKey);
    } catch {
      // blob may already be gone
    }
  }

  if (existing.status === "draft") {
    await db.delete(pendingReceipts).where(eq(pendingReceipts.draftExpenseId, id));
  }

  await db.delete(expenses).where(eq(expenses.id, id));
  return true;
}

export async function confirmExpense(
  id: string,
  _user: User,
  input: z.infer<typeof expenseUpdateSchema> = {},
) {
  const parsed = expenseUpdateSchema.parse(input);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  if (!existing || existing.status !== "draft") {
    return { error: "NOT_DRAFT" as const };
  }

  const merged = {
    amountCents: parsed.amountCents ?? existing.amountCents,
    expenseDate: parsed.expenseDate ?? existing.expenseDate,
    merchant: parsed.merchant ?? existing.merchant,
    description: parsed.description ?? existing.description,
    categoryId: parsed.categoryId ?? existing.categoryId,
    overrideDuplicate: parsed.overrideDuplicate,
  };

  const merchantNormalized = normalizeMerchant(merged.merchant);

  if (!merged.overrideDuplicate) {
    const duplicate = await findDuplicate(
      merged.expenseDate,
      merged.amountCents,
      merchantNormalized,
      id,
    );
    if (duplicate) {
      return { duplicate };
    }
  }

  const updates: Partial<typeof expenses.$inferInsert> = {
    amountCents: merged.amountCents,
    expenseDate: merged.expenseDate,
    merchant: merged.merchant,
    merchantNormalized,
    description: merged.description,
    categoryId: merged.categoryId,
    status: "confirmed",
    updatedAt: new Date(),
  };

  if (parsed.categoryId && parsed.categoryId !== existing.categoryId) {
    updates.categoryWasAuto = false;
    await upsertMerchantCorrection(merchantNormalized, parsed.categoryId);
  }

  const [confirmed] = await db
    .update(expenses)
    .set(updates)
    .where(eq(expenses.id, id))
    .returning();

  const [receipt] = await db
    .select()
    .from(pendingReceipts)
    .where(eq(pendingReceipts.draftExpenseId, id))
    .limit(1);

  if (receipt) {
    await db.delete(pendingReceipts).where(eq(pendingReceipts.id, receipt.id));
  }

  return { expense: confirmed };
}

export async function createDraftFromHarness(
  user: User,
  receiptId: string,
  data: {
    amountCents: number;
    expenseDate: string;
    merchant: string;
    categoryHint?: string;
  },
  blobKey: string,
) {
  const db = getDb();
  const merchantNormalized = normalizeMerchant(data.merchant);
  const { allCategories, corrections } = await loadCategorizationContext();

  const { categoryId, categoryWasAuto } = categorizeExpense(
    { merchantNormalized, categoryHint: data.categoryHint },
    allCategories,
    corrections,
  );

  const [draft] = await db
    .insert(expenses)
    .values({
      amountCents: data.amountCents,
      expenseDate: data.expenseDate,
      merchant: data.merchant,
      merchantNormalized,
      description: null,
      categoryId,
      status: "draft",
      source: "photo",
      receiptBlobKey: blobKey,
      categoryWasAuto,
      createdBy: user.id,
    })
    .returning();

  await db
    .update(pendingReceipts)
    .set({
      status: "processed",
      draftExpenseId: draft.id,
      resolvedAt: new Date(),
    })
    .where(eq(pendingReceipts.id, receiptId));

  return draft;
}

export async function getExpenseById(id: string) {
  const db = getDb();
  const [expense] = await db
    .select()
    .from(expenses)
    .where(eq(expenses.id, id))
    .limit(1);
  return expense ?? null;
}

export { getUncategorizedId };
