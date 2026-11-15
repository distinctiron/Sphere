/**
 * Retrieval Service (Story 7.4)
 *
 * - retrieveRelevantChunks(): semantic top-k search scoped to one paper.
 * - retrieveForSelection(): hybrid search for Intellisense (Story 7.5) that
 *   combines semantic similarity with the selection's position in the paper.
 *
 * Caching: per-paper chunk vectors, query embeddings and retrieval results are
 * cached in memory. Keys include the embedding model; entries for a paper are
 * invalidated whenever it is re-indexed.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { sharedCache } from "./cache";
import { generateEmbedding, getEmbeddingConfig, type EmbeddingConfig } from "./embeddings";
import type { RetrievedChunk, SectionType } from "./types";
import { deserializeEmbedding, rankBySimilarity } from "./vector-search";

const HOUR = 60 * 60 * 1000;

interface IndexedChunk {
  chunk: Omit<RetrievedChunk, "similarity" | "score">;
  vector: Float32Array;
  normalized: string;
}

const vectorCache = sharedCache<IndexedChunk[]>("paper-vectors", 50, HOUR);
const queryEmbeddingCache = sharedCache<number[]>("query-embeddings", 500, 6 * HOUR);
const resultCache = sharedCache<RetrievalResult>("retrieval-results", 500, HOUR);

export type RetrievalStatus = "ok" | "not_indexed" | "no_match";

export interface RetrievalResult {
  status: RetrievalStatus;
  chunks: RetrievedChunk[];
}

export function invalidatePaperRetrievalCache(paperId: string): void {
  const prefix = `${paperId}:`;
  vectorCache.deleteWhere((key) => key.startsWith(prefix));
  resultCache.deleteWhere((key) => key.startsWith(prefix));
}

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f\u0370-\u03ff]+/g, " ")
    .trim();
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

async function loadPaperVectors(paperId: string, model: string): Promise<IndexedChunk[]> {
  const key = `${paperId}:${model}`;
  const cached = vectorCache.get(key);
  if (cached) return cached;

  const rows = await db.paperChunk.findMany({
    where: { paperId, embeddingModel: model, embedding: { not: null } },
    orderBy: { position: "asc" },
    select: {
      id: true,
      content: true,
      sectionType: true,
      sectionTitle: true,
      anchorId: true,
      position: true,
      embedding: true,
    },
  });

  const indexed = rows.map((row) => ({
    chunk: {
      id: row.id,
      content: row.content,
      sectionType: row.sectionType as SectionType,
      sectionTitle: row.sectionTitle,
      anchorId: row.anchorId,
      position: row.position,
    },
    vector: deserializeEmbedding(row.embedding!),
    normalized: normalizeForMatch(row.content),
  }));
  // Don't cache empty results: the paper may be indexed moments later
  if (indexed.length > 0) vectorCache.set(key, indexed);
  return indexed;
}

async function embedQuery(text: string, config: EmbeddingConfig): Promise<number[]> {
  const key = `${config.model}:${hash(text)}`;
  const cached = queryEmbeddingCache.get(key);
  if (cached) return cached;
  const vector = await generateEmbedding(text, config);
  queryEmbeddingCache.set(key, vector);
  return vector;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Semantic search: top-k chunks of a paper by cosine similarity to the query.
 * Returns status "not_indexed" when the paper has no embedded chunks and
 * "no_match" when nothing clears the similarity threshold, so callers can
 * fall back to other context.
 */
export async function retrieveRelevantChunks(
  paperId: string,
  query: string,
  options: { topK?: number; minSimilarity?: number } = {}
): Promise<RetrievalResult> {
  const config = getEmbeddingConfig();
  const topK = options.topK ?? 3;
  const minSimilarity = options.minSimilarity ?? config.minSimilarity;

  const cacheKey = `${paperId}:${config.model}:search:${topK}:${minSimilarity}:${hash(normalizeForMatch(query))}`;
  const cached = resultCache.get(cacheKey);
  if (cached) return cached;

  const indexed = await loadPaperVectors(paperId, config.model);
  if (indexed.length === 0) return { status: "not_indexed", chunks: [] };

  const queryVector = await embedQuery(query, config);
  const ranked = rankBySimilarity(
    queryVector,
    indexed.map((i) => ({ vector: i.vector, item: i.chunk }))
  );
  const chunks = ranked
    .filter((r) => r.similarity >= minSimilarity)
    .slice(0, topK)
    .map((r) => ({ ...r.item, similarity: round(r.similarity), score: round(r.similarity) }));

  if (chunks.length === 0) {
    console.info(
      `RAG: no chunk of paper ${paperId} reached similarity ${minSimilarity} (best ${round(ranked[0]?.similarity ?? 0)})`
    );
  }

  const result: RetrievalResult = { status: chunks.length > 0 ? "ok" : "no_match", chunks };
  resultCache.set(cacheKey, result);
  return result;
}

/** Section priority for a paper overview: what a reader skims first */
const OVERVIEW_ORDER: SectionType[] = ["abstract", "conclusion", "introduction", "discussion", "results", "methods", "other"];

/**
 * Fallback context for broad questions ("summarize this", "main contribution")
 * that don't match any passage closely: the leading chunk of the abstract,
 * conclusion, introduction, ... in that order.
 */
export async function retrieveOverviewChunks(paperId: string, topK = 4): Promise<RetrievalResult> {
  const indexed = await loadPaperVectors(paperId, getEmbeddingConfig().model);
  if (indexed.length === 0) return { status: "not_indexed", chunks: [] };

  const picked: IndexedChunk[] = [];
  for (const type of OVERVIEW_ORDER) {
    const first = indexed.find((i) => i.chunk.sectionType === type);
    if (first) picked.push(first);
    if (picked.length >= topK) break;
  }
  return {
    status: "ok",
    chunks: picked.map((i) => ({ ...i.chunk, similarity: 0, score: 0 })),
  };
}

/** Word windows used to locate a passage inside chunk text despite formatting differences */
export function buildLocationProbes(selectedText: string, surroundingText?: string): string[] {
  const probes: string[] = [];
  const selection = normalizeForMatch(selectedText);
  if (selection.split(" ").length >= 4) probes.push(selection.slice(0, 200));

  if (surroundingText) {
    const words = normalizeForMatch(surroundingText).split(" ").filter(Boolean);
    const size = 8;
    if (words.length >= size) {
      for (const start of [0, Math.floor((words.length - size) / 2), words.length - size]) {
        probes.push(words.slice(start, start + size).join(" "));
      }
    }
  }
  return Array.from(new Set(probes));
}

const SEMANTIC_WEIGHT = 0.65;
const POSITION_WEIGHT = 0.35;

/**
 * Hybrid search for explaining a selected passage: chunks containing the
 * selection (or its surrounding paragraph) score highest, their neighbours
 * next, combined with semantic similarity to the selection.
 */
export async function retrieveForSelection(
  paperId: string,
  selectedText: string,
  options: { surroundingText?: string; topK?: number } = {}
): Promise<RetrievalResult> {
  const config = getEmbeddingConfig();
  const topK = options.topK ?? 3;

  const cacheKey = `${paperId}:${config.model}:selection:${topK}:${hash(
    normalizeForMatch(selectedText) + "|" + normalizeForMatch(options.surroundingText ?? "")
  )}`;
  const cached = resultCache.get(cacheKey);
  if (cached) return cached;

  const indexed = await loadPaperVectors(paperId, config.model);
  if (indexed.length === 0) return { status: "not_indexed", chunks: [] };

  const query = options.surroundingText
    ? `${selectedText}\n\n${options.surroundingText.slice(0, 1500)}`
    : selectedText;
  const queryVector = await embedQuery(query, config);

  const probes = buildLocationProbes(selectedText, options.surroundingText);
  const containing = new Set(
    indexed.filter((i) => probes.some((p) => i.normalized.includes(p))).map((i) => i.chunk.position)
  );

  const scored = rankBySimilarity(
    queryVector,
    indexed.map((i) => ({ vector: i.vector, item: i.chunk }))
  ).map(({ item, similarity }) => {
    const positional = containing.has(item.position)
      ? 1
      : containing.has(item.position - 1) || containing.has(item.position + 1)
        ? 0.5
        : 0;
    return {
      ...item,
      similarity: round(similarity),
      score: round(SEMANTIC_WEIGHT * similarity + POSITION_WEIGHT * positional),
      positional,
    };
  });

  const chunks = scored
    .filter((c) => c.positional > 0 || c.similarity >= config.minSimilarity)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ positional: _positional, ...chunk }) => chunk);

  const result: RetrievalResult = { status: chunks.length > 0 ? "ok" : "no_match", chunks };
  resultCache.set(cacheKey, result);
  return result;
}
