import "dotenv/config";
import { promises as dns } from "node:dns";
import { Worker } from "bullmq";
import { and, desc, eq } from "drizzle-orm";
import { asUser, type WorkerDb as Db } from "./db.ts";
import { emailGuesses, targets, type EmailGuess } from "../db/schema.ts";
import {
  recomputePrimaryEmail,
  mapResult,
  type TerminalStatus,
  type VerifierResponse,
} from "./verify-helpers.ts";
import { enqueueEmailVerify } from "../lib/queues/email.ts";

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return { url };
}

// Bounded so one hung provider cannot pin a job, and the row it set to
// "verifying", for the lifetime of the process.
const VERIFIER_TIMEOUT_MS = 10_000;

async function verifyWithProvider(email: string, apiKey: string): Promise<VerifierResponse> {
  const url = `https://api.quickemailverification.com/v1/verify?email=${encodeURIComponent(email)}&apikey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(VERIFIER_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`Verifier API failed (${response.status})`);
  }
  return (await response.json()) as VerifierResponse;
}

async function setStatus(
  db: Db,
  guess: EmailGuess,
  status: TerminalStatus | "verifying",
  meta: unknown,
): Promise<boolean> {
  const rows = await db
    .update(emailGuesses)
    .set({ status, verificationMeta: meta, updatedAt: new Date() })
    .where(and(eq(emailGuesses.id, guess.id), eq(emailGuesses.userId, guess.userId)))
    .returning({ id: emailGuesses.id });
  return rows.length > 0;
}

// Ownership chain, re-read from the DB inside the tenant's RLS scope: the
// guess must exist and must still belong to its target's real owner. Job
// payloads are not trusted, so nothing here comes from the queue.
async function loadOwnedGuess(db: Db, candidateId: string) {
  const [guess] = await db
    .select()
    .from(emailGuesses)
    .where(eq(emailGuesses.id, candidateId))
    .limit(1);
  if (!guess) {
    return null;
  }
  const [target] = await db
    .select({ id: targets.id, userId: targets.userId })
    .from(targets)
    .where(eq(targets.id, guess.targetId))
    .limit(1);
  if (!target || target.userId !== guess.userId) {
    return null;
  }
  return { guess, target };
}

async function nextPending(db: Db, guess: EmailGuess): Promise<{ id: string; userId: string } | null> {
  const [valid] = await db.select({ id: emailGuesses.id }).from(emailGuesses)
    .where(and(eq(emailGuesses.targetId, guess.targetId), eq(emailGuesses.userId, guess.userId), eq(emailGuesses.status, "valid"))).limit(1);
  if (valid) return null;
  const [next] = await db.select({ id: emailGuesses.id, userId: emailGuesses.userId })
    .from(emailGuesses)
    .where(and(eq(emailGuesses.targetId, guess.targetId), eq(emailGuesses.userId, guess.userId), eq(emailGuesses.status, "pending")))
    .orderBy(desc(emailGuesses.score), desc(emailGuesses.createdAt)).limit(1);
  return next ?? null;
}

async function domainMailStatus(domain: string): Promise<"usable" | "invalid" | "unknown"> {
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return mx.some((entry) => entry.exchange !== ".") ? "usable" : "invalid";
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND") return "invalid";
    if (code !== "ENODATA") return "unknown";
  }
  const address = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain)]);
  if (address.some((item) => item.status === "fulfilled" && item.value.length > 0)) return "usable";
  if (address.some((item) => item.status === "rejected" && !["ENODATA", "ENOTFOUND"].includes((item.reason as NodeJS.ErrnoException).code ?? ""))) return "unknown";
  return "invalid";
}

export async function processVerifyJob(job: {
  data: { candidateId: string; userId: string };
}): Promise<void> {
  // The payload's userId opens the RLS scope, so every statement below can
  // only ever touch that tenant's rows. A forged payload naming another
  // tenant's candidate matches nothing here and the job exits.
  const next = await asUser(job.data.userId, async (db) => {
    const owned = await loadOwnedGuess(db, job.data.candidateId);
    if (!owned) {
      return null;
    }
    const { guess, target } = owned;
    if (guess.status === "valid") return null;
    if (guess.status !== "pending") return nextPending(db, guess);
    await setStatus(db, guess, "verifying", guess.verificationMeta);

    const finish = async (status: TerminalStatus, meta: unknown) => {
      if (!await setStatus(db, guess, status, meta)) return null;
      if (status === "valid") {
        await recomputePrimaryEmail(db, target.id);
        await db.delete(emailGuesses).where(and(
          eq(emailGuesses.targetId, target.id), eq(emailGuesses.userId, guess.userId), eq(emailGuesses.status, "pending"),
        ));
        return null;
      }
      return nextPending(db, guess);
    };

    const domain = guess.email.split("@")[1] ?? "";
    const mailStatus = await domainMailStatus(domain);
    if (mailStatus !== "usable") {
      return finish(mailStatus, { reason: mailStatus === "invalid" ? "no-mail-host" : "dns-unavailable" });
    }

    const apiKey = process.env.EMAIL_VERIFIER_API_KEY;
    if (!apiKey) {
      return finish("unknown", { reason: "no-verifier-key" });
    }
    const raw = await verifyWithProvider(guess.email, apiKey);
    const status = mapResult(raw);
    return finish(status, raw);
  });
  if (next) await enqueueEmailVerify(next.id, next.userId);
}

// Recovery path for a job that threw: settle the row on a terminal status so
// it leaves "verifying". Ownership is re-checked from the row, not the job.
async function markGuessUnsettled(candidateId: string, userId: string): Promise<void> {
  try {
    const next = await asUser(userId, async (db) => {
      const owned = await loadOwnedGuess(db, candidateId);
      if (!owned) {
        return null;
      }
      if (owned.guess.status === "valid") return null;
      if (owned.guess.status === "pending" || owned.guess.status === "verifying") {
        await setStatus(db, owned.guess, "unknown", { reason: "verify-failed" });
      }
      return nextPending(db, owned.guess);
    });
    if (next) await enqueueEmailVerify(next.id, next.userId);
  } catch (recoveryError) {
    console.error("Could not settle failed verify job", recoveryError);
  }
}

export function startVerifyWorker(): Worker {
  const worker = new Worker("email-verify", processVerifyJob, {
    connection: redisConnection(),
    concurrency: 5,
    limiter: { max: 10, duration: 60_000 },
  });
  // Without this a thrown job leaves the guess at "verifying" forever and
  // the owner's client polls it every 3s with no ceiling. Terminal-fail the
  // row so the guess list settles.
  worker.on("failed", (job, error) => {
    if (!job) {
      return;
    }
    console.error(`email-verify job ${job.id} failed`, error);
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void markGuessUnsettled(job.data.candidateId, job.data.userId);
    }
  });
  console.log("email-verify worker running (concurrency 5, 10 verifications/min)");
  return worker;
}

if (process.argv[1]?.endsWith("workers/email-verify.ts")) {
  startVerifyWorker();
}
