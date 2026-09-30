import { Eye, Send, UserPlus, type LucideIcon } from "lucide-react";
import { Reveal } from "./reveal";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

const STEPS: Step[] = [
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
    title: "Copy, send, track",
    body: "Copy your message, send it from your own inbox, and log replies and referrals.",
  },
];

export function HowSteps() {
  return (
    <ol className="relative mx-auto mt-8 flex max-w-170 flex-col gap-8">
      <div aria-hidden="true" className="absolute top-5 bottom-5 left-5 w-px -translate-x-1/2 bg-border" />
      {STEPS.map((step, index) => (
        <li key={step.title}>
          <Reveal delay={index * 80} className="grid grid-cols-[auto_1fr] items-start gap-4 sm:gap-5">
            <div
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full border border-primary bg-primary text-sm font-semibold text-primary-foreground"
            >
              <span>{index + 1}</span>
            </div>
            <div className="space-y-1 pt-1.5">
              <p className="flex items-center gap-2 text-base font-semibold tracking-tight">
                <step.icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {step.title}
              </p>
              <p className="text-sm text-pretty text-muted-foreground">{step.body}</p>
            </div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
