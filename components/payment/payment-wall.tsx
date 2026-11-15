import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brush, SketchCard } from "@/components/sketch";
import { CalendarMark, CardMark, LockMark } from "@/components/payment/sketch-marks";
import { formatEurCents, SUBSCRIPTION_PLAN, USAGE_MARKUP } from "@/lib/billing/plans";

interface PaymentWallProps {
  title?: string;
  message?: string;
}

/** Full-size wall for locked areas (e.g. tutorials on the free tier) */
export function PaymentWall({
  title = "Part of the paid plans",
  message = "Tutorials, Deep Dive chat and explanations are included with pay as you go and the subscription. News stays free.",
}: PaymentWallProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <SketchCard seed="payment-wall" w={1000} h={600} panel hover as="section" aria-labelledby="wall-h" wrapClassName="w-full max-w-3xl" className="px-10 pb-[30px] pt-9">
        <div className="flex flex-col items-center text-center">
          <LockMark />
          <h2 id="wall-h" className="mb-1.5 mt-2.5 font-hand text-[44px] font-bold leading-none">{title}</h2>
          <p className="m-0 max-w-[560px]">{message}</p>
        </div>

        <div className="mt-8 grid gap-9 md:grid-cols-2">
          <SketchCard seed="wall-payg" w={420} h={220} hover wrapClassName="h-full" className="flex h-full flex-col px-6 pb-[22px] pt-6">
            <div className="flex h-full flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <CardMark />
                <h3 className="m-0 font-hand text-[32px] font-bold leading-none">
                  <Brush color="green" className="px-1.5">Pay as you go</Brush>
                </h3>
              </div>
              <p className="m-0 flex-1">Top up a wallet from €5. AI calls cost {USAGE_MARKUP}× their model cost.</p>
              <div>
                <Button asChild size="sm">
                  <Link href="/profile#billing">Top up</Link>
                </Button>
              </div>
            </div>
          </SketchCard>

          <SketchCard seed="wall-sub" w={420} h={220} hover wrapClassName="h-full" className="flex h-full flex-col px-6 pb-[22px] pt-6">
            <div className="flex h-full flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <CalendarMark />
                <h3 className="m-0 font-hand text-[32px] font-bold leading-none">
                  <Brush color="blue" className="px-1.5">Unlimited</Brush>
                </h3>
              </div>
              <p className="m-0 flex-1">{formatEurCents(SUBSCRIPTION_PLAN.priceCents)} a month for unlimited AI use.</p>
              <div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/profile#billing">Subscribe</Link>
                </Button>
              </div>
            </div>
          </SketchCard>
        </div>
      </SketchCard>
    </div>
  );
}
