import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout } from "node:timers/promises";
import { Queue } from "bullmq";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users, targets } from "../db/schema.ts";
import { asUser } from "../workers/db.ts";
import { processGuessJob } from "../workers/email-guess.ts";

// Real authenticated HTTP boundary. Requires pnpm build; no browser or provider calls.
async function main() {
  assert(process.env.DATABASE_URL && process.env.APP_DATABASE_URL && process.env.REDIS_URL);
  const listener = createServer();
  await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const address = listener.address();
  assert(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve) => listener.close(() => resolve()));
  const base = `http://localhost:${port}`;
  const redis = new URL(process.env.REDIS_URL);
  redis.pathname = "/15";
  const server = spawn(process.execPath, [".next/standalone/server.js"], {
    env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1", BETTER_AUTH_URL: base, EMAILABLE_API_KEY: "test_local_fixture", REDIS_URL: redis.toString() },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  server.stdout.on("data", (chunk) => { serverOutput = (serverOutput + String(chunk)).slice(-4000); });
  server.stderr.on("data", (chunk) => { serverOutput = (serverOutput + String(chunk)).slice(-4000); });
  const owner = postgres(process.env.DATABASE_URL);
  const db = drizzle(owner);
  const emails = [0, 1].map(() => `${crypto.randomUUID()}@example.com`);
  const queues = ["email-guess", "email-verify"].map((name) => new Queue(name, { connection: { url: redis.toString() } }));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { ready = (await fetch(`${base}/api/targets`)).status === 401; } catch { /* Wait for local startup. */ }
      if (ready) break;
      await setTimeout(100);
    }
    assert(ready, `Test server did not start: ${serverOutput}`);
    const accounts = [];
    for (const email of emails) {
      const password = `${crypto.randomUUID()}-Fixture1!`;
      const signup = await fetch(`${base}/api/auth/sign-up/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ name: "API check", email, password }) });
      assert.equal(signup.status, 200);
      const signin = await fetch(`${base}/api/auth/sign-in/email`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ email, password }) });
      assert.equal(signin.status, 200);
      const session = await signin.json();
      accounts.push({ id: session.user.id as string, cookie: signin.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ") });
    }
    const account = accounts[0]!;
    const request = (path: string, method = "GET", body?: unknown, cookie = account.cookie) => fetch(`${base}${path}`, {
      method, headers: { "Content-Type": "application/json", Origin: base, Cookie: cookie }, ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const created = await request("/api/targets", "POST", { full_name: "Jane Doe", domain: "example.com" });
    assert.equal(created.status, 201);
    const { target } = await created.json();
    assert(!("emailCheck" in target) && !("emailVerifications" in target), "private check metadata is not in target envelopes");
    const path = `/api/targets/${target.id}`;
    const predicate = and(eq(targets.id, target.id), eq(targets.userId, account.id));
    const read = async () => (await asUser(account.id, (tx) => tx.select().from(targets).where(predicate)))[0]!;
    const generate = async () => processGuessJob({ data: { targetId: target.id, userId: account.id, generation: (await read()).emailGeneration!.id } });
    await generate();
    const initial = await (await request(`${path}/guesses`)).json();
    assert(initial.guesses.length > 10);
    const checked = { state: "deliverable" as const, reason: "accepted_email", acceptAll: false, score: 100, checkedAt: "2026-10-01T00:00:00.000Z", test: false };
    await asUser(account.id, (tx) => tx.update(targets).set({ emailVerifications: { "jane@example.com": checked } }).where(predicate));
    const current = await (await request(`${path}/guesses`)).json();
    const consent = { confirmed: true, candidate_count: current.uncheckedCount, suggestion_generation: current.generation.id };
    assert.equal((await request(`${path}/verify`, "POST", { ...consent, confirmed: false })).status, 400);
    assert.equal((await request(`${path}/verify`, "POST", { ...consent, candidate_count: current.uncheckedCount + 1 })).status, 409);
    assert.equal((await request(`${path}/verify`, "POST", { ...consent, suggestion_generation: crypto.randomUUID() })).status, 409);
    assert.equal((await request(`${path}/verify`, "POST", consent)).status, 202);
    const confirmed = (await read()).emailCheck!;
    assert.equal(confirmed.emails.length, current.uncheckedCount);
    assert(!confirmed.emails.includes("jane@example.com"), "cached addresses excluded from default check");
    const edited = await request(path, "PATCH", { notes: "Updated notes", domain: "otherexample.com" });
    assert.equal(edited.status, 200);
    const afterEdit = await read();
    assert.equal(afterEdit.emailGeneration?.id, current.generation.id, "edit never requests generation");
    assert.deepEqual(afterEdit.emailCheck, confirmed, "edit retains active consent and progress");
    const oldList = await (await request(`${path}/guesses`)).json();
    assert(oldList.stale);
    assert.deepEqual(oldList.guesses.map((row: { email: string }) => row.email), initial.guesses.map((row: { email: string }) => row.email), "edited domain never hides the last generated list");
    assert.deepEqual(oldList.guesses.find((row: { email: string }) => row.email === "jane@example.com").verification, checked);
    for (const endpoint of ["guesses", "verify"]) {
      assert.equal((await request(`${path}/${endpoint}`, "POST", consent, accounts[1]!.cookie)).status, 404);
      assert.equal((await request(`${path}/${endpoint}`, "POST", consent, "")).status, 401);
    }
    assert.equal((await request(`${path}/guesses`, "GET", undefined, accounts[1]!.cookie)).status, 404);
    assert.equal((await request(`${path}/guesses`, "POST", {})).status, 202);
    const pending = (await read()).emailGeneration!.id;
    assert.equal((await request(`${path}/guesses`, "POST", {})).status, 202);
    assert.equal((await read()).emailGeneration!.id, pending, "double click does not enqueue another generation");
    await generate();
    const regenerated = await (await request(`${path}/guesses`)).json();
    assert(regenerated.guesses.every((row: { email: string }) => row.email.endsWith("@otherexample.com")));
    assert(!regenerated.stale);
    assert.deepEqual((await read()).emailVerifications["jane@example.com"], checked);
    assert.deepEqual((await read()).emailCheck, confirmed, "manual regeneration retains the active check");
    const retainedAddress = regenerated.guesses[0].email as string;
    assert.equal((await request(`${path}/primary-email`, "PATCH", { email: retainedAddress }, accounts[1]!.cookie)).status, 404);
    assert.equal((await request(`${path}/primary-email`, "PATCH", { email: retainedAddress }, "")).status, 401);
    assert.equal((await request(`${path}/primary-email`, "PATCH", { email: "not an email" })).status, 400);
    assert.equal((await request(`${path}/primary-email`, "PATCH", { email: retainedAddress })).status, 200);
    const selected = await read();
    assert.equal(selected.primaryEmail, retainedAddress, "explicit selection saves the outreach address");
    assert.equal(selected.emailGeneration!.id, regenerated.generation.id, "manual selection never regenerates suggestions");
    assert.deepEqual(selected.emailCheck, confirmed, "manual selection never starts or changes a paid check");
    await asUser(account.id, (tx) => tx.update(targets).set({
      emailCheck: { ...confirmed, status: "completed", remainingEmails: [] },
      emailVerifications: { ...(afterEdit.emailVerifications), [retainedAddress]: checked },
    }).where(predicate));
    const recheck = { confirmed: true, recheck: true, candidate_count: regenerated.guesses.length, suggestion_generation: regenerated.generation.id };
    assert.equal((await request(`${path}/verify`, "POST", recheck)).status, 202);
    assert((await read()).emailCheck!.emails.includes(retainedAddress), "explicit recheck includes cached addresses");
    console.log("email API check: manual regeneration, edits preserve paid results, fixed consent, generation/count guards, private metadata, and tenant isolation passed");
  } finally {
    const rows = await db.select({ id: users.id }).from(users).where(inArray(users.email, emails));
    for (const queue of queues) {
      for (const job of await queue.getJobs(["wait", "delayed", "failed", "completed"])) {
        if (rows.some((row) => row.id === job.data.userId)) await job.remove();
      }
      await queue.close();
    }
    await db.delete(users).where(inArray(users.email, emails));
    await owner.end();
    server.kill("SIGTERM");
  }
}
main().then(() => process.exit(0), (error: unknown) => { console.error(error); process.exit(1); });
