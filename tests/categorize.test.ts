import { describe, expect, it } from "vitest";
import { categorizeExpense } from "@/lib/categorize";
import { FIXTURE_FLAT } from "./fixtures/category-tree";

describe("categorizeExpense", () => {
  it("prefers correction by category id over keyword", () => {
    const corrections = new Map([["metro", "dining-id"]]);
    const result = categorizeExpense(
      { merchantNormalized: "metro" },
      FIXTURE_FLAT,
      corrections,
    );
    expect(result.categoryId).toBe("dining-id");
    expect(result.bucket).toBe("Wants");
    expect(result.categoryWasAuto).toBe(true);
    expect(result.subcategoryResolved).toBe(true);
  });

  it("matches deepest keyword (Groceries under Needs)", () => {
    const result = categorizeExpense(
      { merchantNormalized: "metro grocery" },
      FIXTURE_FLAT,
      new Map(),
    );
    expect(result.categoryId).toBe("groceries-id");
    expect(result.bucket).toBe("Needs");
    expect(result.subcategoryResolved).toBe(true);
  });

  it("matches keyword rules for Wants dining", () => {
    const result = categorizeExpense(
      { merchantNormalized: "local restaurant" },
      FIXTURE_FLAT,
      new Map(),
    );
    expect(result.categoryId).toBe("dining-id");
    expect(result.bucket).toBe("Wants");
  });

  it("uses category hint name when no keyword matches", () => {
    const result = categorizeExpense(
      { merchantNormalized: "xyz", categoryHint: "Groceries" },
      FIXTURE_FLAT,
      new Map(),
    );
    expect(result.categoryId).toBe("groceries-id");
  });

  it("uses bucket hint when name not found", () => {
    const result = categorizeExpense(
      { merchantNormalized: "xyz", categoryHint: "Savings" },
      FIXTURE_FLAT,
      new Map(),
    );
    expect(result.categoryId).toBe("savings-id");
    expect(result.subcategoryResolved).toBe(false);
  });

  it("falls back to Needs bucket", () => {
    const result = categorizeExpense(
      { merchantNormalized: "gibberish xyz" },
      FIXTURE_FLAT,
      new Map(),
    );
    expect(result.categoryId).toBe("needs-id");
    expect(result.subcategoryResolved).toBe(false);
  });
});
