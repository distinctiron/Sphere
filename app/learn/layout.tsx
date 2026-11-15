import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "@/components/learn/figures/figures.css";
import { AppHeader } from "@/components/sketch/app-header";
import { PaymentWall } from "@/components/payment/payment-wall";
import { canAccessTutorials } from "@/lib/billing/account";
import { getSessionUserId } from "@/lib/news/session";

export const dynamic = "force-dynamic";

/**
 * Tutorials are part of the paid plans. Signed-out visitors fall through to the
 * pages, which redirect to login; signed-in free users see the payment wall.
 */
export default async function LearnLayout({ children }: { children: ReactNode }) {
  const userId = await getSessionUserId();
  if (userId && !(await canAccessTutorials(userId))) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[1240px] flex-col gap-8 px-6 pb-16 pt-6">
        <AppHeader />
        <PaymentWall
          title="Tutorials are part of the paid plans"
          message="The Learn paths, their figures, quizzes and the lesson tutor are included with pay as you go and the subscription. News stays free."
        />
      </div>
    );
  }
  return <div className="min-h-screen">{children}</div>;
}
