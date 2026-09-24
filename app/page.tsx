import Link from "next/link";
import { ArrowRight, Mail, Send, Users, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Section {
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
  href: string;
  linkLabel: string;
}

const SECTIONS: Section[] = [
  {
    icon: Users,
    title: "Targets",
    description: "Recruiters, hiring managers, and employees to reach.",
    stat: "0 targets",
    href: "/targets",
    linkLabel: "Open targets",
  },
  {
    icon: Mail,
    title: "Templates",
    description: "Reusable messages with variables that fill themselves in.",
    stat: "0 templates",
    href: "/templates",
    linkLabel: "Open templates",
  },
  {
    icon: Send,
    title: "Outreach",
    description: "Drafts, sent messages, replies, and outcomes in one pipeline.",
    stat: "0 outreach",
    href: "/outreach",
    linkLabel: "Open outreach",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="animate-enter flex flex-col items-start gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">ReachSmith</h1>
          <p className="max-w-xl text-muted-foreground">
            Organize targets, predict and verify emails, and track outreach. Add your first
            target to get started.
          </p>
        </div>
        <Link href="/targets" className={cn(buttonVariants(), "pressable")}>
          Add your first target
          <ArrowRight aria-hidden="true" />
        </Link>
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
              <span className="text-sm font-medium">{section.stat}</span>
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
