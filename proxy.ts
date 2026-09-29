import { NextResponse, type NextRequest } from "next/server";
import { isCsrfAttempt } from "@/lib/csrf";

// CSRF, applied once for every mutating /api request. This was nine copies
// of the same three lines, and the failure mode of that is a new route that
// quietly forgets the check.
//
// Next's guidance is to keep authentication and authorization in the
// handlers, and it is: every route still calls getUserId() and returns 404
// (never 403) for a foreign id. This is a transport-level precondition,
// which is what proxy is for — the same shape as the CORS example in the
// Next docs. All the decision logic lives in lib/csrf.ts; this stays a thin
// adapter so proxy holds no logic of its own.
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
