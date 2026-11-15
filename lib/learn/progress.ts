import { db } from "@/lib/db";

/** Per-user lesson progress (Story 9.2). Lesson ids are validated by callers against the curriculum. */

export type LessonProgressStatus = "STARTED" | "COMPLETED";

export interface LessonProgress {
  lessonId: string;
  status: LessonProgressStatus;
  quizCorrect: number | null;
  quizTotal: number | null;
  lastViewedAt: string;
  completedAt: string | null;
}

type Row = Awaited<ReturnType<typeof db.userLessonProgress.findFirstOrThrow>>;

function toDTO(row: Row): LessonProgress {
  return {
    lessonId: row.lessonId,
    status: row.status,
    quizCorrect: row.quizCorrect,
    quizTotal: row.quizTotal,
    lastViewedAt: row.lastViewedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function getProgressMap(userId: string): Promise<Record<string, LessonProgress>> {
  const rows = await db.userLessonProgress.findMany({ where: { userId } });
  return Object.fromEntries(rows.map((r) => [r.lessonId, toDTO(r)]));
}

/** Most recently viewed unfinished lesson, else the most recent one */
export async function getContinueLesson(userId: string): Promise<LessonProgress | null> {
  const row =
    (await db.userLessonProgress.findFirst({ where: { userId, status: "STARTED" }, orderBy: { lastViewedAt: "desc" } })) ??
    (await db.userLessonProgress.findFirst({ where: { userId }, orderBy: { lastViewedAt: "desc" } }));
  return row ? toDTO(row) : null;
}

/** Records a lesson view (creates STARTED progress; never downgrades COMPLETED) */
export async function recordLessonView(userId: string, lessonId: string): Promise<LessonProgress> {
  const row = await db.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: { lastViewedAt: new Date() },
  });
  return toDTO(row);
}

export interface ProgressUpdate {
  status?: LessonProgressStatus;
  quizCorrect?: number;
  quizTotal?: number;
}

export async function updateLessonProgress(userId: string, lessonId: string, update: ProgressUpdate): Promise<LessonProgress> {
  const completing = update.status === "COMPLETED";
  const data = {
    ...(update.status ? { status: update.status, completedAt: completing ? new Date() : null } : {}),
    ...(update.quizTotal !== undefined ? { quizCorrect: update.quizCorrect ?? 0, quizTotal: update.quizTotal } : {}),
    lastViewedAt: new Date(),
  };
  const existing = await db.userLessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  // Keep the original completion date when re-completing
  if (completing && existing?.completedAt) data.completedAt = existing.completedAt;
  const row = await db.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, ...data },
    update: data,
  });
  return toDTO(row);
}
