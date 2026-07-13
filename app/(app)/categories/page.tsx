"use client";

import { useCallback, useEffect, useState } from "react";
import {
  faLayerGroup,
  faMinus,
  faPen,
  faPlus,
  faTags,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  bucket: string;
  isBucket: boolean;
  depth: number;
  keywords: string[];
  children: CategoryNode[];
};

const BUCKET_EMOJI: Record<string, string> = {
  Needs: "🧾",
  Wants: "🛍️",
  Savings: "🐷",
};

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { notify } = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories?format=tree");
      if (!res.ok) throw new Error("Failed to load categories");
      setTree(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addChild(parentId: string) {
    const name = prompt("Subcategory name");
    if (!name?.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, name: name.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      notify({ kind: "error", message: data.error?.message ?? "Failed to add" });
      return;
    }
    notify({ kind: "success", message: `Added “${name.trim()}”` });
    await load();
  }

  async function renameNode(id: string, current: string) {
    const name = prompt("New name", current);
    if (!name?.trim() || name.trim() === current) return;
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      notify({ kind: "error", message: data.error?.message ?? "Failed to rename" });
      return;
    }
    notify({ kind: "success", message: "Category renamed" });
    await load();
  }

  async function editKeywords(id: string, current: string[]) {
    const raw = prompt("Keywords (comma-separated)", current.join(", "));
    if (raw === null) return;
    const keywords = raw
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords }),
    });
    if (!res.ok) {
      const data = await res.json();
      notify({
        kind: "error",
        message: data.error?.message ?? "Failed to update keywords",
      });
      return;
    }
    notify({ kind: "success", message: "Keywords updated" });
    await load();
  }

  async function deleteNode(id: string, name: string) {
    const ok = await confirm({
      title: `Delete “${name}”?`,
      message: "This removes the category and all of its subcategories.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    let reassignTo: string | undefined;
    let res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (res.status === 409) {
      reassignTo = prompt(
        "Expenses use this branch. Enter a category ID to reassign them to:",
      )?.trim();
      if (!reassignTo) return;
      res = await fetch(
        `/api/categories/${id}?reassignTo=${encodeURIComponent(reassignTo)}`,
        {
          method: "DELETE",
        },
      );
    }
    if (!res.ok && res.status !== 204) {
      const data = await res.json();
      notify({ kind: "error", message: data.error?.message ?? "Failed to delete" });
      return;
    }
    notify({ kind: "success", message: `Deleted “${name}”` });
    await load();
  }

  function renderNode(node: CategoryNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);

    return (
      <li
        key={node.id}
        className="category-mgmt-item"
        style={{ marginLeft: depth * 16 }}
      >
        <div className="category-mgmt-row">
          {hasChildren ? (
            <button
              type="button"
              className="btn btn-compact btn-icon"
              aria-expanded={isOpen}
              aria-label={isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onClick={() =>
                setExpanded((s) => {
                  const n = new Set(s);
                  if (n.has(node.id)) n.delete(node.id);
                  else n.add(node.id);
                  return n;
                })
              }
            >
              <Icon name={isOpen ? faMinus : faPlus} />
            </button>
          ) : (
            <span className="category-breakdown-spacer" />
          )}
          <span className="category-mgmt-name">
            {node.isBucket && (
              <span className="category-mgmt-emoji" aria-hidden="true">
                {BUCKET_EMOJI[node.name] ?? "📁"}
              </span>
            )}
            <strong>{node.name}</strong>
            {node.keywords.length > 0 && (
              <span className="muted" style={{ fontSize: "var(--fs-sm)" }}>
                ({node.keywords.join(", ")})
              </span>
            )}
          </span>
          {!node.isBucket && (
            <span className="category-mgmt-actions">
              <button
                type="button"
                className="btn btn-compact btn-ghost"
                onClick={() => renameNode(node.id, node.name)}
              >
                <Icon name={faPen} />
                Rename
              </button>
              <button
                type="button"
                className="btn btn-compact btn-ghost"
                onClick={() => editKeywords(node.id, node.keywords)}
              >
                <Icon name={faTags} />
                Keywords
              </button>
              <button
                type="button"
                className="btn btn-compact btn-danger"
                onClick={() => deleteNode(node.id, node.name)}
              >
                <Icon name={faTrash} />
                Delete
              </button>
            </span>
          )}
          {node.depth < 4 && (
            <button
              type="button"
              className="btn btn-compact"
              onClick={() => addChild(node.id)}
            >
              <Icon name={faPlus} />
              Add child
            </button>
          )}
        </div>
        {hasChildren && isOpen && (
          <ul>{node.children.map((c) => renderNode(c, depth + 1))}</ul>
        )}
      </li>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>
          <Icon name={faLayerGroup} />
          Categories
        </h1>
      </div>
      <p className="page-subtitle">
        Manage subcategories under Needs, Wants, and Savings. Top-level buckets are
        fixed.
      </p>

      {loading && (
        <div className="card">
          <Skeleton variant="text" count={5} />
        </div>
      )}
      {error && !loading && <p className="error">{error}</p>}
      {!loading && !error && (
        <ul className="category-mgmt-tree">
          {tree.map((bucket) => renderNode(bucket, 0))}
        </ul>
      )}
    </div>
  );
}
