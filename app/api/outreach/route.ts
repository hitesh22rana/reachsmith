import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import * as v from "valibot";
import { forUser } from "@/db";
import { outreaches, targets, templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import {
  buildOutreachBody,
  pickDeclaredVariables,
  toOutreachInsert,
  toOutreachJson,
} from "@/features/outreach/server";
import { parseBody } from "@/lib/validators";
import { OutreachCreateSchema, OutreachStatusSchema } from "@/features/outreach/validation";
import { decodeCursor, keysetAfter, paginate, PaginationQuerySchema } from "@/lib/pagination";

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
  const conditions = [eq(outreaches.userId, userId)];
  if (filter.output.status) {
    conditions.push(eq(outreaches.status, filter.output.status));
  }
  if (filter.output.targetId) {
    conditions.push(eq(outreaches.targetId, filter.output.targetId));
  }
  // The cursor composes with the filters: both narrow one keyset scan, so
  // filtering and paging cannot disagree about which rows exist.
  if (cursor) {
    conditions.push(keysetAfter(outreaches.createdAt, outreaches.id, cursor));
  }
  const rows = await forUser(userId, (db) =>
    db
      .select({ outreach: outreaches, fullName: targets.fullName, company: targets.company })
      .from(outreaches)
      .innerJoin(targets, eq(outreaches.targetId, targets.id))
      .where(and(...conditions))
      // created_at, not last_status_change_at: a status PATCH rewrites the
      // latter, re-sorting the list under a reader mid-scroll and moving the
      // cursor's position. The Updated column still renders lastStatusChangeAt.
      .orderBy(desc(outreaches.createdAt), desc(outreaches.id))
      .limit(query.output.limit + 1),
  );
  const page = paginate(rows, query.output.limit, (row) => row.outreach);
  return NextResponse.json({
    outreach: page.items.map((row) =>
      toOutreachJson(row.outreach, { fullName: row.fullName, company: row.company }),
    ),
    nextCursor: page.nextCursor,
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
  const [target] = await forUser(userId, (db) =>
    db
      .select()
      .from(targets)
      .where(and(eq(targets.id, parsed.data.target_id), eq(targets.userId, userId)))
      .limit(1),
  );
  if (!target) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const requestedTemplateId = parsed.data.template_id;
  const [template] = requestedTemplateId
    ? await forUser(userId, (db) =>
        db
          .select()
          .from(templates)
          .where(and(eq(templates.id, requestedTemplateId), eq(templates.userId, userId)))
          .limit(1),
      )
    : [];
  if (requestedTemplateId && !template) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  // The template's stored placeholder list is the allowlist for metadata.
  // A submitted key the template does not declare is dropped rather than
  // stored, so this column cannot be used to smuggle unbounded data or to
  // attach values to a template that never asked for them.
  const variables = pickDeclaredVariables(
    parsed.data.variables,
    template?.placeholders.map((placeholder) => placeholder.name) ?? [],
    template != null,
  );
  const bodyFinal =
    parsed.data.body || buildOutreachBody(template?.body, target, variables);
  if (!bodyFinal) {
    return NextResponse.json(
      { message: "Provide a template or message text" },
      { status: 400 },
    );
  }
  const [outreach] = await forUser(userId, (db) =>
    db
      .insert(outreaches)
      .values(
        toOutreachInsert(userId, target.id, template?.id ?? null, parsed.data, bodyFinal, variables),
      )
      .returning(),
  );
  if (!outreach) {
    return NextResponse.json({ message: "Failed to create outreach" }, { status: 500 });
  }
  return NextResponse.json(
    { outreach: toOutreachJson(outreach, target) },
    { status: 201 },
  );
}
