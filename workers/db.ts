import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.ts";

// Workers cannot import "@/db" (path aliases don't resolve under plain
// node), so they bootstrap their own client. Same lazy singleton shape.
let db: PostgresJsDatabase<typeof schema> | null = null;

export function getWorkerDb(): PostgresJsDatabase<typeof schema> {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    db = drizzle(postgres(url), { schema });
  }
  return db;
}
