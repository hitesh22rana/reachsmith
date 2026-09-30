import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { emailGuesses, targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { enqueueEmailGuess } from "@/lib/queues/email";
import { toTargetJson, toTargetPatch } from "@/features/targets/server";
import { parseBody } from "@/lib/validators";
import { TargetPatchSchema } from "@/features/targets/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function findOwnedTarget(userId: string, id: string) {
  const [target] = await forUser(userId, (db) =>
    db
      .select()
      .from(targets)
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .limit(1),
  );
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
  const id = (await context.params).id;
  const refreshGuess = ["full_name", "first_name", "last_name", "domain", "company_website", "notes", "social_urls"]
    .some((field) => field in parsed.data);
  const [updated] = await forUser(userId, (db) =>
    (async () => {
      const rows = await db
        .update(targets)
        .set({
          ...patch,
          ...(refreshGuess && patch.primaryEmail === undefined ? {
            primaryEmail: sql<string | null>`case when ${targets.primaryEmailSource} = 'verified' then null else ${targets.primaryEmail} end`,
            primaryEmailSource: sql<"manual" | "verified" | null>`case when ${targets.primaryEmailSource} = 'verified' then null else ${targets.primaryEmailSource} end`,
          } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(targets.id, id), eq(targets.userId, userId)))
        .returning();
      if (rows[0] && refreshGuess) {
        await db.delete(emailGuesses)
          .where(and(eq(emailGuesses.targetId, id), eq(emailGuesses.userId, userId)));
      }
      return rows;
    })(),
  );
  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  // Best effort: only evidence changes restart the company email search.
  if (refreshGuess) {
    try {
      await enqueueEmailGuess(updated.id, userId);
    } catch (error) {
      console.error("Failed to enqueue email-guess", error);
    }
  }
  return NextResponse.json({ target: toTargetJson(updated) });
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  // Email guesses and outreach cascade via FK; template links set-null.
  const id = (await context.params).id;
  const [deleted] = await forUser(userId, (db) =>
    db
      .delete(targets)
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .returning({ id: targets.id }),
  );
  if (!deleted) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: deleted.id });
}
