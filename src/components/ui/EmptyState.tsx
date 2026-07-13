import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "@/components/ui/Icon";

type EmptyStateProps = {
  icon: IconDefinition;
  title: string;
  description: string;
  action?: React.ReactNode;
};

/** Explains an empty screen's purpose and offers the primary next action. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon name={icon} />
      </span>
      <span className="empty-state-title">{title}</span>
      <span className="empty-state-description">{description}</span>
      {action}
    </div>
  );
}
