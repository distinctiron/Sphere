import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/news/session";
import { getProgressMap } from "@/lib/learn/progress";

export const dynamic = "force-dynamic";

/** GET /api/learn/progress: the user's progress for every lesson they have opened */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ progress: await getProgressMap(userId) });
}
