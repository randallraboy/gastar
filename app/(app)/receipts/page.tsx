"use client";

import { useCallback, useEffect, useState } from "react";
import { ExpenseForm, type CategoryOption } from "@/components/ExpenseForm";
import { ReceiptCapture } from "@/components/ReceiptCapture";

type Receipt = {
  id: string;
  status: string;
  imageUrl: string;
  errorNote: string | null;
};

export default function ReceiptsPage() {
  const [pending, setPending] = useState<Receipt[]>([]);
  const [unreadable, setUnreadable] = useState<Receipt[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [converting, setConverting] = useState<Receipt | null>(null);

  const load = useCallback(async () => {
    const [pendingRes, unreadableRes, catRes] = await Promise.all([
      fetch("/api/receipts?status=pending"),
      fetch("/api/receipts?status=unreadable"),
      fetch("/api/categories"),
    ]);
    setPending(await pendingRes.json());
    setUnreadable(await unreadableRes.json());
    setCategories(await catRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function discard(id: string) {
    if (!confirm("Discard this receipt?")) return;
    await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <h1>Receipts</h1>
      <p style={{ color: "var(--muted)", marginBottom: "var(--space-4)" }}>
        Upload receipt photos for processing by the local harness.
      </p>

      <ReceiptCapture onUploaded={load} />

      <h2>Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="empty">No pending receipts</p>
      ) : (
        <div className="receipt-grid">
          {pending.map((r) => (
            <div key={r.id} className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.imageUrl} alt="Receipt" className="receipt-thumb" />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                {r.id.slice(0, 8)}…
              </p>
              <button className="btn btn-block" onClick={() => setConverting(r)}>
                Convert to manual
              </button>
              <button
                className="btn btn-danger btn-block"
                style={{ marginTop: "var(--space-2)" }}
                onClick={() => discard(r.id)}
              >
                Discard
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: "var(--space-6)" }}>Unreadable ({unreadable.length})</h2>
      {unreadable.length === 0 ? (
        <p className="empty">No unreadable receipts</p>
      ) : (
        unreadable.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: "var(--space-4)" }}>
            <p>{r.errorNote}</p>
            <div className="category-card-actions">
              <button className="btn" onClick={() => setConverting(r)}>
                Enter manually
              </button>
              <button className="btn btn-danger" onClick={() => discard(r.id)}>
                Discard
              </button>
            </div>
          </div>
        ))
      )}

      {converting && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Manual entry from receipt</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={converting.imageUrl} alt="Receipt" className="capture-preview" />
            <ExpenseForm
              categories={categories}
              pendingReceiptId={converting.id}
              submitLabel="Save expense"
              onCancel={() => setConverting(null)}
              onSubmit={async (values) => {
                const res = await fetch("/api/expenses", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(values),
                });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error?.message ?? "Failed to save");
                }
                setConverting(null);
                await load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
