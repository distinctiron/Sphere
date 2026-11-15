import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/jobs/cron-auth";
import { isKnownJob, runJobOrPipeline } from "@/lib/jobs/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET|POST /api/cron/[job]
 * Trigger a background job from an external scheduler (Vercel Cron, system
 * cron, ...). Requires "Authorization: Bearer $CRON_SECRET".
 *
 * Jobs: process-papers (fetch → score → index), arxiv-fetch, novelty-scoring, rag-indexing
 * Responds when the run finishes, with one summary per job.
 */
async function handle(request: Request, { params }: { params: { job: string } }) {
  const authError = checkCronAuth(request);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  if (!isKnownJob(params.job)) {
    return NextResponse.json({ error: `Unknown job: ${params.job}` }, { status: 404 });
  }

  const summaries = await runJobOrPipeline(params.job, "http");
  const failed = summaries.some((s) => s.status === "FAILED");
  return NextResponse.json({ job: params.job, summaries }, { status: failed ? 500 : 200 });
}

export const GET = handle;
export const POST = handle;
