/**
 * News outlets and company blogs via RSS/Atom feeds.
 * Individual feeds can be disabled with DISABLED_NEWS_FEEDS="Name A,Name B".
 */

import { createHash } from "crypto";
import { mapWithConcurrency } from "@/lib/jobs/rate-limit";
import { parseFeed, type FeedEntry } from "../feed-parser";
import { fetchText } from "../http";
import { cleanTitle, htmlToText, truncate } from "../normalize";
import { createKeywordMatcher, type FeedConfig } from "../topics";
import type { RawNewsItem } from "../types";
import { errorMessage, type NewsSource } from "./types";

function disabledFeeds(): Set<string> {
  return new Set(
    (process.env.DISABLED_NEWS_FEEDS || "")
      .split(",")
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean)
  );
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/** Aggregator titles look like "Headline - Outlet"; split off the outlet */
export function splitAggregatorTitle(title: string, sourceName?: string): { title: string; outlet?: string } {
  if (sourceName && title.endsWith(` - ${sourceName}`)) {
    return { title: title.slice(0, -(sourceName.length + 3)).trim(), outlet: sourceName };
  }
  return { title };
}

export function entryToItem(entry: FeedEntry, feed: FeedConfig): RawNewsItem | null {
  if (!entry.title || !entry.link) return null;
  const { title, outlet } = splitAggregatorTitle(cleanTitle(entry.title), entry.sourceName);
  const text = htmlToText(entry.content);
  return {
    source: "rss",
    externalId: `${feed.name.toLowerCase().replace(/\s+/g, "-")}:${shortHash(entry.id || entry.link)}`,
    url: entry.link,
    title,
    // Aggregator descriptions only repeat the title
    snippet: outlet ? undefined : truncate(text, 400) || undefined,
    // Some feeds carry the full article (content:encoded); keep it to ground story articles
    content: !outlet && text.length > 1200 ? truncate(text, 8000) : undefined,
    author: entry.author,
    sourceName: outlet ?? feed.name,
    publishedAt: entry.published ?? new Date(),
    engagement: 0,
    comments: 0,
  };
}

export const rssSource: NewsSource = {
  id: "rss",
  disabledReason: () => null,

  async fetch(topic, { signal, since }) {
    const disabled = disabledFeeds();
    const feeds = topic.feeds.filter((f) => !disabled.has(f.name.toLowerCase()));
    const matches = createKeywordMatcher(topic.keywords);
    const errors: string[] = [];

    const results = await mapWithConcurrency(
      feeds,
      4,
      async (feed) => {
        try {
          const parsed = parseFeed(await fetchText(feed.url, { signal, timeoutMs: 20_000 }));
          return parsed.entries
            .map((entry) => entryToItem(entry, feed))
            .filter((item): item is RawNewsItem => item !== null)
            .filter((item) => item.publishedAt >= since)
            .filter((item) => !feed.filterByKeywords || matches(`${item.title} ${item.snippet ?? ""}`));
        } catch (error) {
          errors.push(`${feed.name}: ${errorMessage(error)}`);
          return [];
        }
      },
      () => signal.aborted
    );

    const items = results.flatMap((r) => (r?.status === "fulfilled" ? r.value : []));
    if (items.length === 0 && feeds.length > 0 && errors.length === feeds.length) {
      throw new Error(`All feeds failed: ${errors[0]}`);
    }
    return { items, errors };
  },
};
