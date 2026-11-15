"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Brush, SketchCard } from "@/components/sketch";
import { CalendarMark, CardMark, PenTick } from "@/components/payment/sketch-marks";
import { TopUpSelector } from "@/components/payment/top-up-selector";
import { BillingStatus } from "@/components/billing/billing-status";
import { FEATURE_LABELS, goToStripe, useBilling } from "@/components/billing/use-billing";
import { formatEurCents, formatEurMicros, SUBSCRIPTION_PLAN, USAGE_MARKUP, type TopUpId } from "@/lib/billing/plans";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Billing section of the account page: status, plans and recent usage */
export function PaymentPage({ accountCard }: { accountCard?: React.ReactNode }) {
  const { billing, loading } = useBilling();
  const [topUp, setTopUp] = useState<TopUpId | undefined>();
  const [busy, setBusy] = useState<"top-up" | "subscription" | null>(null);

  async function checkout(plan: "top-up" | "subscription") {
    if (plan === "top-up" && !topUp) {
      toast.error("Choose an amount to top up");
      return;
    }
    setBusy(plan);
    try {
      await goToStripe("/api/payments/checkout", plan === "top-up" ? { plan, topUpId: topUp } : { plan });
    } catch (error) {
      toast.error((error as Error).message);
      setBusy(null);
    }
  }

  const subscribed = billing?.tier === "SUBSCRIPTION";

  return (
    <div className="space-y-10" id="billing">
      <div className="grid gap-11 md:grid-cols-2">
        {accountCard}
        <BillingStatus billing={billing} loading={loading} />
      </div>

      <div className="grid gap-11 lg:grid-cols-2">
        <SketchCard seed="plan-payg" w={590} h={640} panel as="section" aria-labelledby="payg-h" wrapClassName="h-full" className="flex h-full flex-col px-7 pb-7 pt-[26px]">
          <div className="flex items-center gap-3">
            <CardMark />
            <h2 id="payg-h" className="m-0 font-hand text-[36px] font-bold leading-none">
              <Brush color="green" className="px-1.5">Pay as you go</Brush>
            </h2>
          </div>
          <p className="mb-5 mt-3">
            Top up a prepaid wallet. Each AI call costs {USAGE_MARKUP}× the model&apos;s inference cost and is deducted
            from it. Most calls cost a few cents or less, and every charge appears in your usage below.
          </p>
          <ul className="mb-6 flex list-none flex-col gap-1.5 p-0 text-sm">
            <li className="flex items-center gap-2"><PenTick />Deep Dive chat, Intellisense and the lesson tutor</li>
            <li className="flex items-center gap-2"><PenTick />All tutorials</li>
            <li className="flex items-center gap-2"><PenTick />Credit never expires</li>
          </ul>
          <TopUpSelector selected={topUp} onSelect={setTopUp} disabled={busy !== null} />
          <div className="mt-7">
            <Button onClick={() => checkout("top-up")} disabled={!topUp || busy !== null} size="lg">
              {busy === "top-up" ? <span className="sk-pulse">Opening Stripe…</span> : "Top up wallet"}
            </Button>
          </div>
        </SketchCard>

        <SketchCard seed="plan-sub" w={590} h={640} panel wedge as="section" aria-labelledby="sub-h" wrapClassName="h-full" className="flex h-full flex-col px-7 pb-7 pt-[26px]">
          <div className="flex items-center gap-3">
            <CalendarMark />
            <h2 id="sub-h" className="m-0 font-hand text-[36px] font-bold leading-none">
              <Brush color="blue" className="px-1.5">{SUBSCRIPTION_PLAN.name}</Brush>
            </h2>
          </div>
          <p className="mb-1 mt-4 font-hand text-[44px] font-bold leading-none">
            {formatEurCents(SUBSCRIPTION_PLAN.priceCents)}
            <span className="sk-muted font-sans text-base font-normal"> / month</span>
          </p>
          <p className="mb-5 mt-3">Unlimited AI use for a flat monthly price. Cancel anytime.</p>
          <ul className="mb-6 flex list-none flex-col gap-1.5 p-0 text-sm">
            <li className="flex items-center gap-2"><PenTick />Unlimited Deep Dive chat, Intellisense and lesson tutor</li>
            <li className="flex items-center gap-2"><PenTick />All tutorials</li>
            <li className="flex items-center gap-2"><PenTick />No wallet to keep topped up</li>
          </ul>
          <p className="sk-muted text-sm">
            Fair use: unlimited covers normal personal research. If a month&apos;s usage is exceptionally heavy, further
            calls draw from your wallet until the next billing date.
          </p>
          <div className="mt-auto pt-7">
            {subscribed ? (
              <p className="m-0 font-hand text-[24px] font-bold">You&apos;re subscribed. Manage it from the Billing card above.</p>
            ) : (
              <Button onClick={() => checkout("subscription")} disabled={busy !== null} size="lg">
                {busy === "subscription" ? <span className="sk-pulse">Opening Stripe…</span> : "Subscribe"}
              </Button>
            )}
          </div>
        </SketchCard>
      </div>

      {billing && (billing.usage.length > 0 || billing.payments.length > 0) && (
        <SketchCard seed="usage-history" w={1180} h={420} as="section" aria-labelledby="usage-h" className="px-7 pb-7 pt-[26px]">
          <h2 id="usage-h" className="m-0 font-hand text-[34px] font-bold leading-none">Recent activity</h2>
          <div className="mt-5 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-hand text-[22px] font-bold">AI usage</h3>
              {billing.usage.length === 0 ? (
                <p className="sk-muted text-sm">No AI calls yet.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-[rgba(0,0,0,.08)] p-0 text-sm">
                  {billing.usage.map((u) => (
                    <li key={u.id} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span>
                        {FEATURE_LABELS[u.feature] ?? u.feature}
                        <span className="sk-muted ml-2 text-xs">{formatDateTime(u.createdAt)}</span>
                      </span>
                      <span className="font-mono">{u.billing === "WALLET" ? formatEurMicros(u.chargedMicros) : "Included"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 font-hand text-[22px] font-bold">Payments</h3>
              {billing.payments.length === 0 ? (
                <p className="sk-muted text-sm">No payments yet.</p>
              ) : (
                <ul className="m-0 list-none divide-y divide-[rgba(0,0,0,.08)] p-0 text-sm">
                  {billing.payments.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span>
                        {p.transactionType === "WALLET_TOP_UP" ? "Wallet top-up" : "Subscription"}
                        {p.status === "FAILED" && <span className="sk-red ml-2 text-xs">failed</span>}
                        <span className="sk-muted ml-2 text-xs">{formatDateTime(p.createdAt)}</span>
                      </span>
                      <span className="font-mono">{formatEurCents(p.amountCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SketchCard>
      )}
    </div>
  );
}
