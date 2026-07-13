"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  faChartLine,
  faChartPie,
  faCheck,
  faMinus,
  faPen,
  faPlus,
  faReceipt,
  faTableList,
  faTrash,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { ExpenseForm, formatCad } from "@/components/ExpenseForm";
import { formatCategoryPath } from "@/components/CategoryPicker";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { TrendChart } from "@/components/charts/TrendChart";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { toCategorySlices, toTrendSeries } from "@/lib/chart-data";
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

const BUCKET_EMOJI: Record<BudgetCategory, string> = {
  Needs: "🧾",
  Wants: "🛍️",
  Savings: "🐷",
};

const BUCKET_BADGE: Record<BudgetCategory, string> = {
  Needs: "badge badge-accent-needs",
  Wants: "badge badge-accent-wants",
  Savings: "badge badge-accent-savings",
};

const BUCKET_STAT: Record<BudgetCategory, string> = {
  Needs: "stat-card stat-card-needs",
  Wants: "stat-card stat-card-wants",
  Savings: "stat-card stat-card-savings",
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
                className="btn btn-compact btn-icon"
                onClick={() => onToggle(node.categoryId)}
                aria-expanded={expanded.has(node.categoryId)}
                aria-label={
                  expanded.has(node.categoryId)
                    ? `Collapse ${node.name}`
                    : `Expand ${node.name}`
                }
              >
                <Icon name={expanded.has(node.categoryId) ? faMinus : faPlus} />
              </button>
            ) : (
              <span className="category-breakdown-spacer" />
            )}
            <span style={{ flex: 1 }}>{node.name}</span>
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { notify } = useToast();
  const confirm = useConfirm();

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ status: "confirmed" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (bucketFilter) params.set("bucket", bucketFilter);
    if (categoryIdFilter) params.set("categoryId", categoryIdFilter);

    try {
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
    } catch {
      notify({ kind: "error", message: "Could not load expenses. Please retry." });
    } finally {
      setLoading(false);
    }
  }, [from, to, bucketFilter, categoryIdFilter, notify]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const trendData = useMemo(
    () =>
      toTrendSeries(
        expenses.map((e) => ({
          expenseDate: e.expenseDate,
          amountCents: e.amountCents,
        })),
        { from: from || undefined, to: to || undefined },
      ),
    [expenses, from, to],
  );

  const breakdownData = useMemo(
    () =>
      toCategorySlices(
        categoryTotals.map((c) => ({
          categoryId: c.categoryId,
          name: c.name,
          bucket: c.bucket,
          sumCents: c.sumCents,
        })),
      ),
    [categoryTotals],
  );

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
    notify({
      kind: "success",
      message: mode === "edit" ? "Expense updated" : "Expense saved",
    });
    await loadExpenses();
  }

  async function deleteExpense(id: string) {
    const ok = await confirm({
      title: "Delete this expense?",
      message: "This permanently removes the expense from your records.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        notify({ kind: "error", message: "Could not delete expense." });
        return;
      }
      notify({ kind: "success", message: "Expense deleted" });
      await loadExpenses();
    } finally {
      setDeletingId(null);
    }
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
        <span className={BUCKET_BADGE[expense.bucket]}>
          <span aria-hidden="true">{BUCKET_EMOJI[expense.bucket]}</span>
          {formatCategoryPath(expense.categoryPath)}
        </span>
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
        <h1>
          <Icon name={faTableList} />
          Expenses
        </h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditing(null);
          }}
        >
          <Icon name={faPlus} />
          Add expense
        </button>
      </div>

      {drafts.length > 0 && (
        <section className="section">
          <h2 className="section-title">
            <Icon name={faReceipt} />
            Drafts from receipts
          </h2>
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
                      <Icon name={faCheck} />
                      Review &amp; confirm
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={deletingId === draft.id}
                      onClick={() => deleteExpense(draft.id)}
                    >
                      <Icon name={faTrash} />
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="chart-grid">
        <div className="chart-card">
          <h3>
            <Icon name={faChartLine} />
            Spending over time
          </h3>
          {loading ? <Skeleton variant="chart" /> : <TrendChart data={trendData} />}
        </div>
        <div className="chart-card">
          <h3>
            <Icon name={faChartPie} />
            Category breakdown
          </h3>
          {loading ? (
            <Skeleton variant="chart" />
          ) : (
            <CategoryBreakdownChart data={breakdownData} />
          )}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">
          <Icon name={faWallet} />
          Spending by bucket
        </h2>
        <div className="stat-grid">
          {categoryTotals.map((bucket) => (
            <div key={bucket.categoryId} className={BUCKET_STAT[bucket.bucket]}>
              <div className="stat-label">
                <span aria-hidden="true">{BUCKET_EMOJI[bucket.bucket] ?? "📊"}</span>
                {bucket.name}
              </div>
              <div className="stat-value">{formatCad(bucket.sumCents)}</div>
              {bucket.children.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-compact btn-ghost"
                    style={{ marginTop: "var(--space-2)" }}
                    onClick={() => toggleExpanded(bucket.categoryId)}
                  >
                    <Icon
                      name={expandedBuckets.has(bucket.categoryId) ? faMinus : faPlus}
                    />
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
        <Icon name={faWallet} />
        <strong>Filtered total:</strong> {formatCad(sumCents)}
      </p>

      {loading ? (
        <div className="card">
          <Skeleton variant="text" count={5} />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={faTableList}
          title="No expenses yet"
          description="Add your first expense, or capture a receipt to generate one automatically."
          action={
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm(true);
                setEditing(null);
              }}
            >
              <Icon name={faPlus} />
              Add expense
            </button>
          }
        />
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
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      {expense.receiptImageUrl && (
                        <button
                          className="btn btn-compact btn-ghost"
                          aria-label={`View receipt for ${expense.merchant}`}
                          onClick={() => setViewingReceipt(expense)}
                        >
                          <Icon name={faReceipt} />
                        </button>
                      )}
                      <button
                        className="btn btn-compact btn-ghost"
                        aria-label={`Edit ${expense.merchant}`}
                        onClick={() => {
                          setEditing(expense);
                          setShowForm(true);
                        }}
                      >
                        <Icon name={faPen} />
                      </button>
                      <button
                        className="btn btn-compact btn-danger"
                        aria-label={`Delete ${expense.merchant}`}
                        disabled={deletingId === expense.id}
                        onClick={() => deleteExpense(expense.id)}
                      >
                        <Icon name={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="card-list">
            {expenses.map((expense) => (
              <div key={expense.id} className="card expense-card">
                <div className="expense-card-head">
                  <div className="row">
                    <span className="expense-emoji" aria-hidden="true">
                      {BUCKET_EMOJI[expense.bucket]}
                    </span>
                    <div>
                      <strong>{expense.merchant}</strong>
                      <div className="expense-card-meta">{expense.expenseDate}</div>
                    </div>
                  </div>
                  <div className="expense-card-amount">
                    {formatCad(expense.amountCents)}
                  </div>
                </div>
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
                    <button
                      className="btn btn-compact"
                      onClick={() => setViewingReceipt(expense)}
                    >
                      <Icon name={faReceipt} />
                      Receipt
                    </button>
                  )}
                  <button
                    className="btn btn-compact"
                    onClick={() => {
                      setEditing(expense);
                      setShowForm(true);
                    }}
                  >
                    <Icon name={faPen} />
                    Edit
                  </button>
                  <button
                    className="btn btn-compact btn-danger"
                    disabled={deletingId === expense.id}
                    onClick={() => deleteExpense(expense.id)}
                  >
                    <Icon name={faTrash} />
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
            <div className="modal-actions">
              <button
                className="btn"
                onClick={() => {
                  setDuplicateWarning(null);
                  setPendingSubmit(null);
                }}
              >
                Cancel
              </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
