import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    // Model names stay singular for Better Auth; tables are plural.
    schema: { user: users, session: sessions, account: accounts, verification: verifications },
  }),
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
