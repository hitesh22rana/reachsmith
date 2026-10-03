import { Queue } from "bullmq";

// Queue payloads carry IDs only; workers reload rows and recheck
// ownership from the DB before any read or write. The userId rides along
// because tenant RLS is scoped by a transaction-local GUC, and the worker
// has to set that before its first read (it looks the target up by id alone).
// The worker treats it as a scope, not a grant, and re-checks the ownership
// chain regardless.

interface GuessJob {
  targetId: string;
  userId: string;
  generation: string;
}

function connection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return { url, maxRetriesPerRequest: null as unknown as number };
}

// Lazy: importing this module never connects, so pages render without env
// and routes can decide how to handle a missing REDIS_URL.
function lazyQueue<T>(name: string): () => Queue<T> {
  let queue: Queue<T> | null = null;
  return () => (queue ??= new Queue<T>(name, { connection: connection() }));
}

const guessQueue = lazyQueue<GuessJob>("email-guess");

export function enqueueEmailGuess(targetId: string, userId: string, generation: string): Promise<unknown> {
  return guessQueue().add("guess", { targetId, userId, generation }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}
