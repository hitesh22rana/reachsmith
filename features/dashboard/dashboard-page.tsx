import { headers } from "next/headers";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { forUser } from "@/db";
import { outreaches, targets, templates } from "@/db/schema";
import { auth, requireUserId } from "@/lib/auth";
import { BlobatarAvatar } from "@/components/blobatar-avatar";
import { ProfileMenu } from "@/features/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { ActivityCard, type ActivityItem } from "./components/activity-card";
import { PipelineCard } from "./components/pipeline-card";
import { AddFirstTargetCta, StatCards } from "./components/stat-cards";
import { CHANNEL_LABELS } from "@/features/templates/validation";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  replied: "Replied",
  no_response: "No response",
  rejected: "Rejected",
  success: "Success",
};

function roleAtCompany(roleTitle: string | null, company: string | null): string {
  const parts = [roleTitle, company].filter(Boolean).join(" at ");
  return parts ? ` · ${parts}` : "";
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });

  const [
    [targetRow],
    [templateRow],
    [outreachRow],
    newTargets,
    newTemplates,
    statusRows,
    recentOutreach,
  ] = await forUser(userId, (db) =>
    Promise.all([
      db.select({ count: count() }).from(targets).where(eq(targets.userId, userId)),
      db.select({ count: count() }).from(templates).where(eq(templates.userId, userId)),
      db.select({ count: count() }).from(outreaches).where(eq(outreaches.userId, userId)),
      db
        .select({
          id: targets.id,
          fullName: targets.fullName,
          roleTitle: targets.roleTitle,
          company: targets.company,
          createdAt: targets.createdAt,
        })
        .from(targets)
        .where(eq(targets.userId, userId))
        .orderBy(desc(targets.createdAt))
        .limit(5),
      db
        .select({ id: templates.id, name: templates.name, createdAt: templates.createdAt })
        .from(templates)
        .where(eq(templates.userId, userId))
        .orderBy(desc(templates.createdAt))
        .limit(5),
      db
        .select({ status: outreaches.status })
        .from(outreaches)
        .where(eq(outreaches.userId, userId)),
      db
        .select({
          id: outreaches.id,
          status: outreaches.status,
          channel: outreaches.channel,
          targetId: outreaches.targetId,
          lastStatusChangeAt: outreaches.lastStatusChangeAt,
        })
        .from(outreaches)
        .where(eq(outreaches.userId, userId))
      .orderBy(desc(outreaches.lastStatusChangeAt))
      .limit(5),
    ]),
  );

  const targetCount = targetRow?.count ?? 0;
  const templateCount = templateRow?.count ?? 0;
  const outreachCount = outreachRow?.count ?? 0;

  const statusCounts: Record<string, number> = {};
  for (const row of statusRows) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  const outreachTargetIds = [...new Set(recentOutreach.map((o) => o.targetId))];
  const outreachTargets =
    outreachTargetIds.length > 0
      ? await forUser(userId, (db) =>
          db
            .select({ id: targets.id, fullName: targets.fullName })
            .from(targets)
            .where(and(eq(targets.userId, userId), inArray(targets.id, outreachTargetIds))),
        )
      : [];
  const targetNames = new Map(outreachTargets.map((t) => [t.id, t.fullName]));

  const activity: ActivityItem[] = [
    ...newTargets.map((t) => ({
      key: `target-${t.id}`,
      at: t.createdAt,
      title: t.fullName,
      detail: `New target${roleAtCompany(t.roleTitle, t.company)}`,
      href: `/targets/${t.id}`,
      face: t.fullName,
    })),
    ...newTemplates.map((t) => ({
      key: `template-${t.id}`,
      at: t.createdAt,
      title: t.name,
      detail: "New template",
      href: "/templates",
      face: null,
    })),
    ...recentOutreach.map((o) => {
      const name = targetNames.get(o.targetId) ?? "Unknown target";
      return {
        key: `outreach-${o.id}`,
        at: o.lastStatusChangeAt,
        title: name,
        detail: `Outreach · ${STATUS_LABELS[o.status] ?? o.status} · ${CHANNEL_LABELS[o.channel] ?? o.channel}`,
        href: "/outreach",
        face: name,
      };
    }),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = session?.user.name.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      <header className="animate-enter flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {session ? (
              <BlobatarAvatar
                name={session.user.email}
                size={52}
                className="ring-1 ring-foreground/10"
              />
            ) : null}
            <div className="min-w-0 space-y-1.5">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {session ? `${greeting}, ${firstName}` : "ReachSmith"}
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
                Organize targets, predict and verify emails, and track outreach.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ModeToggle />
            {session ? (
              <ProfileMenu name={session.user.name} email={session.user.email} />
            ) : null}
          </div>
        </div>
        {session && targetCount === 0 ? <AddFirstTargetCta /> : null}
      </header>

      <StatCards
        stats={{ Targets: targetCount, Templates: templateCount, Outreach: outreachCount }}
      />

      <section className="grid items-start gap-4 lg:grid-cols-5">
        <ActivityCard activity={activity} />
        <PipelineCard outreachCount={outreachCount} statusCounts={statusCounts} />
      </section>
    </div>
  );
}
