import { Mail } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function TemplatesPage() {
  return (
    <EmptyState
      icon={Mail}
      title="No templates yet"
      description="Save reusable outreach messages with variables like {{first_name}} and {{company}}."
    />
  );
}
