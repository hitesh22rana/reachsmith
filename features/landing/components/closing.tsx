import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { FAQS } from "../faqs";

export function Faq() {
  return (
    <section aria-labelledby="faq-heading" id="faq" className="mx-auto w-full max-w-5xl scroll-mt-24 px-6 py-8 sm:py-12">
      <Reveal>
        <div className="mx-auto max-w-[680px] space-y-3 text-center">
          <p className="text-sm font-semibold text-muted-foreground">FAQ</p>
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Asked before you ask
          </h2>
        </div>
      </Reveal>
      <div className="mx-auto mt-8 flex max-w-[680px] flex-col gap-3">
        {FAQS.map((faq, index) => (
          <Reveal key={faq.question} delay={Math.min(index, 3) * 60}>
            <details
              open={index === 0}
              className="group rounded-2xl border bg-card px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-open:rotate-180"
                />
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
    <section aria-labelledby="final-heading" className="mx-auto w-full max-w-5xl px-6 py-8 text-center sm:py-12">
      <Reveal>
        <h2
          id="final-heading"
          className="mx-auto max-w-[680px] bg-gradient-to-r from-black to-[#666666] bg-clip-text text-3xl font-semibold tracking-tight text-balance text-transparent sm:text-4xl dark:from-white dark:to-[#9B9B9B]"
        >
          Your next referral is one pipeline away
        </h2>
        <p className="mx-auto mt-4 max-w-[680px] text-lg text-pretty text-muted-foreground">
          Create an account, add your first contact, and send the first message today.
        </p>
        <div className="mt-6">
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
