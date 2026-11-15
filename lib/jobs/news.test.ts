import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    newsItem: { findMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
    newsStory: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/llm", () => ({
  isLLMConfigured: vi.fn(() => true),
  summarizeStory: vi.fn(),
}));

vi.mock("@/lib/news/article", () => ({
  isArticleStale: vi.fn(() => true),
  streamStoryArticle: vi.fn(async () => "generated"),
}));

vi.mock("@/lib/news/sources", () => ({
  resolveSources: vi.fn(),
}));

import { db } from "@/lib/db";
import { isLLMConfigured, summarizeStory } from "@/lib/llm";
import { streamStoryArticle } from "@/lib/news/article";
import { resolveSources } from "@/lib/news/sources";
import type { RawNewsItem } from "@/lib/news/types";
import { getPipelineSchedules } from "./config";
import { newsFetchJob, outletArticleKey, upsertNewsItems } from "./news-fetch";
import { newsSummarizeJob } from "./news-summarize";
import { PIPELINES } from "./registry";

const mockDb = vi.mocked(db, true);

const ctx = () => ({
  runId: "run-1",
  trigger: "cli" as const,
  signal: new AbortController().signal,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
});

function raw(overrides: Partial<RawNewsItem>): RawNewsItem {
  return {
    source: "hackernews",
    externalId: "1",
    url: "https://example.com/a?utm_source=hn",
    title: "Title",
    sourceName: "Hacker News",
    publishedAt: new Date("2026-09-29T10:00:00Z"),
    engagement: 10,
    comments: 1,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isLLMConfigured).mockReturnValue(true);
  mockDb.newsItem.createMany.mockImplementation((async ({ data }: { data: unknown[] }) => ({ count: data.length })) as never);
});

describe("upsertNewsItems", () => {
  it("creates new items with canonical URLs, de-duplicating the batch", async () => {
    mockDb.newsItem.findMany.mockResolvedValue([] as never);
    const stats = await upsertNewsItems([raw({}), raw({}), raw({ externalId: "2", targetUrl: "https://www.target.com/x/" })], "ai");

    expect(stats).toEqual({ created: 2, updated: 0, unchanged: 0, duplicates: 0 });
    const data = (mockDb.newsItem.createMany.mock.calls[0][0] as { data: Array<{ canonicalUrl: string }> }).data;
    expect(data.map((d) => d.canonicalUrl)).toEqual(["https://example.com/a", "https://target.com/x"]);
  });

  it("refreshes engagement of known items but never lowers it", async () => {
    mockDb.newsItem.findMany
      .mockResolvedValueOnce([] as never) // known outlet articles
      .mockResolvedValueOnce([
        { id: "a", source: "hackernews", externalId: "1", engagement: 5, comments: 1 },
        { id: "b", source: "rss", externalId: "2", engagement: 3, comments: 0 },
        { id: "c", source: "hackernews", externalId: "3", engagement: 7, comments: 2 },
      ] as never);
    const stats = await upsertNewsItems(
      [
        raw({ externalId: "1", engagement: 50, comments: 9 }),
        raw({ source: "rss", externalId: "2", engagement: 0, comments: 0, sourceName: "TechCrunch" }),
        raw({ externalId: "3", engagement: 7, comments: 2 }),
      ],
      "ai"
    );
    expect(stats).toEqual({ created: 0, updated: 1, unchanged: 2, duplicates: 0 });
    expect(mockDb.newsItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "a" }, data: expect.objectContaining({ engagement: 50, comments: 9 }) })
    );
  });

  it("skips outlet articles already stored via another feed", async () => {
    mockDb.newsItem.findMany
      .mockResolvedValueOnce([{ sourceName: "TechCrunch", title: "OpenAI’s new model" }] as never)
      .mockResolvedValueOnce([] as never);
    const stats = await upsertNewsItems(
      [
        raw({ source: "rss", externalId: "google-news:1", sourceName: "TechCrunch", title: "OpenAI's new model" }),
        raw({ source: "rss", externalId: "verge:1", sourceName: "The Verge", title: "Other" }),
        raw({ source: "rss", externalId: "google-news:2", sourceName: "The Verge", title: "Other" }),
      ],
      "ai"
    );
    expect(stats).toMatchObject({ created: 1, duplicates: 2 });
    expect(outletArticleKey({ sourceName: "WSJ", title: "A — B!" })).toBe("wsj|ab");
  });
});

describe("news-fetch job", () => {
  it("isolates source failures and reports per-source results", async () => {
    mockDb.newsItem.findMany.mockResolvedValue([] as never);
    vi.mocked(resolveSources).mockReturnValue({
      enabled: [
        { id: "hackernews", disabledReason: () => null, fetch: async () => ({ items: [raw({})], errors: [] }) },
        { id: "reddit", disabledReason: () => null, fetch: async () => Promise.reject(new Error("HTTP 429")) },
      ],
      skipped: { x: "not configured" },
    });
    const result = await newsFetchJob.run(ctx());
    expect(result.itemsProcessed).toBe(1);
    expect(result.itemsFailed).toBe(1);
    expect(result.details).toMatchObject({
      sources: { hackernews: { fetched: 1 }, reddit: { fetched: 0, failed: "HTTP 429" } },
      skipped: { x: "not configured" },
    });
  });

  it("fails the run when every source fails", async () => {
    vi.mocked(resolveSources).mockReturnValue({
      enabled: [{ id: "rss", disabledReason: () => null, fetch: async () => Promise.reject(new Error("offline")) }],
      skipped: {},
    });
    await expect(newsFetchJob.run(ctx())).rejects.toThrow("Every news source failed");
  });
});

describe("news-summarize job", () => {
  const storyWithItems = {
    itemCount: 2,
    items: [
      { source: "rss", sourceName: "Reuters", title: "A", snippet: null, engagement: 0, comments: 0, publishedAt: new Date() },
      { source: "hackernews", sourceName: "Hacker News", title: "B", snippet: "s", engagement: 40, comments: 3, publishedAt: new Date() },
    ],
  };

  beforeEach(() => {
    mockDb.newsStory.findMany
      .mockResolvedValueOnce([
        { id: "due", itemCount: 2, summarizedItemCount: 0 },
        { id: "done", itemCount: 3, summarizedItemCount: 3 },
      ] as never)
      .mockResolvedValueOnce([] as never); // breaking stories for article pre-generation
    mockDb.newsStory.findUnique.mockResolvedValue(storyWithItems as never);
  });

  it("skips in mock mode", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(false);
    const result = await newsSummarizeJob.run(ctx());
    expect(result.details).toEqual({ skipped: "LLM not configured" });
    expect(summarizeStory).not.toHaveBeenCalled();
  });

  it("summarizes stories that are new or grew, with platform labels", async () => {
    vi.mocked(summarizeStory).mockResolvedValue({ headline: "H", summary: "S", whyItMatters: "W" });
    const result = await newsSummarizeJob.run(ctx());

    expect(result).toMatchObject({ itemsProcessed: 1, itemsFailed: 0 });
    expect(vi.mocked(summarizeStory).mock.calls[0][0].map((i) => i.platform)).toEqual(["Hacker News", "News"]);
    expect(mockDb.newsStory.update).toHaveBeenCalledWith({
      where: { id: "due" },
      data: { headline: "H", summary: "S", whyItMatters: "W", summarizedItemCount: 2, summaryError: null, summaryAttempts: 0 },
    });
  });

  it("records failures for retry", async () => {
    vi.mocked(summarizeStory).mockRejectedValue(new Error("bad output"));
    const result = await newsSummarizeJob.run(ctx());
    expect(result).toMatchObject({ itemsProcessed: 0, itemsFailed: 1 });
    expect(mockDb.newsStory.update).toHaveBeenCalledWith({
      where: { id: "due" },
      data: { summaryAttempts: { increment: 1 }, summaryError: "bad output" },
    });
  });

  it("fails fast on bad credentials without penalising stories", async () => {
    vi.mocked(summarizeStory).mockRejectedValue(Object.assign(new Error("unauthorized"), { status: 401 }));
    await expect(newsSummarizeJob.run(ctx())).rejects.toThrow("LLM authentication failed");
    expect(mockDb.newsStory.update).not.toHaveBeenCalled();
  });

  it("pre-generates articles for stale breaking stories", async () => {
    vi.mocked(summarizeStory).mockResolvedValue({ headline: "H", summary: "S", whyItMatters: "" });
    mockDb.newsStory.findMany.mockReset();
    mockDb.newsStory.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ id: "b1" }, { id: "b2" }, { id: "b3" }, { id: "b4" }] as never);
    const result = await newsSummarizeJob.run(ctx());
    expect(streamStoryArticle).toHaveBeenCalledTimes(3);
    expect(result.details).toMatchObject({ articlesGenerated: 3 });
  });
});

describe("scheduling", () => {
  it("runs papers hourly and news every 15 minutes by default", () => {
    delete process.env.NEWS_INTERVAL_MINUTES;
    delete process.env.NEWS_SCHEDULE_OFFSET_MINUTES;
    delete process.env.JOB_INTERVAL_MINUTES;
    expect(getPipelineSchedules()).toEqual([
      { pipeline: "process-papers", intervalMinutes: 60, offsetMinutes: 5 },
      { pipeline: "process-news", intervalMinutes: 15, offsetMinutes: 2 },
    ]);
    process.env.NEWS_INTERVAL_MINUTES = "10";
    process.env.NEWS_SCHEDULE_OFFSET_MINUTES = "13";
    expect(getPipelineSchedules()[1]).toEqual({ pipeline: "process-news", intervalMinutes: 10, offsetMinutes: 3 });
    delete process.env.NEWS_INTERVAL_MINUTES;
    delete process.env.NEWS_SCHEDULE_OFFSET_MINUTES;
  });

  it("registers the news pipeline in order", () => {
    expect(PIPELINES["process-news"]).toEqual(["news-fetch", "news-clustering", "news-summarize"]);
  });
});
