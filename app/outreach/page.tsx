import { Send } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireUserId } from "@/lib/auth";

export default async function OutreachPage() {
  await requireUserId();
  return (
    <EmptyState
      icon={Send}
      title="No outreach yet"
      description="Compose a message from a template, copy it, and mark it sent."
    />
  );
}
