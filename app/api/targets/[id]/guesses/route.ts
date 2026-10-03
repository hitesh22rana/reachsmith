import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { emailGuesses, targets, type EmailGeneration } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { emailInputKey } from "@/lib/email-inputs";
import { hasVerification } from "@/lib/email-verification";
import { enqueueEmailGuess } from "@/lib/queues/email";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const id = (await context.params).id;
  // Read metadata and rows in one transaction under the same target lock.
  const page = await forUser(userId, async (db) => {
    const [target] = await db.select().from(targets)
      .where(and(eq(targets.id, id), eq(targets.userId, userId))).for("share");
    if (!target) return null;
    const rows = await db.select().from(emailGuesses)
      .where(and(eq(emailGuesses.targetId, id), eq(emailGuesses.userId, userId)))
      .orderBy(desc(emailGuesses.score), desc(emailGuesses.createdAt));
    const verificationTest = process.env.EMAILABLE_API_KEY?.startsWith("test_") ?? false;
    const generation = target.emailGeneration;
    const check = target.emailCheck;
    return {
      guesses: rows.map((row) => ({
        email: row.email, patternUsed: row.patternUsed, source: row.source,
        verification: target.emailVerifications[row.email.toLowerCase()] ?? null,
      })),
      check: check ? {
        status: check.status, test: check.test, emails: check.remainingEmails,
        ...(check.error ? { error: check.error } : {}), resumable: Boolean(check.batchId),
      } : null,
      verificationEnabled: Boolean(process.env.EMAILABLE_API_KEY), verificationTest,
      uncheckedCount: rows.filter((row) => !hasVerification(target.emailVerifications[row.email.toLowerCase()], verificationTest)).length,
      generation: generation ? { id: generation.id, status: generation.status, ...(generation.error ? { error: generation.error } : {}) } : null,
      stale: generation?.inputKey ? generation.inputKey !== emailInputKey(target) : rows.length > 0,
      generatedDomain: generation?.domain ?? null,
    };
  });
  return page ? NextResponse.json(page) : NextResponse.json({ message: "Not found" }, { status: 404 });
}

export async function POST(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const id = (await context.params).id;
  const predicate = and(eq(targets.id, id), eq(targets.userId, userId));
  const result = await forUser(userId, async (db) => {
    const [target] = await db.select().from(targets).where(predicate).for("update");
    if (!target) return null;
    if (target.emailGeneration?.status === "pending") return { queued: true };
    const generation: EmailGeneration = { ...target.emailGeneration, id: crypto.randomUUID(), status: "pending" };
    delete generation.error;
    await db.update(targets).set({ emailGeneration: generation }).where(predicate);
    return { generation };
  });
  if (!result) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if ("generation" in result && result.generation) {
    try { await enqueueEmailGuess(id, userId, result.generation.id); }
    catch {
      await forUser(userId, (db) => db.update(targets).set({ emailGeneration: { ...result.generation!, status: "failed", error: "Could not queue suggestions. Start the worker and try again." } })
        .where(and(predicate, eq(targets.emailGeneration, result.generation!))));
      return NextResponse.json({ message: "Could not queue suggestions. Start the worker and try again." }, { status: 503 });
    }
  }
  return NextResponse.json({ message: "Suggestions queued." }, { status: 202 });
}
