import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkCronAuth } from "@/lib/jobs/cron-auth";
import { JOBS } from "@/lib/jobs/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/status?limit=20
 * Job monitoring: latest run per job, recent runs, and processing backlog.
 * Requires "Authorization: Bearer $CRON_SECRET".
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return NextResponse.json({ error: authError.error }, { status: authError.status });

  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit")) || 20, 100);

  const [recentRuns, latestPerJob, unscored, ragBacklog, unclusteredNews, activeStories, unsummarizedStories] = await Promise.all([
    db.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: limit }),
    Promise.all(
      Object.keys(JOBS).map((jobName) =>
        db.jobRun.findFirst({ where: { jobName, status: { not: "SKIPPED" } }, orderBy: { startedAt: "desc" } })
      )
    ),
    db.paper.count({ where: { noveltyScore: null } }),
    db.paper.groupBy({ by: ["ragStatus"], _count: { _all: true } }),
    db.newsItem.count({ where: { storyId: null } }),
    db.newsStory.count({ where: { status: "ACTIVE" } }),
    db.newsStory.count({ where: { status: "ACTIVE", summarizedItemCount: 0 } }),
  ]);

  return NextResponse.json({
    jobs: Object.keys(JOBS).map((name, i) => ({ name, description: JOBS[name].description, lastRun: latestPerJob[i] })),
    backlog: {
      unscoredPapers: unscored,
      ragStatus: Object.fromEntries(ragBacklog.map((r) => [r.ragStatus, r._count._all])),
      news: { unclusteredItems: unclusteredNews, activeStories, unsummarizedStories },
    },
    recentRuns,
  });
}
