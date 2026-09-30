import { and, desc, eq, sql } from "drizzle-orm";
import type { WorkerDb } from "./db.ts";
import { emailGuesses, targets } from "../db/schema.ts";

export interface VerifierResponse {
  result?: string;
  safe_to_send?: number | boolean | string;
  accept_all?: number | boolean | string;
  disposable?: number | boolean | string;
  role?: number | boolean | string;
  [key: string]: unknown;
}

export type TerminalStatus = "valid" | "invalid" | "unknown" | "accept_all";

// Provider flags can be string booleans. Only an affirmative safe-to-send
// result without catch-all, role, or disposable evidence becomes valid.
export function mapResult(data: VerifierResponse): TerminalStatus {
  const yes = (value: unknown) => value === true || value === 1 || value === "true" || value === "1";
  const result = (data.result ?? "").toLowerCase();
  if (result === "invalid" || result === "disposable" || yes(data.disposable)) return "invalid";
  if (result === "accept_all" || result === "catch_all" || yes(data.accept_all)) return "accept_all";
  if (result === "valid") {
    return yes(data.safe_to_send) && !yes(data.role) ? "valid" : "unknown";
  }
  return "unknown";
}

// Only a valid candidate moves primary_email; anything else leaves the
// target untouched. An owner's settled override wins: the provenance
// predicate is in the WHERE, so the guard is one statement and cannot
// race a manual write.
//
// Takes the caller's tenant-scoped db rather than opening its own, so this
// runs inside the job's RLS scope and cannot reach another tenant's row.
export async function recomputePrimaryEmail(db: WorkerDb, targetId: string): Promise<void> {
  const guesses = await db
    .select()
    .from(emailGuesses)
    .where(
      and(eq(emailGuesses.targetId, targetId), eq(emailGuesses.status, "valid")),
    )
    .orderBy(desc(emailGuesses.score), desc(emailGuesses.createdAt));
  const best = guesses[0];
  if (!best) {
    return;
  }
  await db
    .update(targets)
    .set({ primaryEmail: best.email, primaryEmailSource: "verified", updatedAt: new Date() })
    .where(
      and(
        eq(targets.id, targetId),
        eq(targets.userId, best.userId),
        sql`${targets.primaryEmailSource} is distinct from 'manual'`,
      ),
    );
}
