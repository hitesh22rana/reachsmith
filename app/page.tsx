import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ReachSmith | Make every outreach count",
  description:
    "Keep your job search contacts, tailored messages, email checks, and follow-ups in one place.",
};

const stages = [
  {
    number: "01",
    title: "Keep the right people close.",
    description:
      "Collect recruiters, hiring managers, and potential referrers with the context you need before reaching out.",
  },
  {
    number: "02",
    title: "Write with context.",
    description:
      "Start from a reusable template, add the role and company details, then make the message your own.",
  },
  {
    number: "03",
    title: "Check the address.",
    description:
      "When an email is missing, ReachSmith can generate likely addresses and verify candidates before you use one.",
  },
  {
    number: "04",
    title: "Know where things stand.",
    description:
      "Copy your message, send it yourself, and record what happened so the next follow-up has a clear starting point.",
  },
] as const;

const primaryLink =
  "inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-6 font-semibold text-background transition-transform duration-150 ease-out hover:opacity-85 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 motion-reduce:transition-none motion-reduce:active:scale-100 dark:focus-visible:outline-orange-400";
const textLink =
  "inline-flex items-center gap-2 whitespace-nowrap border-b border-current font-semibold transition-colors duration-150 hover:text-orange-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 motion-reduce:transition-none dark:hover:text-orange-400 dark:focus-visible:outline-orange-400";

export default async function Home() {
  if (await getUserId()) {
    redirect("/dashboard");
  }

  return (
    <main className="w-full flex-1 bg-background text-foreground">
      <div className="mx-auto w-[min(100%-2rem,80rem)]">
        <nav className="flex items-center justify-between gap-4 border-b border-border py-6" aria-label="Main navigation">
          <Link href="/" aria-label="ReachSmith home" className="whitespace-nowrap text-lg font-bold tracking-[-0.05em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 dark:focus-visible:outline-orange-400">
            Reach<span className="text-orange-700 dark:text-orange-400">Smith</span>
          </Link>
          <Link href="/signup" className={textLink}>
            Create account <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>

        <section className="grid gap-10 py-16 sm:py-24 lg:min-h-[43rem] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center lg:gap-16" aria-labelledby="landing-title">
          <div className="min-w-0">
            <p className="flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground before:size-2 before:rounded-full before:bg-orange-700 before:content-[''] dark:before:bg-orange-400">
              A workspace for the job search
            </p>
            <h1 id="landing-title" className="my-6 max-w-[11ch] min-w-0 text-5xl leading-[1.02] font-semibold tracking-[-0.065em] [overflow-wrap:anywhere] sm:text-6xl lg:text-[clamp(4rem,7vw,6.75rem)]">
              Make every <span className="text-orange-700 dark:text-orange-400">outreach</span> count.
            </h1>
            <p className="max-w-[48ch] text-lg leading-relaxed text-muted-foreground">
              Find the people worth contacting. Write a message that sounds like
              you. Keep track of every conversation without another spreadsheet.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <Link href="/signup" className={primaryLink}>
                Create account <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/login" className={textLink}>Log in</Link>
            </div>
          </div>

          <div className="min-w-0 rounded-xl border border-border bg-muted p-6" aria-label="The ReachSmith workflow">
            <div className="flex justify-between gap-4 border-b border-border pb-6 font-mono text-xs text-muted-foreground">
              <span>One place for the whole conversation</span>
              <span aria-hidden="true">↘</span>
            </div>
            <ol className="divide-y divide-border">
              {[
                "People to reach",
                "Messages to send",
                "Emails to check",
                "Replies to track",
              ].map((label, index) => (
                <li key={label} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6 py-6">
                  <span className="font-mono text-xs text-orange-700 dark:text-orange-400">0{index + 1} /</span>
                  <strong className="text-xl font-medium tracking-tight sm:text-2xl">{label}</strong>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border py-16 sm:py-24" id="how-it-works" aria-labelledby="workflow-title">
          <div className="mb-16 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)] lg:items-end">
            <div className="min-w-0">
              <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">The workflow</p>
              <h2 id="workflow-title" className="max-w-[17ch] min-w-0 text-4xl leading-tight font-semibold tracking-[-0.055em] [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">
                From first contact to follow-up.
              </h2>
            </div>
            <p className="max-w-[44ch] leading-relaxed text-muted-foreground">
              ReachSmith gives each step a home, so the details behind a good
              introduction do not disappear between tabs.
            </p>
          </div>
          <ol>
            {stages.map((stage) => (
              <li key={stage.number} className="grid gap-3 border-t border-border py-10 lg:grid-cols-[5rem_minmax(0,1fr)_minmax(0,0.9fr)] lg:items-baseline lg:gap-10">
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-orange-700 dark:text-orange-400">{stage.number} / 04</span>
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{stage.title}</h3>
                <p className="max-w-[47ch] leading-relaxed text-muted-foreground">{stage.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl bg-muted p-6 sm:p-12 lg:p-16" aria-label="Get started">
          <p className="mb-10 max-w-[18ch] text-4xl leading-tight font-semibold tracking-[-0.05em] [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">
            Good conversations start with a little preparation.
          </p>
          <Link href="/signup" className={primaryLink}>
            Create account <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 py-10 text-sm text-muted-foreground">
          <span>ReachSmith, a personal outreach workspace.</span>
          <Link href="/login" className="whitespace-nowrap text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 dark:focus-visible:outline-orange-400">Log in</Link>
        </footer>
      </div>
    </main>
  );
}
