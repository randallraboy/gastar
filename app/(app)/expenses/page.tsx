"use client";

import { useCallback, useEffect, useState } from "react";
import { ExpenseForm, formatCad } from "@/components/ExpenseForm";
import { formatCategoryPath } from "@/components/CategoryPicker";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/budget-categories";

type Expense = {
  id: string;
  amountCents: number;
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
  receiptImageUrl: string | null;
};

type CategoryTotal = {
  categoryId: string;
  name: string;
  bucket: BudgetCategory;
  depth: number;
  sumCents: number;
  children: CategoryTotal[];
};

type ListResponse = {
  items: Expense[];
  total: number;
  sumCents: number;
  categoryTotals: CategoryTotal[];
};

function CategoryBreakdown({
  nodes,
  expanded,
  onToggle,
}: {
  nodes: CategoryTotal[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <ul className="category-breakdown">
      {nodes.map((node) => (
        <li key={node.categoryId}>
          <div className="category-breakdown-row">
            {node.children.length > 0 ? (
              <button
                type="button"
                className="btn btn-compact"
                onClick={() => onToggle(node.categoryId)}
                aria-expanded={expanded.has(node.categoryId)}
              >
                {expanded.has(node.categoryId) ? "−" : "+"}
              </button>
            ) : (
              <span className="category-breakdown-spacer" />
            )}
            <span>{node.name}</span>
            <strong>{formatCad(node.sumCents)}</strong>
          </div>
          {node.children.length > 0 && expanded.has(node.categoryId) && (
            <CategoryBreakdown
              nodes={node.children}
              expanded={expanded}
              onToggle={onToggle}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drafts, setDrafts] = useState<Expense[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [sumCents, setSumCents] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bucketFilter, setBucketFilter] = useState<BudgetCategory | "">("");
  const [categoryIdFilter, setCategoryIdFilter] = useState("");
  const [expandedBuckets, setExpandedBuckets] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirmingDraft, setConfirmingDraft] = useState<Expense | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<Expense | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: "confirmed" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (bucketFilter) params.set("bucket", bucketFilter);
    if (categoryIdFilter) params.set("categoryId", categoryIdFilter);

    const [confirmedRes, draftsRes] = await Promise.all([
      fetch(`/api/expenses?${params}`),
      fetch("/api/expenses?status=draft"),
    ]);

    const confirmed: ListResponse = await confirmedRes.json();
    const draftData: ListResponse = await draftsRes.json();

    setExpenses(confirmed.items);
    setSumCents(confirmed.sumCents);
    setCategoryTotals(confirmed.categoryTotals);
    setDrafts(draftData.items);
    setLoading(false);
  }, [from, to, bucketFilter, categoryIdFilter]);

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

  function toggleExpanded(id: string) {
    setExpandedBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderCategoryBadges(expense: Expense) {
    return (
      <>
        <span className="badge">{formatCategoryPath(expense.categoryPath)}</span>
        {expense.categoryWasAuto && (
          <span className="badge" style={{ marginLeft: "var(--space-2)" }}>
            auto
          </span>
        )}
        {expense.categoryWasAuto && !expense.subcategoryResolved && (
          <span className="badge badge-warn" style={{ marginLeft: "var(--space-2)" }}>
            Bucket only
          </span>
        )}
      </>
    );
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
                  <p className="muted">{formatCategoryPath(draft.categoryPath)}</p>
                  {draft.note && (
                    <p className="muted" style={{ fontStyle: "italic" }}>
                      Note: “{draft.note}”
                    </p>
                  )}
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

      <section style={{ marginBottom: "var(--space-5)" }}>
        <h2>Spending by category</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "var(--space-3)",
          }}
        >
          {categoryTotals.map((bucket) => (
            <div key={bucket.categoryId} className="card">
              <div style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                {bucket.name}
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
                {formatCad(bucket.sumCents)}
              </div>
              {bucket.children.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-compact"
                    style={{ marginTop: "var(--space-2)" }}
                    onClick={() => toggleExpanded(bucket.categoryId)}
                  >
                    {expandedBuckets.has(bucket.categoryId) ? "Hide" : "Show"} breakdown
                  </button>
                  {expandedBuckets.has(bucket.categoryId) && (
                    <CategoryBreakdown
                      nodes={bucket.children}
                      expanded={expandedBuckets}
                      onToggle={toggleExpanded}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

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
          <label htmlFor="bucketFilter">Bucket</label>
          <select
            id="bucketFilter"
            className="input"
            value={bucketFilter}
            onChange={(e) => {
              setBucketFilter(e.target.value as BudgetCategory | "");
              setCategoryIdFilter("");
            }}
          >
            <option value="">All</option>
            {BUDGET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="categoryIdFilter">Subcategory ID</label>
          <input
            id="categoryIdFilter"
            className="input"
            placeholder="Filter by category node"
            value={categoryIdFilter}
            onChange={(e) => setCategoryIdFilter(e.target.value)}
          />
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
                  <td>
                    {expense.description ?? "—"}
                    {expense.note && (
                      <span
                        className="muted"
                        style={{
                          display: "block",
                          fontStyle: "italic",
                          fontSize: "0.8125rem",
                        }}
                      >
                        Note: “{expense.note}”
                      </span>
                    )}
                  </td>
                  <td>{renderCategoryBadges(expense)}</td>
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
                <div>{renderCategoryBadges(expense)}</div>
                {expense.description && (
                  <p className="expense-card-meta">{expense.description}</p>
                )}
                {expense.note && (
                  <p className="expense-card-meta" style={{ fontStyle: "italic" }}>
                    Note: “{expense.note}”
                  </p>
                )}
                <div className="expense-card-actions">
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
