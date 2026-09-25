import type { Metadata } from "next";
import TargetDetailPage from "@/features/targets/target-detail-page";

export const metadata: Metadata = {
  title: "Target details",
  description: "View a ReachSmith target contact and its outreach history.",
  robots: { index: false, follow: false },
};

export default TargetDetailPage;
