import { describe, expect, it } from "vitest";
import { categorizeExpense } from "@/lib/categorize";
import type { Category } from "@/lib/db/schema";

const categories: Category[] = [
  {
    id: "groceries-id",
    name: "Groceries",
    isSystem: false,
    keywords: ["metro", "grocery"],
    createdAt: new Date(),
  },
  {
    id: "dining-id",
    name: "Dining",
    isSystem: false,
    keywords: ["restaurant"],
    createdAt: new Date(),
  },
  {
    id: "uncat-id",
    name: "Uncategorized",
    isSystem: true,
    keywords: [],
    createdAt: new Date(),
  },
];

describe("categorizeExpense", () => {
  it("prefers correction over keyword", () => {
    const corrections = new Map([["metro", "dining-id"]]);
    const result = categorizeExpense(
      { merchantNormalized: "metro" },
      categories,
      corrections,
    );
    expect(result.categoryId).toBe("dining-id");
    expect(result.categoryWasAuto).toBe(true);
  });

  it("matches keyword rules", () => {
    const result = categorizeExpense(
      { merchantNormalized: "metro grocery" },
      categories,
      new Map(),
    );
    expect(result.categoryId).toBe("groceries-id");
  });

  it("uses category hint when no rule matches", () => {
    const result = categorizeExpense(
      { merchantNormalized: "xyz", categoryHint: "Dining" },
      categories,
      new Map(),
    );
    expect(result.categoryId).toBe("dining-id");
  });

  it("falls back to Uncategorized", () => {
    const result = categorizeExpense(
      { merchantNormalized: "gibberish xyz" },
      categories,
      new Map(),
    );
    expect(result.categoryId).toBe("uncat-id");
  });
});
