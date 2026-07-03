"use client";

import { useCallback, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  isSystem: boolean;
  keywords: string[];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message ?? "Failed to add category");
      return;
    }
    setName("");
    setKeywords("");
    await load();
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        keywords: editKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message ?? "Failed to update");
      return;
    }
    setEditingId(null);
    await load();
  }

  async function deleteCategory(cat: Category) {
    if (cat.isSystem) return;
    if (!confirm(`Delete "${cat.name}"? Expenses will move to Uncategorized.`)) return;
    const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message ?? "Failed to delete");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1>Categories</h1>

      <form
        onSubmit={addCategory}
        className="card"
        style={{ marginBottom: "var(--space-5)" }}
      >
        <h2>Add category</h2>
        <div className="form-group" style={{ marginBottom: "var(--space-3)" }}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group" style={{ marginBottom: "var(--space-3)" }}>
          <label htmlFor="keywords">Keywords (comma-separated)</label>
          <input
            id="keywords"
            className="input"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>

      <table className="category-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Keywords</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td>
                {editingId === cat.id ? (
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                ) : (
                  <>
                    {cat.name}
                    {cat.isSystem && <span className="badge">locked</span>}
                  </>
                )}
              </td>
              <td>
                {editingId === cat.id ? (
                  <input
                    className="input"
                    value={editKeywords}
                    onChange={(e) => setEditKeywords(e.target.value)}
                  />
                ) : (
                  cat.keywords.join(", ") || "—"
                )}
              </td>
              <td>
                {cat.isSystem ? (
                  <span style={{ color: "var(--muted)" }}>System</span>
                ) : editingId === cat.id ? (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => saveEdit(cat.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn"
                      style={{ marginLeft: "var(--space-1)" }}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                        setEditKeywords(cat.keywords.join(", "));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ marginLeft: "var(--space-1)" }}
                      onClick={() => deleteCategory(cat)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="category-list">
        {categories.map((cat) => (
          <div key={cat.id} className="card">
            {editingId === cat.id ? (
              <>
                <div className="form-group" style={{ marginBottom: "var(--space-3)" }}>
                  <label htmlFor={`edit-name-${cat.id}`}>Name</label>
                  <input
                    id={`edit-name-${cat.id}`}
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: "var(--space-3)" }}>
                  <label htmlFor={`edit-kw-${cat.id}`}>Keywords</label>
                  <input
                    id={`edit-kw-${cat.id}`}
                    className="input"
                    value={editKeywords}
                    onChange={(e) => setEditKeywords(e.target.value)}
                  />
                </div>
                <div className="category-card-actions">
                  <button className="btn btn-primary" onClick={() => saveEdit(cat.id)}>
                    Save
                  </button>
                  <button className="btn" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <strong>{cat.name}</strong>
                  {cat.isSystem && (
                    <span className="badge" style={{ marginLeft: "var(--space-2)" }}>
                      locked
                    </span>
                  )}
                </div>
                <p className="expense-card-meta">
                  {cat.keywords.join(", ") || "No keywords"}
                </p>
                {cat.isSystem ? (
                  <span style={{ color: "var(--muted)" }}>System category</span>
                ) : (
                  <div className="category-card-actions">
                    <button
                      className="btn"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                        setEditKeywords(cat.keywords.join(", "));
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteCategory(cat)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
