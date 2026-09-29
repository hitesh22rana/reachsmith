import { Queue } from "bullmq";

// Queue payloads carry IDs only; workers reload rows and re-verify
// ownership from the DB before any read or write.

interface GuessJob {
  targetId: string;
}

interface VerifyJob {
  candidateId: string;
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

export function enqueueEmailGuess(targetId: string): Promise<unknown> {
  return getGuessQueue().add("guess", { targetId });
}

export function enqueueEmailVerify(candidateId: string): Promise<unknown> {
  return getVerifyQueue().add(
    "verify",
    { candidateId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      // Failed jobs are pointless once the row has been settled to `unknown`.
      removeOnFail: true,
    },
  );
}
