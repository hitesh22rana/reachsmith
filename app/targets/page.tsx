import { requireUserId } from "@/lib/auth";
import { TargetsView } from "@/features/targets";

export default async function TargetsPage() {
  await requireUserId();
  return <TargetsView />;
}
