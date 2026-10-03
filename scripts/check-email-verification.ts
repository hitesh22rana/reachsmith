import "dotenv/config";
import assert from "node:assert/strict";
import { Queue } from "bullmq";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { targets, emailGuesses, users, type NewTarget } from "../db/schema.ts";
import { asUser } from "../workers/db.ts";
import { processGuessJob } from "../workers/email-guess.ts";
import { processVerifyJob } from "../workers/email-verify.ts";
import { hasVerification } from "../lib/email-verification.ts";

// Real DB/RLS and queue boundary; mocked provider HTTP never uses live credits.
async function main() {
  assert(process.env.DATABASE_URL && process.env.APP_DATABASE_URL && process.env.REDIS_URL);
  const redis = new URL(process.env.REDIS_URL);
  redis.pathname = "/15";
  process.env.REDIS_URL = redis.toString();
  process.env.EMAILABLE_API_KEY = "test_local_fixture";
  const owner = postgres(process.env.DATABASE_URL);
  const setup = drizzle(owner);
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const userId = ids[0]!;
  const originalFetch = globalThis.fetch;
  const queue = new Queue("email-verify", { connection: { url: redis.toString() } });
  let targetId = "";
  let posts = 0;
  let submitted: string[] = [];
  let partial = true;
  let interrupt = false;
  let batchNumber = 0;
  try {
    await setup.insert(users).values(ids.map((id) => ({ id, name: "Verification check", email: `${id}@example.com` })));
    const [target] = await asUser(userId, (db) => db.insert(targets).values({ userId, fullName: "Jane Doe", domain: "example.com", primaryEmail: "manual@example.org" }).returning());
    assert(target);
    targetId = target.id;
    const predicate = and(eq(targets.id, targetId), eq(targets.userId, userId));
    const read = () => asUser(userId, async (db) => {
      const target = (await db.select().from(targets).where(predicate))[0]!;
      const rows = await db.select().from(emailGuesses).where(and(eq(emailGuesses.targetId, targetId), eq(emailGuesses.userId, userId)));
      return { target, rows: rows.map((row) => ({ ...row, verification: target.emailVerifications[row.email] ?? null })) };
    });
    const generate = async (patch: Partial<NewTarget> = {}) => {
      const generation = crypto.randomUUID();
      await asUser(userId, (db) => db.update(targets).set({ ...patch, emailGeneration: { id: generation, status: "pending" } }).where(predicate));
      await processGuessJob({ data: { userId, targetId, generation } });
    };
    const confirm = async (emails?: string[], test = true) => {
      const current = await read();
      emails ??= current.rows.filter((row) => !hasVerification(row.verification ?? undefined, test)).map((row) => row.email);
      const generation = crypto.randomUUID();
      await asUser(userId, (db) => db.update(targets).set({ emailCheck: { generation, status: "pending", test, emails, remainingEmails: emails } }).where(predicate));
      return { data: { userId, targetId, generation } };
    };
    globalThis.fetch = async (input, init) => {
      if (String(input).endsWith("/account")) return Response.json({ available_credits: 0 });
      assert(String(input).startsWith("https://api.emailable.com/v1/batch"));
      if (init?.method === "POST") {
        posts++;
        submitted = JSON.parse(String(init.body)).emails;
        if (interrupt) throw new Error("simulated network interruption");
        return Response.json({ id: `fixture-batch-${++batchNumber}` });
      }
      const emails = (partial ? submitted.slice(0, 1) : submitted).map((email, index) => ({
        email, state: index === 0 ? "deliverable" : "risky", reason: index === 0 ? "accepted_email" : "low_deliverability", accept_all: index !== 0, score: index === 0 ? 100 : 60,
      }));
      return Response.json({ id: `fixture-batch-${batchNumber}`, emails, total_counts: { processed: emails.length, total: submitted.length } });
    };
    await generate();
    const job = await confirm();
    await processVerifyJob({ data: { ...job.data, userId: ids[1]! } });
    assert.equal(posts, 0, "foreign payload never calls the provider");
    await processVerifyJob(job);
    assert.equal((await read()).target.emailCheck?.status, "verifying");
    assert(submitted.length > 10, "verify the complete list beyond the former cutoff");
    await processVerifyJob(job);
    assert.equal((await read()).rows.filter((row) => row.verification).length, 1, "partial results persist");
    partial = false;
    await processVerifyJob(job);
    const completed = await read();
    assert.equal(completed.target.emailCheck?.status, "completed");
    assert.equal(completed.target.primaryEmail, "manual@example.org");
    assert(completed.rows.every((row) => row.verification?.test === true));
    assert(completed.rows.some((row) => row.verification?.acceptAll));
    await processVerifyJob(job);
    assert.equal(posts, 1, "completed redelivery cannot submit again");

    // Rank changes, disappearance, and return must retain identical results/dates.
    const originalResults = completed.target.emailVerifications;
    await generate({ notes: "Jane's address is jane.doe@example.com" });
    assert.equal((await read()).rows[0]?.email, "jane.doe@example.com", "notes change ranking on explicit regeneration");
    assert.deepEqual((await read()).target.emailVerifications, originalResults);
    await generate({ domain: "otherexample.com" });
    assert((await read()).rows.every((row) => row.verification === null));
    assert.deepEqual((await read()).target.emailVerifications, originalResults, "removed addresses remain cached");
    await generate({ domain: "example.com", notes: "Additional address: unique@example.com" });
    const returned = await read();
    assert.deepEqual(returned.target.emailVerifications, originalResults);
    assert(returned.rows.find((row) => row.email === "jane@example.com")?.verification);
    assert.equal(returned.rows.find((row) => row.email === "unique@example.com")?.verification, null, "new address starts unchecked");

    // The confirmed snapshot survives regeneration before submission and polling.
    const snapshot = await confirm();
    await generate({ domain: "otherexample.com" });
    await processVerifyJob(snapshot);
    assert.deepEqual(submitted, ["unique@example.com"], "never add regenerated addresses to paid submission");
    await processVerifyJob(snapshot);
    assert((await read()).target.emailVerifications["unique@example.com"], "late results persist even when absent from current list");
    await generate({ domain: "example.com" });
    assert((await read()).rows.find((row) => row.email === "unique@example.com")?.verification, "returning address reuses late result");

    // A confirmed set larger than the provider limit stays fixed between chunks.
    const many = Array.from({ length: 1001 }, (_, index) => `fixture${index}@example.com`);
    const large = await confirm(many);
    await processVerifyJob(large);
    assert.equal(submitted.length, 1000);
    await generate({ domain: "otherexample.com" });
    await processVerifyJob(large);
    await processVerifyJob(large);
    assert.deepEqual(submitted, [many[1000]], "next chunk is from original consent, not regenerated candidates");
    await processVerifyJob(large);
    assert.equal((await read()).target.emailCheck?.status, "completed");
    const largeResults = (await read()).target.emailVerifications;
    assert(many.every((email) => largeResults[email]), "all chunk results retained");

    // Ambiguous submissions are never automatically resubmitted.
    interrupt = true;
    const interrupted = await confirm(["interrupted@example.com"]);
    const beforeInterrupt = posts;
    await processVerifyJob(interrupted);
    await processVerifyJob(interrupted);
    assert.equal(posts, beforeInterrupt + 1);
    assert.equal((await read()).target.emailCheck?.status, "failed");
    interrupt = false;
    process.env.EMAILABLE_API_KEY = "live_local_fixture";
    const beforeBalance = posts;
    await processVerifyJob(await confirm(["balance@example.com"], false));
    assert.equal(posts, beforeBalance, "insufficient balance cannot submit a paid batch");
    assert.equal((await read()).target.emailCheck?.status, "failed");
    assert.equal(hasVerification(originalResults["jane@example.com"], false), false, "simulated result does not replace a live check");
    console.log("email verification check: cached results, regenerated ranks/domains, immutable consent across chunks, tenant isolation, and no duplicate spending passed");
  } finally {
    globalThis.fetch = originalFetch;
    for (const job of await queue.getJobs(["wait", "delayed", "failed", "completed"])) {
      if (job.data.targetId === targetId) await job.remove();
    }
    await queue.close();
    await setup.delete(users).where(inArray(users.id, ids));
    await owner.end();
  }
}
main().then(() => process.exit(0), (error: unknown) => { console.error(error); process.exit(1); });
