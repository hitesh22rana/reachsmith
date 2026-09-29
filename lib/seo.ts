// One origin for metadata, robots and the sitemap: three copies of this
// expression is three chances for canonical URLs to disagree with each other.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "https://reachsmith.app";

export function resolveBaseUrl(): URL {
  try {
    return new URL(SITE_URL);
  } catch {
    return new URL("https://reachsmith.app");
  }
}
