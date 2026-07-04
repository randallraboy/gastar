import "./load-env";
import { getDb } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/budget-categories";
import { and, eq, isNull } from "drizzle-orm";

type SeedLeaf = { name: string; keywords: string[] };
type SeedMid = { name: string; children: SeedLeaf[] };
type SeedDirect = { name: string; keywords: string[] };

const SEED_TREE: Record<BudgetCategory, { mids: SeedMid[]; direct: SeedDirect[] }> = {
  Needs: {
    mids: [
      {
        name: "Food",
        children: [
          {
            name: "Groceries",
            keywords: ["grocery", "supermarket", "metro", "loblaws", "sobeys"],
          },
        ],
      },
      {
        name: "Transport",
        children: [
          { name: "Rideshare", keywords: ["uber", "lyft"] },
          { name: "Public Transit", keywords: ["transit", "presto"] },
          { name: "Fuel & Parking", keywords: ["gas", "parking"] },
        ],
      },
      {
        name: "Housing",
        children: [
          { name: "Rent", keywords: ["rent"] },
          { name: "Mortgage", keywords: ["mortgage", "property"] },
        ],
      },
      {
        name: "Utilities",
        children: [
          { name: "Hydro & Electric", keywords: ["hydro", "electric"] },
          { name: "Water", keywords: ["water"] },
          { name: "Internet & Phone", keywords: ["internet", "bell", "rogers"] },
        ],
      },
      {
        name: "Health",
        children: [
          { name: "Pharmacy", keywords: ["pharmacy", "shoppers"] },
          { name: "Medical", keywords: ["doctor", "dental", "medical"] },
        ],
      },
    ],
    direct: [],
  },
  Wants: {
    mids: [
      {
        name: "Food & Drink",
        children: [
          { name: "Dining", keywords: ["restaurant", "cafe"] },
          { name: "Coffee", keywords: ["coffee", "tim hortons", "starbucks"] },
        ],
      },
      {
        name: "Entertainment",
        children: [
          { name: "Streaming", keywords: ["netflix", "spotify"] },
          { name: "Movies & Games", keywords: ["cinema", "movie", "game"] },
        ],
      },
      {
        name: "Shopping",
        children: [
          {
            name: "General Retail",
            keywords: ["amazon", "walmart", "costco", "retail", "store"],
          },
        ],
      },
      {
        name: "Travel",
        children: [
          { name: "Flights", keywords: ["airline", "flight"] },
          { name: "Lodging", keywords: ["hotel", "airbnb"] },
          { name: "Vacation", keywords: ["vacation"] },
        ],
      },
    ],
    direct: [],
  },
  Savings: {
    mids: [],
    direct: [
      { name: "Investments", keywords: ["investment", "rrsp", "tfsa"] },
      { name: "Contributions", keywords: ["savings", "contribution"] },
    ],
  },
};

async function upsertChild(
  parentId: string | null,
  bucket: BudgetCategory,
  name: string,
  keywords: string[],
  displayOrder: number,
  isBucket: boolean,
): Promise<string> {
  const db = getDb();
  const parentCondition = parentId
    ? eq(categories.parentId, parentId)
    : isNull(categories.parentId);

  const [existing] = await db
    .select()
    .from(categories)
    .where(and(parentCondition, eq(categories.name, name)))
    .limit(1);

  if (existing) {
    await db
      .update(categories)
      .set({ keywords, displayOrder, bucket, isBucket })
      .where(eq(categories.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(categories)
    .values({
      parentId,
      name,
      bucket,
      isBucket,
      displayOrder,
      keywords,
    })
    .returning({ id: categories.id });

  return created.id;
}

async function seedBucket(bucket: BudgetCategory, bucketOrder: number): Promise<void> {
  const bucketId = await upsertChild(null, bucket, bucket, [], bucketOrder, true);
  const config = SEED_TREE[bucket];

  for (let mi = 0; mi < config.mids.length; mi++) {
    const mid = config.mids[mi];
    const midId = await upsertChild(bucketId, bucket, mid.name, [], mi, false);
    for (let li = 0; li < mid.children.length; li++) {
      const leaf = mid.children[li];
      await upsertChild(midId, bucket, leaf.name, leaf.keywords, li, false);
    }
  }

  for (let di = 0; di < config.direct.length; di++) {
    const leaf = config.direct[di];
    await upsertChild(
      bucketId,
      bucket,
      leaf.name,
      leaf.keywords,
      config.mids.length + di,
      false,
    );
  }
}

async function main() {
  console.log("Seeding category hierarchy…");
  for (let i = 0; i < BUDGET_CATEGORIES.length; i++) {
    await seedBucket(BUDGET_CATEGORIES[i], i);
  }
  console.log("Category seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
