import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";

// Rate-limit buckets are keyed on the client IP. With no trustedProxies,
// Better Auth accepts a bare single-value `X-Forwarded-For` from the caller
// (ip.mjs:190), so an anonymous client mints a fresh bucket per request and
// the 3-per-10s sign-in throttle never accumulates. Listing a non-empty
// trusted-hop set makes it walk the XFF chain right-to-left and stop at the
// first untrusted hop, so a prepended forgery is discarded and only the hop
// the proxy actually observed becomes the key.
//
// The default covers loopback and RFC1918 space, which is where a real
// reverse proxy, load balancer or the compose bridge sits. Override with
// BETTER_AUTH_TRUSTED_PROXIES (comma-separated IPs or CIDRs) when TLS is
// terminated somewhere else.
const DEFAULT_TRUSTED_PROXIES = [
  "127.0.0.1/32",
  "::1/128",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
];

const trustedProxies = (process.env.BETTER_AUTH_TRUSTED_PROXIES ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

// An explicit empty list would restore the client-selectable key, so fall
// back to the defaults rather than honouring a blank value.
const ipProxies = trustedProxies.length > 0 ? trustedProxies : DEFAULT_TRUSTED_PROXIES;

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    // Model names stay singular for Better Auth; tables are plural.
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
  advanced: {
    ipAddress: { trustedProxies: ipProxies },
  },
  session: {
    // getUserId() runs on every authenticated request and slides expiresAt
    // forward, so without this a stolen token stays valid for as long as the
    // victim keeps using the app. Sessions now expire 7 days after issue.
    disableSessionRefresh: true,
  },
  emailAndPassword: {
    enabled: true,
    // No auto sign-in: existing emails get a generic success-shaped
    // response (plus dummy hashing) instead of an "already exists"
    // error, so signups do not reveal which emails are registered.
    autoSignIn: false,
  },
});

// Session user id for ownership scoping. Null when logged out;
// never throws, so callers choose redirect vs 401.
export async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

// Page guard: logged-out visitors go to login. Fails closed by design.
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) {
    redirect("/login");
  }
  return userId;
}
