import { describe, expect, it } from "vitest";
import { toTrendSeries, toCategorySlices } from "@/lib/chart-data";

describe("toTrendSeries", () => {
  it("returns an empty series for no items (fallback)", () => {
    expect(toTrendSeries([], {})).toEqual([]);
  });

  it("returns a single point for one item (fallback)", () => {
    const series = toTrendSeries([{ expenseDate: "2026-07-01", amountCents: 500 }], {});
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({ periodStart: "2026-07-01", totalCents: 500 });
  });

  it("buckets by day within a short range and sums amounts", () => {
    const series = toTrendSeries(
      [
        { expenseDate: "2026-07-03", amountCents: 300 },
        { expenseDate: "2026-07-01", amountCents: 100 },
        { expenseDate: "2026-07-01", amountCents: 200 },
      ],
      { from: "2026-07-01", to: "2026-07-05" },
    );
    expect(series.map((p) => p.periodStart)).toEqual(["2026-07-01", "2026-07-03"]);
    expect(series[0].totalCents).toBe(300);
    expect(series[1].totalCents).toBe(300);
  });

  it("is sorted ascending by period start", () => {
    const series = toTrendSeries(
      [
        { expenseDate: "2026-03-15", amountCents: 100 },
        { expenseDate: "2026-01-05", amountCents: 100 },
        { expenseDate: "2026-02-10", amountCents: 100 },
      ],
      {},
    );
    const starts = series.map((p) => p.periodStart);
    expect(starts).toEqual([...starts].sort());
  });

  it("buckets by month for long ranges", () => {
    const series = toTrendSeries(
      [
        { expenseDate: "2026-01-05", amountCents: 100 },
        { expenseDate: "2026-01-20", amountCents: 150 },
        { expenseDate: "2026-06-10", amountCents: 200 },
      ],
      { from: "2026-01-01", to: "2026-12-31" },
    );
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ periodStart: "2026-01-01", totalCents: 250 });
    expect(series[0].bucketLabel).toBe("Jan");
    expect(series[1]).toMatchObject({ periodStart: "2026-06-01", totalCents: 200 });
  });
});

describe("toCategorySlices", () => {
  it("returns empty for zero total (fallback)", () => {
    expect(
      toCategorySlices([
        { categoryId: "a", name: "Needs", bucket: "Needs", sumCents: 0 },
      ]),
    ).toEqual([]);
  });

  it("sorts descending by amount with shares summing to ~1", () => {
    const slices = toCategorySlices([
      { categoryId: "n", name: "Needs", bucket: "Needs", sumCents: 250 },
      { categoryId: "w", name: "Wants", bucket: "Wants", sumCents: 500 },
      { categoryId: "s", name: "Savings", bucket: "Savings", sumCents: 250 },
    ]);
    expect(slices.map((s) => s.label)).toEqual(["Wants", "Needs", "Savings"]);
    expect(slices[0].share).toBeCloseTo(0.5, 5);
    expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 5);
  });

  it("assigns per-bucket accent tokens", () => {
    const slices = toCategorySlices([
      { categoryId: "w", name: "Wants", bucket: "Wants", sumCents: 100 },
    ]);
    expect(slices[0].accent).toBe("var(--accent-wants)");
  });

  it("groups tail slices into an Other group", () => {
    const totals = Array.from({ length: 8 }, (_, i) => ({
      categoryId: `c${i}`,
      name: `Cat ${i}`,
      bucket: "Needs" as const,
      sumCents: (8 - i) * 100,
    }));
    const slices = toCategorySlices(totals);
    expect(slices).toHaveLength(6);
    const other = slices[slices.length - 1];
    expect(other.label).toBe("Other");
    expect(other.categoryId).toBe("__other__");
    expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 5);
  });
});
