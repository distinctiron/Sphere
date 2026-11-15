import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/news/session";
import { getOrCreatePlan, hasActiveSubscription } from "@/lib/billing/account";
import { CURRENCY, TOP_UP_OPTIONS } from "@/lib/billing/plans";
import { appBaseUrl, getOrCreateStripeCustomer, getStripe, getSubscriptionPriceId } from "@/lib/stripe";

export const runtime = "nodejs";

const BodySchema = z.discriminatedUnion("plan", [
  z.object({ plan: z.literal("top-up"), topUpId: z.string() }),
  z.object({ plan: z.literal("subscription") }),
]);

/**
 * POST /api/payments/checkout
 * Body: { plan: "top-up", topUpId } | { plan: "subscription" }
 * Returns { url } of a Stripe Checkout page. Money only moves when Stripe's
 * webhook confirms the payment (app/api/webhooks/stripe).
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a top-up amount or the subscription" }, { status: 400 });

  try {
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true } });
    const customer = await getOrCreateStripeCustomer(user);
    const stripe = getStripe();
    const base = appBaseUrl();

    if (parsed.data.plan === "subscription") {
      if (hasActiveSubscription(await getOrCreatePlan(userId))) {
        return NextResponse.json({ error: "You already have an active subscription" }, { status: 409 });
      }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer,
        line_items: [{ price: await getSubscriptionPriceId(), quantity: 1 }],
        subscription_data: { metadata: { userId } },
        metadata: { userId, kind: "subscription" },
        success_url: `${base}/payment/success?type=subscription&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/payment/cancel`,
      });
      return NextResponse.json({ url: session.url });
    }

    const { topUpId } = parsed.data;
    const option = TOP_UP_OPTIONS.find((o) => o.id === topUpId);
    if (!option) return NextResponse.json({ error: "Unknown top-up amount" }, { status: 400 });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY,
            unit_amount: option.amountCents,
            product_data: {
              name: "Sphere wallet top-up",
              description: "Prepaid credit for AI features, billed at twice the model inference cost",
            },
          },
        },
      ],
      metadata: { userId, kind: "wallet_top_up", topUpId: option.id },
      payment_intent_data: { metadata: { userId, kind: "wallet_top_up" } },
      success_url: `${base}/payment/success?type=top-up&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/payment/cancel`,
    });

    await db.transaction.create({
      data: {
        userId,
        transactionType: "WALLET_TOP_UP",
        amountCents: option.amountCents,
        currency: CURRENCY,
        status: "PENDING",
        stripeCheckoutSessionId: session.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}
