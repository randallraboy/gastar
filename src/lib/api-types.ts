import type { Expense, Category } from "@/lib/db/schema";

export type ExpenseDto = {
  id: string;
  amountCents: number;
  currency: "CAD";
  expenseDate: string;
  merchant: string;
  description: string | null;
  categoryId: string;
  categoryWasAuto: boolean;
  status: "draft" | "confirmed";
  source: "manual" | "photo";
  receiptImageUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryDto = {
  id: string;
  name: string;
  isSystem: boolean;
  keywords: string[];
};

export type PendingReceiptDto = {
  id: string;
  status: "pending" | "processed" | "unreadable" | "converted";
  imageUrl: string;
  errorNote: string | null;
  draftExpenseId: string | null;
  uploadedBy: string;
  uploadedAt: string;
};

export function toExpenseDto(expense: Expense): ExpenseDto {
  return {
    id: expense.id,
    amountCents: expense.amountCents,
    currency: expense.currency as "CAD",
    expenseDate: expense.expenseDate,
    merchant: expense.merchant,
    description: expense.description,
    categoryId: expense.categoryId,
    categoryWasAuto: expense.categoryWasAuto,
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

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    isSystem: category.isSystem,
    keywords: category.keywords,
  };
}

export function toPendingReceiptDto(receipt: {
  id: string;
  status: string;
  errorNote: string | null;
  draftExpenseId: string | null;
  uploadedBy: string;
  uploadedAt: Date;
}): PendingReceiptDto {
  return {
    id: receipt.id,
    status: receipt.status as PendingReceiptDto["status"],
    imageUrl: `/api/receipts/${receipt.id}/image`,
    errorNote: receipt.errorNote,
    draftExpenseId: receipt.draftExpenseId,
    uploadedBy: receipt.uploadedBy,
    uploadedAt: receipt.uploadedAt.toISOString(),
  };
}
