import { NextResponse } from "next/server";
import { NEWS_WINDOWS, type NewsSort, type NewsWindow } from "@/lib/news/dto";
import { getSessionUserId } from "@/lib/news/session";
import { getFeedMeta, listStories } from "@/lib/news/stories";
import { isNewsSourceId } from "@/lib/news/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;

/**
 * GET /api/news/stories
 * Breaking AI news stories for the News tab.
 *
 * Query parameters:
 * - window: "24h" (default) | "3d" | "7d": stories with activity in this window
 * - sort: "heat" (default) | "latest"
 * - source: comma-separated platforms (hackernews,reddit,github,rss,x)
 * - saved: "true" for the user's saved stories (any age)
 * - offset, limit: pagination (limit default 30, max 50)
 * Dismissed stories are excluded.
 */
export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const windowParam = params.get("window") as NewsWindow | null;
  const windowHours = NEWS_WINDOWS[windowParam && windowParam in NEWS_WINDOWS ? windowParam : "24h"];
  const sort: NewsSort = params.get("sort") === "latest" ? "latest" : "heat";
  const sources = (params.get("source") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(isNewsSourceId);
  const offset = Math.max(0, parseInt(params.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(params.get("limit") ?? "30", 10) || 30));

  try {
    const { stories, total } = await listStories({
      userId,
      windowHours,
      sort,
      sources,
      savedOnly: params.get("saved") === "true",
      offset,
      limit,
    });
    return NextResponse.json({ stories, meta: await getFeedMeta(total) });
  } catch (error) {
    console.error("Error listing news stories:", error);
    return NextResponse.json({ error: "Failed to load news" }, { status: 500 });
  }
}
