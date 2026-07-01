"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExpenseForm, type CategoryOption } from "@/components/ExpenseForm";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);

    const res = await fetch("/api/receipts", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message ?? "Upload failed");
    } else {
      await load();
    }
    setUploading(false);
  }

  async function discard(id: string) {
    if (!confirm("Discard this receipt?")) return;
    await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <h1>Receipts</h1>
      <p style={{ color: "var(--muted)" }}>
        Upload receipt photos for processing by the local harness.
      </p>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
        <button
          className="btn btn-primary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : "Upload receipt photo"}
        </button>
        {error && (
          <p className="error" style={{ marginTop: "0.5rem" }}>
            {error}
          </p>
        )}
      </div>

      <h2>Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="empty">No pending receipts</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          }}
        >
          {pending.map((r) => (
            <div key={r.id} className="card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.imageUrl}
                alt="Receipt"
                style={{ width: "100%", height: 140, objectFit: "cover" }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                {r.id.slice(0, 8)}…
              </p>
              <button className="btn" onClick={() => setConverting(r)}>
                Convert to manual
              </button>
              <button
                className="btn btn-danger"
                style={{ marginTop: "0.25rem" }}
                onClick={() => discard(r.id)}
              >
                Discard
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ marginTop: "2rem" }}>Unreadable ({unreadable.length})</h2>
      {unreadable.length === 0 ? (
        <p className="empty">No unreadable receipts</p>
      ) : (
        unreadable.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: "1rem" }}>
            <p>{r.errorNote}</p>
            <button className="btn" onClick={() => setConverting(r)}>
              Enter manually
            </button>
            <button
              className="btn btn-danger"
              style={{ marginLeft: "0.5rem" }}
              onClick={() => discard(r.id)}
            >
              Discard
            </button>
          </div>
        ))
      )}

      {converting && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Manual entry from receipt</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={converting.imageUrl}
              alt="Receipt"
              style={{ maxWidth: "100%", marginBottom: "1rem" }}
            />
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
