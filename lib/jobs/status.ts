import { db } from "@/lib/db";
import { getSchedulerConfig } from "./config";

/**
 * True when the scheduled arXiv fetch has completed recently (within two
 * scheduling intervals), meaning papers are being pre-processed in the
 * background and per-user fetching at login is unnecessary.
 */
export async function isScheduledFetchActive(): Promise<boolean> {
  const { intervalMinutes } = getSchedulerConfig();
  const since = new Date(Date.now() - 2 * intervalMinutes * 60_000 - 10 * 60_000);
  const recent = await db.jobRun.findFirst({
    where: { jobName: "arxiv-fetch", status: "COMPLETED", startedAt: { gte: since } },
    select: { id: true },
  });
  return recent !== null;
}
