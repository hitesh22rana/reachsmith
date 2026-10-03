import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { targets, emailGuesses, type EmailCheck } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { parseBody } from "@/lib/validators";
import { VerifySuggestionsSchema } from "@/features/email/validation";
import { hasVerification } from "@/lib/email-verification";
import { enqueueVerification } from "@/workers/email-verify";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const parsed = parseBody(VerifySuggestionsSchema, await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 });
  const id = (await context.params).id;
  const result = await forUser(userId, async (db) => {
    const predicate = and(eq(targets.id, id), eq(targets.userId, userId));
    const [target] = await db.select().from(targets).where(predicate).for("update");
    if (!target) return { status: 404, message: "Not found" };
    if (!process.env.EMAILABLE_API_KEY) return { status: 503, message: "Email verification service is not configured." };
    const existing = target.emailCheck;
    if (existing && ["pending", "submitting", "verifying"].includes(existing.status)) return { status: 202, message: "Email check already started." };
    if (existing?.status === "failed" && !existing.batchId) return { status: 409, message: "The previous submission may have been accepted. Check with the administrator before starting another check." };
    if (target.emailGeneration?.status === "pending") return { status: 409, message: "Wait for regeneration before confirming a check." };
    if ((target.emailGeneration?.id ?? null) !== parsed.data.suggestion_generation) return { status: 409, message: "Suggestions changed. Refresh and confirm the new list." };
    const test = process.env.EMAILABLE_API_KEY.startsWith("test_");
    const guesses = await db.select({ email: emailGuesses.email }).from(emailGuesses)
      .where(and(eq(emailGuesses.targetId, id), eq(emailGuesses.userId, userId)));
    const resume = existing?.status === "failed" && Boolean(existing.batchId);
    const emails = guesses.map((guess) => guess.email.toLowerCase())
      .filter((email) => parsed.data.recheck || !hasVerification(target.emailVerifications[email], test));
    const count = resume ? existing!.remainingEmails.length : emails.length;
    if (!count) return { status: 409, message: "No unchecked suggestions. Use recheck to refresh existing results." };
    if (count !== parsed.data.candidate_count) return { status: 409, message: "Suggestions changed. Refresh and confirm the new count." };
    const check: EmailCheck = resume ? { ...existing!, status: "verifying" } : {
      generation: crypto.randomUUID(), status: "pending", test, emails, remainingEmails: emails,
    };
    delete check.error;
    await db.update(targets).set({ emailCheck: check }).where(predicate);
    return { status: 202, check };
  });
  if ("check" in result && result.check) {
    try { await enqueueVerification({ targetId: id, userId, generation: result.check.generation }); }
    catch {
      await forUser(userId, (db) => db.update(targets).set({ emailCheck: result.check!.batchId ? { ...result.check!, status: "failed", error: "Could not queue the check. Resume after starting the worker." } : null })
        .where(and(eq(targets.id, id), eq(targets.userId, userId), eq(targets.emailCheck, result.check!))));
      return NextResponse.json({ message: "Could not queue the check. Start the worker and try again." }, { status: 503 });
    }
  }
  return NextResponse.json({ message: "message" in result ? result.message : "Email check queued." }, { status: result.status });
}
