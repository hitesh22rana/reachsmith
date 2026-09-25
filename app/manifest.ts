import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReachSmith",
    short_name: "ReachSmith",
    description: "Referral outreach without the spreadsheet.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/reachsmith-mascot.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
