import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { audiences, templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { toTemplateJson, toTemplatePatch } from "@/features/templates/server";
import { placeholderError } from "@/features/templates/render";
import { parseBody } from "@/lib/validators";
import { TemplatePatchSchema } from "@/features/templates/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function findOwnedTemplate(userId: string, id: string) {
  const [row] = await forUser(userId, (db) =>
    db
      .select({ template: templates, audienceName: audiences.name })
      .from(templates)
      .leftJoin(audiences, eq(templates.audienceId, audiences.id))
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .limit(1),
  );
  return row ?? null;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const row = await findOwnedTemplate(userId, (await context.params).id);
  if (!row) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ template: toTemplateJson(row.template, row.audienceName) });
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(TemplatePatchSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  if (parsed.data.body !== undefined) {
    const problem = placeholderError(parsed.data.body);
    if (problem) {
      return NextResponse.json({ message: problem }, { status: 400 });
    }
  }
  const id = (await context.params).id;
  const result = await forUser(userId, async (db) => {
    const patch = await toTemplatePatch(db, userId, parsed.data);
    if (Object.keys(patch).length === 0) {
      return { empty: true, template: null, audienceName: null };
    }
    const [template] = await db
      .update(templates)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .returning();
    if (!template) {
      return { empty: false, template: null, audienceName: null };
    }
    // The row may predate this save under different casing, so read the name
    // back rather than echoing what was typed.
    const [row] = await db
      .select({ audienceName: audiences.name })
      .from(templates)
      .leftJoin(audiences, eq(templates.audienceId, audiences.id))
      .where(eq(templates.id, template.id))
      .limit(1);
    return { empty: false, template, audienceName: row?.audienceName ?? null };
  });
  if (result.empty) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }
  if (!result.template) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    template: toTemplateJson(result.template, result.audienceName),
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const id = (await context.params).id;
  const [deleted] = await forUser(userId, (db) =>
    db
      .delete(templates)
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .returning({ id: templates.id }),
  );
  if (!deleted) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: deleted.id });
}
