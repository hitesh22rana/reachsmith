import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "https://reachsmith.app";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/dashboard", "/targets", "/templates", "/outreach"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
