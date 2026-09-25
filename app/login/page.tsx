import type { Metadata } from "next";
import { AuthForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your ReachSmith account.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const created = (await searchParams).new === "1";
  return (
    <>
      {created ? (
        <p className="mx-auto w-full max-w-sm px-6 pt-12 text-center text-sm text-muted-foreground">
          Account created. Log in to continue.
        </p>
      ) : null}
      <AuthForm mode="login" />
    </>
  );
}
