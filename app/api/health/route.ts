import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

// Public container/runtime check. Authenticated routes are guarded
// by the auth feature; this endpoint only reports DB reachability.
export async function GET(): Promise<NextResponse> {
  try {
    await getDb().execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
