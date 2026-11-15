/**
 * RAG query helpers (Stories 7.5 / 7.6): turn retrieved chunks into numbered
 * citations and prompt context, build retrieval queries for multi-turn chat,
 * and keep conversation history within a token budget.
 */

import { estimateTokens } from "./chunker";
import type { Citation, RetrievedChunk, SectionType } from "./types";

export type ChatTurn = { role: "user" | "assistant"; content: string };

const SECTION_LABELS: Record<SectionType, string> = {
  abstract: "Abstract",
  introduction: "Introduction",
  methods: "Methods",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion",
  other: "Other",
};

export function sectionLabel(type: SectionType): string {
  return SECTION_LABELS[type] ?? "Other";
}

/** Retrieved chunks → numbered citations, in paper order for readability */
export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return [...chunks]
    .sort((a, b) => a.position - b.position)
    .map((chunk, i) => ({
      id: i + 1,
      chunkId: chunk.id,
      sectionType: chunk.sectionType,
      sectionTitle: chunk.sectionTitle,
      anchorId: chunk.anchorId,
      relevance: chunk.similarity,
      content: chunk.content,
    }));
}

/** Numbered source passages for the LLM prompt */
export function formatSourcesForPrompt(citations: Citation[]): string {
  return citations
    .map((c) => {
      const heading = c.sectionTitle ? `${c.sectionTitle} (${sectionLabel(c.sectionType)})` : sectionLabel(c.sectionType);
      return `[${c.id}] ${heading}\n${c.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Query used to retrieve chunks for a chat turn. Short follow-ups ("why?",
 * "how does that compare?") carry little meaning on their own, so the previous
 * user question is appended to keep retrieval anchored in the conversation.
 */
export function buildRetrievalQuery(message: string, history: ChatTurn[]): string {
  const previousQuestion = [...history].reverse().find((m) => m.role === "user")?.content;
  if (!previousQuestion) return message;
  const isShortFollowUp = message.trim().split(/\s+/).length < 12;
  return isShortFollowUp ? `${message}\n\n(Follow-up to: ${previousQuestion.slice(0, 500)})` : message;
}

/**
 * Keep the most recent turns that fit the budget, always starting with a user
 * turn so provider APIs that require alternating roles accept it.
 */
export function trimHistory(history: ChatTurn[], maxTokens = 6000, maxTurns = 12): ChatTurn[] {
  const kept: ChatTurn[] = [];
  let tokens = 0;
  for (let i = history.length - 1; i >= 0 && kept.length < maxTurns; i--) {
    const cost = estimateTokens(history[i].content);
    if (tokens + cost > maxTokens) break;
    kept.unshift(history[i]);
    tokens += cost;
  }
  while (kept.length > 0 && kept[0].role !== "user") kept.shift();
  return kept;
}
