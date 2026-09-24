import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { emailGuesses, targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { enqueueEmailVerify } from "@/lib/queues/email";
import { parseBody } from "@/lib/validators";
import { PrimaryEmailSchema } from "@/features/email/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Manually re-run verification for one candidate, found by email so the
// guess ID never has to leave the server.
export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(PrimaryEmailSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const [target] = await getDb()
    .select({ id: targets.id })
    .from(targets)
    .where(and(eq(targets.id, (await context.params).id), eq(targets.userId, userId)))
    .limit(1);
  if (!target) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const [guess] = await getDb()
    .select({ id: emailGuesses.id })
    .from(emailGuesses)
    .where(
      and(
        eq(emailGuesses.targetId, target.id),
        eq(emailGuesses.userId, userId),
        eq(emailGuesses.email, parsed.data.email),
      ),
    )
    .limit(1);
  if (!guess) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  try {
    await enqueueEmailVerify(guess.id);
  } catch (error) {
    console.error("Failed to enqueue email-verify", error);
    return NextResponse.json({ message: "Queue unavailable, try again" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
