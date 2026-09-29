import { and, eq, sql } from "drizzle-orm";
import type { WorkerDb } from "./db.ts";
import { emailGuesses, targets } from "../db/schema.ts";

// §7.5 preference order: most frequent pattern first; observed social
// handles outrank derived patterns below first.last.
export const PATTERN_PRIORITY = [
  "first.last",
  "handle",
  "f.last",
  "first",
  "first_last",
  "last.first",
  "f_last",
];

export interface VerifierResponse {
  result?: string;
  safe_to_send?: number | boolean;
  [key: string]: unknown;
}

export type TerminalStatus = "valid" | "invalid" | "unknown" | "accept_all";

// §7.4 mapping: valid + safe_to_send → valid; invalid/disposable → invalid;
// catch-all → accept_all; everything else → unknown.
export function mapResult(data: VerifierResponse): TerminalStatus {
  const result = (data.result ?? "").toLowerCase();
  const safe = data.safe_to_send === 1 || data.safe_to_send === true;
  if (result === "valid" && safe) {
    return "valid";
  }
  if (result === "invalid" || result === "disposable") {
    return "invalid";
  }
  if (result === "accept_all" || result === "catch_all" || result === "valid") {
    return "accept_all";
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
    );
  if (guesses.length === 0) {
    return;
  }
  const rank = (pattern: string): number => {
    const index = PATTERN_PRIORITY.indexOf(pattern);
    return index === -1 ? PATTERN_PRIORITY.length : index;
  };
  const best = guesses.sort((a, b) => rank(a.patternUsed) - rank(b.patternUsed))[0];
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
