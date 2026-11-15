import type { JobLogger } from "@/lib/jobs/logger";
import type { TopicConfig } from "../topics";
import type { NewsSourceId, RawNewsItem } from "../types";

export interface SourceContext {
  logger: JobLogger;
  signal: AbortSignal;
  /** Only items published after this are wanted */
  since: Date;
}

export interface NewsSource {
  id: NewsSourceId;
  /** null when usable; otherwise why the source is off (missing config) */
  disabledReason(): string | null;
  fetch(topic: TopicConfig, ctx: SourceContext): Promise<SourceResult>;
}

export interface SourceResult {
  items: RawNewsItem[];
  /** Partial failures (one feed/subreddit/query down) that didn't stop the source */
  errors: string[];
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
