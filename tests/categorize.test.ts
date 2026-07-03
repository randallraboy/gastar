import { describe, expect, it } from "vitest";
import { categorizeExpense } from "@/lib/categorize";
import type { BudgetCategory } from "@/lib/budget-categories";

describe("categorizeExpense", () => {
  it("prefers correction over keyword", () => {
    const corrections = new Map<string, BudgetCategory>([["metro", "Wants"]]);
    const result = categorizeExpense({ merchantNormalized: "metro" }, corrections);
    expect(result.category).toBe("Wants");
    expect(result.categoryWasAuto).toBe(true);
  });

  it("matches keyword rules for Needs", () => {
    const result = categorizeExpense(
      { merchantNormalized: "metro grocery" },
      new Map(),
    );
    expect(result.category).toBe("Needs");
  });

  it("matches keyword rules for Wants", () => {
    const result = categorizeExpense(
      { merchantNormalized: "local restaurant" },
      new Map(),
    );
    expect(result.category).toBe("Wants");
  });

  it("uses category hint when no rule matches", () => {
    const result = categorizeExpense(
      { merchantNormalized: "xyz", categoryHint: "Savings" },
      new Map(),
    );
    expect(result.category).toBe("Savings");
  });

  it("falls back to Needs", () => {
    const result = categorizeExpense(
      { merchantNormalized: "gibberish xyz" },
      new Map(),
    );
    expect(result.category).toBe("Needs");
  });
});
