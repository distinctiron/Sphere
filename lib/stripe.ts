import Stripe from "stripe";
import { db } from "@/lib/db";
import { CURRENCY, SUBSCRIPTION_PLAN } from "@/lib/billing/plans";

let client: Stripe | null = null;

/** Server-only Stripe client, created on first use so a missing key fails the request, not the import. */
export function getStripe(): Stripe {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }
  return client;
}

export function appBaseUrl(): string {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** The user's Stripe customer id, creating the customer on first checkout */
export async function getOrCreateStripeCustomer(user: { id: string; email: string }): Promise<string> {
  const plan = await db.paymentPlan.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  if (plan.stripeCustomerId) return plan.stripeCustomerId;

  const customer = await getStripe().customers.create({ email: user.email, metadata: { userId: user.id } });
  // Only set it if no concurrent request set one first
  const { count } = await db.paymentPlan.updateMany({
    where: { userId: user.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  if (count === 1) return customer.id;
  const current = await db.paymentPlan.findUniqueOrThrow({ where: { userId: user.id } });
  return current.stripeCustomerId!;
}

let subscriptionPriceId: string | undefined;

/**
 * The Stripe Price for the monthly subscription. Uses STRIPE_SUBSCRIPTION_PRICE_ID
 * when set; otherwise finds the price by lookup key, creating product and price
 * on first use (so a fresh test-mode account works without dashboard setup).
 */
export async function getSubscriptionPriceId(): Promise<string> {
  if (process.env.STRIPE_SUBSCRIPTION_PRICE_ID) return process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (subscriptionPriceId) return subscriptionPriceId;

  const stripe = getStripe();
  const existing = await stripe.prices.list({ lookup_keys: [SUBSCRIPTION_PLAN.lookupKey], active: true, limit: 1 });
  if (existing.data[0]) {
    subscriptionPriceId = existing.data[0].id;
    return subscriptionPriceId;
  }

  const price = await stripe.prices.create({
    currency: CURRENCY,
    unit_amount: SUBSCRIPTION_PLAN.priceCents,
    recurring: { interval: SUBSCRIPTION_PLAN.interval },
    lookup_key: SUBSCRIPTION_PLAN.lookupKey,
    product_data: { name: SUBSCRIPTION_PLAN.name },
  });
  subscriptionPriceId = price.id;
  return price.id;
}
