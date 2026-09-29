import { NextResponse, type NextRequest } from "next/server";
import { isCsrfAttempt } from "@/lib/csrf";

// CSRF, applied once for every mutating /api request, so a new route cannot
// quietly forget the check. This is a transport-level precondition only: every
// route still calls getUserId() and answers 404 (never 403) for a foreign id.
// All the decision logic lives in lib/csrf.ts.
//
// Scoped to /api on purpose. A Server Action posts to its *page* route, not
// /api, so this matcher would silently skip it. There are none today; an
// action added later must check origin in the action itself.
export function proxy(request: NextRequest): NextResponse {
  if (isCsrfAttempt(request.method, request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
