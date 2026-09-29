import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { audiences, templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { readBackAudienceName, toTemplateInsert, toTemplateJson } from "@/features/templates/server";
import { placeholderError } from "@/features/templates/render";
import { parseBody } from "@/lib/validators";
import { TemplateCreateSchema } from "@/features/templates/validation";

export async function GET(): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const rows = await forUser(userId, (db) =>
    db
      .select({ template: templates, audienceName: audiences.name })
      .from(templates)
      .leftJoin(audiences, eq(templates.audienceId, audiences.id))
      .where(eq(templates.userId, userId))
      .orderBy(desc(templates.createdAt)),
  );
  return NextResponse.json({
    templates: rows.map((row) => toTemplateJson(row.template, row.audienceName)),
  });
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
  // The schema's check is static so the form can show it; this is the same
  // problem with the offending placeholder named.
  const problem = placeholderError(parsed.data.body);
  if (problem) {
    return NextResponse.json({ message: problem }, { status: 400 });
  }
  const created = await forUser(userId, async (db) => {
    const [template] = await db
      .insert(templates)
      .values(await toTemplateInsert(db, userId, parsed.data))
      .returning();
    if (!template) {
      return null;
    }
    return { template, audienceName: await readBackAudienceName(db, template.id) };
  });
  if (!created) {
    return NextResponse.json({ message: "Failed to create template" }, { status: 500 });
  }
  return NextResponse.json(
    { template: toTemplateJson(created.template, created.audienceName) },
    { status: 201 },
  );
}
