"use client";

import { formatCad } from "@/lib/money";
import type { CategorySlice } from "@/lib/chart-data";

type CategoryBreakdownChartProps = {
  data: CategorySlice[];
};

// r chosen so the circumference is 100 units — makes dash math read as percent.
const RADIUS = 15.915;

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/**
 * Category breakdown as a donut with legend on wide screens, degrading to
 * labeled horizontal bars on narrow screens (CSS-driven). Renders a text
 * fallback and screen-reader summary when there is no data.
 */
export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <p className="chart-fallback">
        No spending to break down yet. Confirmed expenses will appear here by category.
      </p>
    );
  }

  let cumulative = 0;
  const segments = data.map((slice) => {
    const length = slice.share * 100;
    // Offset so the first slice starts at the 12 o'clock position.
    const offset = 25 - cumulative;
    cumulative += length;
    return { slice, length, offset };
  });

  const summary =
    "Spending by category: " +
    data
      .map((s) => `${s.label} ${formatCad(s.amountCents)} (${percent(s.share)})`)
      .join(", ") +
    ".";

  return (
    <div>
      <div className="chart-donut" role="img" aria-label={summary}>
        <svg className="chart-svg" viewBox="0 0 42 42" style={{ maxWidth: 200 }}>
          <circle
            cx="21"
            cy="21"
            r={RADIUS}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth="6"
          />
          {segments.map(({ slice, length, offset }) => (
            <circle
              key={slice.categoryId}
              cx="21"
              cy="21"
              r={RADIUS}
              fill="none"
              stroke={slice.accent}
              strokeWidth="6"
              strokeDasharray={`${length} ${100 - length}`}
              strokeDashoffset={offset}
              transform="rotate(-90 21 21)"
            />
          ))}
        </svg>
      </div>

      <div className="chart-bars" role="img" aria-label={summary}>
        {data.map((slice) => (
          <div key={slice.categoryId} style={{ marginBottom: "var(--space-2)" }}>
            <div className="chart-legend-row">
              <span className="chart-legend-label">{slice.label}</span>
              <span className="chart-legend-value">{percent(slice.share)}</span>
            </div>
            <div className="chart-bar-track">
              <div
                className="chart-bar-fill"
                style={{ width: percent(slice.share), background: slice.accent }}
              />
            </div>
          </div>
        ))}
      </div>

      <ul className="chart-legend" aria-hidden="true">
        {data.map((slice) => (
          <li key={slice.categoryId} className="chart-legend-row">
            <span
              className="chart-legend-swatch"
              style={{ background: slice.accent }}
            />
            <span className="chart-legend-label">{slice.label}</span>
            <span className="chart-legend-value">
              {formatCad(slice.amountCents)} · {percent(slice.share)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
