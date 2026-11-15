/**
 * Item content for story articles (Story 8.6)
 *
 * Articles are grounded in what the sources actually say, not just headlines:
 * - outlets / blogs / linked pages: the main article text of the page
 * - Hacker News: the linked article plus the top comments
 * - Reddit: the post text plus the top comments
 * - GitHub: the README (repos) or release notes (stored at fetch time)
 * - X: the post text plus the linked article
 * Content is fetched lazily when an article is generated and cached on the
 * item; failures fall back to the snippet.
 */

import { parse, type HTMLElement } from "node-html-parser";
import { db } from "@/lib/db";
import { mapWithConcurrency } from "@/lib/jobs/rate-limit";
import { parseFeed } from "./feed-parser";
import { fetchJson, fetchResponse, NEWS_USER_AGENT } from "./http";
import { canonicalizeUrl, decodeEntities, hostOf, htmlToText, truncate } from "./normalize";

export const MAX_CONTENT_CHARS = 8000;
const MAX_COMMENTS = 6;
const MAX_COMMENT_CHARS = 500;
const FETCH_TIMEOUT_MS = 10_000;
/** Pages that can't be fetched meaningfully (JS redirects, logins, media) */
const UNFETCHABLE_HOSTS = /(^|\.)(news\.google\.com|x\.com|twitter\.com|t\.co|youtube\.com|youtu\.be|i\.redd\.it|v\.redd\.it|linkedin\.com|facebook\.com|instagram\.com)$/;

const BOILERPLATE_SELECTORS =
  "script, style, noscript, nav, header, footer, aside, form, iframe, svg, figure, button, [role=navigation], [role=banner], [role=contentinfo], .advert, .ad, .ads, .newsletter, .related, .share, .social, .comments, .subscribe";

/** Main text of an article page: <article>/<main> or the densest block of paragraphs */
export function extractArticleText(html: string, maxChars = MAX_CONTENT_CHARS): string {
  const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false, pre: true } });
  root.querySelectorAll(BOILERPLATE_SELECTORS).forEach((el) => el.remove());

  const paragraphsOf = (el: HTMLElement) =>
    el
      .querySelectorAll("p, h2, h3, li, blockquote, pre")
      .map((p) => decodeEntities(p.textContent).replace(/\s+/g, " ").trim())
      .filter((t) => t.length >= 40 || /^#|^\d+\./.test(t));

  // The most specific container with a real amount of text, else the whole page
  const specific = [...root.querySelectorAll("article"), ...root.querySelectorAll("main")]
    .map(paragraphsOf)
    .sort((a, b) => b.join(" ").length - a.join(" ").length)[0];
  const best = specific && specific.join(" ").length >= 400 ? specific : paragraphsOf(root);
  // Nested elements (li inside blockquote, ...) can repeat text
  const unique = best.filter((p, i) => best.indexOf(p) === i);
  return truncate(unique.join("\n\n"), maxChars);
}

async function fetchPageText(url: string, signal?: AbortSignal): Promise<string | null> {
  const host = hostOf(url);
  if (!host || UNFETCHABLE_HOSTS.test(host)) return null;
  try {
    const response = await fetchResponse(url, {
      signal,
      timeoutMs: FETCH_TIMEOUT_MS,
      maxRetryWaitMs: 0,
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": `Mozilla/5.0 (compatible; ${NEWS_USER_AGENT})` },
    });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("html")) {
      await response.body?.cancel();
      return null;
    }
    const text = extractArticleText(await response.text());
    return text.length >= 200 ? text : null;
  } catch {
    return null;
  }
}

interface HnNode {
  text?: string | null;
  author?: string | null;
  children?: HnNode[];
}

async function hackerNewsComments(itemId: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const item = await fetchJson<HnNode>(`https://hn.algolia.com/api/v1/items/${itemId}`, { signal, timeoutMs: FETCH_TIMEOUT_MS });
    return (item.children ?? [])
      .filter((c) => c.text)
      .slice(0, MAX_COMMENTS)
      .map((c) => truncate(htmlToText(c.text!), MAX_COMMENT_CHARS));
  } catch {
    return [];
  }
}

async function redditComments(permalink: string, signal?: AbortSignal): Promise<string[]> {
  try {
    const url = `${permalink.replace(/\/$/, "")}/.rss?sort=top&limit=${MAX_COMMENTS + 1}`;
    const response = await fetchResponse(url, { signal, timeoutMs: FETCH_TIMEOUT_MS, maxRetryWaitMs: 5000 });
    // The first entry is the post itself
    return parseFeed(await response.text())
      .entries.slice(1, MAX_COMMENTS + 1)
      .map((e) => truncate(htmlToText(e.content), MAX_COMMENT_CHARS))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function githubReadme(repoUrl: string, signal?: AbortSignal): Promise<string | null> {
  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  if (!match) return null;
  try {
    const headers: Record<string, string> = { Accept: "application/vnd.github.raw+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetchResponse(`https://api.github.com/repos/${match[1]}/readme`, {
      signal,
      timeoutMs: FETCH_TIMEOUT_MS,
      headers,
    });
    const markdown = await response.text();
    // Strip images, badges and HTML; keep the prose
    const text = markdown
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return truncate(text, MAX_CONTENT_CHARS);
  } catch {
    return null;
  }
}

export interface ContentItem {
  id: string;
  source: string;
  externalId: string;
  url: string;
  canonicalUrl: string;
  discussionUrl: string | null;
  snippet: string | null;
  content: string | null;
  contentFetchedAt: Date | null;
}

function withComments(body: string | null, comments: string[], label: string): string | null {
  const parts: string[] = [];
  if (body) parts.push(body);
  if (comments.length > 0) parts.push(`${label}:\n${comments.map((c) => `- ${c}`).join("\n")}`);
  return parts.length ? truncate(parts.join("\n\n"), MAX_CONTENT_CHARS) : null;
}

/** Builds the grounding text for one item (network access; never throws) */
export async function fetchItemContent(item: ContentItem, signal?: AbortSignal): Promise<string | null> {
  const linked = item.canonicalUrl !== canonicalizeUrl(item.url) || item.source === "rss";
  switch (item.source) {
    case "hackernews": {
      const [article, comments] = await Promise.all([
        item.canonicalUrl.includes("news.ycombinator.com") ? Promise.resolve(item.snippet) : fetchPageText(item.canonicalUrl, signal),
        hackerNewsComments(item.externalId, signal),
      ]);
      return withComments(article, comments, "Top Hacker News comments");
    }
    case "reddit": {
      const [article, comments] = await Promise.all([
        linked ? fetchPageText(item.canonicalUrl, signal) : Promise.resolve(null),
        item.discussionUrl ? redditComments(item.discussionUrl, signal) : Promise.resolve([]),
      ]);
      const body = [item.content ?? item.snippet, article].filter(Boolean).join("\n\nLinked article:\n");
      return withComments(body || null, comments, "Top Reddit comments");
    }
    case "github":
      return item.content ?? (item.externalId.startsWith("repo:") ? await githubReadme(item.url, signal) : null);
    case "x": {
      const article = linked ? await fetchPageText(item.canonicalUrl, signal) : null;
      return article ? `${item.snippet ?? ""}\n\nLinked article:\n${article}`.trim() : null;
    }
    default:
      return item.content ?? (await fetchPageText(item.url, signal));
  }
}

/**
 * Makes sure the given items have content, fetching what's missing (bounded
 * concurrency, overall time budget). Returns content by item id; items whose
 * fetch failed map to their snippet.
 */
export async function ensureItemContent(items: ContentItem[], budgetMs = 15_000): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  const missing = items.filter((i) => !i.contentFetchedAt);
  items.filter((i) => i.contentFetchedAt).forEach((i) => result.set(i.id, i.content ?? i.snippet));

  const signal = AbortSignal.timeout(budgetMs);
  await mapWithConcurrency(
    missing,
    4,
    async (item) => {
      const content = await fetchItemContent(item, signal);
      result.set(item.id, content ?? item.snippet);
      await db.newsItem.update({
        where: { id: item.id },
        data: { content: content ?? null, contentFetchedAt: new Date() },
      });
    },
    () => signal.aborted
  );
  missing.filter((i) => !result.has(i.id)).forEach((i) => result.set(i.id, i.snippet));
  return result;
}
