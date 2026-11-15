/**
 * GitHub: fast-rising new repositories (Search API) and releases of watched
 * projects (release Atom feeds). GITHUB_TOKEN is optional; unauthenticated
 * search allows 10 requests/minute, which is enough for a 15-minute schedule.
 */

import { createIntervalThrottle } from "@/lib/jobs/rate-limit";
import { parseFeed } from "../feed-parser";
import { fetchJson, fetchText } from "../http";
import { cleanTitle, htmlToText, truncate } from "../normalize";
import type { RawNewsItem } from "../types";
import { errorMessage, type NewsSource } from "./types";

interface Repo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  pushed_at: string;
  owner: { login: string };
}

/** Build/nightly/pre-release tags (llama.cpp "b11242", pytorch "trunk/<sha>", "-rc1") aren't news */
const NOISY_TAG = /^(b\d+$|trunk\/|nightly|ciflow\/)|(\d|[-.])(rc|alpha|beta|dev|pre)\.?\d*$/i;

export function isNewsworthyRelease(tag: string): boolean {
  return !NOISY_TAG.test(tag);
}

/** New repos are considered for this long; heat decays from the repo's creation */
const REPO_WINDOW_DAYS = 3;

/** Tag of a release from its URL (tags can contain slashes, e.g. "trunk/<sha>") */
export function releaseTag(link: string, fallback: string): string {
  const match = link.match(/\/releases\/tag\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : fallback;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export function repoToItem(repo: Repo): RawNewsItem {
  return {
    source: "github",
    externalId: `repo:${repo.full_name.toLowerCase()}`,
    url: repo.html_url,
    title: repo.description ? `${repo.full_name}: ${cleanTitle(repo.description)}` : repo.full_name,
    snippet: repo.description ? truncate(cleanTitle(repo.description), 400) : undefined,
    author: repo.owner.login,
    sourceName: "GitHub",
    publishedAt: new Date(repo.created_at),
    engagement: repo.stargazers_count,
    comments: 0,
  };
}

export const githubSource: NewsSource = {
  id: "github",
  disabledReason: () => null,

  async fetch(topic, { signal, since }) {
    const throttle = createIntervalThrottle(process.env.GITHUB_TOKEN ? 300 : 2500);
    const items = new Map<string, RawNewsItem>();
    const errors: string[] = [];
    const { searchTopics, minStars, watchedRepos } = topic.github;

    const createdAfter = new Date(Date.now() - REPO_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
    for (const searchTopic of searchTopics) {
      if (signal.aborted) break;
      await throttle(signal);
      const q = `topic:${searchTopic} created:>${createdAfter} stars:>=${minStars}`;
      try {
        const result = await fetchJson<{ items: Repo[] }>(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=20`,
          { signal, headers: headers() }
        );
        result.items.forEach((repo) => items.set(`repo:${repo.full_name.toLowerCase()}`, repoToItem(repo)));
      } catch (error) {
        errors.push(`search ${searchTopic}: ${errorMessage(error)}`);
      }
    }

    for (const repo of watchedRepos) {
      if (signal.aborted) break;
      await throttle(signal);
      try {
        const feed = parseFeed(await fetchText(`https://github.com/${repo}/releases.atom`, { signal }));
        // Only the newest newsworthy release per repo (feeds are newest first)
        const fresh = feed.entries
          .filter((e) => e.published && e.published >= since)
          .filter((e) => isNewsworthyRelease(releaseTag(e.link, e.title)))
          .slice(0, 1);
        if (fresh.length === 0) continue;

        // Releases carry no engagement; use the repository's stars
        let stars = 0;
        try {
          stars = (await fetchJson<Repo>(`https://api.github.com/repos/${repo}`, { signal, headers: headers() }))
            .stargazers_count;
        } catch {
          /* stars are optional */
        }
        for (const entry of fresh) {
          const tag = releaseTag(entry.link, entry.title);
          items.set(`release:${repo}@${tag}`, {
            source: "github",
            externalId: `release:${repo.toLowerCase()}@${tag}`,
            url: entry.link,
            title: `${repo} ${cleanTitle(entry.title)} released`,
            snippet: truncate(htmlToText(entry.content), 400) || undefined,
            content: truncate(htmlToText(entry.content), 8000) || undefined,
            author: repo.split("/")[0],
            sourceName: "GitHub",
            publishedAt: entry.published!,
            engagement: stars,
            comments: 0,
          });
        }
      } catch (error) {
        errors.push(`releases ${repo}: ${errorMessage(error)}`);
      }
    }

    if (items.size === 0 && errors.length === searchTopics.length + watchedRepos.length) {
      throw new Error(`All GitHub requests failed: ${errors[0]}`);
    }
    return { items: Array.from(items.values()), errors };
  },
};
