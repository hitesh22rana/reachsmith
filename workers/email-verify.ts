import "dotenv/config";
import { promises as dns } from "node:dns";
import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { getWorkerDb } from "./db.ts";
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

// Bounded so one hung provider cannot pin a job — and the row it set to
// "verifying" — for the lifetime of the process.
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
  guess: EmailGuess,
  status: TerminalStatus | "verifying",
  meta: unknown,
): Promise<void> {
  await getWorkerDb()
    .update(emailGuesses)
    .set({ status, verificationMeta: meta, updatedAt: new Date() })
    .where(and(eq(emailGuesses.id, guess.id), eq(emailGuesses.userId, guess.userId)));
}

// Ownership chain, re-read from the DB on every job: the guess must exist
// and must still belong to its target's real owner. Job payloads are not
// trusted, so nothing here comes from the queue.
async function loadOwnedGuess(candidateId: string) {
  const db = getWorkerDb();
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

export async function processVerifyJob(job: { data: { candidateId: string } }): Promise<void> {
  const owned = await loadOwnedGuess(job.data.candidateId);
  if (!owned) {
    return;
  }
  const { guess, target } = owned;
  await setStatus(guess, "verifying", guess.verificationMeta);

  const domain = guess.email.split("@")[1] ?? "";
  try {
    const records = await dns.resolveMx(domain);
    if (records.length === 0) {
      await setStatus(guess, "invalid", { reason: "no-mx" });
      return;
    }
  } catch {
    await setStatus(guess, "invalid", { reason: "no-mx" });
    return;
  }

  const apiKey = process.env.EMAIL_VERIFIER_API_KEY;
  if (!apiKey) {
    await setStatus(guess, "unknown", { reason: "no-verifier-key" });
    return;
  }
  const raw = await verifyWithProvider(guess.email, apiKey);
  const status = mapResult(raw);
  await setStatus(guess, status, raw);
  await recomputePrimaryEmail(target.id);
}

// Recovery path for a job that threw: settle the row on a terminal status so
// it leaves "verifying". Ownership is re-checked from the row, not the job.
async function markGuessUnsettled(candidateId: string): Promise<void> {
  try {
    const owned = await loadOwnedGuess(candidateId);
    if (!owned) {
      return;
    }
    await setStatus(owned.guess, "unknown", { reason: "verify-failed" });
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
    void markGuessUnsettled(job.data.candidateId);
  });
  console.log("email-verify worker running (concurrency 5, 10 verifications/min)");
  return worker;
}

if (process.argv[1]?.endsWith("workers/email-verify.ts")) {
  startVerifyWorker();
}
