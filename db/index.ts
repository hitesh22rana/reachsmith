import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

interface GlobalDbCache {
  __reachsmithDb?: PostgresJsDatabase<typeof schema>;
}

const globalForDb = globalThis as unknown as GlobalDbCache;

function createDb(): PostgresJsDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(postgres(url), { schema });
}

// Lazy singleton: importing this module never connects.
// First use without DATABASE_URL throws, so pages render without env
// and API routes can translate that into a 500.
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!globalForDb.__reachsmithDb) {
    globalForDb.__reachsmithDb = createDb();
  }
  return globalForDb.__reachsmithDb;
}
