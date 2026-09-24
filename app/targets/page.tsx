import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requireUserId } from "@/lib/auth";

export default async function TargetsPage() {
  await requireUserId();
  return (
    <EmptyState
      icon={Users}
      title="No targets yet"
      description="Add recruiters, hiring managers, and employees you want to reach."
    />
  );
}
