/**
 * Server-side orchestration used by the explain and chat routes: make sure a
 * paper is indexed (bounded wait), retrieve context, and degrade gracefully.
 * Never throws: RAG problems fall back to non-RAG context.
 */

import { extractDocument } from "./chunker";
import { ensurePaperIndexed, fetchPaperHtml } from "./indexer";
import { toCitations } from "./query";
import {
  retrieveForSelection,
  retrieveOverviewChunks,
  retrieveRelevantChunks,
  type RetrievalStatus,
} from "./retriever";
import type { Citation } from "./types";

export type RagContextStatus = RetrievalStatus | "error";

export interface RagContext {
  status: RagContextStatus;
  citations: Citation[];
}

/** Wait for indexing at most `ms`; indexing keeps running in the background after that */
async function waitForIndex(paperId: string, ms: number): Promise<void> {
  const indexing = ensurePaperIndexed(paperId).catch((error) => {
    console.error(`RAG indexing failed for paper ${paperId}:`, error);
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([indexing, new Promise((resolve) => (timer = setTimeout(resolve, ms)))]);
  clearTimeout(timer);
}

export async function getSelectionContext(
  paperId: string,
  selectedText: string,
  surroundingText: string | undefined
): Promise<RagContext> {
  try {
    await waitForIndex(paperId, Number(process.env.RAG_EXPLAIN_INDEX_WAIT_MS) || 8000);
    const result = await retrieveForSelection(paperId, selectedText, { surroundingText, topK: 3 });
    return { status: result.status, citations: toCitations(result.chunks) };
  } catch (error) {
    console.error(`RAG retrieval failed for paper ${paperId}; explaining without context:`, error);
    return { status: "error", citations: [] };
  }
}

export async function getChatContext(paperId: string, retrievalQuery: string): Promise<RagContext> {
  const topK = Number(process.env.RAG_CHAT_TOP_K) || 4;
  try {
    await waitForIndex(paperId, Number(process.env.RAG_CHAT_INDEX_WAIT_MS) || 20000);
    let result = await retrieveRelevantChunks(paperId, retrievalQuery, { topK });
    if (result.status === "no_match") {
      // Broad questions ("summarize this") match no single passage well;
      // ground them in an overview of the paper instead.
      result = await retrieveOverviewChunks(paperId, topK);
    }
    return { status: result.status, citations: toCitations(result.chunks) };
  } catch (error) {
    console.error(`RAG retrieval failed for paper ${paperId}; using fallback context:`, error);
    return { status: "error", citations: [] };
  }
}

/**
 * Fallback when retrieval is unavailable: the paper's extracted plain text
 * (far smaller than raw HTML), truncated to stay within model context limits.
 */
export async function getFullTextFallback(htmlUrl: string, maxChars = 60000): Promise<string | undefined> {
  try {
    const html = await fetchPaperHtml(htmlUrl);
    if (!html) return undefined;
    const { text } = extractDocument(html);
    return text.length > maxChars ? `${text.slice(0, maxChars)}\n[... content truncated for length ...]` : text;
  } catch (error) {
    console.warn("Failed to fetch paper content for fallback context:", error);
    return undefined;
  }
}
