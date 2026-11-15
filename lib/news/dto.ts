/**
 * Shapes returned by the news API and used by the News UI.
 * Client-safe: no server-only imports.
 */

import type { NewsSourceId } from "./types";

export type StoryUserStatus = "NEW" | "READ" | "DISMISSED";

export interface StoryItemDTO {
  id: string;
  source: NewsSourceId;
  sourceName: string;
  title: string;
  url: string;
  discussionUrl: string | null;
  author: string | null;
  engagement: number;
  comments: number;
  publishedAt: string;
}

export interface SourceAggregate {
  source: NewsSourceId;
  /** Items on this platform */
  count: number;
  /** Highest engagement on this platform (points/upvotes/stars) */
  topEngagement: number;
  /** Distinct outlets / communities, e.g. ["r/LocalLLaMA", "r/OpenAI"] */
  names: string[];
}

export interface StoryDTO {
  id: string;
  headline: string;
  summary: string | null;
  whyItMatters: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  itemCount: number;
  sourceCount: number;
  heatScore: number;
  isBreaking: boolean;
  hasArticle: boolean;
  sources: SourceAggregate[];
  /** Top items (all items on the story page) */
  items: StoryItemDTO[];
  userState: { status: StoryUserStatus; saved: boolean } | null;
}

export interface NewsFeedMeta {
  total: number;
  /** When news was last fetched successfully (null = never) */
  lastFetchedAt: string | null;
  /** Per-source outcome of the last fetch */
  sources: Record<string, { fetched?: number; failed?: string; errors?: string[] }>;
  skipped: Record<string, string>;
}

export interface NewsFeedResponse {
  stories: StoryDTO[];
  meta: NewsFeedMeta;
}

/** A numbered source of a story article, cited as [id] */
export interface NewsCitation {
  id: number;
  itemId: string;
  source: NewsSourceId;
  sourceName: string;
  title: string;
  url: string;
  discussionUrl: string | null;
  engagement: number;
  comments: number;
  publishedAt: string;
  /** Short excerpt shown in the citation tooltip */
  excerpt: string;
}

export interface RelatedLinks {
  stories: Array<{ id: string; headline: string; lastSeenAt: string }>;
  papers: Array<{ id: string; title: string }>;
}

/** Events of the story article SSE stream */
export type ArticleStreamEvent =
  | { citations: NewsCitation[]; related: RelatedLinks; cached: boolean; generatedAt?: string; stale?: boolean }
  | { chunk: string }
  | { error: string };

export const NEWS_WINDOWS = { "24h": 24, "3d": 72, "7d": 168 } as const;
export type NewsWindow = keyof typeof NEWS_WINDOWS;
export type NewsSort = "heat" | "latest";
