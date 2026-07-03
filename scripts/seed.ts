import "./load-env";

/**
 * Seed script placeholder — budget categories are fixed (Needs, Wants, Savings)
 * and no longer require database seeding.
 */
async function main() {
  console.log("No seed data required (budget categories are fixed enums)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
