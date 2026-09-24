import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/components/landing/chrome";
import { Hero } from "@/components/landing/hero";
import { Tagline } from "@/components/landing/tagline";
import { Accuracy, Benefits, HowItWorks, Problem } from "@/components/landing/sections";
import { Faq, FinalCta } from "@/components/landing/closing";

export const metadata: Metadata = {
  title: "ReachSmith — Referral outreach without the spreadsheet",
  description:
    "ReachSmith keeps every recruiter and employee contact in one place, checks each email before you write, and tracks every conversation to its outcome.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Home() {
  if (await getUserId()) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <Hero />
        <Tagline />
        <Problem />
        <Benefits />
        <HowItWorks />
        <Accuracy />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
