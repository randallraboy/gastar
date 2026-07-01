import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { timingSafeEqual } from "crypto";

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

describe("authz helpers", () => {
  const original = process.env.ALLOWED_EMAILS;

  beforeEach(() => {
    process.env.ALLOWED_EMAILS = "allowed@test.com,other@test.com";
  });

  afterEach(() => {
    process.env.ALLOWED_EMAILS = original;
  });

  it("parses allowlist", () => {
    const allowed = new Set(
      (process.env.ALLOWED_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
    expect(allowed.has("allowed@test.com")).toBe(true);
    expect(allowed.has("blocked@test.com")).toBe(false);
  });

  it("compares harness tokens in constant time", () => {
    expect(constantTimeEqual("secret-token", "secret-token")).toBe(true);
    expect(constantTimeEqual("secret-token", "wrong-token")).toBe(false);
    expect(constantTimeEqual("short", "longer")).toBe(false);
  });
});
