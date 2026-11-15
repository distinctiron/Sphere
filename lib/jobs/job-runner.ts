/**
 * Job execution engine
 *
 * runJob() wraps a job with:
 * - a lock so the same job never runs twice concurrently
 * - a JobRun record (RUNNING → COMPLETED / FAILED / SKIPPED) for monitoring
 * - structured start/finish/error logging with duration metrics
 * - a time budget (AbortSignal) so runs finish before their lock expires
 *
 * It never throws: failures are recorded and returned, so one failing job
 * cannot crash the scheduler or block other jobs.
 */

import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { acquireJobLock, releaseJobLock } from "./lock";
import { createJobLogger } from "./logger";
import type { JobDefinition, JobRunSummary, JobTrigger } from "./types";

/** Share of the timeout after which the job is asked to wrap up */
const SOFT_TIMEOUT_RATIO = 0.9;

function toJson(value: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

export async function runJob(job: JobDefinition, trigger: JobTrigger): Promise<JobRunSummary> {
  const owner = randomUUID();
  const startedAt = Date.now();

  let locked: boolean;
  try {
    locked = await acquireJobLock(job.name, owner, job.timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[job:${job.name}] could not acquire lock: ${message}`);
    return {
      jobName: job.name,
      runId: null,
      status: "FAILED",
      durationMs: Date.now() - startedAt,
      itemsProcessed: 0,
      itemsFailed: 0,
      error: `Lock error: ${message}`,
    };
  }

  if (!locked) {
    const skipped = await db.jobRun.create({
      data: {
        jobName: job.name,
        trigger,
        status: "SKIPPED",
        finishedAt: new Date(),
        durationMs: 0,
        details: { reason: "Another run of this job is in progress" },
      },
    });
    console.log(`[job:${job.name} run:${skipped.id}] skipped: another run holds the lock`);
    return {
      jobName: job.name,
      runId: skipped.id,
      status: "SKIPPED",
      durationMs: 0,
      itemsProcessed: 0,
      itemsFailed: 0,
    };
  }

  // Runs left RUNNING by a crashed process can no longer be running once we hold the lock
  await db.jobRun.updateMany({
    where: { jobName: job.name, status: "RUNNING" },
    data: { status: "FAILED", finishedAt: new Date(), error: "Abandoned (process stopped before the run finished)" },
  });

  const run = await db.jobRun.create({ data: { jobName: job.name, trigger, status: "RUNNING" } });
  const logger = createJobLogger(job.name, run.id);
  const controller = new AbortController();
  const softTimeout = setTimeout(() => controller.abort(), job.timeoutMs * SOFT_TIMEOUT_RATIO);

  logger.info("started", { trigger });

  try {
    const result = await job.run({ runId: run.id, trigger, logger, signal: controller.signal });
    const durationMs = Date.now() - startedAt;
    const details = controller.signal.aborted
      ? { ...result.details, stoppedEarly: "time budget exhausted" }
      : result.details;

    await db.jobRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        durationMs,
        itemsProcessed: result.itemsProcessed,
        itemsFailed: result.itemsFailed,
        details: toJson(details),
      },
    });
    logger.info("completed", {
      durationMs,
      itemsProcessed: result.itemsProcessed,
      itemsFailed: result.itemsFailed,
      ...details,
    });

    return {
      jobName: job.name,
      runId: run.id,
      status: "COMPLETED",
      durationMs,
      itemsProcessed: result.itemsProcessed,
      itemsFailed: result.itemsFailed,
      details,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    logger.error("failed", { durationMs, error });

    await db.jobRun
      .update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt: new Date(), durationMs, error: message.slice(0, 2000) },
      })
      .catch((updateError) => logger.error("could not record failure", { error: updateError }));

    return {
      jobName: job.name,
      runId: run.id,
      status: "FAILED",
      durationMs,
      itemsProcessed: 0,
      itemsFailed: 0,
      error: message,
    };
  } finally {
    clearTimeout(softTimeout);
    await releaseJobLock(job.name, owner).catch((error) =>
      logger.error("could not release lock", { error })
    );
  }
}
