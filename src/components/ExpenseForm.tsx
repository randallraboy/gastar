"use client";

import { useEffect, useState } from "react";
import { formatCad, parseDollarInput, centsToDollars } from "@/lib/money";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/budget-categories";

export type ExpenseFormValues = {
  amountCents: number;
  expenseDate: string;
  merchant: string;
  description: string;
  category: BudgetCategory;
};

type ExpenseFormProps = {
  initial?: Partial<Omit<ExpenseFormValues, "description">> & {
    description?: string | null;
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
  const [category, setCategory] = useState<BudgetCategory>(
    initial?.category ?? BUDGET_CATEGORIES[0],
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initial?.category) setCategory(initial.category);
  }, [initial?.category]);

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

      await onSubmit({
        amountCents,
        expenseDate,
        merchant: merchant.trim(),
        description: description.trim(),
        category,
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
        <label htmlFor="category">Category</label>
        <select
          id="category"
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value as BudgetCategory)}
          required
        >
          {BUDGET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
