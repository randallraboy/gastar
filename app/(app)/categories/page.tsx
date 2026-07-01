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

      <form onSubmit={addCategory} className="card" style={{ marginBottom: "1.5rem" }}>
        <h2>Add category</h2>
        <div className="form-group" style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group" style={{ marginBottom: "0.75rem" }}>
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

      <table>
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
                      style={{ marginLeft: "0.25rem" }}
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
                      style={{ marginLeft: "0.25rem" }}
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
    </div>
  );
}
