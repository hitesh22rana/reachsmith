import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

interface GlobalDbCache {
  __reachsmithDb?: PostgresJsDatabase<typeof schema>;
  __reachsmithRlsChecked?: boolean;
}

const globalForDb = globalThis as unknown as GlobalDbCache;

function createDb(): PostgresJsDatabase<typeof schema> {
  // APP_DATABASE_URL, not DATABASE_URL. DATABASE_URL is the owner role that
  // runs migrations, and an owner or superuser bypasses row-level security
  // outright, which would make every tenant policy silently inert.
  const url = process.env.APP_DATABASE_URL;
  if (!url) {
    throw new Error(
      "APP_DATABASE_URL is not set. The runtime must connect as the non-superuser " +
        "reachsmith_app role so tenant RLS applies; DATABASE_URL (owner) bypasses it.",
    );
  }
  return drizzle(postgres(url), { schema });
}

// Lazy singleton: importing this module never connects.
// First use without APP_DATABASE_URL throws, so pages render without env
// and API routes can translate that into a 500.
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (!globalForDb.__reachsmithDb) {
    globalForDb.__reachsmithDb = createDb();
  }
  return globalForDb.__reachsmithDb;
}

// Refuse to hand out a connection that cannot be constrained. A superuser or
// a BYPASSRLS role ignores the tenant policies no matter what the schema
// says, and that failure is invisible: queries succeed and quietly return
// other tenants' rows. Checked once per process.
async function assertRlsApplies(): Promise<void> {
  if (globalForDb.__reachsmithRlsChecked) {
    return;
  }
  const [role] = await getDb().execute<{ rolsuper: boolean; rolbypassrls: boolean }>(
    sql`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
  );
  if (!role) {
    throw new Error("Could not verify the database role can be constrained by RLS");
  }
  if (role.rolsuper || role.rolbypassrls) {
    throw new Error(
      "The database role is a superuser or has BYPASSRLS, so tenant row-level " +
        "security does not apply. Point APP_DATABASE_URL at the non-superuser " +
        "reachsmith_app role, or drop the privileges on this role.",
    );
  }
  globalForDb.__reachsmithRlsChecked = true;
}

// Run queries as one tenant. The GUC is transaction-local, so the identity
// cannot leak to the next request that borrows this pooled connection, and
// every statement in the callback is filtered by the same policy.
//
// Always pass the session user id. With the GUC unset the policy evaluates
// to NULL and the query returns nothing, which is the intended failure mode:
// an unscoped query is quiet, never a leak.
export async function forUser<T>(
  userId: string,
  run: (db: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  await assertRlsApplies();
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`);
    return run(tx as PostgresJsDatabase<typeof schema>);
  });
}
