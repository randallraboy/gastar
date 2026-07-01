import { describe, expect, it } from "vitest";
import { normalizeMerchant } from "@/lib/normalize";

describe("normalizeMerchant", () => {
  it("lowercases and trims", () => {
    expect(normalizeMerchant("  Metro  ")).toBe("metro");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeMerchant("Tim Horton's  #123")).toBe("tim hortons 123");
  });
});
