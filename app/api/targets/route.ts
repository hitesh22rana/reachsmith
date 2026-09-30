import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import * as v from "valibot";
import { forUser } from "@/db";
import { targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { enqueueEmailGuess } from "@/lib/queues/email";
import { toTargetInsert, toTargetJson } from "@/features/targets/server";
import { parseBody } from "@/lib/validators";
import { decodeCursor, keysetAfter, paginate, PaginationQuerySchema } from "@/lib/pagination";
import { TargetCreateSchema } from "@/features/targets/validation";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const query = v.safeParse(PaginationQuerySchema, {
    limit: params.get("limit") ?? undefined,
    cursor: params.get("cursor") ?? undefined,
  });
  if (!query.success) {
    return NextResponse.json({ message: "Invalid pagination" }, { status: 400 });
  }
  const cursor = decodeCursor(query.output.cursor);
  if (query.output.cursor && !cursor) {
    return NextResponse.json({ message: "Invalid cursor" }, { status: 400 });
  }
  const rows = await forUser(userId, (db) =>
    db
      .select()
      .from(targets)
      .where(
        cursor
          ? and(eq(targets.userId, userId), keysetAfter(targets.createdAt, targets.id, cursor))
          : eq(targets.userId, userId),
      )
      .orderBy(desc(targets.createdAt), desc(targets.id))
      // limit + 1: paginate() trims the extra to prove a next page exists.
      .limit(query.output.limit + 1),
  );
  const page = paginate(rows, query.output.limit);
  return NextResponse.json({
    targets: page.items.map(toTargetJson),
    nextCursor: page.nextCursor,
  });
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
