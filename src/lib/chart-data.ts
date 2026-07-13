import type { BudgetCategory } from "@/lib/budget-categories";

export type TrendPoint = {
  /** Human-readable x-axis label for the bucket, e.g. "Jul 1" or "Jul". */
  bucketLabel: string;
  /** ISO date (YYYY-MM-DD) marking the start of the bucket period. */
  periodStart: string;
  /** Summed amount within the bucket, in cents. */
  totalCents: number;
};

export type CategorySlice = {
  categoryId: string;
  label: string;
  bucket: BudgetCategory;
  amountCents: number;
  /** Fraction of the visible total, 0–1. */
  share: number;
  /** Theme token used to color the slice. */
  accent: string;
};

type TrendItem = { expenseDate: string; amountCents: number };
type CategoryTotalInput = {
  categoryId: string;
  name: string;
  bucket: BudgetCategory;
  sumCents: number;
};

const MS_PER_DAY = 86_400_000;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const BUCKET_ACCENT: Record<BudgetCategory, string> = {
  Needs: "var(--accent-needs)",
  Wants: "var(--accent-wants)",
  Savings: "var(--accent-savings)",
};

type Granularity = "day" | "week" | "month";

function parseUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pickGranularity(spanDays: number): Granularity {
  if (spanDays <= 45) return "day";
  if (spanDays <= 210) return "week";
  return "month";
}

/** Returns the UTC period-start date for a value under the given granularity. */
function bucketStart(date: Date, granularity: Granularity): Date {
  if (granularity === "day") {
    return date;
  }
  if (granularity === "week") {
    // ISO week starts Monday. getUTCDay(): 0=Sun..6=Sat.
    const day = date.getUTCDay();
    const diff = (day + 6) % 7;
    return new Date(date.getTime() - diff * MS_PER_DAY);
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function bucketLabel(date: Date, granularity: Granularity): string {
  const month = MONTHS[date.getUTCMonth()];
  if (granularity === "month") {
    return month;
  }
  return `${month} ${date.getUTCDate()}`;
}

/**
 * Aggregate expense items into a time-ordered spending series. Bucket
 * granularity scales with the active range so the x-axis stays legible.
 * A result with 0–1 points is expected to trigger the chart's text fallback.
 */
export function toTrendSeries(
  items: TrendItem[],
  range: { from?: string; to?: string },
): TrendPoint[] {
  if (items.length === 0) return [];

  const dates = items.map((i) => i.expenseDate);
  const fromStr = range.from ?? dates.reduce((a, b) => (a < b ? a : b));
  const toStr = range.to ?? dates.reduce((a, b) => (a > b ? a : b));
  const spanDays = Math.max(
    0,
    (parseUtc(toStr).getTime() - parseUtc(fromStr).getTime()) / MS_PER_DAY,
  );
  const granularity = pickGranularity(spanDays);

  const buckets = new Map<string, { start: Date; totalCents: number }>();
  for (const item of items) {
    const start = bucketStart(parseUtc(item.expenseDate), granularity);
    const key = toIso(start);
    const existing = buckets.get(key);
    if (existing) {
      existing.totalCents += item.amountCents;
    } else {
      buckets.set(key, { start, totalCents: item.amountCents });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map(({ start, totalCents }) => ({
      periodStart: toIso(start),
      bucketLabel: bucketLabel(start, granularity),
      totalCents,
    }));
}

/**
 * Turn category totals into breakdown slices, sorted largest-first with each
 * slice's share of the visible total. A zero total yields an empty result
 * (chart fallback). Tiny tail slices are grouped into "Other".
 */
export function toCategorySlices(
  categoryTotals: CategoryTotalInput[],
): CategorySlice[] {
  const positive = categoryTotals.filter((c) => c.sumCents > 0);
  const total = positive.reduce((sum, c) => sum + c.sumCents, 0);
  if (total === 0) return [];

  const sorted = [...positive].sort((a, b) => b.sumCents - a.sumCents);

  const MAX_SLICES = 6;
  const head = sorted.length > MAX_SLICES ? sorted.slice(0, MAX_SLICES - 1) : sorted;
  const tail = sorted.length > MAX_SLICES ? sorted.slice(MAX_SLICES - 1) : [];

  const slices: CategorySlice[] = head.map((c) => ({
    categoryId: c.categoryId,
    label: c.name,
    bucket: c.bucket,
    amountCents: c.sumCents,
    share: c.sumCents / total,
    accent: BUCKET_ACCENT[c.bucket],
  }));

  if (tail.length > 0) {
    const tailTotal = tail.reduce((sum, c) => sum + c.sumCents, 0);
    slices.push({
      categoryId: "__other__",
      label: "Other",
      bucket: tail[0].bucket,
      amountCents: tailTotal,
      share: tailTotal / total,
      accent: "var(--muted)",
    });
  }

  return slices;
}
