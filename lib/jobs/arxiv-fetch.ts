/**
 * arXiv Fetching Job (Story 6.2)
 *
 * Fetches newly announced Computer Science and Physics papers into the shared
 * papers table (papers are not user-specific).
 *
 * Why a lookback window instead of "submitted in the last hour": arXiv only
 * exposes papers once they are announced (daily batches), by which time they
 * were submitted 1-3 days earlier. A strict last-hour window would almost
 * always be empty. Instead each run queries submittedDate over a lookback
 * window, newest first, and pages until a page contains no new papers.
 * Deduplication by arxiv_id makes re-reading the window cheap and safe.
 *
 * If the previous run didn't finish scanning (page cap, arXiv error, time
 * budget) or there is no previous run, the early stop is disabled so the rest
 * of the window is backfilled instead of being skipped.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildSubmittedDateQuery, searchArxiv, type ParsedPaper } from "@/lib/arxiv";
import { createIntervalThrottle } from "./rate-limit";
import type { JobContext, JobDefinition, JobResult } from "./types";

const PAGE_SIZE = 200;
const COMPLETE_STOP_REASONS = ["caught up with stored papers", "end of results"];
// arXiv API terms of use: no more than one request every 3 seconds
const arxivThrottle = createIntervalThrottle(3000);

function getConfig() {
  const categories = (process.env.ARXIV_FETCH_CATEGORIES || "cs.*,physics.*")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  return {
    categories,
    lookbackHours: Number(process.env.ARXIV_FETCH_LOOKBACK_HOURS) || 96,
    maxPages: Number(process.env.ARXIV_FETCH_MAX_PAGES) || 30,
  };
}

export interface UpsertStats {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
}

function hasChanged(
  existing: {
    title: string;
    abstract: string;
    updatedDate: Date;
    pdfUrl: string;
    authors: Prisma.JsonValue;
    categories: Prisma.JsonValue;
  },
  paper: ParsedPaper
): boolean {
  return (
    existing.title !== paper.title ||
    existing.abstract !== paper.abstract ||
    existing.updatedDate.getTime() !== paper.updatedDate.getTime() ||
    existing.pdfUrl !== paper.pdfUrl ||
    JSON.stringify(existing.authors) !== JSON.stringify(paper.authors) ||
    JSON.stringify(existing.categories) !== JSON.stringify(paper.categories)
  );
}

function toCreateInput(paper: ParsedPaper): Prisma.PaperCreateManyInput {
  return {
    arxivId: paper.arxivId,
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    publicationDate: paper.publicationDate,
    updatedDate: paper.updatedDate,
    categories: paper.categories,
    pdfUrl: paper.pdfUrl,
    htmlUrl: paper.htmlUrl,
  };
}

/**
 * Insert new papers and update existing ones whose metadata changed.
 * Papers whose content changed are queued for RAG re-indexing.
 */
export async function upsertPapers(papers: ParsedPaper[]): Promise<UpsertStats> {
  const stats: UpsertStats = { created: 0, updated: 0, unchanged: 0, failed: 0 };
  const unique = Array.from(new Map(papers.map((p) => [p.arxivId, p])).values());
  if (unique.length === 0) return stats;

  const existing = await db.paper.findMany({
    where: { arxivId: { in: unique.map((p) => p.arxivId) } },
    select: {
      id: true,
      arxivId: true,
      title: true,
      abstract: true,
      updatedDate: true,
      pdfUrl: true,
      authors: true,
      categories: true,
    },
  });
  const existingById = new Map(existing.map((p) => [p.arxivId, p]));

  const toCreate = unique.filter((p) => !existingById.has(p.arxivId));
  if (toCreate.length > 0) {
    try {
      const result = await db.paper.createMany({ data: toCreate.map(toCreateInput) });
      stats.created += result.count;
    } catch {
      // A concurrent writer (e.g. the legacy on-login fetch) may have inserted
      // some of these; fall back to row-by-row inserts and skip duplicates.
      for (const paper of toCreate) {
        try {
          await db.paper.create({ data: toCreateInput(paper) });
          stats.created++;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            stats.unchanged++;
          } else {
            stats.failed++;
            console.error(`Failed to insert paper ${paper.arxivId}:`, error);
          }
        }
      }
    }
  }

  for (const paper of unique) {
    const current = existingById.get(paper.arxivId);
    if (!current) continue;
    if (!hasChanged(current, paper)) {
      stats.unchanged++;
      continue;
    }
    try {
      const contentChanged = current.updatedDate.getTime() !== paper.updatedDate.getTime();
      await db.paper.update({
        where: { id: current.id },
        data: {
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          updatedDate: paper.updatedDate,
          categories: paper.categories,
          pdfUrl: paper.pdfUrl,
          htmlUrl: paper.htmlUrl,
          ...(contentChanged ? { ragStatus: "PENDING", ragAttempts: 0, ragError: null } : {}),
        },
      });
      stats.updated++;
    } catch (error) {
      stats.failed++;
      console.error(`Failed to update paper ${paper.arxivId}:`, error);
    }
  }

  return stats;
}

/** True when the last completed run scanned until it caught up (so early stopping is safe) */
async function previousRunCaughtUp(currentRunId: string): Promise<boolean> {
  const previous = await db.jobRun.findFirst({
    where: { jobName: "arxiv-fetch", status: { in: ["COMPLETED", "FAILED"] }, id: { not: currentRunId } },
    orderBy: { startedAt: "desc" },
    select: { status: true, details: true },
  });
  const stopReason = (previous?.details as { stopReason?: string } | null)?.stopReason;
  return previous?.status === "COMPLETED" && !!stopReason && COMPLETE_STOP_REASONS.includes(stopReason);
}

async function run({ runId, logger, signal }: JobContext): Promise<JobResult> {
  const config = getConfig();
  const backfill = !(await previousRunCaughtUp(runId));
  const to = new Date();
  const from = new Date(to.getTime() - config.lookbackHours * 60 * 60 * 1000);
  const searchQuery = buildSubmittedDateQuery(config.categories, from, to);

  const totals: UpsertStats = { created: 0, updated: 0, unchanged: 0, failed: 0 };
  let pagesFetched = 0;
  let totalResults = 0;
  let stopReason = "max pages reached";
  let fetchError: string | undefined;

  logger.info("querying arXiv", { searchQuery, maxPages: config.maxPages, backfill });

  for (let page = 0; page < config.maxPages; page++) {
    if (signal.aborted) {
      stopReason = "time budget exhausted";
      break;
    }
    await arxivThrottle(signal);

    let result;
    try {
      result = await searchArxiv({ searchQuery, start: page * PAGE_SIZE, maxResults: PAGE_SIZE, signal });
    } catch (error) {
      // Nothing fetched at all: report the run as failed. Otherwise keep the
      // partial results; the next scheduled run picks up the rest.
      if (pagesFetched === 0) throw error;
      fetchError = error instanceof Error ? error.message : String(error);
      logger.warn("page fetch failed, keeping partial results", { page, error });
      stopReason = "arXiv error";
      break;
    }

    pagesFetched++;
    totalResults = result.totalResults;
    const stats = await upsertPapers(result.papers);
    totals.created += stats.created;
    totals.updated += stats.updated;
    totals.unchanged += stats.unchanged;
    totals.failed += stats.failed;
    logger.info("page processed", { page, fetched: result.papers.length, ...stats });

    if (result.papers.length === 0 || (page + 1) * PAGE_SIZE >= result.totalResults) {
      stopReason = "end of results";
      break;
    }
    // Results are newest-first: a page with nothing new means we've caught up
    if (stats.created === 0 && !backfill) {
      stopReason = "caught up with stored papers";
      break;
    }
  }

  if (stopReason === "max pages reached") {
    logger.warn("stopped at ARXIV_FETCH_MAX_PAGES; remaining papers will be fetched next run", {
      maxPages: config.maxPages,
    });
  }

  return {
    itemsProcessed: totals.created + totals.updated,
    itemsFailed: totals.failed,
    details: {
      newPapers: totals.created,
      updatedPapers: totals.updated,
      unchangedPapers: totals.unchanged,
      pagesFetched,
      totalResultsInWindow: totalResults,
      windowFrom: from.toISOString(),
      windowTo: to.toISOString(),
      categories: config.categories,
      backfill,
      stopReason,
      ...(fetchError ? { fetchError } : {}),
    },
  };
}

export const arxivFetchJob: JobDefinition = {
  name: "arxiv-fetch",
  description: "Fetch newly announced cs.* and physics.* papers from arXiv",
  timeoutMs: 15 * 60 * 1000,
  run,
};
