import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { toTemplateJson, toTemplatePatch } from "@/features/templates/server";
import { parseBody } from "@/lib/validators";
import { TemplatePatchSchema } from "@/features/templates/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function findOwnedTemplate(userId: string, id: string) {
  const [template] = await forUser(userId, (db) =>
    db
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .limit(1),
  );
  return template ?? null;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const template = await findOwnedTemplate(userId, (await context.params).id);
  if (!template) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ template: toTemplateJson(template) });
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
  const patch = toTemplatePatch(parsed.data);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }
  const id = (await context.params).id;
  const [updated] = await forUser(userId, (db) =>
    db
      .update(templates)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .returning(),
  );
  if (!updated) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ template: toTemplateJson(updated) });
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
