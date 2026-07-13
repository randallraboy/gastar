import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { config, type IconDefinition } from "@fortawesome/fontawesome-svg-core";

// We import the FontAwesome CSS ourselves in the root layout, so disable the
// runtime style injection that otherwise causes a flash of huge icons on SSR.
config.autoAddCss = false;

type IconProps = {
  /** The FontAwesome icon definition to render. */
  name: IconDefinition;
  /**
   * Accessible name. When provided the icon is treated as meaningful and
   * exposed to assistive tech. When omitted the icon is decorative.
   */
  label?: string;
  /**
   * Force decorative (aria-hidden) rendering. Defaults to true when no
   * `label` is provided, false when a `label` is present.
   */
  decorative?: boolean;
  className?: string;
};

/**
 * Thin wrapper around FontAwesome that enforces the a11y contract from
 * contracts/ui-components.md: decorative icons are hidden from assistive
 * tech; icons with a `label` get an accessible name.
 */
export function Icon({ name, label, decorative, className }: IconProps) {
  const isDecorative = decorative ?? label === undefined;

  if (isDecorative) {
    return (
      <FontAwesomeIcon
        icon={name}
        className={["icon", className].filter(Boolean).join(" ")}
        aria-hidden="true"
      />
    );
  }

  return (
    <FontAwesomeIcon
      icon={name}
      className={["icon", className].filter(Boolean).join(" ")}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
