/**
 * News Summarize Job (Story 8.4)
 *
 * Writes an LLM headline, summary and "why it matters" for the hottest stories
 * that are new or have grown since they were last summarized, then
 * pre-generates full articles (Story 8.6) for the top breaking stories so they
 * open instantly. Uses the same failure handling as novelty scoring: bad
 * credentials stop the run, repeated rate limits trip a circuit breaker, and
 * other failures are retried on later runs (up to MAX_SUMMARY_ATTEMPTS).
 */

import { db } from "@/lib/db";
import { isLLMConfigured, summarizeStory } from "@/lib/llm";
import { recordUsage } from "@/lib/billing/usage";
import { isArticleStale, streamStoryArticle } from "@/lib/news/article";
import { orderItems } from "@/lib/news/stories";
import { DEFAULT_TOPIC } from "@/lib/news/topics";
import { NEWS_SOURCE_LABELS, type NewsSourceId } from "@/lib/news/types";
import { isTransientError, mapWithConcurrency } from "./rate-limit";
import type { JobContext, JobDefinition, JobResult } from "./types";

export const MAX_SUMMARY_ATTEMPTS = 5;
const CIRCUIT_BREAKER_THRESHOLD = 3;
const ITEMS_IN_PROMPT = 10;

function getConfig() {
  return {
    maxPerRun: Number(process.env.NEWS_SUMMARIZE_MAX_PER_RUN) || 15,
    articlesPerRun: Number(process.env.NEWS_ARTICLE_PREGEN_MAX_PER_RUN ?? 3),
    concurrency: 3,
  };
}

async function run({ logger, signal }: JobContext): Promise<JobResult> {
  if (!isLLMConfigured()) {
    logger.warn("LLM provider not configured (mock mode); skipping story summaries");
    return { itemsProcessed: 0, itemsFailed: 0, details: { skipped: "LLM not configured" } };
  }
  const config = getConfig();

  // Stories that are new or grew since their summary, hottest first
  const active = await db.newsStory.findMany({
    where: { topic: DEFAULT_TOPIC, status: "ACTIVE", summaryAttempts: { lt: MAX_SUMMARY_ATTEMPTS } },
    orderBy: { heatScore: "desc" },
    take: 200,
    select: { id: true, itemCount: true, summarizedItemCount: true },
  });
  const due = active.filter((s) => s.itemCount > s.summarizedItemCount).slice(0, config.maxPerRun);

  let consecutiveTransient = 0;
  let circuitOpen = false;
  let configError: unknown;
  let failed = 0;

  const results = await mapWithConcurrency(
    due,
    config.concurrency,
    async (candidate) => {
      const story = await db.newsStory.findUnique({
        where: { id: candidate.id },
        select: {
          itemCount: true,
          items: {
            select: { source: true, sourceName: true, title: true, snippet: true, engagement: true, comments: true, publishedAt: true },
          },
        },
      });
      if (!story || story.items.length === 0) return;
      try {
        const summary = await summarizeStory(
          orderItems(story.items)
            .slice(0, ITEMS_IN_PROMPT)
            .map((item) => ({ ...item, platform: NEWS_SOURCE_LABELS[item.source as NewsSourceId] ?? item.source })),
          (usage) => void recordUsage({ feature: "news-summary", billing: "PLATFORM", usage })
        );
        consecutiveTransient = 0;
        await db.newsStory.update({
          where: { id: candidate.id },
          data: {
            headline: summary.headline,
            summary: summary.summary,
            whyItMatters: summary.whyItMatters || null,
            summarizedItemCount: story.itemCount,
            summaryError: null,
            summaryAttempts: 0,
          },
        });
      } catch (error) {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) {
          configError ??= error;
          circuitOpen = true;
          throw error;
        }
        if (isTransientError(error) && ++consecutiveTransient >= CIRCUIT_BREAKER_THRESHOLD && !circuitOpen) {
          circuitOpen = true;
          logger.warn("LLM unavailable or rate limited; stopping this run early", { error });
        }
        failed++;
        logger.warn("story summary failed, will retry later", { storyId: candidate.id, error });
        await db.newsStory.update({
          where: { id: candidate.id },
          data: {
            summaryAttempts: { increment: 1 },
            summaryError: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
          },
        });
        throw error;
      }
    },
    () => circuitOpen || signal.aborted
  );

  if (configError) {
    throw new Error(
      `LLM authentication failed; check LLM_API_KEY: ${configError instanceof Error ? configError.message : String(configError)}`
    );
  }
  const summarized = results.filter((r) => r?.status === "fulfilled").length;

  // Pre-generate articles for the hottest breaking stories
  let articles = 0;
  if (config.articlesPerRun > 0 && !circuitOpen && !signal.aborted) {
    const breaking = await db.newsStory.findMany({
      where: { topic: DEFAULT_TOPIC, status: "ACTIVE", isBreaking: true },
      orderBy: { heatScore: "desc" },
      take: 20,
      select: { id: true, article: true, articleItemCount: true, articleSourceCount: true, itemCount: true, sourceCount: true },
    });
    for (const story of breaking.filter(isArticleStale).slice(0, config.articlesPerRun)) {
      if (signal.aborted) break;
      try {
        await streamStoryArticle(story.id, { regenerate: true }, () => {});
        articles++;
      } catch (error) {
        logger.warn("article pre-generation failed", { storyId: story.id, error });
      }
    }
  }

  return {
    itemsProcessed: summarized,
    itemsFailed: failed,
    details: { due: due.length, summarized, failed, articlesGenerated: articles, circuitBreakerTripped: circuitOpen },
  };
}

export const newsSummarizeJob: JobDefinition = {
  name: "news-summarize",
  description: "Write headlines, summaries and articles for the hottest news stories",
  timeoutMs: 15 * 60 * 1000,
  run,
};
