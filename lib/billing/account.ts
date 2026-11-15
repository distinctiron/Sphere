/**
 * Billing account state and AI access checks (server-only).
 *
 * The tier is derived from the plan row rather than stored, so it can't drift:
 * - an active (or trialing / past_due, while Stripe retries) subscription → SUBSCRIPTION
 * - otherwise any completed wallet top-up → PAY_AS_YOU_GO
 * - otherwise → FREE
 */

import { NextResponse } from "next/server";
import type { PaymentPlan } from "@prisma/client";
import { db } from "@/lib/db";
import { MICROS_PER_EUR, type BillingTier } from "./plans";

/** Subscription statuses that keep unlimited access (past_due: Stripe is retrying the payment) */
const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Real inference cost a subscriber may use per billing period before fair use kicks in */
export function getFairUseCapMicros(): number {
  const eur = Number(process.env.SUBSCRIPTION_FAIR_USE_EUR);
  return Math.round((Number.isFinite(eur) && eur > 0 ? eur : 6) * MICROS_PER_EUR);
}

export function hasActiveSubscription(plan: Pick<PaymentPlan, "subscriptionStatus">): boolean {
  return !!plan.subscriptionStatus && ENTITLED_STATUSES.has(plan.subscriptionStatus);
}

export function deriveTier(plan: Pick<PaymentPlan, "subscriptionStatus" | "totalToppedUpMicros">): BillingTier {
  if (hasActiveSubscription(plan)) return "SUBSCRIPTION";
  if (plan.totalToppedUpMicros > BigInt(0)) return "PAY_AS_YOU_GO";
  return "FREE";
}

/** The user's plan row, created on first use (OAuth sign-ups don't get one at registration) */
export async function getOrCreatePlan(userId: string): Promise<PaymentPlan> {
  return db.paymentPlan.upsert({ where: { userId }, update: {}, create: { userId } });
}

/** Start of the window that counts towards fair use: the current billing period */
function periodStart(plan: PaymentPlan): Date {
  return plan.currentPeriodStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

async function subscriptionCostThisPeriod(plan: PaymentPlan): Promise<number> {
  const result = await db.usageEvent.aggregate({
    where: { userId: plan.userId, billing: "SUBSCRIPTION", createdAt: { gte: periodStart(plan) } },
    _sum: { costMicros: true },
  });
  return result._sum.costMicros ?? 0;
}

export interface BillingAccount {
  tier: BillingTier;
  balanceMicros: number;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    /** Real inference cost used this period, and the fair-use cap, in micro-euros */
    usedMicros: number;
    fairUseCapMicros: number;
  } | null;
  hasStripeCustomer: boolean;
}

export async function getBillingAccount(userId: string): Promise<BillingAccount> {
  const plan = await getOrCreatePlan(userId);
  const tier = deriveTier(plan);
  const showSubscription = plan.stripeSubscriptionId && plan.subscriptionStatus && plan.subscriptionStatus !== "canceled";
  return {
    tier,
    balanceMicros: Number(plan.balanceMicros),
    subscription: showSubscription
      ? {
          status: plan.subscriptionStatus!,
          currentPeriodEnd: plan.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: plan.cancelAtPeriodEnd,
          usedMicros: hasActiveSubscription(plan) ? await subscriptionCostThisPeriod(plan) : 0,
          fairUseCapMicros: getFairUseCapMicros(),
        }
      : null,
    hasStripeCustomer: !!plan.stripeCustomerId,
  };
}

export type AiDenialReason = "FREE_TIER" | "INSUFFICIENT_BALANCE" | "FAIR_USE_REACHED";

export type AiAccess =
  | { allowed: true; billing: "WALLET" | "SUBSCRIPTION" }
  | { allowed: false; reason: AiDenialReason; message: string };

const DENIAL_MESSAGES: Record<AiDenialReason, string> = {
  FREE_TIER: "AI features are part of the paid plans. Top up your wallet or subscribe to use them.",
  INSUFFICIENT_BALANCE: "Your wallet is empty. Top up to keep using the AI features, or subscribe for unlimited use.",
  FAIR_USE_REACHED:
    "You've reached this month's fair-use limit of your subscription. It resets at your next billing date; you can top up your wallet to continue now.",
};

/**
 * Whether the user may make an AI call now, and who pays for it.
 * Subscribers within fair use are covered by the subscription; past the cap
 * their wallet (if funded) pays. A wallet may go slightly negative on the last
 * call, since a call's cost is only known after it completes.
 */
export async function authorizeAiUsage(userId: string): Promise<AiAccess> {
  const plan = await getOrCreatePlan(userId);
  const tier = deriveTier(plan);
  const walletFunded = plan.balanceMicros > BigInt(0);

  if (tier === "SUBSCRIPTION") {
    if ((await subscriptionCostThisPeriod(plan)) < getFairUseCapMicros()) return { allowed: true, billing: "SUBSCRIPTION" };
    if (walletFunded) return { allowed: true, billing: "WALLET" };
    return { allowed: false, reason: "FAIR_USE_REACHED", message: DENIAL_MESSAGES.FAIR_USE_REACHED };
  }
  if (walletFunded) return { allowed: true, billing: "WALLET" };
  const reason = tier === "FREE" ? "FREE_TIER" : "INSUFFICIENT_BALANCE";
  return { allowed: false, reason, message: DENIAL_MESSAGES[reason] };
}

/** 402 response for a denied AI call; clients show the payment wall on `code` */
export function aiAccessDenied(access: Extract<AiAccess, { allowed: false }>) {
  return NextResponse.json({ error: access.message, code: access.reason, message: access.message }, { status: 402 });
}

/** Tutorials (Learn) are included in both paid tiers */
export async function canAccessTutorials(userId: string): Promise<boolean> {
  return deriveTier(await getOrCreatePlan(userId)) !== "FREE";
}
