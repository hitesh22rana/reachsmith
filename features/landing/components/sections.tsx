import { Eye, Flag, Inbox, ListChecks, PenLine, Send, ShieldCheck, UserPlus, type LucideIcon } from "lucide-react";
import { Reveal } from "./reveal";

function Eyebrow({ children }: { children: string }) {
  return <p className="text-sm font-semibold text-muted-foreground">{children}</p>;
}

function SectionHeading({ id, eyebrow, title, sub }: { id: string; eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-[680px] space-y-3 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      <p className="text-lg text-pretty text-muted-foreground">{sub}</p>
    </div>
  );
}

export function Problem() {
  return (
    <section aria-labelledby="problem-heading" className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <Reveal>
        <SectionHeading
          id="problem-heading"
          eyebrow="The problem"
          title="Referrals should not live in a spreadsheet"
          sub="Someone agrees to refer you. The thread goes quiet, the link expires, and nobody remembers who promised what. ReachSmith gives every contact a home: their role, your messages, and what happens next."
        />
      </Reveal>
    </section>
  );
}

interface Benefit {
  icon: LucideIcon;
  title: string;
  body: string;
}

const BENEFITS: Benefit[] = [
  {
    icon: Inbox,
    title: "One pipeline from first hello to hired",
    body: "Drafts, sent mail, replies, and outcomes in a single view.",
  },
  {
    icon: PenLine,
    title: "Personal mail without rewriting",
    body: "Templates fill name, company, role, and job link for each contact.",
  },
  {
    icon: ShieldCheck,
    title: "Addresses you can trust",
    body: "Every guess passes mailbox checks and a verification service. Only valid ones get recommended.",
  },
  {
    icon: Send,
    title: "Sending stays in your hands",
    body: "You copy, you send, you mark it sent. Nothing goes out on its own.",
  },
];

export function Benefits() {
  return (
    <section aria-labelledby="features-heading" id="features" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-12 sm:py-16">
      <Reveal>
        <SectionHeading
          id="features-heading"
          eyebrow="Features"
          title="Everything between hello and hired"
          sub="Four pieces that cover the whole loop, built for one person running many conversations."
        />
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {BENEFITS.map((benefit, index) => (
          <Reveal key={benefit.title} delay={(index % 2) * 80}>
            <article className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-6">
              <benefit.icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <p className="text-base font-semibold tracking-tight">{benefit.title}</p>
              <p className="text-sm text-pretty text-muted-foreground">{benefit.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: UserPlus,
    title: "Add your contacts",
    body: "Name, company, and profile link. That is all it takes to start.",
  },
  {
    icon: Eye,
    title: "Preview the message",
    body: "Pick a template and see the personal version before you copy it.",
  },
  {
    icon: Send,
    title: "Verify, send, track",
    body: "Confirm the address, send from your own inbox, and log replies and referrals.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" id="how" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-12 sm:py-16">
      <Reveal>
        <SectionHeading
          id="how-heading"
          eyebrow="How it works"
          title="Three steps to your first reply"
          sub="No onboarding call. The empty states walk you through each step."
        />
      </Reveal>
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <Reveal key={step.title} delay={index * 80}>
            <li className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <step.icon className="size-5 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-semibold text-muted-foreground">{index + 1}</span>
              </div>
              <p className="text-base font-semibold tracking-tight">{step.title}</p>
              <p className="text-sm text-pretty text-muted-foreground">{step.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

const CHECKS = [
  {
    icon: ListChecks,
    title: "A short list, not a shot in the dark",
    body: "Common address patterns produce a handful of candidates. Nothing more to review.",
  },
  {
    icon: ShieldCheck,
    title: "Mailbox checked before you trust it",
    body: "Syntax, mailbox existence, and a verification service run before any address gets recommended.",
  },
  {
    icon: Flag,
    title: "Risky domains get flagged",
    body: "Domains that accept all mail are labeled risky instead of valid. You always see the confidence.",
  },
];

export function Accuracy() {
  return (
    <section aria-labelledby="accuracy-heading" className="mx-auto w-full max-w-5xl px-6 py-12 sm:py-16">
      <Reveal>
        <SectionHeading
          id="accuracy-heading"
          eyebrow="Email accuracy"
          title="Guessed, then proven"
          sub="A predicted address means nothing until it passes every check. Set any address by hand when you prefer."
        />
      </Reveal>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {CHECKS.map((check, index) => (
          <Reveal key={check.title} delay={index * 80}>
            <article className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-6">
              <check.icon className="size-5 text-muted-foreground" aria-hidden="true" />
              <p className="text-base font-semibold tracking-tight">{check.title}</p>
              <p className="text-sm text-pretty text-muted-foreground">{check.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
