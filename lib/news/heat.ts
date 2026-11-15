/**
 * Story ranking (Story 8.3)
 *
 * heat = coverage × cross-platform multiplier × recency decay
 *
 * - coverage: for each platform, the strongest item's signal (a base for being
 *   covered at all plus log-scaled engagement normalised within that platform,
 *   since 100 HN points ≠ 100 GitHub stars), plus a small bonus for extra items.
 * - multiplier: stories picked up on several platforms, or by several outlets,
 *   are what "breaking" means, so each extra platform/outlet boosts the score.
 * - decay: halves every NEWS_HEAT_HALF_LIFE_HOURS (default 8) since the story's
 *   latest activity, so stories that keep getting coverage stay near the top.
 */

import type { NewsSourceId } from "./types";

export interface HeatItem {
  source: NewsSourceId;
  sourceName: string;
  engagement: number;
  /** When the item happened (publication time; first-seen time for new GitHub repos) */
  at: Date;
}

/** Engagement at which an item counts as "big" on its platform (p90-ish defaults) */
export const ENGAGEMENT_REFERENCE: Record<NewsSourceId, number> = {
  hackernews: 300,
  reddit: 800,
  github: 2000,
  rss: 1,
  x: 1,
};

const BASE_SIGNAL = 0.4;
const EXTRA_ITEM_BONUS = 0.1;
const MAX_EXTRA_ITEMS = 6;
const PLATFORM_BOOST = 0.6;
const OUTLET_BOOST = 0.25;
const MAX_OUTLET_BOOSTS = 4;

export const BREAKING_RECENT_HOURS = 6;

export function halfLifeHours(): number {
  return Number(process.env.NEWS_HEAT_HALF_LIFE_HOURS) || 8;
}

/** Engagement normalised within its platform: 0 (none) … ~1 (big) … capped at 1.5 */
export function normalizedEngagement(source: NewsSourceId, engagement: number, reference = ENGAGEMENT_REFERENCE): number {
  if (engagement <= 0) return 0;
  return Math.min(1.5, Math.log1p(engagement) / Math.log1p(reference[source]));
}

export interface StoryStats {
  heat: number;
  itemCount: number;
  platforms: NewsSourceId[];
  outlets: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  /** ≥2 platforms, or ≥3 distinct outlets/communities, within the last few hours */
  crossPlatformRecent: boolean;
}

export function computeStoryStats(items: HeatItem[], now: Date = new Date()): StoryStats {
  if (items.length === 0) throw new Error("computeStoryStats needs at least one item");

  const bestByPlatform = new Map<NewsSourceId, number>();
  items.forEach((item) => {
    const signal = BASE_SIGNAL + normalizedEngagement(item.source, item.engagement);
    bestByPlatform.set(item.source, Math.max(bestByPlatform.get(item.source) ?? 0, signal));
  });
  const platforms = Array.from(bestByPlatform.keys());
  const extraItems = Math.min(MAX_EXTRA_ITEMS, items.length - platforms.length);
  const coverage = Array.from(bestByPlatform.values()).reduce((a, b) => a + b, 0) + EXTRA_ITEM_BONUS * extraItems;

  // Distinct outlets and communities (e.g. two newspapers, two subreddits)
  const outlets = new Set(items.map((i) => `${i.source}:${i.sourceName.toLowerCase()}`)).size;
  const extraOutlets = Math.min(MAX_OUTLET_BOOSTS, Math.max(0, outlets - platforms.length));
  const multiplier = 1 + PLATFORM_BOOST * (platforms.length - 1) + OUTLET_BOOST * extraOutlets;

  const times = items.map((i) => i.at.getTime());
  const firstSeenAt = new Date(Math.min(...times));
  const lastSeenAt = new Date(Math.min(now.getTime(), Math.max(...times)));
  const ageHours = Math.max(0, (now.getTime() - lastSeenAt.getTime()) / 3_600_000);
  const decay = Math.pow(0.5, ageHours / halfLifeHours());

  const recentCutoff = now.getTime() - BREAKING_RECENT_HOURS * 3_600_000;
  const recent = items.filter((i) => i.at.getTime() >= recentCutoff);
  const recentPlatforms = new Set(recent.map((i) => i.source)).size;
  const recentOutlets = new Set(recent.map((i) => `${i.source}:${i.sourceName.toLowerCase()}`)).size;

  return {
    heat: Math.round(coverage * multiplier * decay * 1000) / 100,
    itemCount: items.length,
    platforms,
    outlets,
    firstSeenAt,
    lastSeenAt,
    crossPlatformRecent: recentPlatforms >= 2 || recentOutlets >= 3,
  };
}

/**
 * Breaking = picked up across platforms recently, or one of the few hottest
 * stories that is still fresh.
 */
export function markBreaking<T extends { id: string; stats: StoryStats }>(
  stories: T[],
  now: Date = new Date(),
  topN = 5
): Set<string> {
  const breaking = new Set<string>();
  const freshCutoff = now.getTime() - 12 * 3_600_000;
  const ranked = [...stories].sort((a, b) => b.stats.heat - a.stats.heat);
  const topIds = new Set(
    ranked
      .filter((s) => s.stats.firstSeenAt.getTime() >= freshCutoff && s.stats.itemCount >= 2)
      .slice(0, topN)
      .map((s) => s.id)
  );
  stories.forEach((s) => {
    if (s.stats.crossPlatformRecent || topIds.has(s.id)) breaking.add(s.id);
  });
  return breaking;
}
