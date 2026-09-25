import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

interface MockRow {
  name: string;
  company: string;
  role: string;
  state: string;
  tone: string;
}

const ROWS: MockRow[] = [
  { name: "Maya Chen", company: "Vantech", role: "Backend engineer", state: "Valid", tone: "bg-green-500/10 text-green-700 dark:text-green-400" },
  { name: "Daniel Okafor", company: "Corelink", role: "Recruiter", state: "Verifying", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  { name: "Sofia Marino", company: "Brightline", role: "Hiring manager", state: "Risky", tone: "bg-destructive/10 text-destructive" },
];

function DashboardMock() {
  return (
    <figure className="overflow-hidden rounded-2xl border bg-card text-left shadow-lg">
      <figcaption className="sr-only">
        Preview of the ReachSmith dashboard showing target contacts with verified email states
      </figcaption>
      <div
        role="img"
        aria-label="Preview of the ReachSmith dashboard showing contacts with verified email states"
        className="overflow-hidden text-left"
      >
        <div className="flex items-center gap-1.5 border-b px-4 py-3" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-yellow-400" />
          <span className="size-2.5 rounded-full bg-green-400" />
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <p className="col-span-2 text-xs font-medium text-muted-foreground sm:col-span-4">
            Targets
          </p>
          {ROWS.map((row) => (
            <div key={row.name} className="contents">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.role}</p>
              </div>
              <p className="hidden truncate text-sm text-muted-foreground sm:block">{row.company}</p>
              <p className="hidden text-sm text-muted-foreground sm:block">
                {row.name.split(" ")[0]?.toLowerCase()}@{row.company.toLowerCase()}.com
              </p>
              <span className={cn("justify-self-end rounded-full px-2 py-0.5 text-xs font-medium", row.tone)}>
                {row.state}
              </span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="mx-auto w-full max-w-5xl px-6 pt-12 pb-8 text-center sm:pt-16">
      <Reveal>
        <h1
          id="hero-heading"
          className="mx-auto max-w-170 bg-linear-to-r from-black to-[#666666] bg-clip-text text-4xl font-semibold tracking-tight text-balance text-transparent sm:text-5xl dark:from-white dark:to-[#9B9B9B]"
        >
          Land more referrals
          <br />
          without the outreach spreadsheet
        </h1>
      </Reveal>
      <Reveal delay={120}>
        <p className="mx-auto mt-6 max-w-170 text-lg text-pretty text-muted-foreground">
          Referral outreach without the spreadsheet: every contact in one place, every
          email verified, every conversation tracked.
        </p>
      </Reveal>
      <Reveal delay={200}>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/signup"
            className={cn(buttonVariants(), "pressable h-auto px-3 py-2 text-base font-semibold")}
          >
            Create free account
            <ArrowRight aria-hidden="true" />
          </Link>
          <p className="text-sm text-muted-foreground">
            Free while in private preview • No credit card • Your data stays yours, delete anytime
          </p>
        </div>
      </Reveal>
      <Reveal delay={280} className="mt-10">
        <DashboardMock />
      </Reveal>
    </section>
  );
}
