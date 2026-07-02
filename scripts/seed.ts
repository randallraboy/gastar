import "./load-env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const DEFAULT_CATEGORIES = [
  {
    name: "Groceries",
    keywords: ["grocery", "supermarket", "metro", "loblaws", "sobeys"],
  },
  {
    name: "Dining",
    keywords: ["restaurant", "cafe", "coffee", "tim hortons", "starbucks"],
  },
  {
    name: "Transport",
    keywords: ["uber", "lyft", "transit", "gas", "parking", "presto"],
  },
  { name: "Housing", keywords: ["rent", "mortgage", "property"] },
  {
    name: "Utilities",
    keywords: ["hydro", "electric", "water", "internet", "bell", "rogers"],
  },
  { name: "Health", keywords: ["pharmacy", "shoppers", "doctor", "dental", "medical"] },
  {
    name: "Entertainment",
    keywords: ["netflix", "spotify", "cinema", "movie", "game"],
  },
  { name: "Shopping", keywords: ["amazon", "walmart", "costco", "retail", "store"] },
  { name: "Travel", keywords: ["airline", "hotel", "airbnb", "flight", "vacation"] },
  { name: "Uncategorized", keywords: [], isSystem: true },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const sqlClient = neon(url);
  const db = drizzle(sqlClient, { schema });

  for (const cat of DEFAULT_CATEGORIES) {
    const [existing] = await db
      .select()
      .from(schema.categories)
      .where(sql`lower(${schema.categories.name}) = lower(${cat.name})`)
      .limit(1);

    if (!existing) {
      await db.insert(schema.categories).values({
        name: cat.name,
        keywords: [...cat.keywords],
        isSystem: "isSystem" in cat ? cat.isSystem : false,
      });
      console.log(`Seeded category: ${cat.name}`);
    }
  }

  console.log("Seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
