import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { asUser } from "./db.ts";
import { targets, type EmailCheck } from "../db/schema.ts";
import { readBatch, submitBatch } from "../features/email/emailable.ts";

interface VerifyJob { targetId: string; userId: string; generation: string; polls?: number }
const connection = () => {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is not set");
  return { url: process.env.REDIS_URL };
};
let queue: Queue<VerifyJob> | undefined;
export function enqueueVerification(data: VerifyJob, delay = 0): Promise<unknown> {
  queue ??= new Queue<VerifyJob>("email-verify", { connection: connection() });
  return queue.add("verify", data, { delay, attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100, removeOnFail: 100 });
}

export async function processVerifyJob(job: { data: VerifyJob }): Promise<void> {
  const { userId, targetId, generation } = job.data;
  const predicate = and(eq(targets.id, targetId), eq(targets.userId, userId));
  // Claim submissions before HTTP; duplicate/stalled deliveries must not spend twice.
  const work = await asUser(userId, async (db) => {
    const [target] = await db.select().from(targets).where(predicate).for("update");
    const check = target?.emailCheck;
    if (!check || check.generation !== generation || ["completed", "failed"].includes(check.status)) return null;
    if (check.status === "submitting") {
      await db.update(targets).set({ emailCheck: { ...check, status: "failed", error: "Submission interrupted. The submission status is uncertain. Check with the administrator before starting another check." } }).where(predicate);
      return null;
    }
    if (check.batchId) return { check, emails: [] as string[] };
    const emails = check.remainingEmails.slice(0, 1000);
    if (!emails.length) {
      await db.update(targets).set({ emailCheck: { ...check, status: "completed" } }).where(predicate);
      return null;
    }
    await db.update(targets).set({ emailCheck: { ...check, status: "submitting", batchEmails: emails } }).where(predicate);
    return { check, emails };
  });
  if (!work) return;
  const save = async (change: Partial<EmailCheck>) => asUser(userId, async (db) => {
    const [target] = await db.select().from(targets).where(predicate).for("update");
    if (target?.emailCheck?.generation !== generation) return false;
    await db.update(targets).set({ emailCheck: { ...target.emailCheck, ...change } }).where(predicate);
    return true;
  });
  try {
    if (!work.check.batchId) {
      const batchId = await submitBatch(work.emails);
      if (await save({ status: "verifying", batchId })) await enqueueVerification({ ...job.data, polls: 0 }, 5000);
      return;
    }
    const batch = await readBatch(work.check.batchId);
    const submitted = work.check.batchEmails;
    const submittedSet = new Set(submitted);
    if (!submitted || batch.emails.some((email) => !submittedSet.has(email.email.toLowerCase())) || new Set(batch.emails.map((email) => email.email.toLowerCase())).size !== batch.emails.length) {
      throw new Error("Email verification service returned unexpected or duplicate addresses.");
    }
    const complete = batch.total_counts && batch.total_counts.total > 0 && batch.total_counts.processed === batch.total_counts.total;
    const next = await asUser(userId, async (db) => {
      const [target] = await db.select().from(targets).where(predicate).for("update");
      if (target?.emailCheck?.generation !== generation || target.emailCheck.batchId !== batch.id) return false;
      const results = { ...target.emailVerifications };
      for (const result of batch.emails) {
        const email = result.email.toLowerCase();
        // A simulated response must not replace a previously paid live result.
        if (work.check.test && results[email] && !results[email]!.test) continue;
        results[email] = {
          state: result.state, reason: result.reason, acceptAll: result.accept_all, score: result.score,
          checkedAt: new Date().toISOString(), test: work.check.test,
        };
      }
      await db.update(targets).set({ emailVerifications: results }).where(predicate);
      if (complete) {
        // Require results for every submitted address. Never rebill omissions.
        if (batch.emails.length !== submitted.length || batch.total_counts?.total !== submitted.length) throw new Error("Email verification service completed without all address results. Resume this batch instead of resubmitting.");
        const remainingEmails = target.emailCheck.remainingEmails.filter((email) => !submittedSet.has(email));
        const { batchId: _batchId, batchEmails: _batchEmails, ...check } = target.emailCheck;
        void _batchId;
        void _batchEmails;
        await db.update(targets).set({ emailCheck: { ...check, remainingEmails, status: remainingEmails.length ? "pending" : "completed" } }).where(predicate);
        return remainingEmails.length > 0;
      }
      if ((job.data.polls ?? 0) >= 120) throw new Error("Email verification service is still processing. Resume the existing batch later.");
      return true;
    });
    if (next) await enqueueVerification({ ...job.data, polls: complete ? 0 : (job.data.polls ?? 0) + 1 }, 10_000);
  } catch (error) {
    await save({ status: "failed", error: error instanceof Error ? error.message : "Email check failed." });
  }
}

export function startVerifyWorker(): Worker {
  return new Worker("email-verify", processVerifyJob, {
    connection: connection(), concurrency: 1, limiter: { max: 4, duration: 1000 },
  });
}
