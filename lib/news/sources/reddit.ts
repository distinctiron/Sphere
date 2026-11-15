/**
 * Reddit: today's top posts of the topic's subreddits.
 *
 * - With REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET (a free "script" app at
 *   https://www.reddit.com/prefs/apps) the OAuth JSON API is used: it includes
 *   upvotes and comment counts and allows ~100 requests/minute.
 * - Without credentials the public Atom feeds are used. Reddit blocks
 *   unauthenticated JSON and rate-limits feeds hard (about one request every
 *   few seconds), and feeds carry no scores, so engagement is 0 and Reddit
 *   posts rank on recency and cross-source coverage only.
 */

import { parseFeed } from "../feed-parser";
import { fetchJson, fetchText, NEWS_USER_AGENT } from "../http";
import { cleanTitle, decodeEntities, htmlToText, truncate } from "../normalize";
import type { RawNewsItem } from "../types";
import type { NewsSource } from "./types";
import { parse } from "node-html-parser";

interface RedditPost {
  id: string;
  name: string;
  title: string;
  url: string;
  permalink: string;
  is_self: boolean;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  stickied: boolean;
  over_18: boolean;
}

interface Listing {
  data: { children: Array<{ data: RedditPost }> };
}

let token: { value: string; expiresAt: number } | null = null;

function credentials() {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

function userAgent(): string {
  return process.env.REDDIT_USER_AGENT || NEWS_USER_AGENT;
}

async function getToken(signal: AbortSignal): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const creds = credentials()!;
  const response = await fetchJson<{ access_token: string; expires_in: number }>(
    "https://www.reddit.com/api/v1/access_token",
    {
      signal,
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${Buffer.from(`${creds.id}:${creds.secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent(),
      },
    }
  );
  token = { value: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 };
  return token.value;
}

export function postToItem(post: RedditPost): RawNewsItem {
  const permalink = `https://www.reddit.com${post.permalink}`;
  return {
    source: "reddit",
    externalId: post.name,
    url: permalink,
    targetUrl: post.is_self ? permalink : decodeEntities(post.url),
    title: cleanTitle(post.title),
    snippet: post.selftext ? truncate(post.selftext.replace(/\s+/g, " ").trim(), 400) : undefined,
    content: post.selftext.length > 400 ? truncate(post.selftext.trim(), 8000) : undefined,
    author: post.author,
    sourceName: `r/${post.subreddit}`,
    publishedAt: new Date(post.created_utc * 1000),
    engagement: post.score,
    comments: post.num_comments,
    discussionUrl: permalink,
  };
}

/**
 * Parses a (multi-)subreddit Atom feed. The link target is the "[link]"
 * anchor in the content; the subreddit is the entry's category.
 */
export function parseSubredditFeed(xml: string, fallbackSubreddit: string): RawNewsItem[] {
  return parseFeed(xml).entries.map((entry) => {
    const root = parse(entry.content || "");
    const linkAnchor = root.querySelectorAll("a").find((a) => a.textContent.trim() === "[link]");
    const target = linkAnchor?.getAttribute("href");
    const body = root.querySelector(".md");
    const isSelf = !target || target === entry.link;
    const subreddit = entry.categories[0] ?? entry.link.match(/\/r\/([^/]+)/)?.[1] ?? fallbackSubreddit;
    return {
      source: "reddit" as const,
      externalId: entry.id,
      url: entry.link,
      targetUrl: isSelf || /^https:\/\/(i|v|preview)\.redd\.it\//.test(target!) ? entry.link : decodeEntities(target!),
      title: cleanTitle(entry.title),
      snippet: body ? truncate(htmlToText(body.innerHTML), 400) || undefined : undefined,
      author: entry.author?.replace(/^\/u\//, ""),
      sourceName: `r/${subreddit}`,
      publishedAt: entry.published ?? new Date(),
      engagement: 0,
      comments: 0,
      discussionUrl: entry.link,
    };
  });
}

export const redditSource: NewsSource = {
  id: "reddit",
  disabledReason: () => null,

  // One request for all subreddits (a "multireddit"): unauthenticated feeds
  // allow only about one request per minute
  async fetch(topic, { signal, since, logger }) {
    const { subreddits, perSubreddit } = topic.reddit;
    const multi = subreddits.join("+");
    const limit = Math.min(100, perSubreddit * subreddits.length);
    let items: RawNewsItem[];

    if (credentials()) {
      const listing = await fetchJson<Listing>(`https://oauth.reddit.com/r/${multi}/top?t=day&limit=${limit}&raw_json=1`, {
        signal,
        headers: { Authorization: `Bearer ${await getToken(signal)}`, "User-Agent": userAgent() },
      });
      items = listing.data.children
        .map((c) => c.data)
        .filter((p) => !p.stickied && !p.over_18)
        .map(postToItem);
    } else {
      const xml = await fetchText(`https://www.reddit.com/r/${multi}/top/.rss?t=day&limit=${limit}`, {
        signal,
        headers: { "User-Agent": userAgent() },
        maxRetryWaitMs: 65_000,
      });
      items = parseSubredditFeed(xml, subreddits[0]);
      logger.info("reddit: using public feeds (no scores); set REDDIT_CLIENT_ID/SECRET for upvotes");
    }
    return { items: items.filter((i) => i.publishedAt >= since), errors: [] };
  },
};
