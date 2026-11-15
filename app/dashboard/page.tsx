import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { DashboardTabs } from "@/components/news/dashboard-tabs";
import { NewsFeed } from "@/components/news/news-feed";

export default async function DashboardPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await auth();

  // Check for session using email (more reliable than id in NextAuth v5)
  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=${encodeURIComponent(searchParams.tab === "news" ? "/dashboard?tab=news" : "/dashboard")}`);
  }

  if (searchParams.tab === "news") {
    return <NewsFeed tabs={<DashboardTabs active="news" />} />;
  }
  return <DashboardContent />;
}
