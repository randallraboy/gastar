import { describe, expect, it } from "vitest";
import {
  dollarsToCents,
  centsToDollars,
  formatCad,
  parseDollarInput,
} from "@/lib/money";

describe("money", () => {
  it("converts dollars to cents", () => {
    expect(dollarsToCents(12.34)).toBe(1234);
  });

  it("converts cents to dollars", () => {
    expect(centsToDollars(1234)).toBe(12.34);
  });

  it("formats CAD", () => {
    expect(formatCad(1234)).toContain("12.34");
  });

  it("parses dollar input", () => {
    expect(parseDollarInput("$12.34")).toBe(1234);
  });

  it("rejects non-positive amounts", () => {
    expect(() => parseDollarInput("0")).toThrow("greater than zero");
    expect(() => parseDollarInput("-5")).toThrow();
  });
});
