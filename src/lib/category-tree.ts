import type { BudgetCategory } from "@/lib/budget-categories";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";

export type CategoryFlat = {
  id: string;
  parentId: string | null;
  name: string;
  bucket: BudgetCategory;
  isBucket: boolean;
  displayOrder: number;
  keywords: string[];
  depth: number;
};

export type CategoryTreeNode = CategoryFlat & {
  children: CategoryTreeNode[];
};

export type CategoryTotalNode = {
  categoryId: string;
  name: string;
  bucket: BudgetCategory;
  depth: number;
  sumCents: number;
  children: CategoryTotalNode[];
};

export function buildTree(flat: CategoryFlat[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();
  for (const row of flat) {
    nodes.set(row.id, { ...row, children: [] });
  }
  const roots: CategoryTreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  }
  const sortChildren = (list: CategoryTreeNode[]) => {
    list.sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
    for (const n of list) sortChildren(n.children);
  };
  sortChildren(roots);
  return roots;
}

export function indexCategories(flat: CategoryFlat[]): Map<string, CategoryFlat> {
  return new Map(flat.map((c) => [c.id, c]));
}

export function getCategoryPath(
  categoryId: string,
  byId: Map<string, CategoryFlat>,
): string[] {
  const path: string[] = [];
  let current = byId.get(categoryId);
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function getDescendantIds(
  categoryId: string,
  flat: CategoryFlat[],
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const row of flat) {
    if (row.parentId) {
      const list = childrenByParent.get(row.parentId) ?? [];
      list.push(row.id);
      childrenByParent.set(row.parentId, list);
    }
  }
  const result = new Set<string>([categoryId]);
  const queue = [categoryId];
  while (queue.length) {
    const id = queue.pop()!;
    for (const childId of childrenByParent.get(id) ?? []) {
      result.add(childId);
      queue.push(childId);
    }
  }
  return result;
}

export function getNodeDepth(
  categoryId: string,
  byId: Map<string, CategoryFlat>,
): number {
  return byId.get(categoryId)?.depth ?? 1;
}

export function findBucketNodeId(
  bucket: BudgetCategory,
  flat: CategoryFlat[],
): string | undefined {
  return flat.find((c) => c.isBucket && c.bucket === bucket)?.id;
}

export function subcategoryResolved(
  categoryId: string,
  byId: Map<string, CategoryFlat>,
): boolean {
  return getNodeDepth(categoryId, byId) > 1;
}

export function buildCategoryTotals(
  flat: CategoryFlat[],
  amountsByCategoryId: Map<string, number>,
): CategoryTotalNode[] {
  const tree = buildTree(flat);

  function visit(node: CategoryTreeNode): CategoryTotalNode {
    let sum = amountsByCategoryId.get(node.id) ?? 0;
    const children = node.children.map(visit);
    for (const child of children) {
      sum += child.sumCents;
    }
    return {
      categoryId: node.id,
      name: node.name,
      bucket: node.bucket,
      depth: node.depth,
      sumCents: sum,
      children,
    };
  }

  return tree.map(visit);
}

export function computeDepths(
  rows: Array<{
    id: string;
    parentId: string | null;
    name: string;
    bucket: BudgetCategory;
    isBucket: boolean;
    displayOrder: number;
    keywords: string[];
  }>,
): CategoryFlat[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const depthCache = new Map<string, number>();

  function depthFor(id: string): number {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    const row = byId.get(id);
    if (!row) return 1;
    const d = row.parentId ? depthFor(row.parentId) + 1 : 1;
    depthCache.set(id, d);
    return d;
  }

  return rows.map((row) => ({
    ...row,
    keywords: row.keywords ?? [],
    depth: depthFor(row.id),
  }));
}

export { BUDGET_CATEGORIES };
