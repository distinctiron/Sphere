/**
 * Run a background job from the command line.
 *
 * Usage: npm run jobs:run -- <job>
 *   process-papers   fetch → score → index (the scheduled pipeline)
 *   arxiv-fetch | novelty-scoring | rag-indexing
 */

import { config } from "dotenv";
import { resolve } from "path";

// Next.js convention: .env.local takes precedence over .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { JOBS, PIPELINES, runJobOrPipeline, isKnownJob } = await import("../lib/jobs/registry");
  const { db } = await import("../lib/db");

  const name = process.argv[2];
  if (!name || !isKnownJob(name)) {
    console.error(`Usage: npm run jobs:run -- <job>\nJobs: ${[...Object.keys(PIPELINES), ...Object.keys(JOBS)].join(", ")}`);
    process.exit(1);
  }

  try {
    const summaries = await runJobOrPipeline(name, "cli");
    console.log(JSON.stringify(summaries, null, 2));
    process.exitCode = summaries.some((s) => s.status === "FAILED") ? 1 : 0;
  } finally {
    await db.$disconnect();
  }
}

main();
