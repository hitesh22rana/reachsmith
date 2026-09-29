import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import * as v from "valibot";
import { getDb } from "@/db";
import { outreaches, targets, templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { buildOutreachBody, toOutreachInsert, toOutreachJson } from "@/features/outreach/server";
import { parseBody } from "@/lib/validators";
import { OutreachCreateSchema, OutreachStatusSchema } from "@/features/outreach/validation";

const FilterSchema = v.object({
  status: v.optional(OutreachStatusSchema),
  targetId: v.optional(v.string()),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const filter = v.safeParse(FilterSchema, {
    status: params.get("status") ?? undefined,
    targetId: params.get("targetId") ?? undefined,
  });
  if (!filter.success) {
    return NextResponse.json({ message: "Invalid filter" }, { status: 400 });
  }
  const conditions = [eq(outreaches.userId, userId)];
  if (filter.output.status) {
    conditions.push(eq(outreaches.status, filter.output.status));
  }
  if (filter.output.targetId) {
    conditions.push(eq(outreaches.targetId, filter.output.targetId));
  }
  const rows = await getDb()
    .select({ outreach: outreaches, fullName: targets.fullName, company: targets.company })
    .from(outreaches)
    .innerJoin(targets, eq(outreaches.targetId, targets.id))
    .where(and(...conditions))
    .orderBy(desc(outreaches.lastStatusChangeAt));
  return NextResponse.json({
    outreach: rows.map((row) =>
      toOutreachJson(row.outreach, { fullName: row.fullName, company: row.company }),
    ),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(OutreachCreateSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const [target] = await getDb()
    .select()
    .from(targets)
    .where(and(eq(targets.id, parsed.data.target_id), eq(targets.userId, userId)))
    .limit(1);
  if (!target) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  let templateId: string | null = null;
  let templateBody: string | undefined;
  if (parsed.data.template_id) {
    const [template] = await getDb()
      .select()
      .from(templates)
      .where(and(eq(templates.id, parsed.data.template_id), eq(templates.userId, userId)))
      .limit(1);
    if (!template) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    templateId = template.id;
    templateBody = template.body;
  }
  const bodyFinal =
    parsed.data.body ||
    buildOutreachBody(templateBody, target, {
      job_title: parsed.data.job_title,
      job_link: parsed.data.job_link,
    });
  if (!bodyFinal) {
    return NextResponse.json(
      { message: "Provide a template or message text" },
      { status: 400 },
    );
  }
  const [outreach] = await getDb()
    .insert(outreaches)
    .values(toOutreachInsert(userId, target.id, templateId, parsed.data, bodyFinal))
    .returning();
  if (!outreach) {
    return NextResponse.json({ message: "Failed to create outreach" }, { status: 500 });
  }
  return NextResponse.json(
    { outreach: toOutreachJson(outreach, target) },
    { status: 201 },
  );
}
