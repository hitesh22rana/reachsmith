import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { SiteFooter, SiteHeader } from "@/features/landing";
import { FAQS, Hero } from "@/features/landing";
import { Benefits, HowItWorks } from "@/features/landing";
import { Faq, FinalCta } from "@/features/landing";

export const metadata: Metadata = {
  title: "ReachSmith — Referral outreach without the spreadsheet",
  description:
    "Referral outreach without the spreadsheet. Keep every contact in one place, verify each email, and track every conversation to its outcome.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "ReachSmith — Referral outreach without the spreadsheet",
    description:
      "Referral outreach without the spreadsheet. Keep every contact in one place, verify each email, and track every conversation to its outcome.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReachSmith — Referral outreach without the spreadsheet",
    description:
      "Referral outreach without the spreadsheet. Keep every contact in one place, verify each email, and track every conversation to its outcome.",
  },
};

export default async function Home() {
  if (await getUserId()) {
    redirect("/dashboard");
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <div className="flex min-h-full flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <Hero />
        <Benefits />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
