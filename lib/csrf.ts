// CSRF: the session cookie is SameSite=Lax, which stops cross-site POSTs
// from carrying credentials but is one unasserted third-party default.
// This makes the check explicit for state-changing requests. A browser
// always sets Origin on cross-origin and same-origin mutations, so a
// request without one is a non-browser client that had to bring its own
// cookie; only a present-and-foreign Origin is rejected.
//
// Compares host *and* port, so https://app.example.com:8443 does not pass
// as https://app.example.com. Kept free of any Next import so it is
// runnable outside the app (scripts/selfcheck.ts).

export function isCrossOrigin(origin: string | null, host: string | null): boolean {
  if (origin === null) {
    return false;
  }
  if (host === null) {
    return true;
  }
  try {
    return new URL(origin).host !== host;
  } catch {
    // "null" (opaque origin) and anything unparseable.
    return true;
  }
}
