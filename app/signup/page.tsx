import type { Metadata } from "next";
import { AuthForm } from "@/features/auth";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a free ReachSmith account.",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
