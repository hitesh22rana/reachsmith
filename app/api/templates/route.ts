import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { toTemplateInsert, toTemplateJson } from "@/features/templates/server";
import { parseBody } from "@/lib/validators";
import { TemplateCreateSchema } from "@/features/templates/validation";

export async function GET(): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const rows = await getDb()
    .select()
    .from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(desc(templates.createdAt));
  return NextResponse.json({ templates: rows.map(toTemplateJson) });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const parsed = parseBody(TemplateCreateSchema, await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }
  const [template] = await getDb()
    .insert(templates)
    .values(toTemplateInsert(userId, parsed.data))
    .returning();
  if (!template) {
    return NextResponse.json({ message: "Failed to create template" }, { status: 500 });
  }
  return NextResponse.json({ template: toTemplateJson(template) }, { status: 201 });
}
