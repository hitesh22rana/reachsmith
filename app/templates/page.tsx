import { Mail } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireUserId } from "@/lib/auth";

export default async function TemplatesPage() {
  await requireUserId();
  return (
    <EmptyState
      icon={Mail}
      title="No templates yet"
      description="Save reusable outreach messages with variables like {{first_name}} and {{company}}."
    />
  );
}
