import { and, eq, gte, lte, sql, desc, count, sum } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { expenses, merchantCorrections, pendingReceipts } from "@/lib/db/schema";
import type { Expense, User } from "@/lib/db/schema";
import type { BudgetCategory } from "@/lib/budget-categories";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";
import { normalizeMerchant } from "@/lib/normalize";
import { canConvertToManual, type ReceiptStatus } from "@/lib/receipt-state";
import { expenseCreateSchema, expenseUpdateSchema } from "@/lib/validation";
import { categorizeExpense } from "@/lib/categorize";
import { deleteBlob } from "@/lib/blob";
import { z } from "zod";

export type ListExpensesFilters = {
  from?: string;
  to?: string;
  category?: BudgetCategory;
  status?: "draft" | "confirmed";
  page?: number;
  pageSize?: number;
};

async function loadCorrections() {
  const db = getDb();
  const correctionsRows = await db.select().from(merchantCorrections);
  return new Map(correctionsRows.map((r) => [r.merchantNormalized, r.category]));
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
  category: BudgetCategory,
): Promise<void> {
  const db = getDb();
  await db
    .insert(merchantCorrections)
    .values({ merchantNormalized, category })
    .onConflictDoUpdate({
      target: merchantCorrections.merchantNormalized,
      set: { category, updatedAt: new Date() },
    });
}

function buildListConditions(filters: ListExpensesFilters) {
  const status = filters.status ?? "confirmed";
  const conditions = [eq(expenses.status, status)];

  if (filters.from) {
    conditions.push(gte(expenses.expenseDate, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(expenses.expenseDate, filters.to));
  }
  if (filters.category) {
    conditions.push(eq(expenses.category, filters.category));
  }

  return and(...conditions);
}

export async function listExpenses(filters: ListExpensesFilters = {}) {
  const db = getDb();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const where = buildListConditions(filters);

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

export async function getCategoryTotals(filters: ListExpensesFilters = {}) {
  const db = getDb();
  const where = buildListConditions(filters);

  const rows = await db
    .select({
      category: expenses.category,
      sumCents: sum(expenses.amountCents),
    })
    .from(expenses)
    .where(where)
    .groupBy(expenses.category);

  const totals: Record<BudgetCategory, number> = {
    Needs: 0,
    Wants: 0,
    Savings: 0,
  };

  for (const row of rows) {
    totals[row.category] = Number(row.sumCents ?? 0);
  }

  return BUDGET_CATEGORIES.map((category) => ({
    category,
    sumCents: totals[category],
  }));
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
  const corrections = await loadCorrections();

  let category = parsed.category;
  let categoryWasAuto = input.categoryWasAuto ?? false;

  if (!category) {
    const result = categorizeExpense(
      { merchantNormalized, description: parsed.description },
      corrections,
    );
    category = result.category;
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
        category,
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
      category,
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
  if (parsed.category !== undefined) {
    updates.category = parsed.category;
    updates.categoryWasAuto = false;
    if (options?.learnCategory !== false) {
      await upsertMerchantCorrection(merchantNormalized, parsed.category);
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
    category: parsed.category ?? existing.category,
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
    category: merged.category,
    status: "confirmed",
    updatedAt: new Date(),
  };

  if (parsed.category && parsed.category !== existing.category) {
    updates.categoryWasAuto = false;
    await upsertMerchantCorrection(merchantNormalized, parsed.category);
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
  const corrections = await loadCorrections();

  const { category, categoryWasAuto } = categorizeExpense(
    { merchantNormalized, categoryHint: data.categoryHint },
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
      category,
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
