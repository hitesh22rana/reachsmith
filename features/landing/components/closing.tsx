import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

const FAQS = [
  {
    question: "How accurate are the predicted emails?",
    answer:
      "Predictions are educated guesses until verified. Each candidate passes mailbox checks and a verification service, and only valid ones get recommended. Domains that accept all mail get flagged as risky, and you can set any address by hand.",
  },
  {
    question: "Does ReachSmith send email for me?",
    answer:
      "No. You copy the message, send it from your own inbox, and mark it sent. Nothing leaves your accounts on its own.",
  },
  {
    question: "Where does my data live?",
    answer:
      "In your private ReachSmith account, visible only to you. Delete a contact and its messages and guesses go with it. Delete your account and everything goes with it.",
  },
  {
    question: "Does it scrape LinkedIn?",
    answer:
      "No. Add contacts by hand or paste a profile link for reference. Server side scraping stays out on purpose.",
  },
  {
    question: "What does it cost?",
    answer:
      "Nothing while in private preview. No credit card. Leave any time by deleting your data.",
  },
  {
    question: "Who is ReachSmith for?",
    answer:
      "Job seekers asking employees for referrals and following up with recruiters, running many conversations at once.",
  },
  {
    question: "What happens after I create an account?",
    answer:
      "Empty states walk you through the loop: add a contact, save a template, send the first message, and track the reply.",
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq-heading" id="faq" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-16 sm:py-24">
      <Reveal>
        <div className="mx-auto max-w-[680px] space-y-3 text-center">
          <p className="text-sm font-semibold text-muted-foreground">FAQ</p>
          <h2 id="faq-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Asked before you ask
          </h2>
        </div>
      </Reveal>
      <div className="mx-auto mt-12 flex max-w-[680px] flex-col gap-3">
        {FAQS.map((faq, index) => (
          <Reveal key={faq.question} delay={Math.min(index, 3) * 60}>
            <details
              open={index === 0}
              className="group rounded-2xl border bg-card px-5 py-4"
            >
              <summary className="cursor-pointer list-none text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm text-pretty text-muted-foreground">{faq.answer}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section aria-labelledby="final-heading" className="mx-auto w-full max-w-5xl px-6 py-16 text-center sm:py-24">
      <Reveal>
        <h2
          id="final-heading"
          className="mx-auto max-w-[680px] bg-gradient-to-r from-black to-[#666666] bg-clip-text text-4xl font-semibold tracking-tight text-balance text-transparent sm:text-5xl dark:from-white dark:to-[#9B9B9B]"
        >
          Your next referral is one organized pipeline away
        </h2>
        <p className="mx-auto mt-4 max-w-[680px] text-lg text-pretty text-muted-foreground">
          Create an account, add three contacts, and send the first message today.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className={cn(buttonVariants(), "pressable h-auto px-3 py-2 text-base font-semibold")}
          >
            Create free account
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
