import { Send } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function OutreachPage() {
  return (
    <EmptyState
      icon={Send}
      title="No outreach yet"
      description="Compose a message from a template, copy it, and mark it sent."
    />
  );
}
