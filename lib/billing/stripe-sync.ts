/**
 * Applies Stripe webhook events to the database (server-only).
 *
 * Every handler is idempotent: Stripe retries webhooks and may deliver them
 * out of order, so wallet credits are guarded by the checkout session id,
 * invoices by the invoice id, and subscription state is always overwritten
 * from the latest subscription object.
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { CURRENCY, centsToMicros } from "./plans";
import { hasActiveSubscription } from "./account";

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

async function userIdForCustomer(customerId: string | null, metadataUserId?: string | null): Promise<string | null> {
  if (metadataUserId) return metadataUserId;
  if (!customerId) return null;
  const plan = await db.paymentPlan.findUnique({ where: { stripeCustomerId: customerId }, select: { userId: true } });
  return plan?.userId ?? null;
}

/**
 * Credit the wallet for a paid top-up checkout. Returns false when there is
 * nothing to do (not a top-up, not paid yet, or already credited).
 */
export async function creditWalletFromCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  if (session.mode !== "payment" || session.metadata?.kind !== "wallet_top_up") return false;
  if (session.payment_status !== "paid") return false; // async methods complete later
  if (session.currency !== CURRENCY) {
    console.error(`[billing] Top-up ${session.id} is in ${session.currency}, expected ${CURRENCY}; not credited`);
    return false;
  }

  const userId = await userIdForCustomer(idOf(session.customer), session.metadata?.userId);
  const amountCents = session.amount_total ?? 0;
  if (!userId || amountCents <= 0) {
    console.error(`[billing] Top-up ${session.id} has no user or amount; not credited`);
    return false;
  }

  return db.$transaction(async (tx) => {
    // The checkout route records a PENDING row; recreate it if that write was lost
    await tx.transaction.upsert({
      where: { stripeCheckoutSessionId: session.id },
      update: {},
      create: {
        userId,
        transactionType: "WALLET_TOP_UP",
        amountCents,
        currency: CURRENCY,
        status: "PENDING",
        stripeCheckoutSessionId: session.id,
      },
    });
    const { count } = await tx.transaction.updateMany({
      where: { stripeCheckoutSessionId: session.id, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", amountCents, stripePaymentIntentId: idOf(session.payment_intent) },
    });
    if (count === 0) return false; // already credited
    const micros = BigInt(centsToMicros(amountCents));
    await tx.paymentPlan.upsert({
      where: { userId },
      update: { balanceMicros: { increment: micros }, totalToppedUpMicros: { increment: micros } },
      create: { userId, balanceMicros: micros, totalToppedUpMicros: micros },
    });
    return true;
  });
}

/** Mark an abandoned top-up checkout as failed */
export async function expireCheckout(session: Stripe.Checkout.Session): Promise<void> {
  await db.transaction.updateMany({
    where: { stripeCheckoutSessionId: session.id, status: "PENDING" },
    data: { status: "FAILED" },
  });
}

/** Copy the subscription's current state onto the user's plan */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId = idOf(subscription.customer);
  const userId = await userIdForCustomer(customerId, subscription.metadata?.userId);
  if (!userId) {
    console.error(`[billing] Subscription ${subscription.id} has no matching user`);
    return;
  }

  const plan = await db.paymentPlan.findUnique({ where: { userId } });
  // A late event for an old, ended subscription must not overwrite a newer one
  if (
    plan?.stripeSubscriptionId &&
    plan.stripeSubscriptionId !== subscription.id &&
    !hasActiveSubscription({ subscriptionStatus: subscription.status }) &&
    hasActiveSubscription(plan)
  ) {
    return;
  }

  const data = {
    stripeCustomerId: customerId ?? plan?.stripeCustomerId ?? null,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || !!subscription.cancel_at,
  };
  await db.paymentPlan.upsert({ where: { userId }, update: data, create: { userId, ...data } });
}

/** Record a subscription invoice as a transaction (paid → COMPLETED, failed → FAILED) */
export async function recordInvoice(invoice: Stripe.Invoice, status: "COMPLETED" | "FAILED"): Promise<void> {
  const subscriptionId = idOf(invoice.subscription);
  if (!subscriptionId || !invoice.id) return;
  const amountCents = status === "COMPLETED" ? invoice.amount_paid : invoice.amount_due;
  if (amountCents <= 0) return; // e.g. €0 proration invoices

  const userId = await userIdForCustomer(idOf(invoice.customer), invoice.subscription_details?.metadata?.userId);
  if (!userId) {
    console.error(`[billing] Invoice ${invoice.id} has no matching user`);
    return;
  }

  await db.transaction.upsert({
    where: { stripeInvoiceId: invoice.id },
    // Once paid, a later failure event (out of order) must not flip it back
    update: status === "COMPLETED" ? { status, amountCents } : {},
    create: {
      userId,
      transactionType: "SUBSCRIPTION_PAYMENT",
      amountCents,
      currency: invoice.currency,
      status,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscriptionId,
      stripePaymentIntentId: idOf(invoice.payment_intent),
    },
  });
}
