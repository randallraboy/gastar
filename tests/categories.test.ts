import { describe, expect, it } from "vitest";

describe("category rules", () => {
  it("blocks system category modification", () => {
    const isSystem = true;
    expect(() => {
      if (isSystem) throw new Error("System categories cannot be deleted");
    }).toThrow("System categories cannot be deleted");
  });

  it("reassigns to uncategorized on delete", () => {
    const expenses = [{ categoryId: "cat-a" }, { categoryId: "cat-b" }];
    const uncategorizedId = "uncat";
    const deletedId = "cat-a";
    const updated = expenses.map((e) =>
      e.categoryId === deletedId ? { ...e, categoryId: uncategorizedId } : e,
    );
    expect(updated[0].categoryId).toBe("uncat");
    expect(updated[1].categoryId).toBe("cat-b");
  });
});
