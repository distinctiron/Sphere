import { NextResponse } from "next/server";
import { z } from "zod";
import { getLessonRef } from "@/lib/learn/curriculum";
import { updateLessonProgress } from "@/lib/learn/progress";
import { getSessionUserId } from "@/lib/news/session";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    status: z.enum(["STARTED", "COMPLETED"]).optional(),
    quizCorrect: z.number().int().min(0).optional(),
    quizTotal: z.number().int().min(1).max(20).optional(),
  })
  .refine((b) => b.status !== undefined || b.quizTotal !== undefined, "Nothing to update")
  .refine((b) => b.quizCorrect === undefined || (b.quizTotal !== undefined && b.quizCorrect <= b.quizTotal), "Invalid quiz score");

/** PUT /api/learn/progress/[lessonId]: { status?, quizCorrect?, quizTotal? } */
export async function PUT(request: Request, { params }: { params: { lessonId: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getLessonRef(params.lessonId)) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const progress = await updateLessonProgress(userId, params.lessonId, parsed.data);
  return NextResponse.json({ progress });
}
