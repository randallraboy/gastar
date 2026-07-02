import { describe, expect, it, vi } from "vitest";

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
