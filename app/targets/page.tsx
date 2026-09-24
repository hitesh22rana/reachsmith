import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function TargetsPage() {
  return (
    <EmptyState
      icon={Users}
      title="No targets yet"
      description="Add recruiters, hiring managers, and employees you want to reach."
    />
  );
}
