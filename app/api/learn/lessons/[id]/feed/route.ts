import { NextResponse } from "next/server";
import { getLessonMeta } from "@/lib/learn/content";
import { getLessonFeed } from "@/lib/learn/feed";
import { getSessionUserId } from "@/lib/news/session";

export const dynamic = "force-dynamic";

/** GET /api/learn/lessons/[id]/feed: this week's News stories and papers that relate to the lesson */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getLessonMeta(params.id)) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  return NextResponse.json(await getLessonFeed(params.id, userId));
}
