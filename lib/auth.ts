import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
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
