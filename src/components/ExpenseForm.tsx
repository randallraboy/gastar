"use client";

import { useEffect, useState } from "react";
import { formatCad, parseDollarInput, centsToDollars } from "@/lib/money";
import { CategoryPicker, formatCategoryPath } from "@/components/CategoryPicker";

export type ExpenseFormValues = {
  amountCents: number;
  expenseDate: string;
  merchant: string;
  description: string;
  categoryId: string;
};

type ExpenseFormProps = {
  initial?: Partial<Omit<ExpenseFormValues, "description">> & {
    description?: string | null;
    note?: string | null;
    categoryPath?: string[];
  };
  pendingReceiptId?: string;
  submitLabel?: string;
  onSubmit: (
    values: ExpenseFormValues & {
      overrideDuplicate?: boolean;
      pendingReceiptId?: string;
    },
  ) => Promise<void>;
  onCancel?: () => void;
};

export function ExpenseForm({
  initial,
  pendingReceiptId,
  submitLabel = "Save expense",
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState(
    initial?.amountCents ? centsToDollars(initial.amountCents).toFixed(2) : "",
  );
  const [expenseDate, setExpenseDate] = useState(
    initial?.expenseDate ?? new Date().toISOString().slice(0, 10),
  );
  const [merchant, setMerchant] = useState(initial?.merchant ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    initial?.categoryId ?? null,
  );
  const [categoryPath, setCategoryPath] = useState<string[]>(
    initial?.categoryPath ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial?.categoryId) setCategoryId(initial.categoryId);
    if (initial?.categoryPath) setCategoryPath(initial.categoryPath);
  }, [initial?.categoryId, initial?.categoryPath]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      let amountCents: number;
      try {
        amountCents = parseDollarInput(amount);
      } catch (err) {
        setFieldErrors({
          amount: err instanceof Error ? err.message : "Invalid amount",
        });
        return;
      }

      if (!merchant.trim()) {
        setFieldErrors({ merchant: "Merchant is required" });
        return;
      }

      if (expenseDate > new Date().toISOString().slice(0, 10)) {
        setFieldErrors({ expenseDate: "Expense date cannot be in the future" });
        return;
      }

      if (!categoryId) {
        setFieldErrors({ category: "Category is required" });
        return;
      }

      await onSubmit({
        amountCents,
        expenseDate,
        merchant: merchant.trim(),
        description: description.trim(),
        categoryId,
        pendingReceiptId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {initial?.note && (
        <div
          className="card"
          style={{
            marginBottom: "var(--space-4)",
            fontStyle: "italic",
            color: "var(--muted)",
          }}
        >
          Receipt note: “{initial.note}”
        </div>
      )}

      <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
        <label htmlFor="amount">Amount (CAD)</label>
        <input
          id="amount"
          className="input"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="12.34"
          required
        />
        {fieldErrors.amount && <span className="error">{fieldErrors.amount}</span>}
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
        <label htmlFor="expenseDate">Date</label>
        <input
          id="expenseDate"
          type="date"
          className="input"
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
          required
        />
        {fieldErrors.expenseDate && (
          <span className="error">{fieldErrors.expenseDate}</span>
        )}
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
        <label htmlFor="merchant">Merchant</label>
        <input
          id="merchant"
          className="input"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          required
        />
        {fieldErrors.merchant && <span className="error">{fieldErrors.merchant}</span>}
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
        <label htmlFor="description">Description (optional)</label>
        <input
          id="description"
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
        <span id="category-label">Category</span>
        {categoryPath.length > 0 && (
          <p className="muted" style={{ margin: "var(--space-1) 0" }}>
            Selected: {formatCategoryPath(categoryPath)}
          </p>
        )}
        <CategoryPicker
          value={categoryId}
          onChange={(id, path) => {
            setCategoryId(id);
            setCategoryPath(path);
          }}
        />
        {fieldErrors.category && <span className="error">{fieldErrors.category}</span>}
      </div>

      {error && <p className="error">{error}</p>}

      <div
        style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}
      >
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export { formatCad };
