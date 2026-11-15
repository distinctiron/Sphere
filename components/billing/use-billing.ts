"use client";

import { useCallback, useEffect, useState } from "react";
import type { BillingTier } from "@/lib/billing/plans";

/** Shape of GET /api/billing */
export interface BillingInfo {
  tier: BillingTier;
  balanceMicros: number;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    usedMicros: number;
    fairUseCapMicros: number;
  } | null;
  hasStripeCustomer: boolean;
  usage: Array<{ id: string; feature: string; billing: string; model: string; chargedMicros: number; createdAt: string }>;
  payments: Array<{ id: string; transactionType: string; amountCents: number; status: string; createdAt: string }>;
}

export function useBilling() {
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async (): Promise<BillingInfo | null> => {
    try {
      const response = await fetch("/api/billing", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as BillingInfo;
      setBilling(data);
      setError(false);
      return data;
    } catch {
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { billing, loading, error, refresh };
}

/** Redirect to a Stripe-hosted page (Checkout or the Customer Portal) */
export async function goToStripe(endpoint: "/api/payments/checkout" | "/api/payments/portal", body?: unknown): Promise<void> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) throw new Error(data.error || "Stripe is unavailable right now");
  window.location.href = data.url;
}

export const TIER_LABELS: Record<BillingTier, string> = {
  FREE: "Free",
  PAY_AS_YOU_GO: "Pay as you go",
  SUBSCRIPTION: "Unlimited",
};

export const FEATURE_LABELS: Record<string, string> = {
  "paper-chat": "Deep Dive answer",
  explain: "Intellisense explanation",
  tutor: "Lesson tutor",
  "novelty-score": "Novelty score",
};
