/**
 * Story queries shared by the news API routes and the story page.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { NewsFeedMeta, NewsSort, SourceAggregate, StoryDTO, StoryItemDTO, StoryUserStatus } from "./dto";
import { DEFAULT_TOPIC } from "./topics";
import { isNewsSourceId, type NewsSourceId } from "./types";

const FEED_ITEMS_PER_STORY = 8;

const itemSelect = {
  id: true,
  source: true,
  sourceName: true,
  title: true,
  url: true,
  discussionUrl: true,
  author: true,
  engagement: true,
  comments: true,
  publishedAt: true,
} satisfies Prisma.NewsItemSelect;

type ItemRow = Prisma.NewsItemGetPayload<{ select: typeof itemSelect }>;

function storySelect(userId: string) {
  return {
    id: true,
    headline: true,
    summary: true,
    whyItMatters: true,
    firstSeenAt: true,
    lastSeenAt: true,
    itemCount: true,
    sourceCount: true,
    heatScore: true,
    isBreaking: true,
    article: true,
    items: { select: itemSelect },
    userStates: { where: { userId }, select: { status: true, saved: true } },
  } satisfies Prisma.NewsStorySelect;
}

type StoryRow = Prisma.NewsStoryGetPayload<{ select: ReturnType<typeof storySelect> }>;

function toItemDTO(item: ItemRow): StoryItemDTO {
  return {
    id: item.id,
    source: item.source as NewsSourceId,
    sourceName: item.sourceName,
    title: item.title,
    url: item.url,
    discussionUrl: item.discussionUrl,
    author: item.author,
    engagement: item.engagement,
    comments: item.comments,
    publishedAt: item.publishedAt.toISOString(),
  };
}

/** Items ordered for display: one per platform first (most engaged), then the rest */
export function orderItems<T extends { source: string; engagement: number; publishedAt: Date }>(items: T[]): T[] {
  const sorted = [...items].sort((a, b) => b.engagement - a.engagement || a.publishedAt.getTime() - b.publishedAt.getTime());
  const seen = new Set<string>();
  const leaders: T[] = [];
  const rest: T[] = [];
  sorted.forEach((item) => {
    if (seen.has(item.source)) rest.push(item);
    else {
      seen.add(item.source);
      leaders.push(item);
    }
  });
  return [...leaders, ...rest];
}

export function aggregateSources(items: Array<{ source: string; sourceName: string; engagement: number }>): SourceAggregate[] {
  const bySource = new Map<NewsSourceId, SourceAggregate>();
  items.forEach((item) => {
    if (!isNewsSourceId(item.source)) return;
    const agg = bySource.get(item.source) ?? { source: item.source, count: 0, topEngagement: 0, names: [] };
    agg.count++;
    agg.topEngagement = Math.max(agg.topEngagement, item.engagement);
    if (!agg.names.includes(item.sourceName)) agg.names.push(item.sourceName);
    bySource.set(item.source, agg);
  });
  return Array.from(bySource.values()).sort((a, b) => b.count - a.count || b.topEngagement - a.topEngagement);
}

function toStoryDTO(story: StoryRow, itemLimit?: number): StoryDTO {
  const ordered = orderItems(story.items);
  const state = story.userStates[0];
  return {
    id: story.id,
    headline: story.headline,
    summary: story.summary,
    whyItMatters: story.whyItMatters,
    firstSeenAt: story.firstSeenAt.toISOString(),
    lastSeenAt: story.lastSeenAt.toISOString(),
    itemCount: story.itemCount,
    sourceCount: story.sourceCount,
    heatScore: story.heatScore,
    isBreaking: story.isBreaking,
    hasArticle: !!story.article,
    sources: aggregateSources(story.items),
    items: (itemLimit ? ordered.slice(0, itemLimit) : ordered).map(toItemDTO),
    userState: state ? { status: state.status as StoryUserStatus, saved: state.saved } : null,
  };
}

export interface ListStoriesOptions {
  userId: string;
  windowHours: number;
  sort: NewsSort;
  sources?: NewsSourceId[];
  savedOnly?: boolean;
  offset?: number;
  limit?: number;
}

export async function listStories(options: ListStoriesOptions): Promise<{ stories: StoryDTO[]; total: number }> {
  const { userId, windowHours, sort, sources, savedOnly, offset = 0, limit = 30 } = options;
  const where: Prisma.NewsStoryWhereInput = {
    topic: DEFAULT_TOPIC,
    ...(savedOnly
      ? { userStates: { some: { userId, saved: true } } }
      : {
          status: "ACTIVE",
          lastSeenAt: { gte: new Date(Date.now() - windowHours * 3_600_000) },
          NOT: { userStates: { some: { userId, status: "DISMISSED" } } },
        }),
    ...(sources && sources.length > 0 ? { items: { some: { source: { in: sources } } } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.newsStory.findMany({
      where,
      orderBy: sort === "latest" ? [{ lastSeenAt: "desc" }] : [{ heatScore: "desc" }, { lastSeenAt: "desc" }],
      skip: offset,
      take: limit,
      select: storySelect(userId),
    }),
    db.newsStory.count({ where }),
  ]);
  return { stories: rows.map((row) => toStoryDTO(row, FEED_ITEMS_PER_STORY)), total };
}

export async function getStory(storyId: string, userId: string): Promise<StoryDTO | null> {
  const row = await db.newsStory.findUnique({ where: { id: storyId }, select: storySelect(userId) });
  return row ? toStoryDTO(row) : null;
}

/** Outcome of the latest news fetch, for empty states and source status chips */
export async function getFeedMeta(total: number): Promise<NewsFeedMeta> {
  const last = await db.jobRun.findFirst({
    where: { jobName: "news-fetch", status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    select: { finishedAt: true, details: true },
  });
  const details = (last?.details ?? {}) as { sources?: NewsFeedMeta["sources"]; skipped?: Record<string, string> };
  return {
    total,
    lastFetchedAt: last?.finishedAt?.toISOString() ?? null,
    sources: details.sources ?? {},
    skipped: details.skipped ?? {},
  };
}

export async function setStoryState(
  userId: string,
  storyId: string,
  update: { status?: StoryUserStatus; saved?: boolean }
) {
  return db.userStoryState.upsert({
    where: { userId_storyId: { userId, storyId } },
    create: { userId, storyId, status: update.status ?? "NEW", saved: update.saved ?? false },
    update: { ...(update.status ? { status: update.status } : {}), ...(update.saved !== undefined ? { saved: update.saved } : {}) },
    select: { status: true, saved: true },
  });
}
