import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { enqueueEmailGuess } from "@/lib/queues/email";
import { toTargetInsert, toTargetJson } from "@/features/targets/server";
import { parseBody } from "@/lib/validators";
import { TargetCreateSchema } from "@/features/targets/validation";

export async function GET(): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const rows = await forUser(userId, (db) =>
    db
      .select()
      .from(targets)
      .where(eq(targets.userId, userId))
      .orderBy(desc(targets.createdAt)),
  );
  return NextResponse.json({ targets: rows.map(toTargetJson) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(TargetCreateSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const [target] = await forUser(userId, (db) =>
    db
      .insert(targets)
      .values(toTargetInsert(userId, parsed.data))
      .returning(),
  );
  if (!target) {
    return NextResponse.json({ message: "Failed to create target" }, { status: 500 });
  }
  // Best effort: a downed queue must not fail target creation.
  try {
    await enqueueEmailGuess(target.id, userId);
  } catch (error) {
    console.error("Failed to enqueue email-guess", error);
  }
  return NextResponse.json({ target: toTargetJson(target) }, { status: 201 });
}
