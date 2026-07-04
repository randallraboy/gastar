import {
  DEFAULT_BUDGET_CATEGORY,
  mapCategoryHintToBucket,
  type BudgetCategory,
} from "@/lib/budget-categories";
import type { CategoryFlat } from "@/lib/category-tree";
import { findBucketNodeId, getNodeDepth, indexCategories } from "@/lib/category-tree";

export type CategorizeInput = {
  merchantNormalized: string;
  description?: string | null;
  categoryHint?: string | null;
};

export type CategorizeResult = {
  categoryId: string;
  bucket: BudgetCategory;
  categoryWasAuto: boolean;
  subcategoryResolved: boolean;
};

type MatchCandidate = { id: string; depth: number; order: number };

export function categorizeExpenseWithTree(
  input: CategorizeInput,
  flat: CategoryFlat[],
  corrections: Map<string, string>,
): CategorizeResult {
  const byId = indexCategories(flat);

  const correctionId = corrections.get(input.merchantNormalized);
  if (correctionId && byId.has(correctionId)) {
    const node = byId.get(correctionId)!;
    return {
      categoryId: correctionId,
      bucket: node.bucket,
      categoryWasAuto: true,
      subcategoryResolved: node.depth > 1,
    };
  }

  const haystack =
    `${input.merchantNormalized} ${input.description ?? ""}`.toLowerCase();

  const keywordMatches: MatchCandidate[] = [];
  flat.forEach((node, index) => {
    for (const keyword of node.keywords) {
      if (keyword && haystack.includes(keyword.toLowerCase())) {
        keywordMatches.push({ id: node.id, depth: node.depth, order: index });
        break;
      }
    }
  });

  if (keywordMatches.length > 0) {
    keywordMatches.sort((a, b) => b.depth - a.depth || a.order - b.order);
    const best = byId.get(keywordMatches[0].id)!;
    return {
      categoryId: best.id,
      bucket: best.bucket,
      categoryWasAuto: true,
      subcategoryResolved: best.depth > 1,
    };
  }

  if (input.categoryHint) {
    const hintLower = input.categoryHint.toLowerCase();
    const nameMatch = flat
      .filter((c) => c.name.toLowerCase() === hintLower)
      .sort((a, b) => b.depth - a.depth);
    if (nameMatch.length > 0) {
      const node = nameMatch[0];
      return {
        categoryId: node.id,
        bucket: node.bucket,
        categoryWasAuto: true,
        subcategoryResolved: node.depth > 1,
      };
    }

    const bucketHint = mapCategoryHintToBucket(input.categoryHint);
    if (bucketHint) {
      const bucketId = findBucketNodeId(bucketHint, flat);
      if (bucketId) {
        return {
          categoryId: bucketId,
          bucket: bucketHint,
          categoryWasAuto: true,
          subcategoryResolved: false,
        };
      }
    }
  }

  const defaultBucket = DEFAULT_BUDGET_CATEGORY;
  const defaultId = findBucketNodeId(defaultBucket, flat);
  if (!defaultId) {
    throw new Error("Default bucket category not seeded");
  }

  return {
    categoryId: defaultId,
    bucket: defaultBucket,
    categoryWasAuto: true,
    subcategoryResolved: false,
  };
}

export function categorizeExpense(
  input: CategorizeInput,
  flat: CategoryFlat[],
  corrections: Map<string, string>,
): CategorizeResult {
  return categorizeExpenseWithTree(input, flat, corrections);
}

export function isSubcategoryResolved(
  categoryId: string,
  flat: CategoryFlat[],
): boolean {
  const byId = indexCategories(flat);
  return getNodeDepth(categoryId, byId) > 1;
}
