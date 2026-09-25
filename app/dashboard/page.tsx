import type { Metadata } from "next";
import DashboardPage from "@/features/dashboard/dashboard-page";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your ReachSmith outreach overview.",
  robots: { index: false, follow: false },
};

export default DashboardPage;
