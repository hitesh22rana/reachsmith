import "dotenv/config";
import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { asUser } from "./db.ts";
import { emailGuesses, targets } from "../db/schema.ts";
import { rankCandidates, resolveDomain } from "../lib/email-rank.ts";
import { emailInputs, emailInputKey } from "../lib/email-inputs.ts";

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return { url };
}

export async function processGuessJob(job: { data: { targetId: string; userId: string; generation: string } }): Promise<void> {
  // Tenant RLS is scoped by the payload's userId for the whole job. The
  // target lookup also checks its owner: a payload naming another tenant's
  // target simply matches nothing.
  try {
    await asUser(job.data.userId, async (db) => {
      const [target] = await db
        .select()
        .from(targets)
        .where(and(eq(targets.id, job.data.targetId), eq(targets.userId, job.data.userId)))
        .limit(1)
        // Serialize reruns with other jobs and target edits before replacing rows.
        .for("update");
      if (!target || target.emailGeneration?.id !== job.data.generation || target.emailGeneration.status === "completed") {
        return;
      }
      const ranked = rankCandidates(emailInputs(target));
      await db.delete(emailGuesses)
        .where(and(eq(emailGuesses.targetId, target.id), eq(emailGuesses.userId, target.userId)));
      await db.update(targets).set({ emailGeneration: {
        id: job.data.generation, status: "completed", inputKey: emailInputKey(target),
        domain: resolveDomain(target.domain, target.companyWebsite),
      } }).where(and(eq(targets.id, target.id), eq(targets.userId, target.userId)));
      if (ranked.length === 0) return;

      await db
        .insert(emailGuesses)
        .values(
          ranked.map((candidate, index) => ({
            userId: target.userId,
            targetId: target.id,
            email: candidate.email,
            patternUsed: candidate.pattern,
            source: candidate.source,
            score: ranked.length - index,
            context: candidate.context,
          })),
        );
    });
  } catch (error) {
    await asUser(job.data.userId, async (db) => {
      const predicate = and(eq(targets.id, job.data.targetId), eq(targets.userId, job.data.userId));
      const [target] = await db.select().from(targets).where(predicate).for("update");
      if (target?.emailGeneration?.id === job.data.generation) {
        await db.update(targets).set({ emailGeneration: { ...target.emailGeneration, status: "failed", error: "Could not generate suggestions. Try regenerating again." } }).where(predicate);
      }
    });
    throw error;
  }
}

export function startGuessWorker(): Worker {
  const worker = new Worker("email-guess", processGuessJob, {
    connection: redisConnection(),
    concurrency: 5,
  });
  console.log("email-guess worker running (concurrency 5)");
  return worker;
}

if (process.argv[1]?.endsWith("workers/email-guess.ts")) {
  startGuessWorker();
}
