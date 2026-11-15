"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BrushTag, SketchCard, SketchProgress } from "@/components/sketch";
import { WarnMark } from "@/components/payment/sketch-marks";
import { formatEurMicros } from "@/lib/billing/plans";
import { goToStripe, TIER_LABELS, type BillingInfo } from "./use-billing";

const TIER_BRUSH = { FREE: "blue", PAY_AS_YOU_GO: "green", SUBSCRIPTION: "yellow" } as const;

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
}

/** Account card: tier, wallet balance and subscription state */
export function BillingStatus({ billing, loading }: { billing: BillingInfo | null; loading: boolean }) {
  const headingId = useId();
  const [opening, setOpening] = useState(false);

  async function openPortal() {
    setOpening(true);
    try {
      await goToStripe("/api/payments/portal");
    } catch (error) {
      toast.error((error as Error).message);
      setOpening(false);
    }
  }

  if (!billing) {
    return (
      <SketchCard seed="billing-status" w={590} h={150} hover wedge as="section" aria-labelledby={headingId} className="h-full px-7 pb-7 pt-[26px]" wrapClassName="h-full">
        <h2 id={headingId} className="m-0 font-hand text-[34px] font-bold leading-none">Billing</h2>
        <p className={`sk-muted mt-1.5 text-sm ${loading ? "sk-pulse" : ""}`}>
          {loading ? "Loading..." : "Unable to load billing information"}
        </p>
      </SketchCard>
    );
  }

  const sub = billing.subscription;
  const fairUse = sub && sub.fairUseCapMicros > 0 ? sub.usedMicros / sub.fairUseCapMicros : 0;

  return (
    <SketchCard seed="billing-status" w={590} h={330} hover wedge as="section" aria-labelledby={headingId} className="h-full px-7 pb-7 pt-[26px]" wrapClassName="h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="m-0 font-hand text-[34px] font-bold leading-none">Billing</h2>
        <BrushTag color={TIER_BRUSH[billing.tier]} delay={0.6}>
          {TIER_LABELS[billing.tier]}
        </BrushTag>
      </div>

      {billing.tier === "FREE" && (
        <p className="sk-muted mt-1.5 text-sm">
          News is free. Deep Dive chat, explanations and tutorials are part of the paid plans below.
        </p>
      )}

      <dl className="m-0 mt-5 grid gap-4">
        <div>
          <dt className="sk-muted font-hand text-xl font-bold leading-none">Wallet balance</dt>
          <dd className={`mt-1 font-mono text-2xl font-bold ${billing.balanceMicros < 0 ? "sk-red" : ""}`}>
            {formatEurMicros(billing.balanceMicros)}
          </dd>
        </div>

        {sub && (
          <div>
            <dt className="sk-muted font-hand text-xl font-bold leading-none">Subscription</dt>
            <dd className="mt-1 text-base">
              {sub.status === "past_due"
                ? "Payment failed. Stripe will retry; update your card to keep unlimited access."
                : sub.cancelAtPeriodEnd
                  ? `Cancelled. Unlimited access until ${formatDate(sub.currentPeriodEnd)}.`
                  : `Active. Renews on ${formatDate(sub.currentPeriodEnd)} for €10.00.`}
            </dd>
          </div>
        )}
      </dl>

      {sub && billing.tier === "SUBSCRIPTION" && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-hand text-[20px] font-bold">Fair use this month</span>
            <span className="font-mono">{Math.min(100, Math.round(fairUse * 100))}%</span>
          </div>
          <SketchProgress seed="fair-use" value={fairUse} tone={fairUse >= 1 ? "red" : fairUse > 0.8 ? "amber" : "green"} label="Fair use this month" />
          {fairUse >= 1 && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <WarnMark /> Limit reached: AI calls use your wallet until the next billing date.
            </p>
          )}
        </div>
      )}

      {billing.hasStripeCustomer && (
        <div className="mt-[22px]">
          <Button size="sm" variant="outline" onClick={openPortal} disabled={opening}>
            {opening ? <span className="sk-pulse">Opening…</span> : sub ? "Manage subscription & invoices" : "Invoices & payment methods"}
          </Button>
        </div>
      )}
    </SketchCard>
  );
}
