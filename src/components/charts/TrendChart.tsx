"use client";

import { useId } from "react";
import { formatCad } from "@/lib/money";
import type { TrendPoint } from "@/lib/chart-data";

type TrendChartProps = {
  data: TrendPoint[];
};

const VIEW_W = 600;
const VIEW_H = 200;
const PAD_X = 8;
const PAD_Y = 16;

/**
 * Responsive SVG area/line chart of spending over time. Renders a text
 * fallback (and a screen-reader summary) when there are fewer than 2 points.
 */
export function TrendChart({ data }: TrendChartProps) {
  const gradientId = useId();

  if (data.length < 2) {
    return (
      <p className="chart-fallback">
        Not enough data yet to chart a spending trend. Add a few more expenses across
        different dates.
      </p>
    );
  }

  const max = Math.max(...data.map((p) => p.totalCents), 1);
  const innerW = VIEW_W - PAD_X * 2;
  const innerH = VIEW_H - PAD_Y * 2;

  const points = data.map((p, i) => {
    const x = PAD_X + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);
    const y = PAD_Y + innerH - (p.totalCents / max) * innerH;
    return { x, y, point: p };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M${points[0].x.toFixed(1)},${(VIEW_H - PAD_Y).toFixed(1)} ` +
    points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L${points[points.length - 1].x.toFixed(1)},${(VIEW_H - PAD_Y).toFixed(1)} Z`;

  const total = data.reduce((sum, p) => sum + p.totalCents, 0);
  const summary = `Spending trend across ${data.length} periods from ${data[0].bucketLabel} to ${data[data.length - 1].bucketLabel}, totalling ${formatCad(total)}. Peak period ${formatCad(max)}.`;

  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={summary}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p) => (
          <circle
            key={p.point.periodStart}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="var(--surface)"
            stroke="var(--primary)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <figcaption className="chart-legend-row" style={{ marginTop: "var(--space-2)" }}>
        <span className="muted">{data[0].bucketLabel}</span>
        <span style={{ flex: 1 }} />
        <span className="muted">{data[data.length - 1].bucketLabel}</span>
      </figcaption>
    </figure>
  );
}
