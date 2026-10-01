import "dotenv/config";
import assert from "node:assert/strict";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { emailGuesses, targets, users } from "../db/schema.ts";
import { nameParts } from "../lib/target-name.ts";
import { rankCandidates } from "../lib/email-rank.ts";
import { asUser } from "../workers/db.ts";
import { processGuessJob } from "../workers/email-guess.ts";

// Real persistence boundary, no Redis or app server required.
// Run against a migrated local database:
// node --experimental-strip-types --no-warnings scripts/check-email-worker.ts
async function main(): Promise<void> {
  assert(process.env.DATABASE_URL && process.env.APP_DATABASE_URL, "Configure both database roles");
  const owner = postgres(process.env.DATABASE_URL);
  const setup = drizzle(owner);
  const userIds = [crypto.randomUUID(), crypto.randomUUID()];
  try {
    // Owner connection creates disposable fixtures; domain reads/writes use RLS.
    await setup.insert(users).values(userIds.map((id) => ({ id, name: "Worker check", email: `${id}@example.com` })));
    const userId = userIds[0]!;
    const [target] = await asUser(userId, (db) => db.insert(targets).values({
      userId, fullName: "Jane Doe", domain: "example.com", primaryEmail: "selected@example.org",
      notes: "Personal: elsewhere@gmail.com",
      socialUrls: ["https://github.com/jane", "https://github.com/janedoe2026"],
    }).returning());
    assert(target);
    const parts = nameParts(target);
    const expected = rankCandidates({
      first_name: parts.firstName, last_name: parts.lastName, domain: target.domain,
      notes: target.notes, social_urls: target.socialUrls,
    });
    assert(expected.length > 10, "fixture must exercise the former cutoff");
    const read = () => asUser(userId, (db) => db.select().from(emailGuesses)
      .where(and(eq(emailGuesses.targetId, target.id), eq(emailGuesses.userId, userId)))
      .orderBy(desc(emailGuesses.score)));
    const job = { data: { targetId: target.id, userId } };
    await processGuessJob(job);
    assert.deepEqual((await read()).map((row) => row.email), expected.map((candidate) => candidate.email), "persist every candidate in rank order");

    // Simulate a previously capped target and verify a rerun repairs its list.
    await asUser(userId, (db) => db.delete(emailGuesses)
      .where(and(eq(emailGuesses.targetId, target.id), eq(emailGuesses.userId, userId), eq(emailGuesses.email, expected.at(-1)!.email))));
    await Promise.all([processGuessJob(job), processGuessJob(job)]);
    const rows = await read();
    assert.deepEqual(rows.map((row) => row.email), expected.map((candidate) => candidate.email), "concurrent reruns restore the complete set without duplicates");
    assert(rows.every((row) => row.score > 0 && row.email.endsWith("@example.com")));
    assert(!rows.some((row) => row.email === "elsewhere@gmail.com"));

    // A mismatched payload must leave the real owner's suggestions untouched.
    await processGuessJob({ data: { targetId: target.id, userId: userIds[1]! } });
    assert.deepEqual(await read(), rows, "foreign job must not change owned rows");
    assert.equal((await asUser(userIds[1]!, (db) => db.select().from(emailGuesses))).length, 0);

    await asUser(userId, (db) => db.update(targets).set({ domain: "newexample.com" })
      .where(and(eq(targets.id, target.id), eq(targets.userId, userId))));
    await processGuessJob(job);
    assert((await read()).every((row) => row.email.endsWith("@newexample.com")), "replace stale-domain rows");
    await asUser(userId, (db) => db.update(targets).set({ domain: null })
      .where(and(eq(targets.id, target.id), eq(targets.userId, userId))));
    await processGuessJob(job);
    assert.deepEqual(await read(), [], "no-domain rerun clears stale suggestions");
    const [unchanged] = await asUser(userId, (db) => db.select().from(targets)
      .where(and(eq(targets.id, target.id), eq(targets.userId, userId))));
    assert.equal(unchanged?.primaryEmail, "selected@example.org", "worker never changes the owner's primary email");
    console.log("email worker check: full ranked persistence, concurrent reruns, refresh, and tenant isolation passed");
  } finally {
    await setup.delete(users).where(inArray(users.id, userIds));
    await owner.end();
  }
}

main().then(() => process.exit(0), (error: unknown) => {
  console.error(error);
  process.exit(1);
});
