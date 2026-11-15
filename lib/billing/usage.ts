/**
 * Usage metering (server-only): records every model call in usage_events and
 * charges wallet-billed calls USAGE_MARKUP × their real cost.
 */

import { db } from "@/lib/db";
import type { LLMUsage } from "@/lib/llm";
import { USAGE_MARKUP } from "./plans";
import { inferenceCostMicros } from "./pricing";

export type UsageFeature = "paper-chat" | "explain" | "tutor" | "novelty-score" | "news-summary" | "story-article";

export interface RecordUsageInput {
  /** Omit for platform (shared background) work */
  userId?: string | null;
  feature: UsageFeature;
  billing: "WALLET" | "SUBSCRIPTION" | "PLATFORM";
  usage: LLMUsage | undefined;
  paperId?: string;
}

export function chargeFor(costMicros: number, billing: RecordUsageInput["billing"]): number {
  return billing === "WALLET" ? costMicros * USAGE_MARKUP : 0;
}

/**
 * Record one model call. Never throws: a metering failure is logged rather
 * than failing a response the user has already received.
 */
export async function recordUsage(input: RecordUsageInput): Promise<{ costMicros: number; chargedMicros: number } | null> {
  const { usage } = input;
  if (!usage) return null;
  try {
    const costMicros = inferenceCostMicros(usage);
    const chargedMicros = input.userId ? chargeFor(costMicros, input.billing) : 0;
    const event = db.usageEvent.create({
      data: {
        userId: input.userId ?? null,
        feature: input.feature,
        billing: input.userId ? input.billing : "PLATFORM",
        provider: usage.provider,
        model: usage.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        cacheWriteTokens: usage.cacheWriteTokens,
        costMicros,
        chargedMicros,
        paperId: input.paperId,
      },
    });
    if (chargedMicros > 0 && input.userId) {
      await db.$transaction([
        event,
        db.paymentPlan.update({
          where: { userId: input.userId },
          data: { balanceMicros: { decrement: BigInt(chargedMicros) } },
        }),
      ]);
    } else {
      await event;
    }
    return { costMicros, chargedMicros };
  } catch (error) {
    console.error(`[billing] Failed to record ${input.feature} usage for ${input.userId ?? "platform"}:`, error);
    return null;
  }
}
