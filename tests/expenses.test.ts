import { describe, expect, it } from "vitest";
import { expenseCreateSchema } from "@/lib/validation";
import { normalizeMerchant } from "@/lib/normalize";

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
});

describe("duplicate detection key", () => {
  it("normalizes merchant for duplicate matching", () => {
    const a = normalizeMerchant("Metro!");
    const b = normalizeMerchant("metro");
    expect(a).toBe(b);
  });
});
