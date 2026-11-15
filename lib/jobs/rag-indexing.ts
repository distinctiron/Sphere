/**
 * RAG Indexing Job (Stories 7.2/7.3: "chunking can be triggered when a paper is
 * first fetched or on-demand")
 *
 * Chunks and embeds papers ahead of time so chat and Intellisense can use
 * retrieval immediately. Papers users engaged with (library, opened) go first,
 * then the newest papers (disable with RAG_PREINDEX_NEW_PAPERS=false).
 * Failed papers are retried with backoff up to MAX_RAG_ATTEMPTS.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MAX_RAG_ATTEMPTS, ensurePaperIndexed, type IndexResult } from "@/lib/rag/indexer";
import { createIntervalThrottle, mapWithConcurrency } from "./rate-limit";
import type { JobContext, JobDefinition, JobResult } from "./types";

// Be polite to arxiv.org when fetching HTML renderings
const htmlThrottle = createIntervalThrottle(1000);

function getConfig() {
  return {
    maxPerRun: Number(process.env.RAG_INDEX_MAX_PER_RUN) || 25,
    concurrency: Number(process.env.RAG_INDEX_CONCURRENCY) || 2,
    preindexNew: process.env.RAG_PREINDEX_NEW_PAPERS !== "false",
  };
}

/** Delay before retrying a failed paper: 1h, 2h, 4h, 8h */
function retryDelayMs(attempts: number): number {
  return attempts <= 0 ? 0 : 60 * 60 * 1000 * 2 ** (attempts - 1);
}

const needsIndexing: Prisma.PaperWhereInput = {
  ragStatus: { in: ["PENDING", "FAILED", "CHUNKED"] },
  ragAttempts: { lt: MAX_RAG_ATTEMPTS },
};

async function selectPapers(maxPerRun: number, preindexNew: boolean): Promise<string[]> {
  const select = { id: true, ragAttempts: true, updatedAt: true } as const;
  const engaged = await db.paper.findMany({
    where: {
      ...needsIndexing,
      userStates: { some: { OR: [{ inLibrary: true }, { status: { in: ["BEING_PROCESSED", "READ"] } }] } },
    },
    orderBy: { updatedAt: "desc" },
    take: maxPerRun * 2,
    select,
  });
  const fresh = preindexNew
    ? await db.paper.findMany({
        where: needsIndexing,
        orderBy: { createdAt: "desc" },
        take: maxPerRun * 2,
        select,
      })
    : [];

  const now = Date.now();
  const due = [...engaged, ...fresh].filter(
    (p) => p.ragAttempts === 0 || now - p.updatedAt.getTime() >= retryDelayMs(p.ragAttempts)
  );
  return Array.from(new Set(due.map((p) => p.id))).slice(0, maxPerRun);
}

async function run({ logger, signal }: JobContext): Promise<JobResult> {
  const config = getConfig();
  const paperIds = await selectPapers(config.maxPerRun, config.preindexNew);
  if (paperIds.length === 0) {
    logger.info("no papers awaiting indexing");
    return { itemsProcessed: 0, itemsFailed: 0, details: { due: 0 } };
  }

  const outcomes: Record<string, number> = {};
  const results = await mapWithConcurrency(
    paperIds,
    config.concurrency,
    async (paperId): Promise<IndexResult> => {
      await htmlThrottle(signal);
      const result = await ensurePaperIndexed(paperId, { signal });
      outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
      if (result.outcome === "failed" || result.outcome === "partial") {
        logger.warn("indexing incomplete, will retry later", { paperId, outcome: result.outcome, error: result.error });
      }
      return result;
    },
    () => signal.aborted
  );

  const failed = results.filter(
    (r) => r?.status === "rejected" || (r?.status === "fulfilled" && ["failed", "partial"].includes(r.value.outcome))
  ).length;
  results.forEach((r, i) => {
    if (r?.status === "rejected") logger.error("indexing error", { paperId: paperIds[i], error: r.reason });
  });

  return {
    itemsProcessed: results.filter((r) => r?.status === "fulfilled").length - failed,
    itemsFailed: failed,
    details: { due: paperIds.length, outcomes, notAttempted: results.filter((r) => r === undefined).length },
  };
}

export const ragIndexingJob: JobDefinition = {
  name: "rag-indexing",
  description: "Chunk and embed papers for retrieval-augmented chat and explanations",
  timeoutMs: 20 * 60 * 1000,
  run,
};
