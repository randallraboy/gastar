import { and, eq, gte, inArray, lte, sql, desc, count, sum } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { expenses, merchantCorrections, pendingReceipts } from "@/lib/db/schema";
import type { Expense, User } from "@/lib/db/schema";
import type { BudgetCategory } from "@/lib/budget-categories";
import { normalizeMerchant } from "@/lib/normalize";
import { canConvertToManual, type ReceiptStatus } from "@/lib/receipt-state";
import { expenseCreateSchema, expenseUpdateSchema } from "@/lib/validation";
import { categorizeExpense } from "@/lib/categorize";
import { deleteBlob } from "@/lib/blob";
import {
  buildCategoryTotals,
  getDescendantIds,
  indexCategories,
} from "@/lib/category-tree";
import { loadCategoryFlat, requireCategoryId } from "@/lib/categories";
import type { CategoryTotalNode } from "@/lib/category-tree";
import { z } from "zod";

export type ListExpensesFilters = {
  from?: string;
  to?: string;
  categoryId?: string;
  bucket?: BudgetCategory;
  status?: "draft" | "confirmed";
  page?: number;
  pageSize?: number;
};

async function loadCorrections(): Promise<Map<string, string>> {
  const db = getDb();
  const correctionsRows = await db.select().from(merchantCorrections);
  return new Map(correctionsRows.map((r) => [r.merchantNormalized, r.categoryId]));
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

async function buildListConditions(filters: ListExpensesFilters) {
  const status = filters.status ?? "confirmed";
  const conditions = [eq(expenses.status, status)];

  if (filters.from) {
    conditions.push(gte(expenses.expenseDate, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(expenses.expenseDate, filters.to));
  }

  if (filters.categoryId) {
    const flat = await loadCategoryFlat();
    const ids = [...getDescendantIds(filters.categoryId, flat)];
    conditions.push(inArray(expenses.categoryId, ids));
  } else if (filters.bucket) {
    const flat = await loadCategoryFlat();
    const bucketIds = flat.filter((c) => c.bucket === filters.bucket).map((c) => c.id);
    if (bucketIds.length > 0) {
      conditions.push(inArray(expenses.categoryId, bucketIds));
    }
  }

  return and(...conditions);
}

export async function listExpenses(filters: ListExpensesFilters = {}) {
  const db = getDb();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const where = await buildListConditions(filters);

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

export async function getCategoryTotals(
  filters: ListExpensesFilters = {},
): Promise<CategoryTotalNode[]> {
  const db = getDb();
  const where = await buildListConditions(filters);
  const flat = await loadCategoryFlat();

  const rows = await db
    .select({
      categoryId: expenses.categoryId,
      sumCents: sum(expenses.amountCents),
    })
    .from(expenses)
    .where(where)
    .groupBy(expenses.categoryId);

  const amounts = new Map<string, number>();
  for (const row of rows) {
    amounts.set(row.categoryId, Number(row.sumCents ?? 0));
  }

  return buildCategoryTotals(flat, amounts);
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
  const flat = await loadCategoryFlat();
  const corrections = await loadCorrections();

  let categoryId = parsed.categoryId;
  let categoryWasAuto = input.categoryWasAuto ?? false;

  if (!categoryId) {
    const result = categorizeExpense(
      { merchantNormalized, description: parsed.description },
      flat,
      corrections,
    );
    categoryId = result.categoryId;
    categoryWasAuto = result.categoryWasAuto;
  } else {
    await requireCategoryId(categoryId, flat);
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
        note: receipt.note ?? null,
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
  const flat = await loadCategoryFlat();

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
    await requireCategoryId(parsed.categoryId, flat);
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
  const flat = await loadCategoryFlat();
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

  if (!parsed.overrideDuplicate) {
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

  if (parsed.categoryId) {
    await requireCategoryId(parsed.categoryId, flat);
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
  note?: string | null,
) {
  const db = getDb();
  const merchantNormalized = normalizeMerchant(data.merchant);
  const flat = await loadCategoryFlat();
  const corrections = await loadCorrections();

  const { categoryId, categoryWasAuto } = categorizeExpense(
    { merchantNormalized, categoryHint: data.categoryHint },
    flat,
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
      note: note ?? null,
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

export async function getCategoryIndex() {
  const flat = await loadCategoryFlat();
  return indexCategories(flat);
}
