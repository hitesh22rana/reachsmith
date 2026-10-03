import "dotenv/config";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { audiences, emailGuesses, outreaches, targets, templates, users } from "../db/schema.ts";
import { asUser } from "../workers/db.ts";

// Exercise the real CLI against a migrated local database; fixtures are removed.
async function main(): Promise<void> {
  assert(process.env.DATABASE_URL && process.env.APP_DATABASE_URL, "Configure both database roles");
  const owner = postgres(process.env.DATABASE_URL);
  const setup = drizzle(owner);
  const userIds = [crypto.randomUUID(), crypto.randomUUID()];
  const userId = userIds[0]!;
  const email = `${userId}@example.com`;
  const seed = () => promisify(execFile)(process.execPath, [
    "--experimental-strip-types", "--no-warnings", "scripts/seed.ts", email,
  ]);
  try {
    await setup.insert(users).values(userIds.map((id) => ({ id, name: "Seed check", email: `${id}@example.com` })));
    const [preset] = await asUser(userId, (db) => db.insert(audiences)
      .values({ userId, name: "fOuNdEr" }).returning());
    assert(preset);
    await seed();
    const snapshot = () => asUser(userId, async (db) => ({
      targets: await db.select().from(targets).where(eq(targets.userId, userId)),
      templates: await db.select().from(templates).where(eq(templates.userId, userId)),
      outreaches: await db.select().from(outreaches).where(eq(outreaches.userId, userId)),
      guesses: await db.select().from(emailGuesses).where(eq(emailGuesses.userId, userId)),
    }));
    const first = await snapshot();
    assert.equal(first.targets.length, 1);
    assert.equal(first.templates.length, 2);
    assert.equal(first.outreaches.length, 2);
    assert.equal(first.templates.find((row) => row.channel === "email")?.audienceId, preset.id,
      "reuse a pre-existing audience case-insensitively");
    assert(first.guesses.length > 10, "demo includes candidates beyond the former cutoff");
    assert(first.guesses.some((row) => row.email === "aarav.sharma@example.com"));
    assert(first.outreaches.every((row) => !row.bodyFinal.includes("{{")), "demo placeholders are rendered");
    await asUser(userId, (db) => db.delete(emailGuesses).where(eq(emailGuesses.userId, userId)));
    await seed();
    const second = await snapshot();
    const targetFields = (row: typeof targets.$inferSelect) => {
      const { emailGeneration: _generation, updatedAt: _updatedAt, ...fields } = row;
      void _generation;
      void _updatedAt;
      return fields;
    };
    assert.deepEqual(second.targets.map(targetFields), first.targets.map(targetFields), "rerun preserves target fields, paid results, and primary email");
    assert.deepEqual(second.templates, first.templates, "rerun does not duplicate templates");
    assert.deepEqual(second.outreaches, first.outreaches, "rerun preserves outreach history");
    assert.equal(second.guesses.length, first.guesses.length, "rerun restores suggestions");
    assert.equal((await asUser(userIds[1]!, (db) => db.select().from(targets))).length, 0,
      "seed does not write another tenant's targets");
    console.log("seed check: audience reuse, suggestions, rendering, reruns, and tenant scope passed");
  } finally {
    await setup.delete(users).where(inArray(users.id, userIds));
    await owner.end();
  }
}

main().then(() => process.exit(0), (error: unknown) => {
  console.error(error);
  process.exit(1);
});
