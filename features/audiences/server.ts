import { and, eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { audiences, type Audience } from "@/db/schema";
import * as schema from "@/db/schema";
import type { ApiAudience } from "./validation";

// Suggestions every account starts with. A constant, not rows: nothing to
// seed per user, nothing to backfill, and nothing to delete. A user's own
// presets layer on top and win on a case-insensitive name match.
export const DEFAULT_AUDIENCES = ["HR", "Recruiter", "Founder", "Generic"] as const;

type Db = PostgresJsDatabase<typeof schema>;

export function toAudienceJson(audience: Audience): ApiAudience {
  return { id: audience.id, name: audience.name };
}

// Caller's own rows first, then the defaults that are not already covered.
export function mergeAudiences(rows: Audience[]): ApiAudience[] {
  const seen = new Set(rows.map((row) => row.name.toLowerCase()));
  const own = rows.map(toAudienceJson);
  const defaults = DEFAULT_AUDIENCES.filter((name) => !seen.has(name.toLowerCase())).map(
    (name) => ({ id: null, name }),
  );
  return [...own, ...defaults];
}

// Find the caller's preset by name, creating it if it is new. Runs on the
// caller's transaction, so RLS and the user_id predicate both apply.
//
// ON CONFLICT DO NOTHING is what makes this safe to call on every save:
// without it, two concurrent saves of a new audience both miss the select
// and the loser takes a unique violation that aborts the whole transaction.
// With it, the loser inserts nothing and falls through to the re-select.
export async function resolveAudienceId(db: Db, userId: string, name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (trimmed === "") {
    return null;
  }
  const existing = await findByName(db, userId, trimmed);
  if (existing) {
    return existing;
  }
  const inserted = await db
    .insert(audiences)
    .values({ userId, name: trimmed })
    .onConflictDoNothing()
    .returning({ id: audiences.id });
  const id = inserted[0]?.id;
  if (id) {
    return id;
  }
  return await findByName(db, userId, trimmed);
}

async function findByName(db: Db, userId: string, name: string): Promise<string | null> {
  const [row] = await db
    .select({ id: audiences.id })
    .from(audiences)
    .where(
      and(eq(audiences.userId, userId), sql`lower(${audiences.name}) = lower(${name})`),
    )
    .limit(1);
  return row?.id ?? null;
}
