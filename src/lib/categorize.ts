import {
  BUDGET_CATEGORIES,
  DEFAULT_BUDGET_CATEGORY,
  CATEGORY_KEYWORDS,
  type BudgetCategory,
} from "@/lib/budget-categories";

export type CategorizeInput = {
  merchantNormalized: string;
  description?: string | null;
  categoryHint?: string | null;
};

export type CategorizeResult = {
  category: BudgetCategory;
  categoryWasAuto: boolean;
};

export function categorizeExpense(
  input: CategorizeInput,
  corrections: Map<string, BudgetCategory>,
): CategorizeResult {
  const correction = corrections.get(input.merchantNormalized);
  if (correction) {
    return { category: correction, categoryWasAuto: true };
  }

  const haystack =
    `${input.merchantNormalized} ${input.description ?? ""}`.toLowerCase();

  for (const category of BUDGET_CATEGORIES) {
    for (const keyword of CATEGORY_KEYWORDS[category]) {
      if (keyword && haystack.includes(keyword.toLowerCase())) {
        return { category, categoryWasAuto: true };
      }
    }
  }

  if (input.categoryHint) {
    const hint = input.categoryHint.toLowerCase();
    const matched = BUDGET_CATEGORIES.find((c) => c.toLowerCase() === hint);
    if (matched) {
      return { category: matched, categoryWasAuto: true };
    }
  }

  return { category: DEFAULT_BUDGET_CATEGORY, categoryWasAuto: true };
}
