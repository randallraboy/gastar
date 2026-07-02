import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

/** Load `.env` then `.env.local` (same precedence as Next.js) for CLI scripts. */
const root = process.cwd();

for (const file of [".env", ".env.local"] as const) {
  const path = resolve(root, file);
  if (existsSync(path)) {
    config({ path, override: file === ".env.local" });
  }
}
