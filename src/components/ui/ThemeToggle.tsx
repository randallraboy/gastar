"use client";

import { faDesktop, faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "@/components/ui/Icon";
import { useTheme } from "@/components/ui/ThemeProvider";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; icon: IconDefinition; label: string }[] = [
  { value: "light", icon: faSun, label: "Light theme" },
  { value: "system", icon: faDesktop, label: "System theme" },
  { value: "dark", icon: faMoon, label: "Dark theme" },
];

/**
 * Segmented light/system/dark control. Any theme is reachable in a single tap
 * and the choice persists via ThemeProvider.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={preference === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => setPreference(option.value)}
        >
          <Icon name={option.icon} />
        </button>
      ))}
    </div>
  );
}
