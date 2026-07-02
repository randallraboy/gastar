import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));

import { handleApiError } from "@/lib/authz";
import { expenseCreateSchema } from "@/lib/validation";

describe("handleApiError", () => {
  it("maps ZodError to a plain-language 400 response", async () => {
    const result = expenseCreateSchema.safeParse({
      amountCents: -5,
      expenseDate: "2026-01-01",
      merchant: "Test",
    });
    expect(result.success).toBe(false);
    if (result.success) return;

    const res = handleApiError(result.error);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("Amount must be greater than zero");
  });

  it("keeps unknown errors as generic 500", async () => {
    const res = handleApiError(new Error("internal detail"));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("internal detail");
  });
});
