export const BUDGET_CATEGORIES = ["Needs", "Wants", "Savings"] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const DEFAULT_BUDGET_CATEGORY: BudgetCategory = "Needs";

/** Maps legacy category names (from the old flat categories table) to budget buckets. */
export const LEGACY_CATEGORY_MAPPING: Record<string, BudgetCategory> = {
  groceries: "Needs",
  dining: "Wants",
  transport: "Needs",
  housing: "Needs",
  utilities: "Needs",
  health: "Needs",
  entertainment: "Wants",
  shopping: "Wants",
  travel: "Wants",
  uncategorized: "Needs",
};

export function mapLegacyCategoryName(name: string): BudgetCategory {
  return LEGACY_CATEGORY_MAPPING[name.toLowerCase()] ?? DEFAULT_BUDGET_CATEGORY;
}

export function mapCategoryHintToBucket(hint: string): BudgetCategory | undefined {
  const lower = hint.toLowerCase();
  const fromLegacy = LEGACY_CATEGORY_MAPPING[lower];
  if (fromLegacy) return fromLegacy;
  return BUDGET_CATEGORIES.find((b) => b.toLowerCase() === lower);
}
