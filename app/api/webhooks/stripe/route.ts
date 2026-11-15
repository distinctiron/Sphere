import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  creditWalletFromCheckout,
  expireCheckout,
  recordInvoice,
  syncSubscription,
} from "@/lib/billing/stripe-sync";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe
 *
 * Events handled (subscribe the production endpoint to exactly these; locally,
 * pass them to `stripe listen --events`, see README "Testing payments locally"):
 * - checkout.session.completed / async_payment_succeeded: credit a wallet top-up,
 *   or link a new subscription
 * - checkout.session.expired: mark an abandoned top-up as failed
 * - customer.subscription.created / updated / deleted: sync subscription state
 * - invoice.paid / invoice.payment_failed: record subscription payments
 *
 * A non-2xx response makes Stripe retry, so handlers must be idempotent.
 *
 * Event payloads use the account's (or endpoint's) API version, which can be
 * newer than the version this client is pinned to, so subscriptions and
 * invoices are re-fetched through the pinned client before use.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleEvent(stripe, event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type} (${event.id}):`, error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleEvent(stripe: Stripe, event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(await stripe.subscriptions.retrieve(id));
      } else {
        await creditWalletFromCheckout(session);
      }
      return;
    }

    case "checkout.session.expired":
      await expireCheckout(event.data.object);
      return;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // Re-fetch so out-of-order deliveries can't apply stale state
      await syncSubscription(await stripe.subscriptions.retrieve(event.data.object.id));
      return;

    case "invoice.paid":
      await recordInvoice(await stripe.invoices.retrieve(event.data.object.id!), "COMPLETED");
      return;

    case "invoice.payment_failed": {
      const invoice = await stripe.invoices.retrieve(event.data.object.id!);
      await recordInvoice(invoice, "FAILED");
      // Status moves to past_due; Stripe's retry schedule (Smart Retries) handles dunning
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      if (subscriptionId) await syncSubscription(await stripe.subscriptions.retrieve(subscriptionId));
      return;
    }

    default:
      return;
  }
}
