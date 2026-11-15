import { describe, it, expect } from "vitest";
import { canonicalizeUrl, cleanTitle, htmlToText, truncate } from "./normalize";
import { createKeywordMatcher, AI_TOPIC } from "./topics";
import { parseBlocks } from "./markdown";

describe("canonicalizeUrl", () => {
  it.each([
    ["https://www.example.com/story/?utm_source=x&utm_medium=y#top", "https://example.com/story"],
    ["http://Example.com/a/b/", "https://example.com/a/b"],
    ["https://example.com/p?b=2&a=1&ref=hn", "https://example.com/p?a=1&b=2"],
    ["https://twitter.com/sama/status/123?s=20", "https://x.com/i/status/123"],
    ["https://x.com/OpenAI/status/123", "https://x.com/i/status/123"],
    ["https://arxiv.org/pdf/2409.12345v2.pdf", "https://arxiv.org/abs/2409.12345"],
    ["https://arxiv.org/html/2409.12345v1", "https://arxiv.org/abs/2409.12345"],
    ["https://old.reddit.com/r/LocalLLaMA/comments/abc/x/", "https://reddit.com/r/LocalLLaMA/comments/abc/x"],
    ["https://youtu.be/dQw4w9WgXcQ", "https://youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://example.com/", "https://example.com"],
  ])("%s → %s", (input, expected) => {
    expect(canonicalizeUrl(input)).toBe(expected);
  });

  it("returns unparseable input unchanged", () => {
    expect(canonicalizeUrl("not a url")).toBe("not a url");
    expect(canonicalizeUrl("mailto:a@b.c")).toBe("mailto:a@b.c");
  });
});

describe("text helpers", () => {
  it("converts HTML to plain text, dropping scripts and decoding entities", () => {
    expect(htmlToText("<p>Hello&nbsp;<b>world</b> &amp; friends</p><script>x()</script><p>Second</p>")).toBe(
      "Hello world & friends Second"
    );
  });

  it("truncates on a word boundary", () => {
    expect(truncate("one two three four five", 15)).toBe("one two three…");
    // No word boundary late enough: hard cut
    expect(truncate("abcdefghijklmnop", 6)).toBe("abcdef…");
    expect(truncate("short", 12)).toBe("short");
  });

  it("cleans titles", () => {
    expect(cleanTitle("  OpenAI&#8217;s  new\nmodel ")).toBe("OpenAI’s new model");
  });
});

describe("createKeywordMatcher", () => {
  const matches = createKeywordMatcher(AI_TOPIC.keywords);

  it.each([
    ["OpenAI ships GPT-6.1", true],
    ["New AI chip from Nvidia", true],
    ["Large language models are hard to evaluate", true],
    ["Anthropic's IPO prospectus", true],
    ["He said the air was fresh", false],
    ["Stock markets rally on rate cut", false],
    ["Maintaining a fair rent", false],
  ])("%s → %s", (text, expected) => {
    expect(matches(text)).toBe(expected);
  });
});

describe("parseBlocks (article Markdown)", () => {
  it("parses headings, paragraphs and lists", () => {
    const blocks = parseBlocks(
      "## What's happening\n\nFirst line\ncontinues here [1].\n\n## Source breakdown\n- **HN:** skeptical [2]\n- **Reddit:** excited\n\n1. one\n2. two"
    );
    expect(blocks).toEqual([
      { type: "h2", text: "What's happening" },
      { type: "p", text: "First line continues here [1]." },
      { type: "h2", text: "Source breakdown" },
      { type: "ul", items: ["**HN:** skeptical [2]", "**Reddit:** excited"] },
      { type: "ol", items: ["one", "two"] },
    ]);
  });

  it("tolerates partial Markdown while streaming", () => {
    expect(parseBlocks("## What's hap")).toEqual([{ type: "h2", text: "What's hap" }]);
    expect(parseBlocks("- **Hacker")).toEqual([{ type: "ul", items: ["**Hacker"] }]);
  });
});
