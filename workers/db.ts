import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../db/schema.ts";

// Workers cannot import "@/db" (path aliases don't resolve under plain
// node), so they bootstrap their own client. Same lazy singleton shape,
// same rule: the runtime role must be one that row-level security can
// constrain, because these workers read a target by id with no user filter.
export type WorkerDb = PostgresJsDatabase<typeof schema>;

let db: WorkerDb | null = null;
let rlsChecked = false;

export function getWorkerDb(): WorkerDb {
  if (!db) {
    const url = process.env.APP_DATABASE_URL;
    if (!url) {
      throw new Error(
        "APP_DATABASE_URL is not set. The worker must connect as the non-superuser " +
          "reachsmith_app role so tenant RLS applies; DATABASE_URL bypasses it.",
      );
    }
    db = drizzle(postgres(url), { schema });
  }
  return db;
}

async function assertRlsApplies(): Promise<void> {
  if (rlsChecked) {
    return;
  }
  const [role] = await getWorkerDb().execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
    sql`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
  );
  if (!role || role.rolsuper || role.rolbypassrls) {
    throw new Error(
      "The worker database role is a superuser or has BYPASSRLS, so tenant " +
        "row-level security does not apply.",
    );
  }
  rlsChecked = true;
}

// Run a job's queries as one tenant.
//
// The userId comes off the queue payload, which is not trusted. That is safe
// precisely because the policy treats it as a scope and not a grant: it can
// only ever widen the worker to rows that already belong to that user, never
// past them. A forged payload naming someone else's target resolves to zero
// rows and the job exits, and the ownership-chain re-check in the job body
// still runs on top.
export async function asUser<T>(
  userId: string,
  run: (db: WorkerDb) => Promise<T>,
): Promise<T> {
  await assertRlsApplies();
  return getWorkerDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
    return run(tx as WorkerDb);
  });
}
