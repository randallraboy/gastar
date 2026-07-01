import { describe, expect, it } from "vitest";
import {
  canProcessReceipt,
  canMarkUnreadable,
  canConvertToManual,
  isTerminalReceiptStatus,
} from "@/lib/receipt-state";
import { validateUploadFile, MAX_UPLOAD_BYTES } from "@/lib/validation";

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
