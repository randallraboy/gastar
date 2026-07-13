import { describe, expect, it } from "vitest";
import {
  resolveEffectiveTheme,
  normalizeThemePreference,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

describe("resolveEffectiveTheme", () => {
  it("uses system preference when set to system", () => {
    expect(resolveEffectiveTheme("system", true)).toBe("dark");
    expect(resolveEffectiveTheme("system", false)).toBe("light");
  });

  it("lets an explicit preference override the system setting", () => {
    expect(resolveEffectiveTheme("light", true)).toBe("light");
    expect(resolveEffectiveTheme("dark", false)).toBe("dark");
  });
});

describe("normalizeThemePreference", () => {
  it("passes through valid preferences", () => {
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
  });

  it("falls back to system for null or invalid values", () => {
    expect(normalizeThemePreference(null)).toBe("system");
    expect(normalizeThemePreference("")).toBe("system");
    expect(normalizeThemePreference("purple")).toBe("system");
    expect(normalizeThemePreference("DARK")).toBe("system");
  });
});

describe("THEME_STORAGE_KEY", () => {
  it("is the shared gastar.theme key", () => {
    expect(THEME_STORAGE_KEY).toBe("gastar.theme");
  });
});
