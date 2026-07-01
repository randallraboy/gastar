import type { Category } from "@/lib/db/schema";

export type CategorizeInput = {
  merchantNormalized: string;
  description?: string | null;
  categoryHint?: string | null;
};

export type CategorizeResult = {
  categoryId: string;
  categoryWasAuto: boolean;
};

export function categorizeExpense(
  input: CategorizeInput,
  categories: Category[],
  corrections: Map<string, string>,
): CategorizeResult {
  const correction = corrections.get(input.merchantNormalized);
  if (correction) {
    return { categoryId: correction, categoryWasAuto: true };
  }

  const haystack =
    `${input.merchantNormalized} ${input.description ?? ""}`.toLowerCase();

  for (const category of categories) {
    if (category.isSystem) continue;
    for (const keyword of category.keywords) {
      if (keyword && haystack.includes(keyword.toLowerCase())) {
        return { categoryId: category.id, categoryWasAuto: true };
      }
    }
  }

  if (input.categoryHint) {
    const hint = input.categoryHint.toLowerCase();
    const matched = categories.find((c) => c.name.toLowerCase() === hint);
    if (matched) {
      return { categoryId: matched.id, categoryWasAuto: true };
    }
  }

  const uncategorized = categories.find((c) => c.isSystem);
  if (!uncategorized) {
    throw new Error("Uncategorized category is missing");
  }

  return { categoryId: uncategorized.id, categoryWasAuto: true };
}

export function getUncategorizedId(categories: Category[]): string {
  const uncategorized = categories.find((c) => c.isSystem);
  if (!uncategorized) {
    throw new Error("Uncategorized category is missing");
  }
  return uncategorized.id;
}
