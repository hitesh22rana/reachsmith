import { headers } from "next/headers";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { ArrowRight, Mail, Send, Users, type LucideIcon } from "lucide-react";
import { getDb } from "@/db";
import { outreaches, targets, templates } from "@/db/schema";
import { auth, requireUserId } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileMenu } from "@/features/auth";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

interface Section {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

const SECTIONS: Section[] = [
  {
    icon: Users,
    title: "Targets",
    description: "Recruiters, hiring managers, and employees to reach.",
    href: "/targets",
    linkLabel: "Open targets",
  },
  {
    icon: Mail,
    title: "Templates",
    description: "Reusable messages with variables that fill themselves in.",
    href: "/templates",
    linkLabel: "Open templates",
  },
  {
    icon: Send,
    title: "Outreach",
    description: "Drafts, sent messages, replies, and outcomes in one pipeline.",
    href: "/outreach",
    linkLabel: "Open outreach",
  },
];

function pluralize(count: number, singular: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${singular}s`;
}

export default async function DashboardPage() {
  const userId = await requireUserId();
  const session = await auth.api.getSession({ headers: await headers() });
  const [[targetRow], [templateRow], [outreachRow]] = await Promise.all([
    getDb().select({ count: count() }).from(targets).where(eq(targets.userId, userId)),
    getDb().select({ count: count() }).from(templates).where(eq(templates.userId, userId)),
    getDb().select({ count: count() }).from(outreaches).where(eq(outreaches.userId, userId)),
  ]);
  const targetCount = targetRow?.count ?? 0;
  const stats: Record<string, string> = {
    Targets: pluralize(targetCount, "target"),
    Templates: pluralize(templateRow?.count ?? 0, "template"),
    Outreach: `${outreachRow?.count ?? 0} outreach`,
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="animate-enter flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">ReachSmith</h1>
            <p className="max-w-xl text-muted-foreground">
              Organize targets, predict and verify emails, and track outreach.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
            {session ? (
              <ProfileMenu name={session.user.name} email={session.user.email} />
            ) : (
              <>
                <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "pressable")}>
                  Log in
                </Link>
                <Link href="/signup" className={cn(buttonVariants(), "pressable")}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
        {session && targetCount === 0 ? (
          <Link href="/targets" className={cn(buttonVariants(), "pressable", "self-start")}>
            Add your first target
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      <section className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map((section, index) => (
          <Card
            key={section.title}
            className="animate-enter"
            style={{ animationDelay: `${(index + 1) * 70}ms` }}
          >
            <CardHeader>
              <section.icon
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <div className="flex items-center justify-between px-(--card-spacing) pb-1">
              <span className="text-sm font-medium">
                {stats[section.title] ?? ""}
              </span>
              <Link
                href={section.href}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {section.linkLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
