"use client";

import { useCallback, useEffect, useState } from "react";
import { ExpenseForm, formatCad, type CategoryOption } from "@/components/ExpenseForm";

type Expense = {
  id: string;
  amountCents: number;
  expenseDate: string;
  merchant: string;
  description: string | null;
  categoryId: string;
  categoryWasAuto: boolean;
  status: "draft" | "confirmed";
  receiptImageUrl: string | null;
};

type ListResponse = {
  items: Expense[];
  total: number;
  sumCents: number;
};

function categoryName(categories: CategoryOption[], id: string) {
  return categories.find((c) => c.id === id)?.name ?? "—";
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drafts, setDrafts] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [sumCents, setSumCents] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirmingDraft, setConfirmingDraft] = useState<Expense | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<Expense | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: "confirmed" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (categoryFilter) params.set("categoryId", categoryFilter);

    const [confirmedRes, draftsRes] = await Promise.all([
      fetch(`/api/expenses?${params}`),
      fetch("/api/expenses?status=draft"),
    ]);

    const confirmed: ListResponse = await confirmedRes.json();
    const draftData: ListResponse = await draftsRes.json();

    setExpenses(confirmed.items);
    setSumCents(confirmed.sumCents);
    setDrafts(draftData.items);
    setLoading(false);
  }, [from, to, categoryFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  async function saveExpense(
    values: {
      amountCents: number;
      expenseDate: string;
      merchant: string;
      description: string;
      categoryId: string;
      overrideDuplicate?: boolean;
      pendingReceiptId?: string;
    },
    mode: "create" | "edit" | "confirm",
    expenseId?: string,
  ) {
    const body = {
      amountCents: values.amountCents,
      expenseDate: values.expenseDate,
      merchant: values.merchant,
      description: values.description || null,
      categoryId: values.categoryId,
      overrideDuplicate: values.overrideDuplicate,
      pendingReceiptId: values.pendingReceiptId,
    };

    let res: Response;
    if (mode === "create") {
      res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else if (mode === "edit" && expenseId) {
      res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else if (mode === "confirm" && expenseId) {
      res = await fetch(`/api/expenses/${expenseId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      return;
    }

    if (res.status === 409) {
      const data = await res.json();
      setDuplicateWarning(data.duplicateOf);
      setPendingSubmit({ values, mode, expenseId });
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message ?? "Failed to save expense");
    }

    setShowForm(false);
    setEditing(null);
    setConfirmingDraft(null);
    setDuplicateWarning(null);
    setPendingSubmit(null);
    await loadExpenses();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    await loadExpenses();
  }

  async function quickCategoryChange(expense: Expense, categoryId: string) {
    await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    await loadExpenses();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Expenses</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditing(null);
          }}
        >
          Add expense
        </button>
      </div>

      {drafts.length > 0 && (
        <section style={{ marginBottom: "var(--space-6)" }}>
          <h2>Drafts from receipts</h2>
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="card"
              style={{ marginBottom: "var(--space-4)" }}
            >
              <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
                {draft.receiptImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={draft.receiptImageUrl}
                    alt="Receipt"
                    className="capture-preview"
                    style={{ maxWidth: 200, maxHeight: 200 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 240 }}>
                  <p>
                    <strong>{draft.merchant}</strong> — {formatCad(draft.amountCents)}{" "}
                    on {draft.expenseDate}
                  </p>
                  <div className="expense-card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => setConfirmingDraft(draft)}
                    >
                      Review & confirm
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteExpense(draft.id)}
                    >
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="toolbar">
        <div className="form-group">
          <label htmlFor="from">From</label>
          <input
            id="from"
            type="date"
            className="input"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="to">To</label>
          <input
            id="to"
            type="date"
            className="input"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="categoryFilter">Category</label>
          <select
            id="categoryFilter"
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="filtered-total filtered-total-sticky">
        <strong>Filtered total:</strong> {formatCad(sumCents)}
      </p>

      {loading ? (
        <p className="empty">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="empty">No expenses yet. Add your first one!</p>
      ) : (
        <>
          <table className="expense-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Merchant</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.expenseDate}</td>
                  <td>{expense.merchant}</td>
                  <td>{expense.description ?? "—"}</td>
                  <td>
                    <select
                      className="input"
                      value={expense.categoryId}
                      onChange={(e) => quickCategoryChange(expense, e.target.value)}
                      style={{ width: "auto" }}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {expense.categoryWasAuto && <span className="badge">auto</span>}
                  </td>
                  <td>{formatCad(expense.amountCents)}</td>
                  <td>
                    {expense.receiptImageUrl && (
                      <button
                        className="btn"
                        style={{ marginRight: "var(--space-1)" }}
                        onClick={() => setViewingReceipt(expense)}
                      >
                        Receipt
                      </button>
                    )}
                    <button
                      className="btn"
                      onClick={() => {
                        setEditing(expense);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ marginLeft: "var(--space-1)" }}
                      onClick={() => deleteExpense(expense.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="card-list">
            {expenses.map((expense) => (
              <div key={expense.id} className="card expense-card">
                <div className="expense-card-amount">
                  {formatCad(expense.amountCents)}
                </div>
                <div>
                  <strong>{expense.merchant}</strong>
                </div>
                <div className="expense-card-meta">{expense.expenseDate}</div>
                <div>
                  <span className="badge">
                    {categoryName(categories, expense.categoryId)}
                  </span>
                  {expense.categoryWasAuto && (
                    <span className="badge" style={{ marginLeft: "var(--space-2)" }}>
                      auto
                    </span>
                  )}
                </div>
                {expense.description && (
                  <p className="expense-card-meta">{expense.description}</p>
                )}
                <div className="expense-card-actions">
                  <select
                    className="input"
                    value={expense.categoryId}
                    onChange={(e) => quickCategoryChange(expense, e.target.value)}
                    aria-label={`Category for ${expense.merchant}`}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {expense.receiptImageUrl && (
                    <button className="btn" onClick={() => setViewingReceipt(expense)}>
                      Receipt
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={() => {
                      setEditing(expense);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteExpense(expense.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {(showForm || editing) && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{editing ? "Edit expense" : "New expense"}</h2>
            {editing?.receiptImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={editing.receiptImageUrl}
                alt="Receipt"
                className="capture-preview"
              />
            )}
            <ExpenseForm
              categories={categories}
              initial={editing ?? undefined}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
              onSubmit={(values) =>
                saveExpense(values, editing ? "edit" : "create", editing?.id)
              }
            />
          </div>
        </div>
      )}

      {confirmingDraft && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Confirm draft expense</h2>
            {confirmingDraft.receiptImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={confirmingDraft.receiptImageUrl}
                alt="Receipt"
                className="capture-preview"
              />
            )}
            <ExpenseForm
              categories={categories}
              initial={confirmingDraft}
              submitLabel="Confirm expense"
              onCancel={() => setConfirmingDraft(null)}
              onSubmit={(values) => saveExpense(values, "confirm", confirmingDraft.id)}
            />
          </div>
        </div>
      )}

      {viewingReceipt?.receiptImageUrl && (
        <div className="modal-backdrop" onClick={() => setViewingReceipt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Receipt — {viewingReceipt.merchant}</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewingReceipt.receiptImageUrl}
              alt={`Receipt for ${viewingReceipt.merchant}`}
              className="capture-preview"
            />
            <button className="btn btn-block" onClick={() => setViewingReceipt(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {duplicateWarning && pendingSubmit && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Duplicate expense</h2>
            <p>
              An expense with the same date, amount, and merchant already exists (
              {duplicateWarning.merchant}, {formatCad(duplicateWarning.amountCents)} on{" "}
              {duplicateWarning.expenseDate}).
            </p>
            <div className="expense-card-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const { values, mode, expenseId } = pendingSubmit as {
                    values: Parameters<typeof saveExpense>[0];
                    mode: "create" | "edit" | "confirm";
                    expenseId?: string;
                  };
                  saveExpense({ ...values, overrideDuplicate: true }, mode, expenseId);
                }}
              >
                Save anyway
              </button>
              <button
                className="btn"
                onClick={() => {
                  setDuplicateWarning(null);
                  setPendingSubmit(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
