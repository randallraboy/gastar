import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => {
    throw new Error("database should not be reached");
  }),
}));

vi.mock("@/lib/categories", () => ({
  loadCategoryFlat: vi.fn(async () => FIXTURE_FLAT),
  requireCategoryId: vi.fn(async () => {}),
}));

import { expenseCreateSchema, expenseUpdateSchema } from "@/lib/validation";
import { normalizeMerchant } from "@/lib/normalize";
import { confirmExpense, createDraftFromHarness, createExpense } from "@/lib/expenses";
import { getDb } from "@/lib/db";
import { expenses, pendingReceipts } from "@/lib/db/schema";
import type { User } from "@/lib/db/schema";
import { FIXTURE_FLAT } from "./fixtures/category-tree";

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

describe("note carry-over onto expenses", () => {
  const user = { id: "u1" } as User;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // A db mock whose selects resolve per-table, and which captures the values
  // passed to the expenses insert.
  function mockDb(opts: {
    pendingReceipt?: Record<string, unknown>;
    onInsert: (values: Record<string, unknown>) => void;
  }) {
    function resolveFor(table: unknown): unknown[] {
      if (table === pendingReceipts) {
        return opts.pendingReceipt ? [opts.pendingReceipt] : [];
      }
      // expenses (duplicate lookup) and merchant_corrections
      return [];
    }

    const db = {
      select: () => {
        let table: unknown;
        const chain: Record<string, unknown> = {
          from: (t: unknown) => {
            table = t;
            return chain;
          },
          where: () => chain,
          groupBy: () => chain,
          limit: async () => resolveFor(table),
          then: (resolve: (v: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(resolveFor(table)).then(resolve, reject),
        };
        return chain;
      },
      insert: () => ({
        values: (values: Record<string, unknown>) => {
          opts.onInsert(values);
          return { returning: async () => [{ id: "e-new", ...values }] };
        },
      }),
      update: () => ({
        set: () => ({ where: async () => undefined }),
      }),
      delete: () => ({ where: async () => undefined }),
    };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  }

  it("createDraftFromHarness copies the receipt's note onto the draft", async () => {
    let inserted: Record<string, unknown> | undefined;
    mockDb({ onInsert: (v) => (inserted = v) });

    await createDraftFromHarness(
      user,
      "receipt-1",
      { amountCents: 4523, expenseDate: "2026-06-28", merchant: "Metro" },
      "blob/receipt-1.jpg",
      "the fan is a Wants item",
    );

    expect(inserted?.note).toBe("the fan is a Wants item");
  });

  it("createDraftFromHarness stores null note when the receipt has none", async () => {
    let inserted: Record<string, unknown> | undefined;
    mockDb({ onInsert: (v) => (inserted = v) });

    await createDraftFromHarness(
      user,
      "receipt-1",
      { amountCents: 4523, expenseDate: "2026-06-28", merchant: "Metro" },
      "blob/receipt-1.jpg",
    );

    expect(inserted?.note ?? null).toBeNull();
  });

  it("createExpense copies the pending receipt's note on manual convert", async () => {
    let inserted: Record<string, unknown> | undefined;
    mockDb({
      pendingReceipt: {
        id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        status: "pending",
        blobKey: "blob/receipt-2.jpg",
        note: "keep this guidance",
      },
      onInsert: (v) => (inserted = v),
    });

    await createExpense(user, {
      amountCents: 1000,
      expenseDate: "2026-06-28",
      merchant: "Metro",
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
      pendingReceiptId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    });

    expect(inserted?.note).toBe("keep this guidance");
  });

  it("confirmExpense leaves the note unchanged through draft → confirmed", async () => {
    const draft = {
      id: "e1",
      status: "draft",
      amountCents: 1000,
      expenseDate: "2026-06-28",
      merchant: "Metro",
      description: null,
      note: "keep this note",
      categoryId: "550e8400-e29b-41d4-a716-446655440000",
    };
    let updates: Record<string, unknown> | undefined;
    const db = {
      select: () => {
        let table: unknown;
        const chain: Record<string, unknown> = {
          from: (t: unknown) => {
            table = t;
            return chain;
          },
          where: () => chain,
          limit: async () => (table === expenses ? [draft] : []),
        };
        return chain;
      },
      update: () => ({
        set: (v: Record<string, unknown>) => {
          updates = v;
          return {
            where: () => ({
              returning: async () => [{ ...draft, ...v, status: "confirmed" }],
            }),
          };
        },
      }),
      delete: () => ({ where: async () => undefined }),
    };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await confirmExpense("e1", user, { overrideDuplicate: true });

    expect(updates && "note" in updates).toBe(false);
    expect("expense" in result && result.expense?.note).toBe("keep this note");
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
