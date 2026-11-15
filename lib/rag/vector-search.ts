/**
 * Vector storage helpers and similarity search.
 *
 * Embeddings are stored as little-endian Float32 bytes in paper_chunks.embedding
 * (1536 dims ≈ 6 KB vs ≈ 30 KB as JSON). Retrieval is always scoped to a single
 * paper (tens of chunks), so exact brute-force cosine similarity is both fast
 * (well under a millisecond) and more accurate than an approximate index; this
 * keeps the local-first SQLite setup free of native vector extensions.
 * If cross-paper search is ever needed, this module is the seam to swap in
 * sqlite-vec or a dedicated vector database.
 */

export function serializeEmbedding(vector: ArrayLike<number>): Uint8Array<ArrayBuffer> {
  return new Uint8Array(Float32Array.from(vector).buffer);
}

export function deserializeEmbedding(bytes: Uint8Array): Float32Array {
  // Copy into a fresh buffer: the source may not be 4-byte aligned
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Float32Array(copy.buffer);
}

export function cosineSimilarity(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface VectorItem<T> {
  vector: Float32Array;
  item: T;
}

/** Rank items by cosine similarity to the query, highest first */
export function rankBySimilarity<T>(
  query: ArrayLike<number>,
  items: VectorItem<T>[]
): Array<{ item: T; similarity: number }> {
  return items
    .map(({ vector, item }) => ({ item, similarity: cosineSimilarity(query, vector) }))
    .sort((a, b) => b.similarity - a.similarity);
}
