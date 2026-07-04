"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type CategoryTreeNode = {
  id: string;
  name: string;
  children: CategoryTreeNode[];
};

type CategoryPickerProps = {
  value: string | null;
  onChange: (categoryId: string, path: string[]) => void;
  disabled?: boolean;
};

function findPathToId(nodes: CategoryTreeNode[], targetId: string): string[] | null {
  for (const node of nodes) {
    if (node.id === targetId) return [node.name];
    const childPath = findPathToId(node.children, targetId);
    if (childPath) return [node.name, ...childPath];
  }
  return null;
}

function getLevelNodes(
  tree: CategoryTreeNode[],
  stack: CategoryTreeNode[],
): CategoryTreeNode[] {
  if (stack.length === 0) return tree;
  return stack[stack.length - 1].children;
}

export function CategoryPicker({ value, onChange, disabled }: CategoryPickerProps) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stack, setStack] = useState<CategoryTreeNode[]>([]);

  useEffect(() => {
    fetch("/api/categories?format=tree")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load categories");
        return r.json();
      })
      .then((data: CategoryTreeNode[]) => {
        setTree(data);
        if (value) {
          const path = findPathToId(data, value);
          if (path && path.length > 1) {
            let nodes = data;
            const nav: CategoryTreeNode[] = [];
            for (let i = 0; i < path.length - 1; i++) {
              const next = nodes.find((n) => n.name === path[i]);
              if (next) {
                nav.push(next);
                nodes = next.children;
              }
            }
            setStack(nav);
          }
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load categories"),
      )
      .finally(() => setLoading(false));
  }, [value]);

  const levelNodes = useMemo(() => getLevelNodes(tree, stack), [tree, stack]);
  const breadcrumb = useMemo(() => stack.map((n) => n.name), [stack]);

  const selectNode = useCallback(
    (node: CategoryTreeNode) => {
      const path = [...breadcrumb, node.name];
      onChange(node.id, path);
    },
    [breadcrumb, onChange],
  );

  if (loading) return <p className="muted">Loading categories…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="category-picker">
      <nav aria-label="Category path" className="category-picker-breadcrumb">
        <button
          type="button"
          className="btn btn-compact"
          disabled={disabled || stack.length === 0}
          onClick={() => setStack((s) => s.slice(0, -1))}
        >
          ↑ Up
        </button>
        {breadcrumb.length > 0 && (
          <span className="category-picker-path">{breadcrumb.join(" › ")}</span>
        )}
      </nav>
      <ul className="category-picker-list" role="listbox" aria-label="Category options">
        {levelNodes.map((node) => (
          <li key={node.id} className="category-picker-item">
            <div className="category-picker-row">
              {node.children.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="btn category-picker-drill"
                    disabled={disabled}
                    onClick={() => setStack((s) => [...s, node])}
                  >
                    {node.name} ›
                  </button>
                  <button
                    type="button"
                    className="btn btn-compact"
                    disabled={disabled}
                    onClick={() => selectNode(node)}
                  >
                    Select
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn category-picker-drill"
                  disabled={disabled}
                  onClick={() => selectNode(node)}
                >
                  {node.name}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function formatCategoryPath(path: string[]): string {
  return path.join(" → ");
}
