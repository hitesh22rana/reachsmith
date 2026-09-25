import type { Metadata } from "next";
import { requireUserId } from "@/lib/auth";
import { TemplatesView } from "@/features/templates";

export const metadata: Metadata = {
  title: "Templates",
  description: "Manage your ReachSmith outreach templates.",
  robots: { index: false, follow: false },
};

export default async function TemplatesPage() {
  await requireUserId();
  return <TemplatesView />;
}
