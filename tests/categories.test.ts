import { describe, expect, it } from "vitest";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";
import { budgetCategorySchema, expenseCreateSchema } from "@/lib/validation";

describe("budget categories", () => {
  it("defines exactly three categories", () => {
    expect(BUDGET_CATEGORIES).toEqual(["Needs", "Wants", "Savings"]);
  });

  it("rejects invalid category values", () => {
    const result = budgetCategorySchema.safeParse("Housing");
    expect(result.success).toBe(false);
  });

  it("accepts valid budget categories in expense create schema", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 1000,
      expenseDate: "2026-01-01",
      merchant: "Test",
      category: "Wants",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid categories in expense create schema", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 1000,
      expenseDate: "2026-01-01",
      merchant: "Test",
      category: "Groceries",
    });
    expect(result.success).toBe(false);
  });
});
