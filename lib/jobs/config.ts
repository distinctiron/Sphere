/** Scheduling configuration shared by the scheduler and status checks */

export interface SchedulerConfig {
  intervalMinutes: number;
  offsetMinutes: number;
  runOnStartup: boolean;
}

export interface PipelineSchedule {
  pipeline: string;
  intervalMinutes: number;
  offsetMinutes: number;
}

function offsetOr(value: string | undefined, fallback: number, intervalMinutes: number): number {
  const offset = Number(value);
  return (Number.isFinite(offset) && value !== undefined && value !== "" ? offset : fallback) % intervalMinutes;
}

/** Schedule of the paper pipeline (process-papers) */
export function getSchedulerConfig(): SchedulerConfig {
  const intervalMinutes = Number(process.env.JOB_INTERVAL_MINUTES) || 60;
  return {
    intervalMinutes,
    offsetMinutes: offsetOr(process.env.JOB_SCHEDULE_OFFSET_MINUTES, 5, intervalMinutes),
    runOnStartup: process.env.JOB_RUN_ON_STARTUP === "true",
  };
}

/** Interval of the news pipeline (process-news); breaking news needs frequent polling */
export function getNewsIntervalMinutes(): number {
  return Number(process.env.NEWS_INTERVAL_MINUTES) || 15;
}

/** Every pipeline the in-process scheduler runs */
export function getPipelineSchedules(): PipelineSchedule[] {
  const papers = getSchedulerConfig();
  const newsInterval = getNewsIntervalMinutes();
  return [
    { pipeline: "process-papers", intervalMinutes: papers.intervalMinutes, offsetMinutes: papers.offsetMinutes },
    {
      pipeline: "process-news",
      intervalMinutes: newsInterval,
      offsetMinutes: offsetOr(process.env.NEWS_SCHEDULE_OFFSET_MINUTES, 2, newsInterval),
    },
  ];
}
