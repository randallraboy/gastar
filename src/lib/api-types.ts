import type { Expense } from "@/lib/db/schema";
import type { BudgetCategory } from "@/lib/budget-categories";
import type { CategoryFlat, CategoryTotalNode } from "@/lib/category-tree";
import { getCategoryPath, subcategoryResolved } from "@/lib/category-tree";

export type ExpenseDto = {
  id: string;
  amountCents: number;
  currency: "CAD";
  expenseDate: string;
  merchant: string;
  description: string | null;
  note: string | null;
  categoryId: string;
  categoryPath: string[];
  bucket: BudgetCategory;
  categoryWasAuto: boolean;
  subcategoryResolved: boolean;
  status: "draft" | "confirmed";
  source: "manual" | "photo";
  receiptImageUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryNodeDto = CategoryFlat & {
  children?: CategoryNodeDto[];
};

export type PendingReceiptDto = {
  id: string;
  status: "pending" | "processed" | "unreadable" | "converted";
  imageUrl: string;
  errorNote: string | null;
  note: string | null;
  draftExpenseId: string | null;
  uploadedBy: string;
  uploadedAt: string;
};

export function toExpenseDto(
  expense: Expense,
  byId: Map<string, CategoryFlat>,
): ExpenseDto {
  const node = byId.get(expense.categoryId);
  const bucket = node?.bucket ?? "Needs";
  return {
    id: expense.id,
    amountCents: expense.amountCents,
    currency: expense.currency as "CAD",
    expenseDate: expense.expenseDate,
    merchant: expense.merchant,
    description: expense.description,
    note: expense.note,
    categoryId: expense.categoryId,
    categoryPath: getCategoryPath(expense.categoryId, byId),
    bucket,
    categoryWasAuto: expense.categoryWasAuto,
    subcategoryResolved: subcategoryResolved(expense.categoryId, byId),
    status: expense.status as "draft" | "confirmed",
    source: expense.source as "manual" | "photo",
    receiptImageUrl: expense.receiptBlobKey
      ? `/api/expenses/${expense.id}/receipt`
      : null,
    createdBy: expense.createdBy,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export function toPendingReceiptDto(receipt: {
  id: string;
  status: string;
  errorNote: string | null;
  note: string | null;
  draftExpenseId: string | null;
  uploadedBy: string;
  uploadedAt: Date;
}): PendingReceiptDto {
  return {
    id: receipt.id,
    status: receipt.status as PendingReceiptDto["status"],
    imageUrl: `/api/receipts/${receipt.id}/image`,
    errorNote: receipt.errorNote,
    note: receipt.note,
    draftExpenseId: receipt.draftExpenseId,
    uploadedBy: receipt.uploadedBy,
    uploadedAt: receipt.uploadedAt.toISOString(),
  };
}

export type { CategoryTotalNode };
