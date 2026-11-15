/**
 * Embedding Generation Service (Story 7.3)
 *
 * Providers:
 * - "openai": text-embedding-3-small (default model). Uses OPENAI_API_KEY, or
 *   LLM_API_KEY when LLM_PROVIDER=openai.
 * - "local": deterministic feature-hashing embeddings (word unigrams + bigrams).
 *   No API needed: used in mock mode, with Anthropic (which has no embeddings
 *   API) when no OpenAI key is available, and in tests. It captures lexical
 *   rather than semantic similarity, so retrieval quality is lower.
 *
 * Every stored vector records its model name; vectors from different models are
 * never compared, and the indexer re-embeds chunks when the model changes.
 */

import OpenAI from "openai";

export interface EmbeddingConfig {
  provider: "openai" | "local";
  model: string;
  apiKey?: string;
  /** Default minimum cosine similarity for a chunk to count as relevant */
  minSimilarity: number;
}

const LOCAL_MODEL = "local-hash-v1";
const LOCAL_DIMENSIONS = 512;
/** Inputs per embeddings API request */
const OPENAI_BATCH_SIZE = 96;
/** text-embedding-3 accepts 8191 tokens; stay well below using the 4 chars/token heuristic */
const MAX_INPUT_CHARS = 24000;

export function getEmbeddingConfig(): EmbeddingConfig {
  const requested = process.env.EMBEDDING_PROVIDER;
  const openAiKey =
    process.env.OPENAI_API_KEY ||
    (process.env.LLM_PROVIDER === "openai" ? process.env.LLM_API_KEY : undefined);
  const minSimilarityOverride = Number(process.env.RAG_MIN_SIMILARITY);

  if (requested !== "local" && openAiKey) {
    return {
      provider: "openai",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      apiKey: openAiKey,
      minSimilarity: minSimilarityOverride || 0.25,
    };
  }

  if (requested === "openai") {
    console.warn("EMBEDDING_PROVIDER=openai but no OpenAI API key is set; using local embeddings.");
  }
  return { provider: "local", model: LOCAL_MODEL, minSimilarity: minSimilarityOverride || 0.08 };
}

// ---------------------------------------------------------------------------
// Local feature-hashing embeddings
// ---------------------------------------------------------------------------

/** Anything but Latin (incl. accented) and Greek letters or digits */
const WORD_SEPARATOR = /[^a-z0-9\u00c0-\u024f\u0370-\u03ff]+/;

const STOPWORDS = new Set(
  "a an and are as at be by for from has have in is it its of on or that the this to was were with we our their which these those than then can not".split(
    " "
  )
);

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function localEmbedding(text: string): number[] {
  const vector = new Array<number>(LOCAL_DIMENSIONS).fill(0);
  const tokens = text
    .toLowerCase()
    .split(WORD_SEPARATOR)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  const add = (feature: string, weight: number) => {
    const hash = fnv1a(feature);
    // The top bit picks the sign, reducing the bias from hash collisions
    vector[hash % LOCAL_DIMENSIONS] += hash & 0x80000000 ? -weight : weight;
  };
  tokens.forEach((token, i) => {
    add(token, 1);
    if (i > 0) add(`${tokens[i - 1]} ${token}`, 0.5);
  });

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Embed texts in batches. Returns one vector per input, in order.
 * Throws on API failure; callers decide how to degrade.
 */
export async function generateEmbeddings(
  texts: string[],
  config: EmbeddingConfig = getEmbeddingConfig()
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const inputs = texts.map((t) => (t.trim() || " ").slice(0, MAX_INPUT_CHARS));

  if (config.provider === "local") {
    return inputs.map(localEmbedding);
  }

  // The SDK retries 429/5xx with exponential backoff
  const client = new OpenAI({ apiKey: config.apiKey, maxRetries: 3, timeout: 60_000 });
  const vectors: number[][] = [];
  for (let i = 0; i < inputs.length; i += OPENAI_BATCH_SIZE) {
    const batch = inputs.slice(i, i + OPENAI_BATCH_SIZE);
    const response = await client.embeddings.create({ model: config.model, input: batch });
    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    vectors.push(...ordered.map((d) => d.embedding));
  }
  return vectors;
}

export async function generateEmbedding(
  text: string,
  config: EmbeddingConfig = getEmbeddingConfig()
): Promise<number[]> {
  const [vector] = await generateEmbeddings([text], config);
  return vector;
}

/** Text that is embedded for a chunk: section context improves retrieval */
export function chunkEmbeddingInput(chunk: {
  content: string;
  sectionTitle: string | null;
}): string {
  return chunk.sectionTitle ? `${chunk.sectionTitle}\n\n${chunk.content}` : chunk.content;
}
