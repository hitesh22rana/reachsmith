import "dotenv/config";
import { promises as dns } from "node:dns";
import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { asUser, type WorkerDb as Db } from "./db.ts";
import { emailGuesses, targets, type EmailGuess } from "../db/schema.ts";
import {
  recomputePrimaryEmail,
  mapResult,
  type TerminalStatus,
  type VerifierResponse,
} from "./verify-helpers.ts";

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
): Promise<void> {
  await db
    .update(emailGuesses)
    .set({ status, verificationMeta: meta, updatedAt: new Date() })
    .where(and(eq(emailGuesses.id, guess.id), eq(emailGuesses.userId, guess.userId)));
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

export async function processVerifyJob(job: {
  data: { candidateId: string; userId: string };
}): Promise<void> {
  // The payload's userId opens the RLS scope, so every statement below can
  // only ever touch that tenant's rows. A forged payload naming another
  // tenant's candidate matches nothing here and the job exits.
  await asUser(job.data.userId, async (db) => {
    const owned = await loadOwnedGuess(db, job.data.candidateId);
    if (!owned) {
      return;
    }
    const { guess, target } = owned;
    await setStatus(db, guess, "verifying", guess.verificationMeta);

    const domain = guess.email.split("@")[1] ?? "";
    try {
      const records = await dns.resolveMx(domain);
      if (records.length === 0) {
        await setStatus(db, guess, "invalid", { reason: "no-mx" });
        return;
      }
    } catch {
      await setStatus(db, guess, "invalid", { reason: "no-mx" });
      return;
    }

    const apiKey = process.env.EMAIL_VERIFIER_API_KEY;
    if (!apiKey) {
      await setStatus(db, guess, "unknown", { reason: "no-verifier-key" });
      return;
    }
    const raw = await verifyWithProvider(guess.email, apiKey);
    const status = mapResult(raw);
    await setStatus(db, guess, status, raw);
    await recomputePrimaryEmail(db, target.id);
  });
}

// Recovery path for a job that threw: settle the row on a terminal status so
// it leaves "verifying". Ownership is re-checked from the row, not the job.
async function markGuessUnsettled(candidateId: string, userId: string): Promise<void> {
  try {
    await asUser(userId, async (db) => {
      const owned = await loadOwnedGuess(db, candidateId);
      if (!owned) {
        return;
      }
      await setStatus(db, owned.guess, "unknown", { reason: "verify-failed" });
    });
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
    void markGuessUnsettled(job.data.candidateId, job.data.userId);
  });
  console.log("email-verify worker running (concurrency 5, 10 verifications/min)");
  return worker;
}

if (process.argv[1]?.endsWith("workers/email-verify.ts")) {
  startVerifyWorker();
}
