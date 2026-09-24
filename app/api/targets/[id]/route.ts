import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { enqueueEmailGuess } from "@/lib/queues/email";
import { toTargetJson, toTargetPatch } from "@/features/targets/server";
import { parseBody } from "@/lib/validators";
import { TargetPatchSchema } from "@/features/targets/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function findOwnedTarget(userId: string, id: string) {
  const [target] = await getDb()
    .select()
    .from(targets)
    .where(and(eq(targets.id, id), eq(targets.userId, userId)))
    .limit(1);
  return target ?? null;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const target = await findOwnedTarget(userId, (await context.params).id);
  if (!target) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ target: toTargetJson(target) });
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(TargetPatchSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const patch = toTargetPatch(parsed.data);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }
  const [updated] = await getDb()
    .update(targets)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(targets.id, (await context.params).id), eq(targets.userId, userId)))
    .returning();
  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  // Best effort: re-guess on updates; the worker skips existing candidates.
  try {
    await enqueueEmailGuess(updated.id);
  } catch (error) {
    console.error("Failed to enqueue email-guess", error);
  }
  return NextResponse.json({ target: toTargetJson(updated) });
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  // EmailGuess/Outreach tables do not exist yet; their scoped deletes land
  // with the outreach/email-pipeline features.
  const [deleted] = await getDb()
    .delete(targets)
    .where(and(eq(targets.id, (await context.params).id), eq(targets.userId, userId)))
    .returning({ id: targets.id });
  if (!deleted) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: deleted.id });
}
