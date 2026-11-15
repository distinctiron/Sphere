/**
 * Automated Novelty Scoring Job (Story 6.3)
 *
 * Pre-computes novelty scores and summaries for unscored papers so users see
 * them immediately at login. Papers are scored concurrently in bounded
 * batches; a failure only affects that paper, which is retried on later runs
 * with exponential backoff until MAX_ATTEMPTS is reached.
 */

import { db } from "@/lib/db";
import { isLLMConfigured, scoreNovelty } from "@/lib/llm";
import { recordUsage } from "@/lib/billing/usage";
import { isTransientError, mapWithConcurrency } from "./rate-limit";
import type { JobContext, JobDefinition, JobResult } from "./types";

export const MAX_SCORING_ATTEMPTS = 5;
/** Stop the run after this many consecutive rate-limit/availability errors */
const CIRCUIT_BREAKER_THRESHOLD = 3;

function getConfig() {
  return {
    maxPerRun: Number(process.env.NOVELTY_SCORING_MAX_PER_RUN) || 100,
    concurrency: Number(process.env.NOVELTY_SCORING_CONCURRENCY) || 5,
  };
}

/** Delay before retrying a paper that has failed `attempts` times: 1h, 2h, 4h, 8h */
export function scoringRetryDelayMs(attempts: number): number {
  return attempts <= 0 ? 0 : 60 * 60 * 1000 * 2 ** (attempts - 1);
}

async function run({ logger, signal }: JobContext): Promise<JobResult> {
  if (!isLLMConfigured()) {
    // Mock scores are placeholders; persisting them would hide the papers from
    // real scoring once an API key is configured.
    logger.warn("LLM provider not configured (mock mode); skipping scoring");
    return { itemsProcessed: 0, itemsFailed: 0, details: { skipped: "LLM not configured" } };
  }

  const config = getConfig();
  const now = Date.now();

  const candidates = await db.paper.findMany({
    where: { noveltyScore: null, scoringAttempts: { lt: MAX_SCORING_ATTEMPTS } },
    orderBy: [{ scoringAttempts: "asc" }, { createdAt: "desc" }],
    take: config.maxPerRun * 2,
    select: {
      id: true,
      title: true,
      abstract: true,
      authors: true,
      categories: true,
      scoringAttempts: true,
      lastScoringAttemptAt: true,
    },
  });

  const due = candidates
    .filter(
      (p) =>
        !p.lastScoringAttemptAt ||
        now - p.lastScoringAttemptAt.getTime() >= scoringRetryDelayMs(p.scoringAttempts)
    )
    .slice(0, config.maxPerRun);

  if (due.length === 0) {
    logger.info("no papers awaiting scoring");
    return { itemsProcessed: 0, itemsFailed: 0, details: { awaiting: 0 } };
  }

  let consecutiveTransientFailures = 0;
  let circuitOpen = false;
  let configError: unknown;
  const failedPaperIds: string[] = [];

  const results = await mapWithConcurrency(
    due,
    config.concurrency,
    async (paper) => {
      try {
        const result = await scoreNovelty(
          paper.title,
          paper.abstract,
          Array.isArray(paper.authors) ? (paper.authors as Array<{ name: string }>) : [],
          Array.isArray(paper.categories) ? (paper.categories as string[]) : [],
          // Shared background work: recorded as platform cost, never charged to users
          (usage) => void recordUsage({ feature: "novelty-score", billing: "PLATFORM", usage, paperId: paper.id })
        );
        consecutiveTransientFailures = 0;
        // Guard on noveltyScore: null so a manual score set meanwhile isn't overwritten
        await db.paper.updateMany({
          where: { id: paper.id, noveltyScore: null },
          data: {
            noveltyScore: result.score,
            noveltySummary: result.summary,
            scoringError: null,
            lastScoringAttemptAt: new Date(),
          },
        });
      } catch (error) {
        // Bad credentials / permissions: not the paper's fault, so don't count
        // an attempt against it; stop the run and report it as failed
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) {
          configError ??= error;
          circuitOpen = true;
          throw error;
        }
        if (isTransientError(error)) {
          consecutiveTransientFailures++;
          if (consecutiveTransientFailures >= CIRCUIT_BREAKER_THRESHOLD && !circuitOpen) {
            circuitOpen = true;
            logger.warn("LLM unavailable or rate limited; stopping this run early", { error });
          }
        }
        failedPaperIds.push(paper.id);
        logger.warn("scoring failed, will retry later", {
          paperId: paper.id,
          attempt: paper.scoringAttempts + 1,
          error,
        });
        await db.paper.update({
          where: { id: paper.id },
          data: {
            scoringAttempts: { increment: 1 },
            lastScoringAttemptAt: new Date(),
            scoringError: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
          },
        });
        throw error;
      }
    },
    () => circuitOpen || signal.aborted
  );

  if (configError) {
    throw new Error(
      `LLM authentication failed; check LLM_API_KEY: ${configError instanceof Error ? configError.message : String(configError)}`
    );
  }

  const scored = results.filter((r) => r?.status === "fulfilled").length;
  const notAttempted = results.filter((r) => r === undefined).length;

  return {
    itemsProcessed: scored,
    itemsFailed: failedPaperIds.length,
    details: {
      due: due.length,
      scored,
      failed: failedPaperIds.length,
      notAttempted,
      circuitBreakerTripped: circuitOpen,
      ...(failedPaperIds.length > 0 ? { failedPaperIds: failedPaperIds.slice(0, 50) } : {}),
    },
  };
}

export const noveltyScoringJob: JobDefinition = {
  name: "novelty-scoring",
  description: "Pre-compute novelty scores and summaries for unscored papers",
  timeoutMs: 20 * 60 * 1000,
  run,
};
