import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { forUser } from "@/db";
import { targets } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { NotesForm } from "./components/notes-form";
import { EditTargetDialog } from "./components/edit-target-dialog";
import { TargetEmailSection } from "@/features/email";
import { TargetOutreachSection } from "@/features/outreach";
import { BackLink } from "@/components/back-link";
import { toTargetJson } from "./server";

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
  const id = (await params).id;
  const [target] = await forUser(userId, (db) =>
    db
      .select()
      .from(targets)
      .where(and(eq(targets.id, id), eq(targets.userId, userId)))
      .limit(1),
  );
  if (!target) {
    notFound();
  }

  const title = [target.roleTitle, target.company].filter((part) => part).join(" at ");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
      <BackLink href="/targets">Back to targets</BackLink>
      <div className="animate-enter flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{target.fullName}</h1>
          {title ? <p className="text-muted-foreground">{title}</p> : null}
        </div>
        <EditTargetDialog target={toTargetJson(target)} />
      </div>

      <section aria-label="Contact info" className="animate-enter rounded-2xl border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" value={target.primaryEmail ?? "Finding email"} />
          <Field label="Source" value={target.sourceType} />
          <Field label="Email domain" value={target.domain} />
          <Field label="Company site" value={target.companyWebsite} href={target.companyWebsite} />
          <Field label="Location" value={target.location} />
        </div>
        {target.socialUrls && target.socialUrls.length > 0 ? (
          <div className="mt-4 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Social URLs</p>
            <ul className="space-y-1">
              {target.socialUrls.map((url) => (
                <li key={url}>
                  <Link
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary break-all hover:underline"
                  >
                    {url}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section aria-label="Notes" className="animate-enter rounded-2xl border bg-card p-6">
        <NotesForm id={target.id} notes={target.notes} />
      </section>

      <section aria-label="Email candidates" className="animate-enter rounded-2xl border bg-card p-6">
        <TargetEmailSection
          targetId={target.id}
          primaryEmail={target.primaryEmail}
          primaryEmailSource={target.primaryEmailSource}
        />
      </section>

      <section aria-label="Outreach history" className="animate-enter rounded-2xl border bg-card p-6">
        <TargetOutreachSection
          target={{
            id: target.id,
            firstName: target.firstName,
            lastName: target.lastName,
            company: target.company,
            roleTitle: target.roleTitle,
            location: target.location,
            companyWebsite: target.companyWebsite,
            domain: target.domain,
            primaryEmail: target.primaryEmail,
          }}
        />
      </section>
    </div>
  );
}
