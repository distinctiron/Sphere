/**
 * News Clustering Job (Story 8.3)
 *
 * 1. Embeds items that aren't in a story yet and assigns each to a story
 *    (same canonical URL, or similar enough to a recent story's centroid),
 *    creating new stories as needed.
 * 2. Recomputes stats, heat and the breaking flag of every active story
 *    (heat decays with time and engagement changes between runs).
 * 3. Archives stale stories and deletes old items.
 */

import { db } from "@/lib/db";
import {
  assignToStory,
  clusterThreshold,
  itemEmbeddingInput,
  planMerges,
  updateCentroid,
  type ClusterStory,
} from "@/lib/news/clustering";
import { computeStoryStats, markBreaking, type HeatItem, type StoryStats } from "@/lib/news/heat";
import { DEFAULT_TOPIC } from "@/lib/news/topics";
import type { NewsSourceId } from "@/lib/news/types";
import { generateEmbeddings, getEmbeddingConfig } from "@/lib/rag/embeddings";
import { deserializeEmbedding, serializeEmbedding } from "@/lib/rag/vector-search";
import type { JobContext, JobDefinition, JobResult } from "./types";

const MAX_ITEMS_PER_RUN = 1000;
const ARCHIVE_AFTER_DAYS = 7;
const DELETE_ITEMS_AFTER_DAYS = 30;

/** Title preference when a story has no LLM headline yet */
const HEADLINE_SOURCE_PRIORITY: Record<NewsSourceId, number> = { rss: 0, hackernews: 1, github: 2, reddit: 3, x: 4 };

interface ItemForStats {
  id: string;
  source: string;
  sourceName: string;
  title: string;
  engagement: number;
  publishedAt: Date;
}

export function pickHeadline(items: ItemForStats[]): string {
  const sorted = [...items].sort(
    (a, b) =>
      (HEADLINE_SOURCE_PRIORITY[a.source as NewsSourceId] ?? 9) - (HEADLINE_SOURCE_PRIORITY[b.source as NewsSourceId] ?? 9) ||
      b.engagement - a.engagement
  );
  return sorted[0].title;
}

async function clusterNewItems(logger: JobContext["logger"], signal: AbortSignal) {
  const config = getEmbeddingConfig();
  const threshold = clusterThreshold(config.model);

  const pending = await db.newsItem.findMany({
    where: { storyId: null, topic: DEFAULT_TOPIC },
    orderBy: { publishedAt: "asc" },
    take: MAX_ITEMS_PER_RUN,
    select: {
      id: true,
      title: true,
      snippet: true,
      canonicalUrl: true,
      publishedAt: true,
      embedding: true,
      embeddingModel: true,
    },
  });
  if (pending.length === 0) return { clustered: 0, newStories: 0, joinedByUrl: 0, joinedBySimilarity: 0, touched: new Set<string>() };

  // Embed the items that don't have a vector from the current model yet
  const toEmbed = pending.filter((p) => !p.embedding || p.embeddingModel !== config.model);
  if (toEmbed.length > 0) {
    const vectors = await generateEmbeddings(toEmbed.map(itemEmbeddingInput), config);
    toEmbed.forEach((item, i) => {
      item.embedding = serializeEmbedding(vectors[i]);
      item.embeddingModel = config.model;
    });
    logger.info("embedded items", { count: toEmbed.length, model: config.model });
  }

  const windowStart = new Date(Math.min(...pending.map((p) => p.publishedAt.getTime())) - 48 * 3_600_000);
  const candidates = await db.newsStory.findMany({
    where: { topic: DEFAULT_TOPIC, status: "ACTIVE", embeddingModel: config.model, lastSeenAt: { gte: windowStart } },
    select: { id: true, centroid: true, itemCount: true, lastSeenAt: true },
  });
  const stories: ClusterStory[] = candidates
    .filter((s) => s.centroid)
    .map((s) => ({ id: s.id, centroid: deserializeEmbedding(s.centroid!), itemCount: s.itemCount, lastSeenAt: s.lastSeenAt }));
  const storyById = new Map(stories.map((s) => [s.id, s]));

  const urlRows = await db.newsItem.findMany({
    where: { canonicalUrl: { in: Array.from(new Set(pending.map((p) => p.canonicalUrl))) }, story: { status: "ACTIVE" } },
    select: { canonicalUrl: true, storyId: true },
  });
  const storyByUrl = new Map(urlRows.filter((r) => r.storyId).map((r) => [r.canonicalUrl, r.storyId!]));

  const counts = { clustered: 0, newStories: 0, joinedByUrl: 0, joinedBySimilarity: 0, touched: new Set<string>() };
  for (const item of pending) {
    if (signal.aborted) break;
    const vector = deserializeEmbedding(item.embedding!);
    const at = item.publishedAt;
    const assignment = assignToStory({ canonicalUrl: item.canonicalUrl, vector, publishedAt: at }, stories, storyByUrl, threshold);

    let storyId: string;
    if (assignment.kind === "new") {
      const created = await db.newsStory.create({
        data: {
          topic: DEFAULT_TOPIC,
          headline: item.title,
          firstSeenAt: at,
          lastSeenAt: at,
          itemCount: 1,
          sourceCount: 1,
          centroid: serializeEmbedding(vector),
          embeddingModel: config.model,
        },
        select: { id: true },
      });
      storyId = created.id;
      const story = { id: storyId, centroid: vector, itemCount: 1, lastSeenAt: at };
      stories.push(story);
      storyById.set(storyId, story);
      counts.newStories++;
    } else {
      storyId = assignment.storyId;
      const story = storyById.get(storyId);
      if (story) {
        story.centroid = updateCentroid(story.centroid, story.itemCount, vector);
        story.itemCount++;
        if (at > story.lastSeenAt) story.lastSeenAt = at;
        await db.newsStory.update({ where: { id: storyId }, data: { centroid: serializeEmbedding(story.centroid) } });
      }
      if (assignment.kind === "url") counts.joinedByUrl++;
      else counts.joinedBySimilarity++;
    }

    storyByUrl.set(item.canonicalUrl, storyId);
    await db.newsItem.update({
      where: { id: item.id },
      data: { storyId, embedding: item.embedding, embeddingModel: item.embeddingModel },
    });
    counts.touched.add(storyId);
    counts.clustered++;
  }
  return counts;
}

/** Folds stories about the same event into one (see planMerges) */
async function mergeSimilarStories(now: Date): Promise<number> {
  const model = getEmbeddingConfig().model;
  const threshold = clusterThreshold(model);
  const candidates = await db.newsStory.findMany({
    where: {
      topic: DEFAULT_TOPIC,
      status: "ACTIVE",
      embeddingModel: model,
      centroid: { not: null },
      lastSeenAt: { gte: new Date(now.getTime() - 72 * 3_600_000) },
    },
    select: { id: true, centroid: true, itemCount: true, lastSeenAt: true, firstSeenAt: true },
  });
  const stories = candidates.map((s) => ({ ...s, centroid: deserializeEmbedding(s.centroid!) }));
  const merges = planMerges(stories, threshold);
  const byId = new Map(stories.map((s) => [s.id, s]));

  for (const [keepId, mergeId] of merges) {
    await db.$transaction(async (tx) => {
      await tx.newsItem.updateMany({ where: { storyId: mergeId }, data: { storyId: keepId } });
      // Carry over users' saved/read state unless they already have one for the kept story
      const states = await tx.userStoryState.findMany({ where: { storyId: mergeId } });
      for (const state of states) {
        await tx.userStoryState.upsert({
          where: { userId_storyId: { userId: state.userId, storyId: keepId } },
          create: { userId: state.userId, storyId: keepId, status: state.status, saved: state.saved },
          update: state.saved ? { saved: true } : {},
        });
      }
      await tx.newsStory.delete({ where: { id: mergeId } });
    });
  }
  // Final centroids of the stories that absorbed others
  const kept = new Set(merges.map(([keepId]) => keepId));
  for (const id of Array.from(kept)) {
    const story = byId.get(id)!;
    await db.newsStory.update({ where: { id }, data: { centroid: serializeEmbedding(story.centroid) } });
  }
  return merges.length;
}

/** Recomputes stats, headline fallback, heat and breaking for all active stories */
async function rankStories(now: Date) {
  const active = await db.newsStory.findMany({
    where: { topic: DEFAULT_TOPIC, status: "ACTIVE" },
    select: {
      id: true,
      summarizedItemCount: true,
      items: {
        select: {
          id: true,
          source: true,
          sourceName: true,
          title: true,
          engagement: true,
          publishedAt: true,
        },
      },
    },
  });

  const withStats: Array<{ id: string; stats: StoryStats; items: ItemForStats[]; summarized: boolean }> = [];
  const empty: string[] = [];
  for (const story of active) {
    if (story.items.length === 0) {
      empty.push(story.id);
      continue;
    }
    const heatItems: HeatItem[] = story.items.map((i) => ({
      source: i.source as NewsSourceId,
      sourceName: i.sourceName,
      engagement: i.engagement,
      at: i.publishedAt,
    }));
    withStats.push({ id: story.id, stats: computeStoryStats(heatItems, now), items: story.items, summarized: story.summarizedItemCount > 0 });
  }

  const breaking = markBreaking(withStats, now);
  for (const story of withStats) {
    await db.newsStory.update({
      where: { id: story.id },
      data: {
        heatScore: story.stats.heat,
        isBreaking: breaking.has(story.id),
        itemCount: story.stats.itemCount,
        sourceCount: story.stats.platforms.length,
        firstSeenAt: story.stats.firstSeenAt,
        lastSeenAt: story.stats.lastSeenAt,
        ...(story.summarized ? {} : { headline: pickHeadline(story.items) }),
      },
    });
  }
  if (empty.length > 0) await db.newsStory.deleteMany({ where: { id: { in: empty } } });
  return { ranked: withStats.length, breaking: breaking.size, removedEmpty: empty.length };
}

async function cleanup(now: Date) {
  const archiveBefore = new Date(now.getTime() - ARCHIVE_AFTER_DAYS * 86_400_000);
  const deleteBefore = new Date(now.getTime() - DELETE_ITEMS_AFTER_DAYS * 86_400_000);

  const archived = await db.newsStory.updateMany({
    where: { status: "ACTIVE", lastSeenAt: { lt: archiveBefore } },
    data: { status: "ARCHIVED", isBreaking: false },
  });
  // Old archived stories go, unless someone saved them
  const deletedStories = await db.newsStory.deleteMany({
    where: { status: "ARCHIVED", lastSeenAt: { lt: deleteBefore }, userStates: { none: { saved: true } } },
  });
  const deletedItems = await db.newsItem.deleteMany({
    where: { publishedAt: { lt: deleteBefore }, OR: [{ storyId: null }, { story: { status: "ARCHIVED", userStates: { none: { saved: true } } } }] },
  });
  return { archived: archived.count, deletedStories: deletedStories.count, deletedItems: deletedItems.count };
}

async function run({ logger, signal }: JobContext): Promise<JobResult> {
  const now = new Date();
  const { touched, ...clustering } = await clusterNewItems(logger, signal);
  const merged = signal.aborted ? 0 : await mergeSimilarStories(now);
  const ranking = await rankStories(now);
  const cleaned = await cleanup(now);
  logger.info("clustering finished", { ...clustering, merged, ...ranking, ...cleaned });

  return {
    itemsProcessed: clustering.clustered,
    itemsFailed: 0,
    details: { ...clustering, storiesTouched: touched.size, merged, ...ranking, ...cleaned },
  };
}

export const newsClusteringJob: JobDefinition = {
  name: "news-clustering",
  description: "Group news items into stories and rank them by heat",
  timeoutMs: 10 * 60 * 1000,
  run,
};
