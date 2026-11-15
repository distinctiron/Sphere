/**
 * Story clustering (Story 8.3)
 *
 * Each new item joins an existing story when:
 *   1. another item of an active story links to the same canonical URL, or
 *   2. its embedding is close enough to a recent story's centroid;
 * otherwise it starts a new story. Centroids are running means of the
 * (unit-length) item vectors.
 */

import { cosineSimilarity } from "@/lib/rag/vector-search";

export interface ClusterStory {
  id: string;
  centroid: Float32Array | number[];
  itemCount: number;
  lastSeenAt: Date;
}

export interface ClusterItem {
  canonicalUrl: string;
  vector: ArrayLike<number>;
  publishedAt: Date;
}

export type Assignment =
  | { kind: "url"; storyId: string }
  | { kind: "similar"; storyId: string; similarity: number }
  | { kind: "new" };

/** Stories only absorb items published within this many hours of their latest item */
export const CLUSTER_WINDOW_HOURS = 48;

/**
 * Default similarity thresholds per embedding model. Titles about the same
 * event score ~0.6-0.8 with OpenAI embeddings; the lexical local embeddings
 * give lower scores, but unrelated titles score far lower still.
 */
export function clusterThreshold(embeddingModel: string): number {
  const override = Number(process.env.NEWS_CLUSTER_THRESHOLD);
  if (override > 0) return override;
  return embeddingModel.startsWith("local") ? 0.4 : 0.62;
}

/** Text embedded for an item: the title carries almost all of the signal */
export function itemEmbeddingInput(item: { title: string; snippet?: string | null }): string {
  const snippet = item.snippet?.slice(0, 200);
  return snippet ? `${item.title}\n${snippet}` : item.title;
}

export function assignToStory(
  item: ClusterItem,
  stories: ClusterStory[],
  storyByUrl: Map<string, string>,
  threshold: number
): Assignment {
  const urlMatch = storyByUrl.get(item.canonicalUrl);
  if (urlMatch) return { kind: "url", storyId: urlMatch };

  const windowMs = CLUSTER_WINDOW_HOURS * 3_600_000;
  let best: { id: string; similarity: number } | null = null;
  for (const story of stories) {
    if (Math.abs(item.publishedAt.getTime() - story.lastSeenAt.getTime()) > windowMs) continue;
    const similarity = cosineSimilarity(item.vector, story.centroid);
    if (similarity >= threshold && (!best || similarity > best.similarity)) {
      best = { id: story.id, similarity };
    }
  }
  return best ? { kind: "similar", storyId: best.id, similarity: best.similarity } : { kind: "new" };
}

/** Running mean of the story's item vectors after adding one more */
export function updateCentroid(centroid: ArrayLike<number>, itemCount: number, vector: ArrayLike<number>): Float32Array {
  const next = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    next[i] = (centroid[i] * itemCount + vector[i]) / (itemCount + 1);
  }
  return next;
}

export interface MergeCandidate extends ClusterStory {
  firstSeenAt: Date;
}

/**
 * Items arriving in a different order can split one event into several
 * stories. Plans merges of stories whose centroids are as similar as an item
 * must be to join a story; smaller stories fold into the largest. Returns
 * [keepId, mergeId] pairs, applied in order. The kept stories' centroid,
 * itemCount and lastSeenAt are updated in place to reflect the merges.
 */
export function planMerges(stories: MergeCandidate[], threshold: number): Array<[string, string]> {
  const windowMs = CLUSTER_WINDOW_HOURS * 3_600_000;
  const sorted = [...stories].sort((a, b) => b.itemCount - a.itemCount || a.firstSeenAt.getTime() - b.firstSeenAt.getTime());
  const merged = new Set<string>();
  const merges: Array<[string, string]> = [];

  for (let i = 0; i < sorted.length; i++) {
    const keep = sorted[i];
    if (merged.has(keep.id)) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const other = sorted[j];
      if (merged.has(other.id)) continue;
      if (Math.abs(keep.lastSeenAt.getTime() - other.lastSeenAt.getTime()) > windowMs) continue;
      if (cosineSimilarity(keep.centroid, other.centroid) >= threshold) {
        merges.push([keep.id, other.id]);
        merged.add(other.id);
        // The kept story's centroid absorbs the other's for later comparisons
        const total = keep.itemCount + other.itemCount;
        const centroid = new Float32Array(keep.centroid.length);
        for (let k = 0; k < centroid.length; k++) {
          centroid[k] = (keep.centroid[k] * keep.itemCount + other.centroid[k] * other.itemCount) / total;
        }
        keep.centroid = centroid;
        keep.itemCount = total;
        if (other.lastSeenAt > keep.lastSeenAt) keep.lastSeenAt = other.lastSeenAt;
      }
    }
  }
  return merges;
}
