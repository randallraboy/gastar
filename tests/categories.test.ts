import { describe, expect, it } from "vitest";
import {
  expenseCreateSchema,
  expenseUpdateSchema,
  categoryCreateSchema,
} from "@/lib/validation";

describe("category validation", () => {
  it("accepts categoryId UUID on create", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 1000,
      expenseDate: "2026-01-01",
      merchant: "Test",
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid categoryId on create", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 1000,
      expenseDate: "2026-01-01",
      merchant: "Test",
      categoryId: "Groceries",
    });
    expect(result.success).toBe(false);
  });

  it("accepts categoryId on update", () => {
    const result = expenseUpdateSchema.safeParse({
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("validates category create body", () => {
    const result = categoryCreateSchema.safeParse({
      parentId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Hobbies",
      keywords: ["craft"],
    });
    expect(result.success).toBe(true);
  });
});
