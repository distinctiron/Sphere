/**
 * Rate limiting helpers shared by background jobs
 */

/** Resolves after `ms`, or immediately when the signal is aborted */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done);
  });
}

/**
 * Enforces a minimum interval between calls (e.g. arXiv asks for one API
 * request every 3 seconds). Calls are serialized in order.
 */
export function createIntervalThrottle(minIntervalMs: number) {
  let nextSlot = 0;
  return async function throttle(signal?: AbortSignal): Promise<void> {
    const now = Date.now();
    const wait = Math.max(0, nextSlot - now);
    nextSlot = Math.max(now, nextSlot) + minIntervalMs;
    if (wait > 0) await sleep(wait, signal);
  };
}

/**
 * Runs `worker` over `items` with at most `concurrency` in flight.
 * Individual failures are captured (Promise.allSettled semantics) so one bad
 * item never stops the batch. Stops scheduling new items once `shouldStop`
 * returns true (used for time budgets and circuit breakers).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
  shouldStop: () => boolean = () => false
): Promise<Array<PromiseSettledResult<R> | undefined>> {
  // Dense array: unattempted items must be real `undefined` entries (not holes) so filters see them
  const results: Array<PromiseSettledResult<R> | undefined> = Array.from({ length: items.length }, () => undefined);
  let cursor = 0;

  async function lane() {
    while (cursor < items.length && !shouldStop()) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, lane));
  return results;
}

/** True for errors worth retrying later (rate limits, server errors, network issues) */
export function isTransientError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (typeof status === "number") return status === 408 || status === 429 || status >= 500;
  const name = (error as { name?: string })?.name;
  return name === "AbortError" || name === "TimeoutError" || name === "FetchError" || name === "TypeError";
}
