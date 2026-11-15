/**
 * In-process job scheduler (Stories 6.1, 8.7)
 *
 * Sphere is local-first (SQLite, self-hosted), so the scheduler runs inside the
 * Next.js server process, started from instrumentation.ts when
 * ENABLE_SCHEDULER=true. Each pipeline runs on its own fixed, clock-aligned
 * schedule:
 * - "process-papers": hourly at :05 by default (JOB_INTERVAL_MINUTES)
 * - "process-news": every 15 minutes at :02, :17, ... (NEWS_INTERVAL_MINUTES)
 *
 * Alternatives for other deployments (all use the same jobs and locks):
 * - HTTP: GET/POST /api/cron/<pipeline> with "Authorization: Bearer $CRON_SECRET"
 *   (Vercel Cron, system cron + curl, GitHub Actions, ...)
 * - CLI:  npm run jobs:run -- <pipeline>
 */

import { getPipelineSchedules, getSchedulerConfig, type PipelineSchedule } from "./config";
import { runJobOrPipeline } from "./registry";

/**
 * Milliseconds until the next run. Runs happen when the number of minutes since
 * the Unix epoch, minus the offset, is a multiple of the interval, i.e. at
 * hh:05 every hour for interval=60, offset=5.
 */
export function msUntilNextRun(now: Date, intervalMinutes: number, offsetMinutes: number): number {
  const intervalMs = intervalMinutes * 60_000;
  const offsetMs = offsetMinutes * 60_000;
  const sinceSlot = (((now.getTime() - offsetMs) % intervalMs) + intervalMs) % intervalMs;
  return intervalMs - sinceSlot;
}

interface SchedulerState {
  started: boolean;
  timers: Record<string, ReturnType<typeof setTimeout>>;
  running: Record<string, boolean>;
}

const globalState = globalThis as unknown as { __sphereScheduler?: SchedulerState };
const state = (globalState.__sphereScheduler ??= { started: false, timers: {}, running: {} });
// Older shape (single pipeline) after a hot reload
state.timers ??= {};
state.running = typeof state.running === "object" ? state.running : {};

async function tick(schedule: PipelineSchedule) {
  const { pipeline } = schedule;
  if (!state.running[pipeline]) {
    state.running[pipeline] = true;
    try {
      const summaries = await runJobOrPipeline(pipeline, "scheduler");
      console.log(
        `[scheduler] ${pipeline} finished: ` +
          summaries.map((s) => `${s.jobName}=${s.status}(${s.itemsProcessed} ok, ${s.itemsFailed} failed)`).join(", ")
      );
    } catch (error) {
      console.error(`[scheduler] ${pipeline} error:`, error);
    } finally {
      state.running[pipeline] = false;
    }
  }
  scheduleNext(schedule);
}

function scheduleNext(schedule: PipelineSchedule) {
  if (!state.started) return;
  const delay = msUntilNextRun(new Date(), schedule.intervalMinutes, schedule.offsetMinutes);
  state.timers[schedule.pipeline] = setTimeout(() => void tick(schedule), delay);
  console.log(`[scheduler] next ${schedule.pipeline} run at ${new Date(Date.now() + delay).toISOString()}`);
}

export function startScheduler(): void {
  if (state.started) return;
  state.started = true;
  const { runOnStartup } = getSchedulerConfig();
  for (const schedule of getPipelineSchedules()) {
    console.log(
      `[scheduler] started: ${schedule.pipeline} every ${schedule.intervalMinutes} min (offset ${schedule.offsetMinutes} min)`
    );
    if (runOnStartup) void tick(schedule);
    else scheduleNext(schedule);
  }
}

export function stopScheduler(): void {
  state.started = false;
  Object.values(state.timers).forEach((timer) => clearTimeout(timer));
  state.timers = {};
}
