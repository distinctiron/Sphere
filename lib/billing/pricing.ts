/**
 * Model inference pricing (server-only).
 *
 * Providers bill in USD per million tokens. Costs are converted to euros with
 * USD_TO_EUR (default 0.86) and rounded up to whole micro-euros.
 *
 * Prices as of 2026-11. Check them when you change LLM_MODEL or when a provider
 * changes its price list: an outdated row means users are billed the wrong amount.
 * Unknown models are billed at FALLBACK_PRICE (deliberately high) with a warning.
 */

import type { LLMUsage } from "@/lib/llm";
import { MICROS_PER_EUR } from "./plans";

export interface ModelPrice {
  /** USD per 1M uncached input tokens */
  input: number;
  /** USD per 1M output tokens (includes reasoning tokens) */
  output: number;
  /** USD per 1M cached input tokens (cache reads) */
  cachedInput: number;
  /** USD per 1M tokens written to the prompt cache (Anthropic); defaults to input */
  cacheWrite?: number;
}

const anthropic = (input: number, output: number, cachedInput = input / 10): ModelPrice => ({
  input,
  output,
  cachedInput,
  cacheWrite: input * 1.25,
});

/** Matched by longest prefix, so dated ids ("gpt-4o-2024-08-06") resolve to their family */
export const MODEL_PRICES: Record<string, ModelPrice> = {
  // OpenAI
  "gpt-5.1": { input: 1.25, output: 10, cachedInput: 0.125 },
  "gpt-5": { input: 1.25, output: 10, cachedInput: 0.125 },
  "gpt-5-mini": { input: 0.25, output: 2, cachedInput: 0.025 },
  "gpt-5-nano": { input: 0.05, output: 0.4, cachedInput: 0.005 },
  "gpt-4.1": { input: 2, output: 8, cachedInput: 0.5 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6, cachedInput: 0.1 },
  "gpt-4o": { input: 2.5, output: 10, cachedInput: 1.25 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cachedInput: 0.075 },
  // Anthropic
  "claude-fable-5-2": anthropic(8, 40, 0.2),
  "claude-opus-5-5": anthropic(4, 20, 0.2),
  "claude-opus-5": anthropic(5, 25),
  "claude-opus-4-8": anthropic(5, 25),
  "claude-opus-4-7": anthropic(5, 25),
  "claude-opus-4-6": anthropic(5, 25),
  "claude-sonnet-5-5": anthropic(2, 10, 0.1),
  "claude-sonnet-5": anthropic(2, 10),
  "claude-sonnet-4-6": anthropic(3, 15),
  "claude-sonnet-4-5": anthropic(3, 15),
  "claude-sonnet-4": anthropic(3, 15),
  "claude-haiku-5-5": anthropic(0.1, 0.5),
  "claude-haiku-4-5": anthropic(1, 5),
};

/** Used for models missing from the table: errs on the side of covering cost */
export const FALLBACK_PRICE: ModelPrice = { input: 10, output: 50, cachedInput: 1 };

const warnedModels = new Set<string>();

export function getModelPrice(model: string): ModelPrice {
  const id = model.toLowerCase();
  let best: string | undefined;
  for (const key of Object.keys(MODEL_PRICES)) {
    if ((id === key || id.startsWith(`${key}-`)) && (!best || key.length > best.length)) best = key;
  }
  if (best) return MODEL_PRICES[best];
  if (!warnedModels.has(id)) {
    warnedModels.add(id);
    console.warn(`[billing] No price for model "${model}"; billing at the fallback rate. Add it to lib/billing/pricing.ts.`);
  }
  return FALLBACK_PRICE;
}

export function getUsdToEurRate(): number {
  const rate = Number(process.env.USD_TO_EUR);
  return Number.isFinite(rate) && rate > 0 ? rate : 0.86;
}

/**
 * Mock calls (no API key) cost nothing unless BILLING_PRICE_MOCK_AS names a
 * model to price them as, e.g. "gpt-5.1"; useful for testing billing locally.
 */
function priceFor(usage: LLMUsage): ModelPrice | null {
  if (usage.provider !== "mock") return getModelPrice(usage.model);
  const as = process.env.BILLING_PRICE_MOCK_AS;
  return as ? getModelPrice(as) : null;
}

/** Real inference cost of one call in micro-euros (rounded up) */
export function inferenceCostMicros(usage: LLMUsage): number {
  const price = priceFor(usage);
  if (!price) return 0;
  const usd =
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cachedInputTokens * price.cachedInput +
      usage.cacheWriteTokens * (price.cacheWrite ?? price.input)) /
    1_000_000;
  // Round away floating-point noise (5625.0000001) before rounding up to whole micro-euros
  const micros = Math.round(usd * getUsdToEurRate() * MICROS_PER_EUR * 1000) / 1000;
  return Math.ceil(micros);
}
