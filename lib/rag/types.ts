/**
 * RAG types shared between server code and client components.
 * Keep this file free of server-only imports.
 */

export const SECTION_TYPES = [
  "abstract",
  "introduction",
  "methods",
  "results",
  "discussion",
  "conclusion",
  "other",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** A chunk produced by the chunker, before it is stored */
export interface ChunkDraft {
  content: string;
  sectionType: SectionType;
  sectionTitle: string | null;
  anchorId: string | null;
  /** Order within the whole paper */
  position: number;
  /** Order within its section */
  chunkIndex: number;
  /** Character offsets into the extracted plain text */
  startPosition: number;
  endPosition: number;
  tokenCount: number;
}

/** A chunk returned by retrieval */
export interface RetrievedChunk {
  id: string;
  content: string;
  sectionType: SectionType;
  sectionTitle: string | null;
  anchorId: string | null;
  position: number;
  /** Cosine similarity to the query (0-1 in practice) */
  similarity: number;
  /** Final ranking score (equals similarity unless hybrid ranking was used) */
  score: number;
}

/** Citation sent to the client alongside a streamed answer */
export interface Citation {
  /** 1-based number used in the answer text, e.g. [2] */
  id: number;
  chunkId: string;
  sectionType: SectionType;
  sectionTitle: string | null;
  anchorId: string | null;
  /** Relevance 0-1 */
  relevance: number;
  content: string;
}
