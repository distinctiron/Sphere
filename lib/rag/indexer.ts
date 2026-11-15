/**
 * Paper indexing pipeline (Stories 7.2 + 7.3)
 *
 * fetch arXiv HTML → chunk → embed → store in paper_chunks.
 *
 * - Papers without an HTML version (404) are indexed from their abstract.
 * - If embedding fails, chunks are still stored (ragStatus CHUNKED) and the
 *   missing embeddings are generated on a later attempt.
 * - Re-indexing is cheap when content is unchanged (content hash), and when
 *   it changed only new/modified chunks are re-embedded (per-chunk hashes).
 * - Concurrent requests for the same paper share one in-flight indexing run.
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";
import { chunkAbstract, chunkPaperHtml } from "./chunker";
import { chunkEmbeddingInput, generateEmbeddings, getEmbeddingConfig } from "./embeddings";
import { invalidatePaperRetrievalCache } from "./retriever";
import { serializeEmbedding } from "./vector-search";

export const MAX_RAG_ATTEMPTS = 5;
/** Below this much extracted text an HTML page is treated as unusable */
const MIN_HTML_TEXT_CHARS = 1000;

export type IndexOutcome =
  | "indexed"
  | "unchanged"
  | "embedded"
  | "partial"
  | "no_content"
  | "failed"
  | "gave_up"
  | "not_found";

export interface IndexResult {
  paperId: string;
  outcome: IndexOutcome;
  chunkCount?: number;
  embeddedCount?: number;
  source?: "html" | "abstract";
  error?: string;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Fetch the arXiv HTML rendering of a paper; null when no HTML version exists */
export async function fetchPaperHtml(htmlUrl: string, signal?: AbortSignal): Promise<string | null> {
  if (!htmlUrl) return null;
  const timeout = AbortSignal.timeout(30_000);
  const response = await fetch(htmlUrl, {
    headers: { "User-Agent": "Sphere Research Platform" },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new HttpError(`HTML fetch returned ${response.status}`, response.status);
  return response.text();
}

async function recordFailure(paperId: string, error: unknown): Promise<IndexResult> {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
  await db.paper.update({
    where: { id: paperId },
    data: { ragStatus: "FAILED", ragError: message, ragAttempts: { increment: 1 } },
  });
  return { paperId, outcome: "failed", error: message };
}

/** Chunk, embed and store a paper */
export async function indexPaper(
  paperId: string,
  options: { force?: boolean; signal?: AbortSignal } = {}
): Promise<IndexResult> {
  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { id: true, htmlUrl: true, abstract: true, ragStatus: true, ragContentHash: true },
  });
  if (!paper) return { paperId, outcome: "not_found" };

  let extracted: { text: string; chunks: ReturnType<typeof chunkPaperHtml>["chunks"] };
  let source: "html" | "abstract" = "html";
  try {
    const html = await fetchPaperHtml(paper.htmlUrl, options.signal);
    extracted = html ? chunkPaperHtml(html) : { text: "", chunks: [] };
    if (extracted.text.length < MIN_HTML_TEXT_CHARS) {
      source = "abstract";
      extracted = chunkAbstract(paper.abstract);
    }
  } catch (error) {
    return recordFailure(paperId, error);
  }

  if (extracted.chunks.length === 0) {
    await db.paper.update({
      where: { id: paperId },
      data: { ragStatus: "NO_CONTENT", ragError: null, ragIndexedAt: new Date() },
    });
    return { paperId, outcome: "no_content", chunkCount: 0 };
  }

  const config = getEmbeddingConfig();
  const contentHash = sha256(extracted.text);
  const existing = await db.paperChunk.findMany({
    where: { paperId },
    select: { contentHash: true, embedding: true, embeddingModel: true },
  });

  const upToDate =
    paper.ragStatus === "READY" &&
    paper.ragContentHash === contentHash &&
    existing.length > 0 &&
    existing.every((c) => c.embedding && c.embeddingModel === config.model);
  if (upToDate && !options.force) {
    return { paperId, outcome: "unchanged", chunkCount: existing.length, source };
  }

  // Reuse embeddings of chunks whose embedded text is unchanged
  const reusable = new Map<string, Uint8Array<ArrayBuffer>>();
  for (const chunk of existing) {
    if (chunk.embedding && chunk.embeddingModel === config.model) {
      reusable.set(chunk.contentHash, chunk.embedding);
    }
  }

  const drafts = extracted.chunks.map((chunk) => ({
    ...chunk,
    contentHash: sha256(chunkEmbeddingInput(chunk)),
  }));
  const toEmbed = drafts.filter((d) => !reusable.has(d.contentHash));

  const newEmbeddings = new Map<string, Uint8Array<ArrayBuffer>>();
  let embedError: string | undefined;
  try {
    const vectors = await generateEmbeddings(toEmbed.map(chunkEmbeddingInput), config);
    toEmbed.forEach((draft, i) => newEmbeddings.set(draft.contentHash, serializeEmbedding(vectors[i])));
  } catch (error) {
    embedError = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
    console.warn(`Embedding generation failed for paper ${paperId}; storing chunks without embeddings:`, embedError);
  }

  const complete = !embedError || toEmbed.length === 0;
  await db.$transaction([
    db.paperChunk.deleteMany({ where: { paperId } }),
    db.paperChunk.createMany({
      data: drafts.map((draft) => {
        const embedding = reusable.get(draft.contentHash) ?? newEmbeddings.get(draft.contentHash) ?? null;
        return {
          paperId,
          content: draft.content,
          contentHash: draft.contentHash,
          sectionType: draft.sectionType,
          sectionTitle: draft.sectionTitle,
          anchorId: draft.anchorId,
          position: draft.position,
          chunkIndex: draft.chunkIndex,
          startPosition: draft.startPosition,
          endPosition: draft.endPosition,
          tokenCount: draft.tokenCount,
          embedding,
          embeddingModel: embedding ? config.model : null,
          metadata: { source, subsectionTitle: draft.subsectionTitle },
        };
      }),
    }),
    db.paper.update({
      where: { id: paperId },
      data: {
        ragStatus: complete ? "READY" : "CHUNKED",
        ragContentHash: contentHash,
        ragIndexedAt: new Date(),
        ragError: embedError ?? null,
        ragAttempts: complete ? 0 : { increment: 1 },
      },
    }),
  ]);
  invalidatePaperRetrievalCache(paperId);

  return {
    paperId,
    outcome: complete ? "indexed" : "partial",
    chunkCount: drafts.length,
    embeddedCount: drafts.length - (complete ? 0 : toEmbed.length),
    source,
    ...(embedError ? { error: embedError } : {}),
  };
}

/**
 * Embed stored chunks that have no embedding, or one from another model.
 * Used to finish CHUNKED papers and after switching embedding models,
 * without re-fetching the paper.
 */
export async function embedPendingChunks(paperId: string): Promise<IndexResult> {
  const config = getEmbeddingConfig();
  const pending = await db.paperChunk.findMany({
    where: {
      paperId,
      OR: [{ embedding: null }, { embeddingModel: null }, { embeddingModel: { not: config.model } }],
    },
    select: { id: true, content: true, sectionTitle: true },
  });

  if (pending.length > 0) {
    let vectors: number[][];
    try {
      vectors = await generateEmbeddings(pending.map(chunkEmbeddingInput), config);
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
      await db.paper.update({
        where: { id: paperId },
        data: { ragStatus: "CHUNKED", ragError: message, ragAttempts: { increment: 1 } },
      });
      return { paperId, outcome: "partial", error: message };
    }
    await db.$transaction(
      pending.map((chunk, i) =>
        db.paperChunk.update({
          where: { id: chunk.id },
          data: { embedding: serializeEmbedding(vectors[i]), embeddingModel: config.model },
        })
      )
    );
  }

  await db.paper.update({
    where: { id: paperId },
    data: { ragStatus: "READY", ragError: null, ragAttempts: 0, ragIndexedAt: new Date() },
  });
  invalidatePaperRetrievalCache(paperId);
  return { paperId, outcome: "embedded", embeddedCount: pending.length };
}

const inFlight = ((globalThis as unknown as { __sphereRagInFlight?: Map<string, Promise<IndexResult>> })
  .__sphereRagInFlight ??= new Map());

/**
 * Make sure a paper is ready for retrieval, doing only the work that's missing.
 * `force` re-indexes even if the paper looks up to date or has exhausted its
 * retry attempts (used by explicit user/on-demand requests).
 */
export function ensurePaperIndexed(
  paperId: string,
  options: { force?: boolean; signal?: AbortSignal } = {}
): Promise<IndexResult> {
  const running = inFlight.get(paperId);
  if (running) return running;

  const work = (async (): Promise<IndexResult> => {
    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: { ragStatus: true, ragAttempts: true },
    });
    if (!paper) return { paperId, outcome: "not_found" };

    if (!options.force) {
      if (paper.ragStatus === "NO_CONTENT") return { paperId, outcome: "no_content" };
      if (paper.ragAttempts >= MAX_RAG_ATTEMPTS && paper.ragStatus !== "READY") {
        return { paperId, outcome: "gave_up" };
      }
    }

    if (paper.ragStatus === "READY" || paper.ragStatus === "CHUNKED") {
      const model = getEmbeddingConfig().model;
      const stale = await db.paperChunk.count({
        where: {
          paperId,
          OR: [{ embedding: null }, { embeddingModel: null }, { embeddingModel: { not: model } }],
        },
      });
      const total = await db.paperChunk.count({ where: { paperId } });
      if (total > 0 && !options.force) {
        return stale > 0 ? embedPendingChunks(paperId) : { paperId, outcome: "unchanged", chunkCount: total };
      }
    }

    return indexPaper(paperId, options);
  })().finally(() => inFlight.delete(paperId));

  inFlight.set(paperId, work);
  return work;
}
