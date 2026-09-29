import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { audiences } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { mergeAudiences, resolveAudienceId, toAudienceJson } from "@/features/audiences/server";
import { AudienceCreateSchema } from "@/features/audiences/validation";
import { parseBody } from "@/lib/validators";

export async function GET(): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const rows = await forUser(userId, (db) =>
    db
      .select()
      .from(audiences)
      .where(eq(audiences.userId, userId))
      .orderBy(desc(audiences.createdAt)),
  );
  return NextResponse.json({ audiences: mergeAudiences(rows) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(AudienceCreateSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const id = await forUser(userId, (db) => resolveAudienceId(db, userId, parsed.data.name));
  if (!id) {
    return NextResponse.json({ message: "Failed to create audience" }, { status: 500 });
  }
  const [created] = await forUser(userId, (db) =>
    db.select().from(audiences).where(eq(audiences.id, id)).limit(1),
  );
  if (!created) {
    return NextResponse.json({ message: "Failed to create audience" }, { status: 500 });
  }
  return NextResponse.json({ audience: toAudienceJson(created) }, { status: 201 });
}
