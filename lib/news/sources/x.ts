/**
 * X (Twitter) through an RSS proxy.
 *
 * X's API has no free read access, so posts are read from an RSS bridge such
 * as a self-hosted RSSHub (https://docs.rsshub.app/routes/social-media#x-twitter)
 * or a Nitter instance. Configure the feed URL with a {user} placeholder:
 *
 *   X_RSS_URL_TEMPLATE=http://localhost:1200/twitter/user/{user}
 *   X_RSS_URL_TEMPLATE=https://nitter.example.com/{user}/rss
 *
 * X_ACCOUNTS (comma separated) overrides the topic's default accounts.
 * Scraping X violates its terms of service and public bridges come and go, so
 * this source is off unless configured and its failures never affect others.
 */

import { mapWithConcurrency } from "@/lib/jobs/rate-limit";
import { parse } from "node-html-parser";
import { parseFeed, type FeedEntry } from "../feed-parser";
import { fetchText } from "../http";
import { canonicalizeUrl, cleanTitle, htmlToText, hostOf, truncate } from "../normalize";
import type { RawNewsItem } from "../types";
import { errorMessage, type NewsSource } from "./types";

function accounts(defaults: string[]): string[] {
  const override = (process.env.X_ACCOUNTS || "")
    .split(",")
    .map((a) => a.trim().replace(/^@/, ""))
    .filter(Boolean);
  return override.length ? override : defaults;
}

/** Status id from an x.com / twitter.com / nitter status URL */
function statusId(url: string): string | null {
  const match = url.match(/\/status(?:es)?\/(\d+)/);
  return match ? match[1] : null;
}

const X_HOSTS = /(^|\.)(x\.com|twitter\.com|t\.co)$/;

export function tweetToItem(entry: FeedEntry, account: string, bridgeHost: string | null): RawNewsItem | null {
  const id = statusId(entry.link) ?? statusId(entry.id);
  if (!id) return null;
  const text = htmlToText(entry.content) || cleanTitle(entry.title);
  if (!text || /^RT by @/i.test(entry.title)) return null; // retweets are someone else's news

  // The first outbound link (not X itself or the bridge) is what the tweet is about
  const outbound = parse(entry.content || "")
    .querySelectorAll("a")
    .map((a) => a.getAttribute("href") || "")
    .find((href) => {
      const host = hostOf(href);
      return host !== null && !X_HOSTS.test(host) && host !== bridgeHost;
    });

  const url = `https://x.com/${account}/status/${id}`;
  return {
    source: "x",
    externalId: id,
    url,
    targetUrl: outbound ? canonicalizeUrl(outbound) : url,
    title: truncate(text, 200),
    snippet: text.length > 200 ? truncate(text, 600) : undefined,
    author: account,
    sourceName: `@${account}`,
    publishedAt: entry.published ?? new Date(),
    engagement: 0,
    comments: 0,
  };
}

export const xSource: NewsSource = {
  id: "x",
  disabledReason: () =>
    process.env.X_RSS_URL_TEMPLATE?.includes("{user}")
      ? null
      : "set X_RSS_URL_TEMPLATE (an RSSHub or Nitter feed URL containing {user}) to enable X",

  async fetch(topic, { signal, since }) {
    const template = process.env.X_RSS_URL_TEMPLATE!;
    const bridgeHost = hostOf(template.replace("{user}", "x"));
    const list = accounts(topic.x.accounts);
    const errors: string[] = [];

    const results = await mapWithConcurrency(
      list,
      2,
      async (account) => {
        try {
          const xml = await fetchText(template.replace("{user}", encodeURIComponent(account)), { signal });
          return parseFeed(xml)
            .entries.map((e) => tweetToItem(e, account, bridgeHost))
            .filter((i): i is RawNewsItem => i !== null && i.publishedAt >= since);
        } catch (error) {
          errors.push(`@${account}: ${errorMessage(error)}`);
          return [];
        }
      },
      () => signal.aborted
    );

    const items = results.flatMap((r) => (r?.status === "fulfilled" ? r.value : []));
    if (items.length === 0 && errors.length === list.length) {
      throw new Error(`X bridge unavailable: ${errors[0]}`);
    }
    return { items, errors };
  },
};
