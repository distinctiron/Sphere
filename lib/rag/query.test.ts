import { describe, it, expect } from "vitest";
import { buildRetrievalQuery, formatSourcesForPrompt, toCitations, trimHistory } from "./query";
import { citedIdsIn, splitCitations } from "./citation-text";
import type { RetrievedChunk } from "./types";

function chunk(position: number, similarity: number, overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: `c${position}`,
    content: `Content ${position}`,
    sectionType: "methods",
    sectionTitle: `${position} Section`,
    anchorId: `S${position}`,
    position,
    similarity,
    score: similarity,
    ...overrides,
  };
}

describe("toCitations", () => {
  it("numbers citations in paper order", () => {
    const citations = toCitations([chunk(7, 0.9), chunk(2, 0.5), chunk(4, 0.7)]);
    expect(citations.map((c) => [c.id, c.chunkId, c.relevance])).toEqual([
      [1, "c2", 0.5],
      [2, "c4", 0.7],
      [3, "c7", 0.9],
    ]);
  });
});

describe("formatSourcesForPrompt", () => {
  it("labels each passage with its number and section", () => {
    const text = formatSourcesForPrompt(
      toCitations([chunk(1, 0.5), chunk(2, 0.4, { sectionTitle: null, sectionType: "results" })])
    );
    expect(text).toBe("[1] 1 Section (Methods)\nContent 1\n\n---\n\n[2] Results\nContent 2");
  });
});

describe("buildRetrievalQuery", () => {
  it("uses the message alone at the start of a conversation", () => {
    expect(buildRetrievalQuery("What dataset is used?", [])).toBe("What dataset is used?");
  });

  it("anchors short follow-ups to the previous question", () => {
    const query = buildRetrievalQuery("Why?", [
      { role: "user", content: "How is the estimator trained?" },
      { role: "assistant", content: "With supervised fine-tuning [1]." },
    ]);
    expect(query).toContain("Why?");
    expect(query).toContain("How is the estimator trained?");
  });

  it("leaves self-contained questions unchanged", () => {
    const message = "Can you explain how the evaluation protocol differs between the two benchmarks in detail?";
    expect(buildRetrievalQuery(message, [{ role: "user", content: "Earlier" }])).toBe(message);
  });
});

describe("trimHistory", () => {
  it("keeps the most recent turns within the token budget, starting with a user turn", () => {
    const history = [
      { role: "user" as const, content: "a".repeat(400) },
      { role: "assistant" as const, content: "b".repeat(400) },
      { role: "user" as const, content: "c".repeat(400) },
      { role: "assistant" as const, content: "d".repeat(400) },
    ];
    // 250 tokens fits two 100-token turns, but the oldest kept must be a user turn
    expect(trimHistory(history, 250).map((t) => t.content[0])).toEqual(["c", "d"]);
    expect(trimHistory(history, 10_000).length).toBe(4);
    expect(trimHistory(history, 10_000, 3).map((t) => t.content[0])).toEqual(["c", "d"]);
  });
});

describe("citation parsing", () => {
  it("finds cited ids including grouped citations", () => {
    expect(Array.from(citedIdsIn("A [1], B [2, 3] and C [2][4]."))).toEqual([1, 2, 3, 4]);
  });

  it("splits text into plain parts and valid citation groups", () => {
    expect(splitCitations("See [1] and [2, 3]. Not [9] or [x].", new Set([1, 2, 3]))).toEqual([
      "See ",
      [1],
      " and ",
      [2, 3],
      ". Not [9] or [x].",
    ]);
  });
});
