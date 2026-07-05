import { describe, expect, it } from "vitest";

import { receiptNoteSchema } from "@/lib/validation";

describe("receiptNoteSchema", () => {
  it("trims surrounding whitespace", () => {
    const result = receiptNoteSchema.safeParse("  the fan is a Wants item  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("the fan is a Wants item");
    }
  });

  it("accepts a note exactly 250 characters long", () => {
    const note = "x".repeat(250);
    const result = receiptNoteSchema.safeParse(note);
    expect(result.success).toBe(true);
  });

  it("rejects a note longer than 250 characters with a clear message", () => {
    const result = receiptNoteSchema.safeParse("x".repeat(251));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Note must be 250 characters or fewer",
      );
    }
  });

  it("treats whitespace-only input as an empty note", () => {
    const result = receiptNoteSchema.safeParse("   ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("");
    }
  });

  it("accepts null and undefined (no note)", () => {
    expect(receiptNoteSchema.safeParse(null).success).toBe(true);
    expect(receiptNoteSchema.safeParse(undefined).success).toBe(true);
  });
});
