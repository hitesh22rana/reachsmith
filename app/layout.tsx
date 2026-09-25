import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "https://reachsmith.app";

function resolveBaseUrl() {
  try {
    return new URL(siteUrl);
  } catch {
    return new URL("https://reachsmith.app");
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: resolveBaseUrl(),
  title: {
    default: "ReachSmith — Referral outreach without the spreadsheet",
    template: "%s | ReachSmith",
  },
  description:
    "Referral outreach without the spreadsheet. Keep every contact in one place, verify each email, and track every conversation to its outcome.",
  keywords: ["referral outreach", "job search", "recruiter contacts", "email verification", "job seekers"],
  authors: [{ name: "ReachSmith" }],
  creator: "ReachSmith",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "ReachSmith",
    url: "/",
    title: "ReachSmith — Referral outreach without the spreadsheet",
    description:
      "Keep every contact in one place, verify each email before you write, and track every conversation to its outcome.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReachSmith — Referral outreach without the spreadsheet",
    description:
      "Keep every contact in one place, verify each email before you write, and track every conversation to its outcome.",
  },
  icons: { icon: [{ url: "/reachsmith-mascot.svg", type: "image/svg+xml" }, "/favicon.ico"] },
  manifest: "/manifest.webmanifest",
};

const siteSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "ReachSmith",
      url: siteUrl,
      logo: `${siteUrl}/reachsmith-mascot.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "ReachSmith",
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth overflow-x-clip antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-clip">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema).replace(/</g, "\\u003c") }} />
        <noscript>
          <style>{`.translate-y-16{transform:none!important}.blur-md{filter:none!important}.opacity-0{opacity:1!important}`}</style>
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
