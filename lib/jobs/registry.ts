/**
 * Job registry and pipelines
 *
 * The hourly "process-papers" pipeline runs fetch → score → index in order;
 * the "process-news" pipeline (every 15 min) runs fetch → cluster → summarize.
 * Each step is isolated: a failed step is recorded and the next still runs
 * (e.g. scoring can catch up on older papers even if arXiv is down).
 * Individual jobs can be disabled with DISABLED_JOBS=job-a,job-b.
 */

import { arxivFetchJob } from "./arxiv-fetch";
import { runJob } from "./job-runner";
import { newsClusteringJob } from "./news-clustering";
import { newsFetchJob } from "./news-fetch";
import { newsSummarizeJob } from "./news-summarize";
import { noveltyScoringJob } from "./novelty-scoring";
import { ragIndexingJob } from "./rag-indexing";
import type { JobDefinition, JobRunSummary, JobTrigger } from "./types";

export const JOBS: Record<string, JobDefinition> = {
  [arxivFetchJob.name]: arxivFetchJob,
  [noveltyScoringJob.name]: noveltyScoringJob,
  [ragIndexingJob.name]: ragIndexingJob,
  [newsFetchJob.name]: newsFetchJob,
  [newsClusteringJob.name]: newsClusteringJob,
  [newsSummarizeJob.name]: newsSummarizeJob,
};

export const PIPELINES: Record<string, string[]> = {
  "process-papers": [arxivFetchJob.name, noveltyScoringJob.name, ragIndexingJob.name],
  "process-news": [newsFetchJob.name, newsClusteringJob.name, newsSummarizeJob.name],
};

export function isKnownJob(name: string): boolean {
  return name in JOBS || name in PIPELINES;
}

function disabledJobs(): Set<string> {
  return new Set(
    (process.env.DISABLED_JOBS || "")
      .split(",")
      .map((j) => j.trim())
      .filter(Boolean)
  );
}

/** Run a single job or a pipeline. Never throws. */
export async function runJobOrPipeline(name: string, trigger: JobTrigger): Promise<JobRunSummary[]> {
  const jobNames = PIPELINES[name] ?? (JOBS[name] ? [name] : []);
  if (jobNames.length === 0) throw new Error(`Unknown job: ${name}`);

  const disabled = disabledJobs();
  const summaries: JobRunSummary[] = [];
  for (const jobName of jobNames) {
    if (disabled.has(jobName)) {
      console.log(`[job:${jobName}] disabled via DISABLED_JOBS, skipping`);
      continue;
    }
    summaries.push(await runJob(JOBS[jobName], trigger));
  }
  return summaries;
}
