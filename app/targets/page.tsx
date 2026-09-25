import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth";
import { TargetsView } from "@/features/targets";

export const metadata: Metadata = {
  title: "Targets",
  description: "Manage your ReachSmith target contacts.",
  robots: { index: false, follow: false },
};

export default async function TargetsPage() {
  await requireUserId();
  return <TargetsView />;
}
