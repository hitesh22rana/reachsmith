import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { forUser } from "@/db";
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
  const id = (await context.params).id;
  const [target] = await forUser(userId, (db) =>
    db
      .select({ id: targets.id })
      .from(targets)
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .limit(1),
  );
  if (!target) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const rows = await forUser(userId, (db) =>
    db
      .select()
      .from(emailGuesses)
      .where(and(eq(emailGuesses.targetId, target.id), eq(emailGuesses.userId, userId)))
      // ~5-20 rows for one target, so no pagination, but they do need a
      // defined order and created_at cannot give one: the guess worker
      // inserts a whole ranked batch in one statement, so every candidate
      // shares a transaction timestamp. score is the ranking it computed.
      .orderBy(desc(emailGuesses.score), desc(emailGuesses.createdAt)),
  );
  return NextResponse.json({
    guesses: rows.map((row) => ({
      email: row.email,
      patternUsed: row.patternUsed,
      source: row.source,
      status: row.status,
    })),
  });
}
