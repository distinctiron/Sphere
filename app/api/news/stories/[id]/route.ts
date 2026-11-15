import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/news/session";
import { getStory, setStoryState } from "@/lib/news/stories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/news/stories/[id]: the story with all its items */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const story = await getStory(params.id, userId);
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  return NextResponse.json({ story });
}

const StateUpdate = z
  .object({
    status: z.enum(["NEW", "READ", "DISMISSED"]).optional(),
    saved: z.boolean().optional(),
  })
  .refine((body) => body.status !== undefined || body.saved !== undefined, "Nothing to update");

/**
 * PATCH /api/news/stories/[id]
 * Body: { status?: "NEW" | "READ" | "DISMISSED", saved?: boolean }
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = StateUpdate.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  try {
    const userState = await setStoryState(userId, params.id, parsed.data);
    return NextResponse.json({ userState });
  } catch (error) {
    // Foreign key failure: the story doesn't exist (or was cleaned up)
    console.error("Error updating story state:", error);
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }
}
