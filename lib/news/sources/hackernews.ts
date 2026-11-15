/**
 * Hacker News via the Algolia search API (free, no key).
 * https://hn.algolia.com/api
 */

import { createIntervalThrottle } from "@/lib/jobs/rate-limit";
import { fetchJson } from "../http";
import { cleanTitle, htmlToText, truncate } from "../normalize";
import { createKeywordMatcher } from "../topics";
import type { RawNewsItem } from "../types";
import { errorMessage, type NewsSource } from "./types";

const API = "https://hn.algolia.com/api/v1/search";

interface AlgoliaHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  story_text?: string | null;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

export function hitToItem(hit: AlgoliaHit): RawNewsItem | null {
  if (!hit.title) return null;
  const discussionUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
  return {
    source: "hackernews",
    externalId: hit.objectID,
    url: hit.url || discussionUrl,
    targetUrl: hit.url || discussionUrl,
    title: cleanTitle(hit.title),
    snippet: hit.story_text ? truncate(htmlToText(hit.story_text), 400) : undefined,
    author: hit.author,
    sourceName: "Hacker News",
    publishedAt: new Date(hit.created_at_i * 1000),
    engagement: hit.points ?? 0,
    comments: hit.num_comments ?? 0,
    discussionUrl,
  };
}

export const hackerNewsSource: NewsSource = {
  id: "hackernews",
  disabledReason: () => null,

  async fetch(topic, { signal, since }) {
    const throttle = createIntervalThrottle(250);
    const matches = createKeywordMatcher(topic.keywords);
    const byId = new Map<string, RawNewsItem>();
    const errors: string[] = [];

    for (const query of topic.hackerNews.queries) {
      if (signal.aborted) break;
      await throttle(signal);
      const params = new URLSearchParams({
        query,
        tags: "story",
        numericFilters: `created_at_i>${Math.floor(since.getTime() / 1000)},points>=${topic.hackerNews.minPoints}`,
        hitsPerPage: "50",
      });
      try {
        const { hits } = await fetchJson<AlgoliaResponse>(`${API}?${params}`, { signal });
        for (const hit of hits) {
          const item = hitToItem(hit);
          // Algolia matches words in URLs and loose prefixes; keep only titles about the topic
          if (item && matches(item.title)) byId.set(item.externalId, item);
        }
      } catch (error) {
        errors.push(`query "${query}": ${errorMessage(error)}`);
      }
    }

    if (byId.size === 0 && errors.length === topic.hackerNews.queries.length) {
      throw new Error(`All Hacker News queries failed: ${errors[0]}`);
    }
    return { items: Array.from(byId.values()), errors };
  },
};
