import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { emailGuesses, targets } from "@/db/schema";
import { getUserId } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const [target] = await getDb()
    .select({ id: targets.id })
    .from(targets)
    .where(and(eq(targets.id, (await context.params).id), eq(targets.userId, userId)))
    .limit(1);
  if (!target) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const rows = await getDb()
    .select()
    .from(emailGuesses)
    .where(and(eq(emailGuesses.targetId, target.id), eq(emailGuesses.userId, userId)));
  return NextResponse.json({
    guesses: rows.map((row) => ({
      email: row.email,
      patternUsed: row.patternUsed,
      source: row.source,
      status: row.status,
    })),
  });
}
