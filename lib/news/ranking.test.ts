import { describe, it, expect, beforeEach } from "vitest";
import { assignToStory, clusterThreshold, planMerges, updateCentroid } from "./clustering";
import { computeStoryStats, markBreaking, normalizedEngagement, type HeatItem } from "./heat";
import { localEmbedding } from "@/lib/rag/embeddings";

const NOW = new Date("2026-09-29T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

beforeEach(() => {
  delete process.env.NEWS_CLUSTER_THRESHOLD;
  delete process.env.NEWS_HEAT_HALF_LIFE_HOURS;
});

describe("heat", () => {
  const item = (overrides: Partial<HeatItem>): HeatItem => ({
    source: "rss",
    sourceName: "TechCrunch",
    engagement: 0,
    at: hoursAgo(1),
    ...overrides,
  });

  it("normalises engagement within each platform", () => {
    expect(normalizedEngagement("hackernews", 0)).toBe(0);
    expect(normalizedEngagement("hackernews", 300)).toBeCloseTo(1);
    expect(normalizedEngagement("github", 300)).toBeLessThan(normalizedEngagement("hackernews", 300));
    expect(normalizedEngagement("reddit", 1e9)).toBe(1.5);
  });

  it("ranks cross-platform coverage above a single post with the same engagement", () => {
    const single = computeStoryStats([item({ source: "hackernews", sourceName: "Hacker News", engagement: 300 })], NOW);
    const cross = computeStoryStats(
      [
        item({ source: "hackernews", sourceName: "Hacker News", engagement: 300 }),
        item({ source: "reddit", sourceName: "r/OpenAI", engagement: 0 }),
        item({ source: "rss", sourceName: "Reuters" }),
      ],
      NOW
    );
    expect(cross.heat).toBeGreaterThan(single.heat * 2);
    expect(cross.platforms.sort()).toEqual(["hackernews", "reddit", "rss"]);
    expect(cross.crossPlatformRecent).toBe(true);
    expect(single.crossPlatformRecent).toBe(false);
  });

  it("counts several outlets on one platform as breaking coverage", () => {
    const stats = computeStoryStats(
      [item({ sourceName: "Reuters" }), item({ sourceName: "WSJ" }), item({ sourceName: "CNBC" })],
      NOW
    );
    expect(stats.outlets).toBe(3);
    expect(stats.crossPlatformRecent).toBe(true);
  });

  it("halves heat every half-life since the latest activity", () => {
    const fresh = computeStoryStats([item({ at: hoursAgo(0) })], NOW);
    const old = computeStoryStats([item({ at: hoursAgo(8) })], NOW);
    expect(old.heat).toBeCloseTo(fresh.heat / 2, 1);
    // New coverage keeps a story hot
    const revived = computeStoryStats([item({ at: hoursAgo(30) }), item({ sourceName: "WSJ", at: hoursAgo(0) })], NOW);
    expect(revived.firstSeenAt).toEqual(hoursAgo(30));
    expect(revived.lastSeenAt).toEqual(NOW);
    expect(revived.heat).toBeGreaterThan(fresh.heat);
  });

  it("marks recent cross-platform stories and the hottest fresh multi-item stories as breaking", () => {
    const story = (id: string, items: HeatItem[]) => ({ id, stats: computeStoryStats(items, NOW) });
    const stories = [
      story("cross", [item({ source: "hackernews", sourceName: "Hacker News" }), item({ source: "reddit", sourceName: "r/x" })]),
      story("hot-pair", [item({ source: "github", sourceName: "GitHub", engagement: 5000 }), item({ source: "github", sourceName: "GitHub", engagement: 4000 })]),
      story("single", [item({ source: "hackernews", sourceName: "Hacker News", engagement: 900 })]),
      story("stale-cross", [
        item({ source: "hackernews", sourceName: "Hacker News", at: hoursAgo(20) }),
        item({ source: "reddit", sourceName: "r/x", at: hoursAgo(20) }),
      ]),
    ];
    const breaking = markBreaking(stories, NOW, 1);
    expect(Array.from(breaking).sort()).toEqual(["cross", "hot-pair"]);
  });
});

describe("clustering", () => {
  const vec = (text: string) => localEmbedding(text);
  const story = (id: string, title: string, lastSeenAt = hoursAgo(1)) => ({
    id,
    centroid: vec(title),
    itemCount: 1,
    lastSeenAt,
    firstSeenAt: lastSeenAt,
  });

  it("uses per-model default thresholds unless overridden", () => {
    expect(clusterThreshold("local-hash-v1")).toBe(0.4);
    expect(clusterThreshold("text-embedding-3-small")).toBe(0.62);
    process.env.NEWS_CLUSTER_THRESHOLD = "0.5";
    expect(clusterThreshold("local-hash-v1")).toBe(0.5);
  });

  it("joins a story with the same canonical URL first", () => {
    const result = assignToStory(
      { canonicalUrl: "https://example.com/a", vector: vec("anything"), publishedAt: NOW },
      [story("s1", "unrelated")],
      new Map([["https://example.com/a", "s2"]]),
      0.4
    );
    expect(result).toEqual({ kind: "url", storyId: "s2" });
  });

  it("joins the most similar recent story above the threshold, else starts a new one", () => {
    const stories = [
      story("openai", "OpenAI scraps release of new AI model over safety concerns"),
      story("amd", "AMD will acquire World Labs for $8.2 billion"),
    ];
    const similar = assignToStory(
      { canonicalUrl: "u1", vector: vec("OpenAI shelves new AI model release over safety concerns"), publishedAt: NOW },
      stories,
      new Map(),
      0.4
    );
    expect(similar).toMatchObject({ kind: "similar", storyId: "openai" });

    const unrelated = assignToStory(
      { canonicalUrl: "u2", vector: vec("Nvidia launches a platform for rogue agents"), publishedAt: NOW },
      stories,
      new Map(),
      0.4
    );
    expect(unrelated).toEqual({ kind: "new" });
  });

  it("ignores stories outside the clustering window", () => {
    const result = assignToStory(
      { canonicalUrl: "u", vector: vec("OpenAI scraps release of new AI model over safety concerns"), publishedAt: NOW },
      [story("old", "OpenAI scraps release of new AI model over safety concerns", hoursAgo(72))],
      new Map(),
      0.4
    );
    expect(result).toEqual({ kind: "new" });
  });

  it("keeps a running mean centroid", () => {
    expect(Array.from(updateCentroid([1, 0], 1, [0, 1]))).toEqual([0.5, 0.5]);
    Array.from(updateCentroid([0.5, 0.5], 2, [1, 1])).forEach((v) => expect(v).toBeCloseTo(2 / 3, 6));
  });

  it("plans merges of split stories into the largest", () => {
    const big = { ...story("big", "OpenAI scraps release of new AI model over safety concerns"), itemCount: 10 };
    const split = story("split", "OpenAI shelves new AI model release over safety concerns");
    const other = story("other", "AMD will acquire World Labs for $8.2 billion");
    const oldSplit = story("old", "OpenAI scraps release of new AI model over safety concerns", hoursAgo(100));
    expect(planMerges([split, other, big, oldSplit], 0.4)).toEqual([["big", "split"]]);
    expect(big.itemCount).toBe(11);
  });
});
