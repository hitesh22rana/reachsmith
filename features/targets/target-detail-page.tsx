import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { targets } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { NotesForm } from "./components/notes-form";
import { EditTargetDialog } from "./components/edit-target-dialog";
import { TargetEmailSection } from "@/features/email";
import { TargetOutreachSection } from "@/features/outreach";
import { toTargetJson } from "./server";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

function Field({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {value ? (
        href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            {value}
          </Link>
        ) : (
          <p className="text-sm">{value}</p>
        )
      ) : (
        <p className="text-sm text-muted-foreground">Not set</p>
      )}
    </div>
  );
}

export default async function TargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const [target] = await getDb()
    .select()
    .from(targets)
    .where(and(eq(targets.id, (await params).id), eq(targets.userId, userId)))
    .limit(1);
  if (!target) {
    notFound();
  }

  const title = [target.roleTitle, target.company].filter((part) => part).join(" at ");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <div className="animate-enter flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{target.fullName}</h1>
          {title ? <p className="text-muted-foreground">{title}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/targets" className={cn(buttonVariants({ variant: "outline" }), "pressable")}>
            Back to targets
          </Link>
          <EditTargetDialog target={toTargetJson(target)} />
        </div>
      </div>

      <section aria-label="Contact info" className="animate-enter rounded-2xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={target.primaryEmail ?? "Finding email"} />
          <Field label="Source" value={target.sourceType} />
          <Field label="Profile" value={target.profileUrl} href={target.profileUrl} />
          <Field label="Company site" value={target.companyWebsite} href={target.companyWebsite} />
        </div>
      </section>

      <section aria-label="Notes" className="animate-enter rounded-2xl border bg-card p-6">
        <NotesForm id={target.id} notes={target.notes} />
      </section>

      <section aria-label="Email candidates" className="animate-enter rounded-2xl border bg-card p-6">
        <TargetEmailSection targetId={target.id} primaryEmail={target.primaryEmail} />
      </section>

      <section aria-label="Outreach history" className="animate-enter rounded-2xl border bg-card p-6">
        <TargetOutreachSection
          target={{
            id: target.id,
            firstName: target.firstName,
            company: target.company,
            roleTitle: target.roleTitle,
          }}
        />
      </section>
    </div>
  );
}
