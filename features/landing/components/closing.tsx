import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";
import { FAQS } from "../faqs";

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
