export const BUDGET_CATEGORIES = ["Needs", "Wants", "Savings"] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const DEFAULT_BUDGET_CATEGORY: BudgetCategory = "Needs";

/** Maps legacy category names (from the old `categories` table) to budget categories. */
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

/** Keyword rules for auto-categorization into budget categories. */
export const CATEGORY_KEYWORDS: Record<BudgetCategory, readonly string[]> = {
  Needs: [
    "grocery",
    "supermarket",
    "metro",
    "loblaws",
    "sobeys",
    "uber",
    "lyft",
    "transit",
    "gas",
    "parking",
    "presto",
    "rent",
    "mortgage",
    "property",
    "hydro",
    "electric",
    "water",
    "internet",
    "bell",
    "rogers",
    "pharmacy",
    "shoppers",
    "doctor",
    "dental",
    "medical",
  ],
  Wants: [
    "restaurant",
    "cafe",
    "coffee",
    "tim hortons",
    "starbucks",
    "netflix",
    "spotify",
    "cinema",
    "movie",
    "game",
    "amazon",
    "walmart",
    "costco",
    "retail",
    "store",
    "airline",
    "hotel",
    "airbnb",
    "flight",
    "vacation",
  ],
  Savings: ["savings", "investment", "rrsp", "tfsa", "contribution"],
};

export function mapLegacyCategoryName(name: string): BudgetCategory {
  return LEGACY_CATEGORY_MAPPING[name.toLowerCase()] ?? DEFAULT_BUDGET_CATEGORY;
}
