import { requireUserId } from "@/lib/auth";
import { TemplatesView } from "@/features/templates";

export default async function TemplatesPage() {
  await requireUserId();
  return <TemplatesView />;
}
