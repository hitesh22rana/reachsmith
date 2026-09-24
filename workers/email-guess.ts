import "dotenv/config";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { getWorkerDb } from "./db.ts";
import { emailGuesses, targets } from "../db/schema.ts";
import { generateCandidates } from "../lib/email-patterns.ts";
import { enqueueEmailVerify } from "../lib/queues/email.ts";

function redisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }
  return { url };
}

// Domain comes from the company website field only: company-name→domain
// lookup is out of scope, so without a website there are no candidates.
function deriveDomain(website: string | null): string | null {
  if (!website) {
    return null;
  }
  try {
    const host = new URL(website).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

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
  const domain = deriveDomain(target.companyWebsite);
  if (!domain) {
    return;
  }
  const nameParts = target.fullName.trim().split(/\s+/);
  const candidates = generateCandidates({
    first_name: target.firstName ?? nameParts[0],
    last_name: target.lastName ?? nameParts.slice(1).join(" ") ?? undefined,
    domain,
  });
  if (candidates.length === 0) {
    return;
  }
  const existing = await db
    .select({ email: emailGuesses.email })
    .from(emailGuesses)
    .where(eq(emailGuesses.targetId, target.id));
  const seen = new Set(existing.map((row) => row.email));
  const fresh = candidates.filter((candidate) => !seen.has(candidate.email));
  if (fresh.length === 0) {
    return;
  }
  const rows = await db
    .insert(emailGuesses)
    .values(
      fresh.map((candidate) => ({
        userId: target.userId,
        targetId: target.id,
        email: candidate.email,
        patternUsed: candidate.pattern,
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
