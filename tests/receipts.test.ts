import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/blob", () => ({
  uploadStagingBlob: vi.fn(),
  deleteBlob: vi.fn(),
  getBlobContent: vi.fn(),
  receiptImagePath: (id: string) => `/api/receipts/${id}/image`,
}));

import {
  canProcessReceipt,
  canMarkUnreadable,
  canConvertToManual,
  canDiscardReceipt,
  isTerminalReceiptStatus,
} from "@/lib/receipt-state";
import { validateUploadFile, MAX_UPLOAD_BYTES } from "@/lib/validation";
import { deleteReceipt } from "@/lib/receipts";
import { getDb } from "@/lib/db";
import { deleteBlob } from "@/lib/blob";

function dbReturningReceipt(receipt: Record<string, unknown> | undefined) {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: async () => (receipt ? [receipt] : []),
    delete: () => chain,
  };
  return chain;
}

describe("receipt state machine", () => {
  it("allows processing only from pending", () => {
    expect(canProcessReceipt("pending")).toBe(true);
    expect(canProcessReceipt("processed")).toBe(false);
  });

  it("allows unreadable only from pending", () => {
    expect(canMarkUnreadable("pending")).toBe(true);
    expect(canMarkUnreadable("unreadable")).toBe(false);
  });

  it("allows manual conversion from pending or unreadable", () => {
    expect(canConvertToManual("pending")).toBe(true);
    expect(canConvertToManual("unreadable")).toBe(true);
    expect(canConvertToManual("processed")).toBe(false);
  });

  it("marks terminal statuses", () => {
    expect(isTerminalReceiptStatus("processed")).toBe(true);
    expect(isTerminalReceiptStatus("pending")).toBe(false);
  });

  it("allows discard only from pending or unreadable", () => {
    expect(canDiscardReceipt("pending")).toBe(true);
    expect(canDiscardReceipt("unreadable")).toBe(true);
    expect(canDiscardReceipt("processed")).toBe(false);
    expect(canDiscardReceipt("converted")).toBe(false);
  });
});

describe("deleteReceipt status guard", () => {
  it("refuses to discard a processed receipt and keeps its blob", async () => {
    vi.mocked(getDb).mockReturnValue(
      dbReturningReceipt({
        id: "r1",
        status: "processed",
        blobKey: "receipts/staging/r1.jpg",
      }) as unknown as ReturnType<typeof getDb>,
    );

    const result = await deleteReceipt("r1");
    expect(result).toBe("invalid_status");
    expect(deleteBlob).not.toHaveBeenCalled();
  });

  it("reports not_found for a missing receipt", async () => {
    vi.mocked(getDb).mockReturnValue(
      dbReturningReceipt(undefined) as unknown as ReturnType<typeof getDb>,
    );

    const result = await deleteReceipt("missing");
    expect(result).toBe("not_found");
    expect(deleteBlob).not.toHaveBeenCalled();
  });
});

describe("upload validation", () => {
  it("rejects unsupported file types", () => {
    const file = new File(["x"], "test.gif", { type: "image/gif" });
    expect(validateUploadFile(file)).toContain("JPEG");
  });

  it("rejects oversize files", () => {
    const file = new File([new ArrayBuffer(MAX_UPLOAD_BYTES + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    expect(validateUploadFile(file)).toContain("10 MB");
  });
});

describe("createPendingReceipt idempotency", () => {
  const user = {
    id: "user-1",
    googleSub: "sub",
    email: "u@example.com",
    displayName: "User",
    createdAt: new Date(),
  };

  const clientKey = "550e8400-e29b-41d4-a716-446655440000";

  const validFile = new File(["x"], "receipt.jpg", { type: "image/jpeg" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockDbChain(opts: {
    existingByKey?: Record<string, unknown> | null;
    insertReturns?: Record<string, unknown>;
    insertThrows?: Error;
    raceExisting?: Record<string, unknown>;
  }) {
    const selectChain = {
      from: () => selectChain,
      where: () => selectChain,
      limit: async () => (opts.existingByKey ? [opts.existingByKey] : []),
    };

    let selectCall = 0;
    const db = {
      select: () => {
        selectCall += 1;
        if (selectCall > 1 && opts.raceExisting) {
          return {
            from: () => ({
              where: () => ({
                limit: async () => [opts.raceExisting],
              }),
            }),
          };
        }
        return selectChain;
      },
      insert: () => ({
        values: () => ({
          returning: async () => {
            if (opts.insertThrows) throw opts.insertThrows;
            return [opts.insertReturns];
          },
        }),
      }),
    };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
  }

  it("stores clientKey on create", async () => {
    const { uploadStagingBlob } = await import("@/lib/blob");
    vi.mocked(uploadStagingBlob).mockResolvedValue("blob/key.jpg");

    mockDbChain({
      insertReturns: {
        id: "r1",
        blobKey: "blob/key.jpg",
        clientKey,
        status: "pending",
        uploadedBy: user.id,
        uploadedAt: new Date(),
      },
    });

    const { createPendingReceipt } = await import("@/lib/receipts");
    const { receipt, created } = await createPendingReceipt(user, validFile, clientKey);

    expect(created).toBe(true);
    expect(receipt.clientKey).toBe(clientKey);
    expect(uploadStagingBlob).toHaveBeenCalled();
  });

  it("returns existing receipt on duplicate clientKey without re-upload", async () => {
    const { uploadStagingBlob } = await import("@/lib/blob");
    const existing = {
      id: "r-existing",
      blobKey: "blob/old.jpg",
      clientKey,
      status: "pending",
      uploadedBy: user.id,
      uploadedAt: new Date(),
    };

    mockDbChain({ existingByKey: existing });

    const { createPendingReceipt } = await import("@/lib/receipts");
    const { receipt, created } = await createPendingReceipt(user, validFile, clientKey);

    expect(created).toBe(false);
    expect(receipt.id).toBe("r-existing");
    expect(uploadStagingBlob).not.toHaveBeenCalled();
  });

  it("always inserts when no clientKey is provided", async () => {
    const { uploadStagingBlob } = await import("@/lib/blob");
    vi.mocked(uploadStagingBlob).mockResolvedValue("blob/new.jpg");

    mockDbChain({
      insertReturns: {
        id: "r2",
        blobKey: "blob/new.jpg",
        clientKey: null,
        status: "pending",
        uploadedBy: user.id,
        uploadedAt: new Date(),
      },
    });

    const { createPendingReceipt } = await import("@/lib/receipts");
    const { created } = await createPendingReceipt(user, validFile);
    expect(created).toBe(true);
    expect(uploadStagingBlob).toHaveBeenCalled();
  });

  it("returns existing row on unique-index conflict race", async () => {
    const { uploadStagingBlob, deleteBlob } = await import("@/lib/blob");
    vi.mocked(uploadStagingBlob).mockResolvedValue("blob/race.jpg");

    mockDbChain({
      insertThrows: new Error("duplicate key value violates unique constraint"),
      raceExisting: {
        id: "r-race",
        blobKey: "blob/race.jpg",
        clientKey,
        status: "pending",
        uploadedBy: user.id,
        uploadedAt: new Date(),
      },
    });

    const { createPendingReceipt } = await import("@/lib/receipts");
    const { receipt, created } = await createPendingReceipt(user, validFile, clientKey);

    expect(created).toBe(false);
    expect(receipt.id).toBe("r-race");
    expect(deleteBlob).toHaveBeenCalledWith("blob/race.jpg");
  });
});
