import { Queue } from "bullmq";

// Queue payloads carry IDs only; workers reload rows and re-verify
// ownership from the DB before any read or write. The userId rides along
// because tenant RLS is scoped by a transaction-local GUC, and the worker
// has to set that before its first read (it looks the target up by id alone).
// The worker treats it as a scope, not a grant, and re-checks the ownership
// chain regardless.

interface GuessJob {
  targetId: string;
  userId: string;
}

interface VerifyJob {
  candidateId: string;
  userId: string;
}

// Lazy: importing this module never connects, so pages render without env
// and routes can decide how to handle a missing REDIS_URL.
let guessQueue: Queue<GuessJob> | null = null;
let verifyQueue: Queue<VerifyJob> | null = null;

function connection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return { url, maxRetriesPerRequest: null as unknown as number };
}

function getGuessQueue(): Queue<GuessJob> {
  if (!guessQueue) {
    guessQueue = new Queue<GuessJob>("email-guess", { connection: connection() });
  }
  return guessQueue;
}

function getVerifyQueue(): Queue<VerifyJob> {
  if (!verifyQueue) {
    verifyQueue = new Queue<VerifyJob>("email-verify", { connection: connection() });
  }
  return verifyQueue;
}

export function enqueueEmailGuess(targetId: string, userId: string): Promise<unknown> {
  return getGuessQueue().add("guess", { targetId, userId });
}

export function enqueueEmailVerify(candidateId: string, userId: string): Promise<unknown> {
  return getVerifyQueue().add(
    "verify",
    { candidateId, userId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      // Failed jobs are pointless once the row has been settled to `unknown`.
      removeOnFail: true,
    },
  );
}
