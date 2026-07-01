import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return url;
}

export function createDb() {
  const sql = neon(getDatabaseUrl());
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;

let dbInstance: Db | null = null;

export function getDb(): Db {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

export { schema };
