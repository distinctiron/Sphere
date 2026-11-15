/**
 * Next.js instrumentation hook: runs once when the server starts.
 * Starts the background job scheduler (Epic 6) when ENABLE_SCHEDULER=true.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.ENABLE_SCHEDULER === "true") {
    const { startScheduler } = await import("./lib/jobs/scheduler");
    startScheduler();
  }
}
