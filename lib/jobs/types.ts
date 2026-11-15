/**
 * Scheduled Job Types
 *
 * A job is a named unit of background work (arXiv fetching, novelty scoring,
 * RAG indexing). Jobs are executed through runJob() which handles locking,
 * logging and status tracking, so job implementations only contain their
 * own business logic.
 */

import type { JobLogger } from "./logger";

export type JobTrigger = "scheduler" | "http" | "cli";

export interface JobContext {
  runId: string;
  trigger: JobTrigger;
  logger: JobLogger;
  /** Aborted when the job exceeds its time budget; long loops should check it */
  signal: AbortSignal;
}

export interface JobResult {
  itemsProcessed: number;
  itemsFailed: number;
  details?: Record<string, unknown>;
}

export interface JobDefinition {
  name: string;
  description: string;
  /**
   * Maximum time a run may hold the lock. If a process crashes mid-run the
   * lock expires after this long and the next run can proceed.
   */
  timeoutMs: number;
  run(ctx: JobContext): Promise<JobResult>;
}

export interface JobRunSummary {
  jobName: string;
  runId: string | null;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  durationMs: number;
  itemsProcessed: number;
  itemsFailed: number;
  details?: Record<string, unknown>;
  error?: string;
}
