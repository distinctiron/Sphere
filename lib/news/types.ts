/**
 * Breaking news types (Epic 8)
 *
 * News sources (Hacker News, Reddit, GitHub, news outlets via RSS, X via an
 * RSS proxy) are adapters returning RawNewsItems. The news-fetch job stores
 * them as NewsItems; news-clustering groups items about the same event into
 * NewsStories.
 *
 * Client-safe: no server-only imports.
 */

export const NEWS_SOURCE_IDS = ["hackernews", "reddit", "github", "rss", "x"] as const;
export type NewsSourceId = (typeof NEWS_SOURCE_IDS)[number];

export const NEWS_SOURCE_LABELS: Record<NewsSourceId, string> = {
  hackernews: "Hacker News",
  reddit: "Reddit",
  github: "GitHub",
  rss: "News",
  x: "X",
};

export function isNewsSourceId(value: string): value is NewsSourceId {
  return (NEWS_SOURCE_IDS as readonly string[]).includes(value);
}

/** An item as returned by a source adapter, before it is stored */
export interface RawNewsItem {
  source: NewsSourceId;
  /** Stable id within the source (HN objectID, Reddit t3_ id, feed guid, ...) */
  externalId: string;
  /** Link to the item (the article itself for outlets; the post for HN/Reddit/X) */
  url: string;
  /** The URL the item is about (link target for HN/Reddit posts); defaults to url */
  targetUrl?: string;
  title: string;
  snippet?: string;
  author?: string;
  /** Where it was published, e.g. "r/LocalLLaMA", "The Verge", "Hacker News" */
  sourceName: string;
  publishedAt: Date;
  /** Points / upvotes / stars (0 when the source doesn't expose it) */
  engagement: number;
  comments: number;
  /** HN / Reddit comments page */
  discussionUrl?: string;
  /** Full text when the source already provides it (release notes, full feed content) */
  content?: string;
}
