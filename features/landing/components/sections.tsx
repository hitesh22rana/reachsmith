import { Inbox, PenLine, Send, ShieldCheck, type LucideIcon } from "lucide-react";
import { Reveal } from "./reveal";
import { HowSteps } from "./how-steps";

function Eyebrow({ children }: { children: string }) {
  return <p className="text-sm font-semibold text-muted-foreground">{children}</p>;
}

function SectionHeading({ id, eyebrow, title, sub }: { id: string; eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-170 space-y-3 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      {sub ? <p className="text-lg text-pretty text-muted-foreground">{sub}</p> : null}
    </div>
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
    <section aria-labelledby="features-heading" id="features" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-8 sm:py-12">
      <Reveal>
        <SectionHeading
          id="features-heading"
          eyebrow="Features"
          title="Everything between hello and hired"
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

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" id="how" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-8 sm:py-12">
      <Reveal>
        <SectionHeading
          id="how-heading"
          eyebrow="How it works"
          title="Three steps to your first reply"
          sub="No onboarding call. The empty states walk you through each step."
        />
      </Reveal>
      <HowSteps />
    </section>
  );
}
