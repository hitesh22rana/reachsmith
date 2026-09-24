import "dotenv/config";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { getWorkerDb } from "./db.ts";
import { emailGuesses, targets } from "../db/schema.ts";
import { rankCandidates, extractHandles } from "../lib/email-rank.ts";
import { rankWithModel } from "./email-rank-model.ts";
import { enqueueEmailVerify } from "../lib/queues/email.ts";

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return { url };
}

// Verify budget: most evidence first, at most 10 attempts, the verify
// worker stops the line at the first valid candidate.
const VERIFY_BUDGET = 10;

async function processGuessJob(job: { data: { targetId: string } }): Promise<void> {
  const db = getWorkerDb();
  const [target] = await db
    .select()
    .from(targets)
    .where(eq(targets.id, job.data.targetId))
    .limit(1);
  if (!target) {
    return;
  }
  const nameParts = target.fullName.trim().split(/\s+/);
  const firstName = target.firstName ?? nameParts[0];
  const lastName = target.lastName ?? nameParts.slice(1).join(" ") ?? undefined;

  const ranked = rankCandidates({
    first_name: firstName,
    last_name: lastName,
    domain: target.domain,
    notes: target.notes,
    social_urls: target.socialUrls,
  });
  if (ranked.length === 0) {
    return;
  }

  const existing = await db
    .select({ email: emailGuesses.email })
    .from(emailGuesses)
    .where(eq(emailGuesses.targetId, target.id));
  const seen = new Set(existing.map((row) => row.email));
  const fresh = ranked.filter((candidate) => !seen.has(candidate.email));
  if (fresh.length === 0) {
    return;
  }

  // SLM re-rank (backend, baked weights); deterministic order on any failure.
  const modelOrder = await rankWithModel(
    { fullName: target.fullName, company: target.company },
    target.notes,
    extractHandles(target.socialUrls).map((entry) => entry.handle),
    fresh.map((candidate, index) => ({
      id: String(index),
      email: candidate.email,
      pattern: candidate.pattern,
      source: candidate.source,
    })),
  );
  const byId = new Map(fresh.map((candidate, index) => [String(index), candidate]));
  const ordered = (modelOrder ?? [...byId.keys()])
    .map((id) => byId.get(id))
    .filter((candidate) => candidate !== undefined)
    .slice(0, VERIFY_BUDGET);

  const rows = await db
    .insert(emailGuesses)
    .values(
      ordered.map((candidate) => ({
        userId: target.userId,
        targetId: target.id,
        email: candidate.email,
        patternUsed: candidate.pattern,
        source: candidate.source,
        score: Math.round(candidate.score),
        context: candidate.context,
      })),
    )
    .returning({ id: emailGuesses.id });
  await Promise.all(rows.map((row) => enqueueEmailVerify(row.id)));
}

new Worker("email-guess", processGuessJob, {
  connection: redisConnection(),
  concurrency: 5,
});

console.log("email-guess worker running (concurrency 5)");
