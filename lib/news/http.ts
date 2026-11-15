/**
 * HTTP helper for news sources: timeout, abort propagation, a descriptive
 * User-Agent, and one retry after a 429 when the server says how long to wait.
 */

import { sleep } from "@/lib/jobs/rate-limit";

export const NEWS_USER_AGENT =
  process.env.NEWS_USER_AGENT || "Sphere/0.1 (+https://github.com/; research news aggregator)";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export interface FetchOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  /** Longest 429 back-off honoured before giving up (default 15 s) */
  maxRetryWaitMs?: number;
}

function retryAfterMs(response: Response): number | null {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  // Reddit sends seconds until reset; GitHub sends an epoch timestamp
  if (Number.isFinite(reset) && reset > 0) return reset > 1e9 ? Math.max(0, reset * 1000 - Date.now()) : reset * 1000;
  return null;
}

export async function fetchResponse(url: string, options: FetchOptions = {}): Promise<Response> {
  const { signal, timeoutMs = 20_000, headers = {}, maxRetryWaitMs = 15_000 } = options;

  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const response = await fetch(url, {
      method: options.method,
      body: options.body,
      headers: { "User-Agent": NEWS_USER_AGENT, ...headers },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      redirect: "follow",
    });
    if (response.ok) return response;

    const wait = response.status === 429 ? retryAfterMs(response) : null;
    if (attempt === 0 && wait !== null && wait <= maxRetryWaitMs && !signal?.aborted) {
      await response.body?.cancel();
      await sleep(wait + 500, signal);
      continue;
    }
    await response.body?.cancel();
    throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, url);
  }
}

export async function fetchText(url: string, options?: FetchOptions): Promise<string> {
  return (await fetchResponse(url, options)).text();
}

export async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
  const response = await fetchResponse(url, {
    ...options,
    headers: { Accept: "application/json", ...options?.headers },
  });
  return (await response.json()) as T;
}
