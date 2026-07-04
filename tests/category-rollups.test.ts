import { describe, expect, it } from "vitest";
import { BUDGET_CATEGORIES } from "@/lib/budget-categories";
import {
  buildCategoryTotals,
  buildTree,
  getCategoryPath,
  getDescendantIds,
  indexCategories,
} from "@/lib/category-tree";
import { FIXTURE_FLAT } from "./fixtures/category-tree";

describe("category rollups", () => {
  it("collects descendant ids for subtree filter", () => {
    const ids = getDescendantIds("food-id", FIXTURE_FLAT);
    expect([...ids].sort()).toEqual(["food-id", "groceries-id"].sort());
  });

  it("bubbles expense amounts to ancestors", () => {
    const amounts = new Map([
      ["groceries-id", 1000],
      ["dining-id", 500],
    ]);
    const totals = buildCategoryTotals(FIXTURE_FLAT, amounts);
    const needs = totals.find((t) => t.categoryId === "needs-id");
    const wants = totals.find((t) => t.categoryId === "wants-id");
    expect(needs?.sumCents).toBe(1000);
    expect(wants?.sumCents).toBe(500);
    const food = needs?.children.find((c) => c.categoryId === "food-id");
    expect(food?.sumCents).toBe(1000);
  });

  it("builds category path from node to root", () => {
    const byId = indexCategories(FIXTURE_FLAT);
    expect(getCategoryPath("groceries-id", byId)).toEqual([
      "Needs",
      "Food",
      "Groceries",
    ]);
  });

  it("builds tree with sorted children", () => {
    const tree = buildTree(FIXTURE_FLAT);
    expect(tree.map((n) => n.name)).toEqual(BUDGET_CATEGORIES);
    expect(tree[0].children[0].name).toBe("Food");
  });
});

describe("budget categories enum", () => {
  it("defines exactly three buckets", () => {
    expect(BUDGET_CATEGORIES).toEqual(["Needs", "Wants", "Savings"]);
  });
});
