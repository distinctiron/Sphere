import { describe, it, expect } from "vitest";
import { parseFeed } from "../feed-parser";
import { isNewsworthyRelease, releaseTag, repoToItem } from "./github";
import { hitToItem } from "./hackernews";
import { parseSubredditFeed, postToItem } from "./reddit";
import { entryToItem, splitAggregatorTitle } from "./rss";
import { tweetToItem } from "./x";

const GOOGLE_NEWS_RSS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Google News</title>
<item><title>OpenAI Scraps Release of New AI Model - WSJ</title><link>https://news.google.com/rss/articles/CBMi123?oc=5</link>
<guid isPermaLink="false">CBMi123</guid><pubDate>Mon, 28 Sep 2026 23:07:00 GMT</pubDate>
<description>&lt;a href="https://news.google.com/rss/articles/CBMi123"&gt;OpenAI Scraps Release&lt;/a&gt;&amp;nbsp;&lt;font&gt;WSJ&lt;/font&gt;</description>
<source url="https://www.wsj.com">WSJ</source></item></channel></rss>`;

const OUTLET_RSS = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>TechCrunch</title>
<item><title><![CDATA[OpenAI reportedly ditches model over safety concerns]]></title><link>https://techcrunch.com/2026/09/28/openai-ditches/</link>
<dc:creator><![CDATA[Jane Reporter]]></dc:creator><pubDate>Mon, 28 Sep 2026 23:30:00 +0000</pubDate><category>AI</category>
<description><![CDATA[<p>OpenAI had planned to release yet another model.</p>]]></description></item></channel></rss>`;

const REDDIT_ATOM = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><category term="multi" label="r/multi"/><title>top</title>
<entry><author><name>/u/someone</name></author><category term="LocalLLaMA" label="r/LocalLLaMA"/>
<content type="html">&lt;div class=&quot;md&quot;&gt;&lt;p&gt;New quantised model is out&lt;/p&gt;&lt;/div&gt; &lt;span&gt;&lt;a href=&quot;https://huggingface.co/some/model&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt; &lt;span&gt;&lt;a href=&quot;https://www.reddit.com/r/LocalLLaMA/comments/abc/new_model/&quot;&gt;[comments]&lt;/a&gt;&lt;/span&gt;</content>
<id>t3_abc</id><link href="https://www.reddit.com/r/LocalLLaMA/comments/abc/new_model/" /><published>2026-09-28T15:55:07+00:00</published><title>New model &amp; benchmarks</title></entry>
<entry><author><name>/u/other</name></author><category term="singularity" label="r/singularity"/>
<content type="html">&lt;span&gt;&lt;a href=&quot;https://i.redd.it/img.png&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;</content>
<id>t3_def</id><link href="https://www.reddit.com/r/singularity/comments/def/meme/" /><published>2026-09-28T16:00:00+00:00</published><title>Meme</title></entry>
</feed>`;

const RELEASES_ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Release notes from ollama</title>
<entry><id>tag:github.com,2008:Repository/1/v0.35.0</id><updated>2026-09-29T01:54:15Z</updated>
<link rel="alternate" type="text/html" href="https://github.com/ollama/ollama/releases/tag/v0.35.0"/><title>v0.35.0</title>
<content type="html">&lt;h2&gt;Decision models&lt;/h2&gt;&lt;p&gt;Ollama now supports decision models.&lt;/p&gt;</content></entry></feed>`;

describe("parseFeed", () => {
  it("parses RSS 2.0 with aggregator <source>", () => {
    const [entry] = parseFeed(GOOGLE_NEWS_RSS).entries;
    expect(entry).toMatchObject({
      id: "CBMi123",
      title: "OpenAI Scraps Release of New AI Model - WSJ",
      link: "https://news.google.com/rss/articles/CBMi123?oc=5",
      sourceName: "WSJ",
    });
    expect(entry.published?.toISOString()).toBe("2026-09-28T23:07:00.000Z");
  });

  it("parses Atom with categories and alternate links", () => {
    const feed = parseFeed(RELEASES_ATOM);
    expect(feed.title).toBe("Release notes from ollama");
    expect(feed.entries[0].link).toBe("https://github.com/ollama/ollama/releases/tag/v0.35.0");
    expect(feed.entries[0].content).toContain("<h2>Decision models</h2>");
    expect(parseFeed(REDDIT_ATOM).entries[0].categories).toEqual(["LocalLLaMA"]);
  });

  it("rejects non-feeds", () => {
    expect(() => parseFeed("<html><body>nope</body></html>")).toThrow("Unrecognised feed format");
  });
});

describe("rss source", () => {
  const feed = { name: "Google News", url: "", filterByKeywords: true };

  it("splits the outlet off aggregator titles and uses it as the source name", () => {
    const item = entryToItem(parseFeed(GOOGLE_NEWS_RSS).entries[0], feed)!;
    expect(item).toMatchObject({ source: "rss", title: "OpenAI Scraps Release of New AI Model", sourceName: "WSJ", snippet: undefined });
    expect(item.externalId).toMatch(/^google-news:[0-9a-f]{16}$/);
  });

  it("keeps outlet feeds' own name and description", () => {
    const item = entryToItem(parseFeed(OUTLET_RSS).entries[0], { name: "TechCrunch", url: "", filterByKeywords: false })!;
    expect(item).toMatchObject({
      title: "OpenAI reportedly ditches model over safety concerns",
      sourceName: "TechCrunch",
      author: "Jane Reporter",
      snippet: "OpenAI had planned to release yet another model.",
    });
  });

  it("only splits a trailing outlet that matches the source", () => {
    expect(splitAggregatorTitle("A - B - Reuters", "Reuters")).toEqual({ title: "A - B", outlet: "Reuters" });
    expect(splitAggregatorTitle("Pros - cons", "Reuters")).toEqual({ title: "Pros - cons" });
  });
});

describe("reddit source", () => {
  it("parses multireddit feeds: subreddit, link target, self text", () => {
    const [post, meme] = parseSubredditFeed(REDDIT_ATOM, "MachineLearning");
    expect(post).toMatchObject({
      source: "reddit",
      externalId: "t3_abc",
      title: "New model & benchmarks",
      sourceName: "r/LocalLLaMA",
      targetUrl: "https://huggingface.co/some/model",
      snippet: "New quantised model is out",
      author: "someone",
      discussionUrl: "https://www.reddit.com/r/LocalLLaMA/comments/abc/new_model/",
    });
    // Image posts are about the post itself
    expect(meme).toMatchObject({ sourceName: "r/singularity", targetUrl: meme.url });
  });

  it("maps OAuth listing posts with scores", () => {
    const item = postToItem({
      id: "abc",
      name: "t3_abc",
      title: "Title",
      url: "https://example.com/a?x=1&amp;y=2",
      permalink: "/r/OpenAI/comments/abc/title/",
      is_self: false,
      selftext: "",
      author: "u1",
      subreddit: "OpenAI",
      score: 1234,
      num_comments: 56,
      created_utc: 1790000000,
      stickied: false,
      over_18: false,
    });
    expect(item).toMatchObject({
      engagement: 1234,
      comments: 56,
      targetUrl: "https://example.com/a?x=1&y=2",
      url: "https://www.reddit.com/r/OpenAI/comments/abc/title/",
      sourceName: "r/OpenAI",
    });
  });
});

describe("hacker news source", () => {
  it("maps Algolia hits, falling back to the discussion for Ask HN", () => {
    const link = hitToItem({ objectID: "1", title: "Show HN: X", url: "https://x.dev", author: "a", points: 10, num_comments: 2, created_at_i: 1790000000 })!;
    expect(link).toMatchObject({ url: "https://x.dev", engagement: 10, comments: 2, discussionUrl: "https://news.ycombinator.com/item?id=1" });
    const ask = hitToItem({ objectID: "2", title: "Ask HN: Y?", url: null, author: "b", points: null, num_comments: null, created_at_i: 1790000000, story_text: "<p>Body</p>" })!;
    expect(ask).toMatchObject({ url: "https://news.ycombinator.com/item?id=2", engagement: 0, snippet: "Body" });
    expect(hitToItem({ objectID: "3", title: null, url: null, author: "c", points: 1, num_comments: 0, created_at_i: 0 })).toBeNull();
  });
});

describe("github source", () => {
  it.each([
    ["v0.35.0", true],
    ["langchain==1.4.3", true],
    ["b11242", false],
    ["trunk/8513bddb54", false],
    ["v0.35.0-rc1", false],
    ["v0.11.0rc2", false],
    ["v1.0.0.dev3", false],
    ["grpc-v1", true],
  ])("release %s newsworthy: %s", (tag, expected) => {
    expect(isNewsworthyRelease(tag)).toBe(expected);
  });

  it("reads tags containing slashes from release URLs", () => {
    expect(releaseTag("https://github.com/pytorch/pytorch/releases/tag/trunk/abc123", "x")).toBe("trunk/abc123");
    expect(releaseTag("https://github.com/o/r/releases/tag/langchain%3D%3D1.4.3", "x")).toBe("langchain==1.4.3");
  });

  it("maps repositories", () => {
    const item = repoToItem({
      full_name: "Org/Repo",
      html_url: "https://github.com/Org/Repo",
      description: "An agent framework",
      stargazers_count: 900,
      forks_count: 10,
      created_at: "2026-09-27T00:00:00Z",
      pushed_at: "2026-09-28T00:00:00Z",
      owner: { login: "Org" },
    });
    expect(item).toMatchObject({ externalId: "repo:org/repo", title: "Org/Repo: An agent framework", engagement: 900 });
  });
});

describe("x source", () => {
  const entry = (content: string, title = "Post", link = "https://nitter.example.com/sama/status/42#m") => ({
    id: link,
    title,
    link,
    content,
    categories: [],
    published: new Date("2026-09-28T10:00:00Z"),
  });

  it("maps posts and uses the first outbound link as the target", () => {
    const item = tweetToItem(
      entry('We are launching a new model <a href="https://nitter.example.com/OpenAI">@OpenAI</a> <a href="https://openai.com/index/new-model/?utm_source=x">openai.com/index/new-model</a>'),
      "sama",
      "nitter.example.com"
    )!;
    expect(item).toMatchObject({
      source: "x",
      externalId: "42",
      url: "https://x.com/sama/status/42",
      targetUrl: "https://openai.com/index/new-model",
      sourceName: "@sama",
      title: "We are launching a new model @OpenAI openai.com/index/new-model",
    });
  });

  it("skips retweets and entries without a status id", () => {
    expect(tweetToItem(entry("text", "RT by @sama: hello"), "sama", null)).toBeNull();
    expect(tweetToItem(entry("text", "Post", "https://nitter.example.com/sama"), "sama", null)).toBeNull();
  });
});
