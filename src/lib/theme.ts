export type ThemePreference = "system" | "light" | "dark";
export type EffectiveTheme = "light" | "dark";

/** localStorage key shared by ThemeProvider and the no-FOUC inline script. */
export const THEME_STORAGE_KEY = "gastar.theme";

const PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];

/**
 * Resolve the theme that should actually render.
 * Precedence: an explicit light/dark preference always wins over the OS
 * setting; "system" defers to `prefersDark`.
 */
export function resolveEffectiveTheme(
  pref: ThemePreference,
  prefersDark: boolean,
): EffectiveTheme {
  if (pref === "light" || pref === "dark") return pref;
  return prefersDark ? "dark" : "light";
}

/** Parse a possibly-invalid stored value into a valid preference. */
export function normalizeThemePreference(raw: string | null): ThemePreference {
  if (raw && (PREFERENCES as readonly string[]).includes(raw)) {
    return raw as ThemePreference;
  }
  return "system";
}
