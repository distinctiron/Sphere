import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { paperChunk: { findMany: vi.fn() } },
}));

import { db } from "@/lib/db";
import { localEmbedding } from "./embeddings";
import {
  buildLocationProbes,
  invalidatePaperRetrievalCache,
  retrieveForSelection,
  retrieveOverviewChunks,
  retrieveRelevantChunks,
} from "./retriever";
import { serializeEmbedding } from "./vector-search";

const PAPER_ID = "paper-1";

const CHUNKS = [
  { sectionType: "abstract", sectionTitle: "Abstract", content: "We propose ConfSFT, which teaches reasoning models calibrated confidence." },
  { sectionType: "methods", sectionTitle: "4 Method", content: "The confidence estimator is trained with supervised fine-tuning on self-generated reasoning traces and decision points." },
  { sectionType: "results", sectionTitle: "5 Experiments", content: "On AIME and MATH benchmarks, generated tokens drop by 30 percent while accuracy is maintained." },
  { sectionType: "results", sectionTitle: "5 Experiments", content: "Table 2 compares against DEER early exit baselines across four reasoning models." },
  { sectionType: "conclusion", sectionTitle: "7 Conclusion", content: "Galaxy formation in the early universe is unrelated to this work." },
].map((c, position) => ({
  id: `chunk-${position}`,
  anchorId: `S${position}`,
  position,
  ...c,
  embedding: serializeEmbedding(localEmbedding(`${c.sectionTitle}\n\n${c.content}`)),
}));

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
  delete process.env.RAG_MIN_SIMILARITY;
  process.env.EMBEDDING_PROVIDER = "local";
  vi.mocked(db.paperChunk.findMany).mockReset();
  vi.mocked(db.paperChunk.findMany).mockResolvedValue(CHUNKS as never);
  invalidatePaperRetrievalCache(PAPER_ID);
});

describe("retrieveRelevantChunks", () => {
  it("returns the top-k chunks of the paper ranked by similarity", async () => {
    const result = await retrieveRelevantChunks(PAPER_ID, "How is the confidence estimator trained?", { topK: 2 });

    expect(result.status).toBe("ok");
    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0].id).toBe("chunk-1");
    expect(result.chunks[0]).toMatchObject({ sectionType: "methods", sectionTitle: "4 Method", anchorId: "S1" });
    expect(result.chunks[0].similarity).toBeGreaterThanOrEqual(result.chunks[1].similarity);
    expect(vi.mocked(db.paperChunk.findMany).mock.calls[0][0]).toMatchObject({
      where: { paperId: PAPER_ID, embeddingModel: "local-hash-v1" },
    });
  });

  it("reports not_indexed when the paper has no embedded chunks", async () => {
    vi.mocked(db.paperChunk.findMany).mockResolvedValue([]);
    const result = await retrieveRelevantChunks(PAPER_ID, "anything");
    expect(result).toEqual({ status: "not_indexed", chunks: [] });
  });

  it("reports no_match when nothing clears the similarity threshold", async () => {
    const result = await retrieveRelevantChunks(PAPER_ID, "photosynthesis chlorophyll", { minSimilarity: 0.5 });
    expect(result).toEqual({ status: "no_match", chunks: [] });
  });

  it("caches results and chunk vectors until the paper is invalidated", async () => {
    await retrieveRelevantChunks(PAPER_ID, "benchmark accuracy");
    await retrieveRelevantChunks(PAPER_ID, "benchmark accuracy");
    await retrieveRelevantChunks(PAPER_ID, "a different question about baselines");
    expect(db.paperChunk.findMany).toHaveBeenCalledTimes(1);

    invalidatePaperRetrievalCache(PAPER_ID);
    await retrieveRelevantChunks(PAPER_ID, "benchmark accuracy");
    expect(db.paperChunk.findMany).toHaveBeenCalledTimes(2);
  });
});

describe("retrieveForSelection (hybrid)", () => {
  it("prioritises the chunk containing the selection, then its neighbours", async () => {
    const result = await retrieveForSelection(PAPER_ID, "DEER", {
      surroundingText: "Table 2 compares against DEER early exit baselines across four reasoning models.",
    });

    expect(result.status).toBe("ok");
    expect(result.chunks[0].id).toBe("chunk-3");
    // Neighbour (position 2) gets a positional boost too
    expect(result.chunks.map((c) => c.id)).toContain("chunk-2");
    expect(result.chunks[0].score).toBeGreaterThan(result.chunks[0].similarity);
  });

  it("falls back to semantic ranking when the selection can't be located", async () => {
    const result = await retrieveForSelection(PAPER_ID, "confidence estimator fine-tuning");
    expect(result.chunks[0].id).toBe("chunk-1");
  });
});

describe("retrieveOverviewChunks", () => {
  it("returns the leading abstract, conclusion and introduction-style chunks in priority order", async () => {
    const result = await retrieveOverviewChunks(PAPER_ID, 3);
    expect(result.status).toBe("ok");
    expect(result.chunks.map((c) => c.sectionType)).toEqual(["abstract", "conclusion", "results"]);
  });
});

describe("buildLocationProbes", () => {
  it("uses the selection when long enough and windows of the surrounding paragraph", () => {
    const probes = buildLocationProbes(
      "calibrated confidence estimates for reasoning",
      "One two three four five six seven eight nine ten eleven twelve"
    );
    expect(probes[0]).toBe("calibrated confidence estimates for reasoning");
    expect(probes).toContain("one two three four five six seven eight");
    expect(probes).toContain("five six seven eight nine ten eleven twelve");
  });

  it("ignores short selections and short paragraphs", () => {
    expect(buildLocationProbes("DEER", "too short")).toEqual([]);
  });
});
