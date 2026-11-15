/**
 * Plans, prices and money formatting (Epic 5). Client-safe: no secrets, no DB.
 *
 * Sphere has three tiers:
 * - FREE: News only. No AI chat, explanations or tutorials.
 * - PAY_AS_YOU_GO: a prepaid euro wallet. Each AI call costs USAGE_MARKUP × its
 *   real inference cost, deducted from the wallet. Tutorials are unlocked.
 * - SUBSCRIPTION: €10/month, unlimited AI use within a fair-use cap on real
 *   inference cost per billing period (see SUBSCRIPTION_FAIR_USE_EUR).
 *
 * All money is in euros. Wallet amounts are micro-euros (1 EUR = 1,000,000),
 * Stripe amounts are cents.
 */

export const CURRENCY = "eur" as const;

/** The user pays this many euros for every euro of model inference */
export const USAGE_MARKUP = 2;

export const MICROS_PER_EUR = 1_000_000;
export const MICROS_PER_CENT = 10_000;

export type BillingTier = "FREE" | "PAY_AS_YOU_GO" | "SUBSCRIPTION";

export const SUBSCRIPTION_PLAN = {
  name: "Sphere Unlimited",
  priceCents: 1000,
  interval: "month" as const,
  /** Stripe Price lookup key; the price is created on first checkout if missing */
  lookupKey: "sphere_unlimited_monthly_eur_1000",
};

export const TOP_UP_OPTIONS = [
  { id: "top-up-5", amountCents: 500, description: "Try the AI features" },
  { id: "top-up-10", amountCents: 1000, description: "Regular reading", popular: true },
  { id: "top-up-25", amountCents: 2500, description: "Heavy research weeks" },
] as const;

export type TopUpId = (typeof TOP_UP_OPTIONS)[number]["id"];

export function centsToMicros(cents: number): number {
  return cents * MICROS_PER_CENT;
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const eurPrecise = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

/** €12.34; amounts under a cent (single AI calls) get four decimals: €0.0042 */
export function formatEurMicros(micros: number): string {
  const value = micros / MICROS_PER_EUR;
  return micros !== 0 && Math.abs(micros) < MICROS_PER_CENT ? eurPrecise.format(value) : eur.format(value);
}

export function formatEurCents(cents: number): string {
  return eur.format(cents / 100);
}
