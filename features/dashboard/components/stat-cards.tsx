import Link from "next/link";
import { ArrowRight, Mail, Send, Users, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function StatCards({ stats }: { stats: Record<string, number> }) {
  return (
    <section className="grid gap-4 sm:grid-cols-3" aria-label="Overview">
      {SECTIONS.map((section, index) => (
        <Card
          key={section.title}
          // transform only: box-shadow in the transition is a paint-only
          // property, and a drop shadow is a second elevation cue fighting a
          // 2px lift on a page this frequent.
          className="animate-enter transition-transform duration-150 ease-out-strong hover:-translate-y-0.5"
          style={{ animationDelay: `${(index + 1) * 60}ms` }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
                <section.icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {stats[section.title] ?? 0}
              </span>
            </div>
            <CardTitle>{section.title}</CardTitle>
            <CardDescription>{section.description}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-end bg-transparent py-3">
            <Link
              href={section.href}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {section.linkLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}

export function AddFirstTargetCta() {
  return (
    <Link href="/targets" className={cn(buttonVariants(), "pressable", "self-start")}>
      Add your first target
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}
