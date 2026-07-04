import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/lib/db", () => ({
  getDb: () => {
    throw new Error("database should not be reached");
  },
}));

import { expenseCreateSchema, expenseUpdateSchema } from "@/lib/validation";
import { normalizeMerchant } from "@/lib/normalize";
import { confirmExpense } from "@/lib/expenses";
import type { User } from "@/lib/db/schema";

describe("expense validation", () => {
  it("rejects future dates", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const date = future.toISOString().slice(0, 10);

    const result = expenseCreateSchema.safeParse({
      amountCents: 100,
      expenseDate: date,
      merchant: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive amounts", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: -100,
      expenseDate: "2026-01-01",
      merchant: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("accepts categoryId on create", () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: 100,
      expenseDate: "2026-01-01",
      merchant: "Test",
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts categoryId on update", () => {
    const result = expenseUpdateSchema.safeParse({
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });
});

describe("duplicate detection key", () => {
  it("normalizes merchant for duplicate matching", () => {
    const a = normalizeMerchant("Metro!");
    const b = normalizeMerchant("metro");
    expect(a).toBe(b);
  });
});

describe("confirmExpense validation", () => {
  const user = { id: "u1" } as User;

  it("rejects a non-positive amount before touching the database", async () => {
    await expect(confirmExpense("e1", user, { amountCents: -500 })).rejects.toThrow(
      "Amount must be greater than zero",
    );
  });

  it("rejects a future date before touching the database", async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    await expect(
      confirmExpense("e1", user, {
        expenseDate: future.toISOString().slice(0, 10),
      }),
    ).rejects.toThrow("Expense date cannot be in the future");
  });
});
