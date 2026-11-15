import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => {
  const db = {
    paymentPlan: { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    usageEvent: { aggregate: vi.fn(), create: vi.fn() },
    transaction: { upsert: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db };
});

import type Stripe from "stripe";
import { db } from "@/lib/db";
import type { LLMUsage } from "@/lib/llm";
import { authorizeAiUsage, deriveTier } from "./account";
import { formatEurMicros } from "./plans";
import { getModelPrice, FALLBACK_PRICE, inferenceCostMicros, MODEL_PRICES } from "./pricing";
import { chargeFor, recordUsage } from "./usage";
import { creditWalletFromCheckout, recordInvoice, syncSubscription } from "./stripe-sync";

const mockDb = vi.mocked(db, true);

function usage(overrides: Partial<LLMUsage> = {}): LLMUsage {
  return { provider: "openai", model: "gpt-5.1", inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, cacheWriteTokens: 0, ...overrides };
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-1",
    userId: "user-1",
    balanceMicros: BigInt(0),
    totalToppedUpMicros: BigInt(0),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.USD_TO_EUR;
  delete process.env.BILLING_PRICE_MOCK_AS;
  delete process.env.SUBSCRIPTION_FAIR_USE_EUR;
});

describe("pricing", () => {
  it("matches models by longest prefix, including dated ids", () => {
    expect(getModelPrice("gpt-4o-2024-08-06")).toBe(MODEL_PRICES["gpt-4o"]);
    expect(getModelPrice("gpt-4o-mini")).toBe(MODEL_PRICES["gpt-4o-mini"]);
    expect(getModelPrice("gpt-5.1")).toBe(MODEL_PRICES["gpt-5.1"]);
    expect(getModelPrice("claude-sonnet-4-20250514")).toBe(MODEL_PRICES["claude-sonnet-4"]);
    expect(getModelPrice("claude-sonnet-4-5")).toBe(MODEL_PRICES["claude-sonnet-4-5"]);
  });

  it("bills unknown models at the conservative fallback rate", () => {
    expect(getModelPrice("some-new-model")).toBe(FALLBACK_PRICE);
  });

  it("converts USD token prices to micro-euros, rounding up", () => {
    process.env.USD_TO_EUR = "0.9";
    // gpt-5.1: 1,000 input × $1.25/M + 500 output × $10/M = $0.00625 → €0.005625
    expect(inferenceCostMicros(usage({ inputTokens: 1000, outputTokens: 500 }))).toBe(5625);
    // cached input is billed at the cache-read rate ($0.125/M)
    expect(inferenceCostMicros(usage({ cachedInputTokens: 1_000_000 }))).toBe(112_500);
  });

  it("prices mock calls at zero unless BILLING_PRICE_MOCK_AS is set", () => {
    const mock = usage({ provider: "mock", model: "mock", inputTokens: 1000, outputTokens: 500 });
    expect(inferenceCostMicros(mock)).toBe(0);
    process.env.BILLING_PRICE_MOCK_AS = "gpt-5.1";
    expect(inferenceCostMicros(mock)).toBeGreaterThan(0);
  });

  it("formats sub-cent amounts with four decimals", () => {
    expect(formatEurMicros(10_000_000)).toBe("€10.00");
    expect(formatEurMicros(4_200)).toBe("€0.0042");
  });
});

describe("tiers and access", () => {
  it("derives the tier from subscription status and top-ups", () => {
    expect(deriveTier(plan())).toBe("FREE");
    expect(deriveTier(plan({ totalToppedUpMicros: BigInt(5_000_000) }))).toBe("PAY_AS_YOU_GO");
    expect(deriveTier(plan({ subscriptionStatus: "active" }))).toBe("SUBSCRIPTION");
    expect(deriveTier(plan({ subscriptionStatus: "past_due" }))).toBe("SUBSCRIPTION");
    expect(deriveTier(plan({ subscriptionStatus: "canceled", totalToppedUpMicros: BigInt(1) }))).toBe("PAY_AS_YOU_GO");
  });

  it("denies free users and empty wallets with distinct reasons", async () => {
    mockDb.paymentPlan.upsert.mockResolvedValue(plan() as never);
    expect(await authorizeAiUsage("user-1")).toMatchObject({ allowed: false, reason: "FREE_TIER" });

    mockDb.paymentPlan.upsert.mockResolvedValue(plan({ totalToppedUpMicros: BigInt(5_000_000) }) as never);
    expect(await authorizeAiUsage("user-1")).toMatchObject({ allowed: false, reason: "INSUFFICIENT_BALANCE" });
  });

  it("bills a funded wallet", async () => {
    mockDb.paymentPlan.upsert.mockResolvedValue(plan({ balanceMicros: BigInt(10), totalToppedUpMicros: BigInt(10) }) as never);
    expect(await authorizeAiUsage("user-1")).toEqual({ allowed: true, billing: "WALLET" });
  });

  it("covers subscribers until the fair-use cap, then falls back to the wallet", async () => {
    process.env.SUBSCRIPTION_FAIR_USE_EUR = "6";
    const subscriber = plan({ subscriptionStatus: "active", currentPeriodStart: new Date("2026-11-01") });
    mockDb.paymentPlan.upsert.mockResolvedValue(subscriber as never);

    mockDb.usageEvent.aggregate.mockResolvedValue({ _sum: { costMicros: 5_999_999 } } as never);
    expect(await authorizeAiUsage("user-1")).toEqual({ allowed: true, billing: "SUBSCRIPTION" });
    expect(mockDb.usageEvent.aggregate).toHaveBeenCalledWith({
      where: { userId: "user-1", billing: "SUBSCRIPTION", createdAt: { gte: new Date("2026-11-01") } },
      _sum: { costMicros: true },
    });

    mockDb.usageEvent.aggregate.mockResolvedValue({ _sum: { costMicros: 6_000_000 } } as never);
    expect(await authorizeAiUsage("user-1")).toMatchObject({ allowed: false, reason: "FAIR_USE_REACHED" });

    mockDb.paymentPlan.upsert.mockResolvedValue({ ...subscriber, balanceMicros: BigInt(1) } as never);
    expect(await authorizeAiUsage("user-1")).toEqual({ allowed: true, billing: "WALLET" });
  });
});

describe("metering", () => {
  it("charges wallet calls twice their cost and nothing otherwise", () => {
    expect(chargeFor(5625, "WALLET")).toBe(11_250);
    expect(chargeFor(5625, "SUBSCRIPTION")).toBe(0);
    expect(chargeFor(5625, "PLATFORM")).toBe(0);
  });

  it("records the event and deducts the charge from the wallet atomically", async () => {
    process.env.USD_TO_EUR = "0.9";
    mockDb.usageEvent.create.mockReturnValue("create-op" as never);
    mockDb.paymentPlan.update.mockReturnValue("update-op" as never);
    mockDb.$transaction.mockResolvedValue([] as never);

    const result = await recordUsage({
      userId: "user-1",
      feature: "paper-chat",
      billing: "WALLET",
      usage: usage({ inputTokens: 1000, outputTokens: 500 }),
    });

    expect(result).toEqual({ costMicros: 5625, chargedMicros: 11_250 });
    expect(mockDb.usageEvent.create.mock.calls[0][0].data).toMatchObject({ costMicros: 5625, chargedMicros: 11_250, billing: "WALLET" });
    expect(mockDb.paymentPlan.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { balanceMicros: { decrement: BigInt(11_250) } },
    });
    expect(mockDb.$transaction).toHaveBeenCalledWith(["create-op", "update-op"]);
  });

  it("records platform work without a user or a charge", async () => {
    mockDb.usageEvent.create.mockResolvedValue({} as never);
    await recordUsage({ feature: "news-summary", billing: "PLATFORM", usage: usage({ inputTokens: 10 }) });
    expect(mockDb.usageEvent.create.mock.calls[0][0].data).toMatchObject({ userId: null, billing: "PLATFORM", chargedMicros: 0 });
    expect(mockDb.paymentPlan.update).not.toHaveBeenCalled();
  });

  it("never throws when recording fails", async () => {
    mockDb.usageEvent.create.mockRejectedValue(new Error("db down") as never);
    await expect(recordUsage({ userId: "u", feature: "explain", billing: "SUBSCRIPTION", usage: usage() })).resolves.toBeNull();
  });
});

describe("Stripe webhooks", () => {
  const paidTopUp = {
    id: "cs_1",
    mode: "payment",
    payment_status: "paid",
    currency: "eur",
    amount_total: 1000,
    customer: "cus_1",
    payment_intent: "pi_1",
    metadata: { kind: "wallet_top_up", userId: "user-1" },
  } as unknown as Stripe.Checkout.Session;

  function useTransaction() {
    mockDb.$transaction.mockImplementation((async (fn: (tx: typeof db) => unknown) => fn(db)) as never);
  }

  it("credits a paid top-up once", async () => {
    useTransaction();
    mockDb.transaction.updateMany.mockResolvedValueOnce({ count: 1 } as never);
    expect(await creditWalletFromCheckout(paidTopUp)).toBe(true);
    expect(mockDb.paymentPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { balanceMicros: { increment: BigInt(10_000_000) }, totalToppedUpMicros: { increment: BigInt(10_000_000) } },
      })
    );

    // Redelivery of the same event: the transaction is already COMPLETED
    mockDb.paymentPlan.upsert.mockClear();
    mockDb.transaction.updateMany.mockResolvedValueOnce({ count: 0 } as never);
    expect(await creditWalletFromCheckout(paidTopUp)).toBe(false);
    expect(mockDb.paymentPlan.upsert).not.toHaveBeenCalled();
  });

  it("ignores unpaid, non-euro and non-top-up sessions", async () => {
    expect(await creditWalletFromCheckout({ ...paidTopUp, payment_status: "unpaid" } as Stripe.Checkout.Session)).toBe(false);
    expect(await creditWalletFromCheckout({ ...paidTopUp, currency: "usd" } as Stripe.Checkout.Session)).toBe(false);
    expect(await creditWalletFromCheckout({ ...paidTopUp, mode: "subscription" } as Stripe.Checkout.Session)).toBe(false);
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  const subscription = {
    id: "sub_new",
    customer: "cus_1",
    status: "active",
    current_period_start: 1_763_000_000,
    current_period_end: 1_765_600_000,
    cancel_at_period_end: false,
    cancel_at: null,
    metadata: { userId: "user-1" },
  } as unknown as Stripe.Subscription;

  it("copies subscription state onto the plan", async () => {
    mockDb.paymentPlan.findUnique.mockResolvedValue(plan() as never);
    await syncSubscription(subscription);
    expect(mockDb.paymentPlan.upsert.mock.calls[0][0].update).toMatchObject({
      stripeSubscriptionId: "sub_new",
      subscriptionStatus: "active",
      currentPeriodEnd: new Date(1_765_600_000 * 1000),
      cancelAtPeriodEnd: false,
    });
  });

  it("does not let a late event for an ended subscription overwrite an active one", async () => {
    mockDb.paymentPlan.findUnique.mockResolvedValue(plan({ stripeSubscriptionId: "sub_new", subscriptionStatus: "active" }) as never);
    await syncSubscription({ ...subscription, id: "sub_old", status: "canceled" } as Stripe.Subscription);
    expect(mockDb.paymentPlan.upsert).not.toHaveBeenCalled();
  });

  it("records invoices idempotently and never downgrades a paid one", async () => {
    const invoice = {
      id: "in_1",
      subscription: "sub_new",
      customer: "cus_1",
      amount_paid: 1000,
      amount_due: 1000,
      currency: "eur",
      payment_intent: "pi_2",
      subscription_details: { metadata: { userId: "user-1" } },
    } as unknown as Stripe.Invoice;

    await recordInvoice(invoice, "COMPLETED");
    expect(mockDb.transaction.upsert.mock.calls[0][0]).toMatchObject({
      where: { stripeInvoiceId: "in_1" },
      update: { status: "COMPLETED", amountCents: 1000 },
      create: { transactionType: "SUBSCRIPTION_PAYMENT", status: "COMPLETED", amountCents: 1000 },
    });

    await recordInvoice(invoice, "FAILED");
    expect(mockDb.transaction.upsert.mock.calls[1][0].update).toEqual({});
  });
});
