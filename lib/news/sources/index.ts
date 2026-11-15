import type { NewsSourceId } from "../types";
import { githubSource } from "./github";
import { hackerNewsSource } from "./hackernews";
import { redditSource } from "./reddit";
import { rssSource } from "./rss";
import type { NewsSource } from "./types";
import { xSource } from "./x";

export const NEWS_SOURCES: NewsSource[] = [hackerNewsSource, redditSource, githubSource, rssSource, xSource];

/** DISABLED_NEWS_SOURCES=reddit,x turns sources off */
export function disabledNewsSources(): Set<NewsSourceId> {
  return new Set(
    (process.env.DISABLED_NEWS_SOURCES || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) as NewsSourceId[]
  );
}

/** Sources that will run, and why the others won't */
export function resolveSources(): { enabled: NewsSource[]; skipped: Record<string, string> } {
  const disabled = disabledNewsSources();
  const enabled: NewsSource[] = [];
  const skipped: Record<string, string> = {};
  for (const source of NEWS_SOURCES) {
    const reason = disabled.has(source.id) ? "disabled via DISABLED_NEWS_SOURCES" : source.disabledReason();
    if (reason) skipped[source.id] = reason;
    else enabled.push(source);
  }
  return { enabled, skipped };
}

export type { NewsSource, SourceContext, SourceResult } from "./types";
