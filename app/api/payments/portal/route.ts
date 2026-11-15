import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/news/session";
import { getOrCreatePlan } from "@/lib/billing/account";
import { appBaseUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * POST /api/payments/portal
 * Returns { url } of the Stripe Customer Portal, where users cancel their
 * subscription, update their card and download invoices. The portal must be
 * enabled once per Stripe mode (Settings → Billing → Customer portal).
 */
export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await getOrCreatePlan(userId);
  if (!plan.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account yet" }, { status: 400 });
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: plan.stripeCustomerId,
      return_url: `${appBaseUrl()}/profile#billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json(
      { error: "The billing portal is unavailable. Enable it in the Stripe dashboard (Settings → Billing → Customer portal)." },
      { status: 500 }
    );
  }
}
