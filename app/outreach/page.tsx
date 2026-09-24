import { requireUserId } from "@/lib/auth";
import { OutreachView } from "@/features/outreach";

export default async function OutreachPage() {
  await requireUserId();
  return <OutreachView />;
}
