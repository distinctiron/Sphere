import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    newsStory: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    newsItem: { update: vi.fn() },
    paperChunk: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/llm", () => ({
  isLLMConfigured: vi.fn(() => true),
  getLLMModelName: vi.fn(() => "anthropic:test-model"),
  generateStoryArticleStreaming: vi.fn(),
}));

import { db } from "@/lib/db";
import { generateStoryArticleStreaming, isLLMConfigured } from "@/lib/llm";
import { isArticleStale, selectArticleSources, streamStoryArticle } from "./article";
import { extractArticleText } from "./content";
import type { ArticleStreamEvent } from "./dto";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isLLMConfigured).mockReturnValue(true);
  mockDb.newsStory.findMany.mockResolvedValue([] as never);
  mockDb.paperChunk.findMany.mockResolvedValue([] as never);
});

describe("isArticleStale", () => {
  const base = { article: "text", articleItemCount: 5, articleSourceCount: 2, itemCount: 5, sourceCount: 2 };
  it.each([
    [{ ...base, article: null }, true],
    [base, false],
    [{ ...base, itemCount: 6 }, false],
    [{ ...base, itemCount: 7 }, true],
    [{ ...base, sourceCount: 3 }, true],
  ])("%o → %s", (state, expected) => {
    expect(isArticleStale(state)).toBe(expected);
  });
});

describe("selectArticleSources", () => {
  const item = (id: string, source: string, url: string, engagement = 0) => ({
    id,
    source,
    url,
    engagement,
    content: null,
    publishedAt: new Date("2026-09-29T00:00:00Z"),
  });

  it("puts one item per platform and readable items before headline-only aggregator links", () => {
    const items = [
      item("g1", "rss", "https://news.google.com/rss/articles/1"),
      item("g2", "rss", "https://news.google.com/rss/articles/2"),
      item("tc", "rss", "https://techcrunch.com/a"),
      item("hn", "hackernews", "https://nytimes.com/a", 50),
      item("rd", "reddit", "https://reddit.com/r/x/1"),
    ];
    const selected = selectArticleSources(items, 4).map((i) => i.id);
    expect(selected.slice(0, 3).sort()).toEqual(["hn", "rd", "tc"]);
    expect(selected[3]).toMatch(/^g/);
  });
});

describe("extractArticleText", () => {
  it("prefers <article> text and drops page chrome", () => {
    const paragraph = (n: number) => `<p>Paragraph ${n} of the article explains what happened in considerable detail today.</p>`;
    const html = `<html><body><nav><p>Navigation link text that is long enough to count as a paragraph here</p></nav>
      <article><h1>Headline</h1>${[1, 2, 3, 4, 5, 6].map(paragraph).join("")}<aside><p>Related: other stories you might like to read today</p></aside></article>
      <footer><p>Copyright footer text that is also long enough to be a paragraph</p></footer><script>track()</script></body></html>`;
    const text = extractArticleText(html);
    expect(text).toContain("Paragraph 1 of the article");
    expect(text).toContain("Paragraph 6 of the article");
    expect(text).not.toContain("Navigation");
    expect(text).not.toContain("Related:");
    expect(text).not.toContain("Copyright");
  });
});

describe("streamStoryArticle", () => {
  const cachedRow = {
    article: "## What's happening\n\nCached [1]",
    articleCitations: { citations: [{ id: 1, title: "T" }], related: { stories: [], papers: [] } },
    articleItemCount: 3,
    articleSourceCount: 2,
    articleGeneratedAt: new Date("2026-09-29T10:00:00Z"),
    itemCount: 3,
    sourceCount: 2,
  };
  const storyRow = {
    id: "s1",
    headline: "Headline",
    summary: "Summary",
    itemCount: 2,
    sourceCount: 2,
    centroid: null,
    embeddingModel: null,
    items: [
      {
        id: "i1",
        source: "github",
        sourceName: "GitHub",
        externalId: "release:o/r@v1",
        title: "o/r v1 released",
        url: "https://github.com/o/r/releases/tag/v1",
        canonicalUrl: "https://github.com/o/r/releases/tag/v1",
        discussionUrl: null,
        snippet: "notes",
        content: "Full release notes",
        contentFetchedAt: new Date(),
        engagement: 900,
        comments: 0,
        publishedAt: new Date("2026-09-29T09:00:00Z"),
      },
      {
        id: "i2",
        source: "rss",
        sourceName: "WSJ",
        externalId: "google-news:1",
        title: "Coverage",
        url: "https://news.google.com/rss/articles/1",
        canonicalUrl: "https://news.google.com/rss/articles/1",
        discussionUrl: null,
        snippet: null,
        content: null,
        contentFetchedAt: new Date(),
        engagement: 0,
        comments: 0,
        publishedAt: new Date("2026-09-29T09:30:00Z"),
      },
    ],
  };

  const collect = async (regenerate = false) => {
    const events: ArticleStreamEvent[] = [];
    const outcome = await streamStoryArticle("s1", { regenerate }, (e) => events.push(e));
    return { outcome, events };
  };

  it("returns a fresh cached article without calling the LLM", async () => {
    mockDb.newsStory.findUnique.mockResolvedValueOnce(cachedRow as never);
    const { outcome, events } = await collect();
    expect(outcome).toBe("cached");
    expect(events[0]).toMatchObject({ cached: true, stale: false, citations: [{ id: 1 }] });
    expect(events[1]).toEqual({ chunk: cachedRow.article });
    expect(generateStoryArticleStreaming).not.toHaveBeenCalled();
  });

  it("generates, streams and caches when there is no fresh article", async () => {
    mockDb.newsStory.findUnique
      .mockResolvedValueOnce({ ...cachedRow, article: null } as never)
      .mockResolvedValueOnce(storyRow as never);
    vi.mocked(generateStoryArticleStreaming).mockImplementation(async (context, onChunk) => {
      expect(context.sources).toContain('[1] GitHub: "o/r v1 released" (900 stars');
      expect(context.sources).toContain("Full release notes");
      expect(context.sources).toContain("[2] News · WSJ");
      onChunk("## What's happening\n\n");
      onChunk("Released [1].");
    });

    const { outcome, events } = await collect();
    expect(outcome).toBe("generated");
    expect(events[0]).toMatchObject({ cached: false, citations: [{ id: 1, itemId: "i1" }, { id: 2, itemId: "i2" }] });
    expect(events.slice(1)).toEqual([{ chunk: "## What's happening\n\n" }, { chunk: "Released [1]." }]);
    expect(mockDb.newsStory.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({
        article: "## What's happening\n\nReleased [1].",
        articleItemCount: 2,
        articleSourceCount: 2,
        articleModel: "anthropic:test-model",
      }),
    });
  });

  it("never caches mock-mode articles, and serves a stale cache in mock mode", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(false);
    mockDb.newsStory.findUnique.mockResolvedValueOnce({ ...cachedRow, itemCount: 10 } as never);
    expect((await collect()).outcome).toBe("cached");

    mockDb.newsStory.findUnique
      .mockResolvedValueOnce({ ...cachedRow, article: null } as never)
      .mockResolvedValueOnce(storyRow as never);
    vi.mocked(generateStoryArticleStreaming).mockImplementation(async (_c, onChunk) => onChunk("mock"));
    expect((await collect()).outcome).toBe("generated");
    expect(mockDb.newsStory.update).not.toHaveBeenCalled();
  });

  it("lets concurrent requests wait for an in-progress generation instead of generating twice", async () => {
    mockDb.newsStory.findUnique
      .mockResolvedValueOnce({ ...cachedRow, article: null } as never)
      .mockResolvedValueOnce(storyRow as never)
      .mockResolvedValueOnce(cachedRow as never);
    let finish!: () => void;
    vi.mocked(generateStoryArticleStreaming).mockImplementation(
      (_c, onChunk) => new Promise<void>((resolve) => (finish = () => (onChunk("done"), resolve())))
    );
    const first = streamStoryArticle("s1", {}, () => {});
    const second = streamStoryArticle("s1", {}, () => {});
    await vi.waitFor(() => expect(generateStoryArticleStreaming).toHaveBeenCalled());
    finish();
    expect(await first).toBe("generated");
    expect(await second).toBe("cached");
    expect(generateStoryArticleStreaming).toHaveBeenCalledTimes(1);
  });

  it("reports unknown stories", async () => {
    mockDb.newsStory.findUnique.mockResolvedValueOnce(null as never);
    expect((await collect()).outcome).toBe("not_found");
  });
});
