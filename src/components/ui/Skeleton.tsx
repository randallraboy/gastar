type SkeletonProps = {
  variant?: "text" | "card" | "chart";
  count?: number;
  className?: string;
};

/**
 * Loading placeholder. The shimmer animation is disabled under
 * prefers-reduced-motion (handled in globals.css).
 */
export function Skeleton({ variant = "text", count = 1, className }: SkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) });
  return (
    <div aria-hidden="true">
      {items.map((_, i) => (
        <span
          key={i}
          className={["skeleton", `skeleton-${variant}`, className]
            .filter(Boolean)
            .join(" ")}
        />
      ))}
    </div>
  );
}
