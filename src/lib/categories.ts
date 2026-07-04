import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { categories, expenses, merchantCorrections } from "@/lib/db/schema";
import type { Category } from "@/lib/db/schema";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";
import { ApiError } from "@/lib/authz";
import {
  buildTree,
  computeDepths,
  getDescendantIds,
  type CategoryFlat,
  type CategoryTreeNode,
} from "@/lib/category-tree";

export type {
  CategoryFlat,
  CategoryTreeNode,
  CategoryTotalNode,
} from "@/lib/category-tree";
export {
  buildTree,
  buildCategoryTotals,
  getCategoryPath,
  getDescendantIds,
  getNodeDepth,
  findBucketNodeId,
  indexCategories,
  subcategoryResolved,
} from "@/lib/category-tree";

export async function loadCategoryFlat(): Promise<CategoryFlat[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.displayOrder), asc(categories.name));

  return computeDepths(
    rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      bucket: row.bucket,
      isBucket: row.isBucket,
      displayOrder: row.displayOrder,
      keywords: row.keywords ?? [],
    })),
  );
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row ?? null;
}

export async function requireCategoryId(
  id: string,
  flat?: CategoryFlat[],
): Promise<CategoryFlat> {
  const list = flat ?? (await loadCategoryFlat());
  const node = list.find((c) => c.id === id);
  if (!node) {
    throw new ApiError(400, "INVALID_CATEGORY", "Category not found");
  }
  return node;
}

function assertNotBucket(node: CategoryFlat): void {
  if (node.isBucket) {
    throw new ApiError(
      400,
      "CATEGORY_BUCKET_IMMUTABLE",
      "Top-level budget categories cannot be changed",
    );
  }
}

export async function createSubcategory(input: {
  parentId: string;
  name: string;
  keywords?: string[];
}): Promise<Category> {
  const db = getDb();
  const flat = await loadCategoryFlat();
  const parent = await requireCategoryId(input.parentId, flat);

  if (parent.depth >= 4) {
    throw new ApiError(
      400,
      "CATEGORY_DEPTH_EXCEEDED",
      "Cannot nest deeper than three subcategory levels",
    );
  }

  const trimmed = input.name.trim();
  if (!trimmed) {
    throw new ApiError(400, "VALIDATION", "Category name is required");
  }

  const siblingDup = flat.some(
    (c) =>
      c.parentId === input.parentId && c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (siblingDup) {
    throw new ApiError(
      400,
      "CATEGORY_DUPLICATE_SIBLING",
      "A subcategory with this name already exists here",
    );
  }

  const siblingCount = flat.filter((c) => c.parentId === input.parentId).length;

  const [created] = await db
    .insert(categories)
    .values({
      parentId: input.parentId,
      name: trimmed,
      bucket: parent.bucket,
      isBucket: false,
      displayOrder: siblingCount,
      keywords: input.keywords ?? [],
    })
    .returning();

  return created;
}

export async function updateSubcategory(
  id: string,
  input: { name?: string; keywords?: string[]; displayOrder?: number },
): Promise<Category> {
  const db = getDb();
  const flat = await loadCategoryFlat();
  const node = await requireCategoryId(id, flat);
  assertNotBucket(node);

  const updates: Partial<typeof categories.$inferInsert> = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) {
      throw new ApiError(400, "VALIDATION", "Category name is required");
    }
    const siblingDup = flat.some(
      (c) =>
        c.id !== id &&
        c.parentId === node.parentId &&
        c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (siblingDup) {
      throw new ApiError(
        400,
        "CATEGORY_DUPLICATE_SIBLING",
        "A subcategory with this name already exists here",
      );
    }
    updates.name = trimmed;
  }

  if (input.keywords !== undefined) updates.keywords = input.keywords;
  if (input.displayOrder !== undefined) updates.displayOrder = input.displayOrder;

  const [updated] = await db
    .update(categories)
    .set(updates)
    .where(eq(categories.id, id))
    .returning();

  return updated;
}

export async function deleteCategoryBranch(
  id: string,
  reassignTo?: string,
): Promise<void> {
  const db = getDb();
  const flat = await loadCategoryFlat();
  const node = await requireCategoryId(id, flat);
  assertNotBucket(node);

  const branchIds = [...getDescendantIds(id, flat)];

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenses)
    .where(inArray(expenses.categoryId, branchIds));

  const expenseCount = Number(count);
  if (expenseCount > 0 && !reassignTo) {
    throw new ApiError(
      409,
      "CATEGORY_BRANCH_HAS_EXPENSES",
      `${expenseCount} expense(s) use this category branch. Reassign them before deleting.`,
    );
  }

  if (reassignTo) {
    if (branchIds.includes(reassignTo)) {
      throw new ApiError(
        400,
        "VALIDATION",
        "Reassignment target cannot be inside the deleted branch",
      );
    }
    await requireCategoryId(reassignTo, flat);
    await db
      .update(expenses)
      .set({ categoryId: reassignTo, updatedAt: new Date() })
      .where(inArray(expenses.categoryId, branchIds));
  }

  await db
    .delete(merchantCorrections)
    .where(inArray(merchantCorrections.categoryId, branchIds));
  await db.delete(categories).where(inArray(categories.id, branchIds));
}

export async function ensureBucketsExist(): Promise<void> {
  const db = getDb();
  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.isBucket, true));
  if (existing.length >= 3) return;

  for (let i = 0; i < BUDGET_CATEGORIES.length; i++) {
    const bucket = BUDGET_CATEGORIES[i];
    const found = existing.find((r) => r.bucket === bucket);
    if (!found) {
      await db.insert(categories).values({
        parentId: null,
        name: bucket,
        bucket,
        isBucket: true,
        displayOrder: i,
        keywords: [],
      });
    }
  }
}

export async function listCategoriesTree(): Promise<CategoryTreeNode[]> {
  const flat = await loadCategoryFlat();
  return buildTree(flat);
}

export async function listCategoriesFlat(): Promise<CategoryFlat[]> {
  return loadCategoryFlat();
}
