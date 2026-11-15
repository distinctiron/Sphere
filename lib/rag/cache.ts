/**
 * Small in-memory LRU cache with TTL, used for query embeddings, per-paper
 * chunk vectors and retrieval results. Stored on globalThis so dev-mode hot
 * reloads don't leak new caches.
 */

export class LruCache<V> {
  private entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(private maxEntries: number, private ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh recency
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  deleteWhere(predicate: (key: string) => boolean): void {
    for (const key of Array.from(this.entries.keys())) {
      if (predicate(key)) this.entries.delete(key);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

const globalCaches = globalThis as unknown as { __sphereRagCaches?: Map<string, LruCache<unknown>> };

export function sharedCache<V>(name: string, maxEntries: number, ttlMs: number): LruCache<V> {
  globalCaches.__sphereRagCaches ??= new Map();
  let cache = globalCaches.__sphereRagCaches.get(name);
  if (!cache) {
    cache = new LruCache<unknown>(maxEntries, ttlMs);
    globalCaches.__sphereRagCaches.set(name, cache);
  }
  return cache as LruCache<V>;
}
