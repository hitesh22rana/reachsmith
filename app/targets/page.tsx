import { requireUserId } from "@/lib/auth";
import { TargetsView } from "@/components/targets/targets-view";

export default async function TargetsPage() {
  await requireUserId();
  return <TargetsView />;
}
