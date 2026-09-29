import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { outreaches, targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { isCrossOrigin } from "@/lib/csrf";
import { toOutreachJson } from "@/features/outreach/server";
import { parseBody } from "@/lib/validators";
import { OutreachPatchSchema } from "@/features/outreach/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  if (isCrossOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(OutreachPatchSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const [row] = await getDb()
    .select({ outreach: outreaches, fullName: targets.fullName, company: targets.company })
    .from(outreaches)
    .innerJoin(targets, eq(outreaches.targetId, targets.id))
    .where(and(eq(outreaches.id, (await context.params).id), eq(outreaches.userId, userId)))
    .limit(1);
  if (!row) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const now = new Date();
  // Owner predicate repeats inside the write, not just in the read above.
  const [updated] = await getDb()
    .update(outreaches)
    .set({
      status: parsed.data.status,
      sentAt: parsed.data.status === "sent" && !row.outreach.sentAt ? now : row.outreach.sentAt,
      lastStatusChangeAt: now,
      updatedAt: now,
    })
    .where(and(eq(outreaches.id, row.outreach.id), eq(outreaches.userId, userId)))
    .returning();
  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    outreach: toOutreachJson(updated, { fullName: row.fullName, company: row.company }),
  });
}
