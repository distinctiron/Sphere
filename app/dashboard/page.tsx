import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await auth();

  // Check for session using email (more reliable than id in NextAuth v5)
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return <DashboardContent />;
}
