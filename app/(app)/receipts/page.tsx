"use client";

import { useCallback, useEffect, useState } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ReceiptCapture } from "@/components/ReceiptCapture";

type Receipt = {
  id: string;
  status: string;
  imageUrl: string;
  errorNote: string | null;
  note: string | null;
};

const NOTE_MAX = 250;

export default function ReceiptsPage() {
  const [pending, setPending] = useState<Receipt[]>([]);
  const [unreadable, setUnreadable] = useState<Receipt[]>([]);
  const [converting, setConverting] = useState<Receipt | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; value: string } | null>(
    null,
  );
  const [noteError, setNoteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [pendingRes, unreadableRes] = await Promise.all([
      fetch("/api/receipts?status=pending"),
      fetch("/api/receipts?status=unreadable"),
    ]);
    setPending(await pendingRes.json());
    setUnreadable(await unreadableRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function discard(id: string) {
    if (!confirm("Discard this receipt?")) return;
    await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    await load();
  }

  async function saveNote(id: string, value: string) {
    setNoteError(null);
    const res = await fetch(`/api/receipts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: value.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setNoteError(data?.error?.message ?? "Could not save note");
      return;
    }
    setEditingNote(null);
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

              {editingNote?.id === r.id ? (
                <div className="form-group" style={{ marginBottom: "var(--space-2)" }}>
                  <label htmlFor={`note-${r.id}`}>Note (optional)</label>
                  <textarea
                    id={`note-${r.id}`}
                    className="input"
                    rows={2}
                    maxLength={NOTE_MAX}
                    value={editingNote.value}
                    onChange={(e) =>
                      setEditingNote({ id: r.id, value: e.target.value })
                    }
                  />
                  <span className="muted" style={{ fontSize: "0.75rem" }}>
                    {NOTE_MAX - editingNote.value.length} characters remaining
                  </span>
                  {noteError && <span className="error">{noteError}</span>}
                  <div
                    style={{
                      display: "flex",
                      gap: "var(--space-2)",
                      marginTop: "var(--space-2)",
                    }}
                  >
                    <button
                      className="btn btn-primary"
                      onClick={() => saveNote(r.id, editingNote.value)}
                    >
                      Save
                    </button>
                    <button className="btn" onClick={() => setEditingNote(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {r.note && (
                    <p
                      className="muted"
                      style={{ fontSize: "0.8125rem", fontStyle: "italic" }}
                    >
                      “{r.note}”
                    </p>
                  )}
                  <button
                    className="btn btn-block"
                    style={{ marginBottom: "var(--space-2)" }}
                    onClick={() => {
                      setNoteError(null);
                      setEditingNote({ id: r.id, value: r.note ?? "" });
                    }}
                  >
                    {r.note ? "Edit note" : "Add note"}
                  </button>
                </>
              )}

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
            {r.note && (
              <p className="muted" style={{ fontStyle: "italic" }}>
                Note: “{r.note}”
              </p>
            )}
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
