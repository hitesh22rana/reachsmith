import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
import { audiences } from "@/db/schema";
import { getUserId } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Presets have no rename and no ordering, so delete is the only management
// call there is. Templates referencing the row are unlinked by the FK's
// ON DELETE SET NULL rather than blocking the delete.
export async function DELETE(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const id = (await context.params).id;
  const [deleted] = await forUser(userId, (db) =>
    db
      .delete(audiences)
      .where(and(eq(audiences.id, id), eq(audiences.userId, userId)))
      .returning({ id: audiences.id }),
  );
  if (!deleted) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ id: deleted.id });
}
