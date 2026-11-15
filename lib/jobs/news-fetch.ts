/**
 * News Fetch Job (Story 8.1/8.2)
 *
 * Pulls recent items from every enabled news source for the topic, normalises
 * them and stores them as NewsItems. Items already stored get their engagement
 * (points, upvotes, stars) refreshed, which feeds the story heat ranking.
 * Sources run in parallel and fail independently.
 */

import { db } from "@/lib/db";
import { canonicalizeUrl } from "@/lib/news/normalize";
import { resolveSources } from "@/lib/news/sources";
import { DEFAULT_TOPIC, getTopic } from "@/lib/news/topics";
import type { RawNewsItem } from "@/lib/news/types";
import type { JobContext, JobDefinition, JobResult } from "./types";

const LOOKUP_BATCH = 400;

function windowHours(): number {
  return Number(process.env.NEWS_FETCH_WINDOW_HOURS) || 48;
}

export interface NewsUpsertStats {
  created: number;
  updated: number;
  unchanged: number;
  /** Outlet articles already stored via another feed (e.g. a direct feed and Google News) */
  duplicates: number;
}

/** Same outlet + same headline = same article, whichever feed it came through */
export function outletArticleKey(item: { sourceName: string; title: string }): string {
  return `${item.sourceName.toLowerCase()}|${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

/** Stores new items and refreshes engagement of known ones */
export async function upsertNewsItems(items: RawNewsItem[], topic: string): Promise<NewsUpsertStats> {
  // De-duplicate within the batch (the same HN story can match several queries)
  const unique = new Map<string, RawNewsItem>();
  items.forEach((item) => unique.set(`${item.source}:${item.externalId}`, item));
  const all = Array.from(unique.values());
  const stats: NewsUpsertStats = { created: 0, updated: 0, unchanged: 0, duplicates: 0 };

  // Outlet articles already stored under another feed's id
  const knownArticles = new Set(
    (
      await db.newsItem.findMany({
        where: { source: "rss", createdAt: { gte: new Date(Date.now() - 2 * windowHours() * 3_600_000) } },
        select: { sourceName: true, title: true },
      })
    ).map(outletArticleKey)
  );

  for (let i = 0; i < all.length; i += LOOKUP_BATCH) {
    const batch = all.slice(i, i + LOOKUP_BATCH);
    const existing = await db.newsItem.findMany({
      where: { OR: batch.map((item) => ({ source: item.source, externalId: item.externalId })) },
      select: { id: true, source: true, externalId: true, engagement: true, comments: true },
    });
    const byKey = new Map(existing.map((e) => [`${e.source}:${e.externalId}`, e]));

    const toCreate = batch.filter((item) => {
      if (byKey.has(`${item.source}:${item.externalId}`)) return false;
      if (item.source !== "rss") return true;
      const key = outletArticleKey(item);
      if (knownArticles.has(key)) {
        stats.duplicates++;
        return false;
      }
      knownArticles.add(key);
      return true;
    });
    if (toCreate.length > 0) {
      const result = await db.newsItem.createMany({
        data: toCreate.map((item) => ({
          source: item.source,
          externalId: item.externalId,
          url: item.url,
          canonicalUrl: canonicalizeUrl(item.targetUrl ?? item.url),
          title: item.title.slice(0, 500),
          snippet: item.snippet ?? null,
          author: item.author ?? null,
          sourceName: item.sourceName,
          publishedAt: item.publishedAt,
          engagement: Math.max(0, Math.round(item.engagement)),
          comments: Math.max(0, Math.round(item.comments)),
          discussionUrl: item.discussionUrl ?? null,
          topic,
          content: item.content ?? null,
          contentFetchedAt: item.content ? new Date() : null,
        })),
      });
      stats.created += result.count;
    }

    for (const item of batch) {
      const known = byKey.get(`${item.source}:${item.externalId}`);
      if (!known) continue;
      // Sources without engagement (feeds) report 0; never overwrite a real count with it
      const engagement = Math.max(known.engagement, Math.round(item.engagement));
      const comments = Math.max(known.comments, Math.round(item.comments));
      if (engagement === known.engagement && comments === known.comments) {
        stats.unchanged++;
        continue;
      }
      await db.newsItem.update({
        where: { id: known.id },
        data: { engagement, comments, engagementUpdatedAt: new Date() },
      });
      stats.updated++;
    }
  }
  return stats;
}

async function run({ logger, signal }: JobContext): Promise<JobResult> {
  const topic = getTopic(DEFAULT_TOPIC);
  const since = new Date(Date.now() - windowHours() * 3_600_000);
  const { enabled, skipped } = resolveSources();
  if (Object.keys(skipped).length > 0) logger.info("sources skipped", { skipped });

  const results = await Promise.allSettled(
    enabled.map((source) => source.fetch(topic, { logger, signal, since }))
  );

  const perSource: Record<string, unknown> = {};
  const items: RawNewsItem[] = [];
  let failedSources = 0;

  results.forEach((result, i) => {
    const id = enabled[i].id;
    if (result.status === "fulfilled") {
      items.push(...result.value.items);
      perSource[id] = {
        fetched: result.value.items.length,
        ...(result.value.errors.length > 0 ? { errors: result.value.errors.slice(0, 10) } : {}),
      };
      if (result.value.errors.length > 0) logger.warn(`${id}: partial failures`, { errors: result.value.errors });
    } else {
      failedSources++;
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      perSource[id] = { fetched: 0, failed: message };
      logger.error(`${id}: source failed`, { error: result.reason });
    }
  });

  if (enabled.length > 0 && failedSources === enabled.length) {
    throw new Error("Every news source failed; see details in the logs");
  }

  const stats = await upsertNewsItems(items, topic.id);
  logger.info("news items stored", { ...stats, sources: perSource });

  return {
    itemsProcessed: stats.created,
    itemsFailed: failedSources,
    details: { ...stats, sources: perSource, skipped, windowHours: windowHours() },
  };
}

export const newsFetchJob: JobDefinition = {
  name: "news-fetch",
  description: "Fetch breaking AI news from Hacker News, Reddit, GitHub, news outlets and X",
  timeoutMs: 10 * 60 * 1000,
  run,
};
