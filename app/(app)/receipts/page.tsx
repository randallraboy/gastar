"use client";

import { useCallback, useEffect, useState } from "react";
import {
  faCheck,
  faInbox,
  faPen,
  faPenToSquare,
  faReceipt,
  faTrash,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ReceiptCapture } from "@/components/ReceiptCapture";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

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
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState<Receipt | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; value: string } | null>(
    null,
  );
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const { notify } = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    const [pendingRes, unreadableRes] = await Promise.all([
      fetch("/api/receipts?status=pending"),
      fetch("/api/receipts?status=unreadable"),
    ]);
    setPending(await pendingRes.json());
    setUnreadable(await unreadableRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function discard(id: string) {
    const ok = await confirm({
      title: "Discard this receipt?",
      message: "The uploaded photo will be permanently removed.",
      confirmLabel: "Discard",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    notify({ kind: "success", message: "Receipt discarded" });
    await load();
  }

  async function saveNote(id: string, value: string) {
    setNoteError(null);
    setSavingNote(true);
    try {
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
      notify({ kind: "success", message: "Note saved" });
      await load();
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Icon name={faReceipt} />
          Receipts
        </h1>
      </div>
      <p className="page-subtitle">
        Upload receipt photos for processing by the local harness.
      </p>

      <ReceiptCapture onUploaded={load} />

      <h2 className="section-title">
        <Icon name={faInbox} />
        Pending ({pending.length})
      </h2>
      {loading ? (
        <div className="receipt-grid">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={faInbox}
          title="No pending receipts"
          description="Take a photo or choose a file above to queue a receipt for processing."
        />
      ) : (
        <div className="receipt-grid">
          {pending.map((r) => (
            <div key={r.id} className="card card-hover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.imageUrl} alt="Receipt" className="receipt-thumb" />
              <p style={{ fontSize: "var(--fs-xs)", color: "var(--muted)" }}>
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
                  <span className="muted" style={{ fontSize: "var(--fs-xs)" }}>
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
                      disabled={savingNote}
                      onClick={() => saveNote(r.id, editingNote.value)}
                    >
                      {savingNote ? (
                        <span className="spinner" aria-hidden="true" />
                      ) : (
                        <Icon name={faCheck} />
                      )}
                      Save
                    </button>
                    <button className="btn" onClick={() => setEditingNote(null)}>
                      <Icon name={faXmark} />
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
                    <Icon name={faPen} />
                    {r.note ? "Edit note" : "Add note"}
                  </button>
                </>
              )}

              <button className="btn btn-block" onClick={() => setConverting(r)}>
                <Icon name={faPenToSquare} />
                Convert to manual
              </button>
              <button
                className="btn btn-danger btn-block"
                style={{ marginTop: "var(--space-2)" }}
                onClick={() => discard(r.id)}
              >
                <Icon name={faTrash} />
                Discard
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="section-title" style={{ marginTop: "var(--space-6)" }}>
        <Icon name={faTriangleExclamation} />
        Unreadable ({unreadable.length})
      </h2>
      {loading ? (
        <Skeleton variant="text" count={2} />
      ) : unreadable.length === 0 ? (
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
                <Icon name={faPenToSquare} />
                Enter manually
              </button>
              <button className="btn btn-danger" onClick={() => discard(r.id)}>
                <Icon name={faTrash} />
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
                notify({ kind: "success", message: "Expense saved" });
                await load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
