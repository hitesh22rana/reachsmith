import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { toTargetJson } from "@/features/targets/server";
import { parseBody } from "@/lib/validators";
import { PrimaryEmailSchema } from "@/features/email/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(PrimaryEmailSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const id = (await context.params).id;
  const [updated] = await forUser(userId, (db) =>
    db
      .update(targets)
      .set({
        primaryEmail: parsed.data.email,
        primaryEmailSource: "manual",
        updatedAt: new Date(),
      })
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .returning(),
  );
  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ target: toTargetJson(updated) });
}
