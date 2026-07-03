import "./load-env";
import { neon } from "@neondatabase/serverless";

const CATEGORY_MAPPING_SQL = `
  CASE lower(c.name)
    WHEN 'groceries' THEN 'Needs'
    WHEN 'dining' THEN 'Wants'
    WHEN 'transport' THEN 'Needs'
    WHEN 'housing' THEN 'Needs'
    WHEN 'utilities' THEN 'Needs'
    WHEN 'health' THEN 'Needs'
    WHEN 'entertainment' THEN 'Wants'
    WHEN 'shopping' THEN 'Wants'
    WHEN 'travel' THEN 'Wants'
    WHEN 'uncategorized' THEN 'Needs'
    ELSE 'Needs'
  END
`;

/**
 * Populates the new `category` text columns from the legacy `categories` table
 * before the structural migration drops category_id FKs and the categories table.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const sql = neon(url);

  await sql(`
    UPDATE expenses e
    SET category = ${CATEGORY_MAPPING_SQL}
    FROM categories c
    WHERE e.category_id = c.id AND e.category IS NULL
  `);

  await sql(`
    UPDATE merchant_corrections mc
    SET category = ${CATEGORY_MAPPING_SQL}
    FROM categories c
    WHERE mc.category_id = c.id AND mc.category IS NULL
  `);

  console.log("Budget category data migration complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
