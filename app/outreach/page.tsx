import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth";
import { OutreachView } from "@/features/outreach";

export const metadata: Metadata = {
  title: "Outreach",
  description: "Track your ReachSmith outreach pipeline.",
  robots: { index: false, follow: false },
};

export default async function OutreachPage() {
  await requireUserId();
  return <OutreachView />;
}
