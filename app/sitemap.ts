import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "https://reachsmith.app";
  return [{ url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 }];
}
