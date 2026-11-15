"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brush, SketchCard, SketchFrame, SketchRing } from "@/components/sketch";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/lib/learn/schema";
import type { LessonProgress } from "@/lib/learn/progress";

async function saveProgress(lessonId: string, body: Record<string, unknown>): Promise<LessonProgress> {
  const response = await fetch(`/api/learn/progress/${lessonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return ((await response.json()) as { progress: LessonProgress }).progress;
}

/** Deterministic per-lesson shuffle of option order, so authors needn't vary the answer position */
function optionOrder(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = (h >>> 0) % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** At least half right completes the lesson */
const passMark = (total: number) => Math.ceil(total / 2);

/** End-of-lesson check (Story 9.2): answer all questions, see explanations; passing completes the lesson */
export function LessonQuiz({ lessonId, questions, initial }: { lessonId: string; questions: QuizQuestion[]; initial: LessonProgress | null }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Array<number | null>>(() => questions.map(() => null));
  const [progress, setProgress] = useState(initial);
  const [saving, setSaving] = useState(false);
  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === questions[i].answer).length;
  const finished = answered === questions.length;

  const choose = async (qi: number, oi: number) => {
    if (answers[qi] !== null) return;
    const next = answers.slice();
    next[qi] = oi;
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      const score = next.filter((a, i) => a === questions[i].answer).length;
      const passed = score >= passMark(questions.length);
      setSaving(true);
      try {
        setProgress(
          await saveProgress(lessonId, { ...(passed ? { status: "COMPLETED" } : {}), quizCorrect: score, quizTotal: questions.length })
        );
        router.refresh();
      } catch {
        toast.error("Couldn't save your progress");
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <SketchCard seed={`quiz:${lessonId}`} h={520} panel wedge as="section" aria-labelledby="quiz-heading" wrapClassName="mt-14" className="p-5 sm:p-7">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quiz-heading" className="font-hand text-[36px] font-bold leading-none">
          Check your understanding
        </h2>
        {progress?.quizTotal ? (
          <span className="-rotate-2 font-hand text-[22px] font-bold text-pen">
            Last score: {progress.quizCorrect}/{progress.quizTotal}
          </span>
        ) : null}
      </div>
      <p className="mb-6 text-pencil">
        These questions ask you to reason with the lesson&apos;s picture rather than recall wording. Pick an answer to see why it is right or wrong.
      </p>

      <ol className="space-y-8">
        {questions.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <li key={qi}>
              <p className="mb-3 font-semibold">
                <span className="mr-1.5 font-hand text-2xl font-bold text-pencil">{qi + 1}.</span>
                {q.question}
              </p>
              <div className="space-y-2.5">
                {optionOrder(`${lessonId}:${qi}`, q.options.length).map((oi) => {
                  const option = q.options[oi];
                  const isChosen = chosen === oi;
                  const isAnswer = q.answer === oi;
                  const reveal = chosen !== null;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => choose(qi, oi)}
                      disabled={reveal}
                      className={cn(
                        "group relative flex min-h-[44px] w-full items-center gap-3 bg-sheet px-3.5 py-2 text-left transition-colors",
                        !reveal && "cursor-pointer hover:bg-[rgba(255,212,59,0.25)]",
                        reveal && !isChosen && !isAnswer && "text-pencil opacity-70"
                      )}
                    >
                      <SketchFrame
                        seed={`quiz:${lessonId}:${qi}:${oi}`}
                        w={600}
                        h={44}
                        tone={reveal && isAnswer ? "green" : reveal && isChosen ? "red" : undefined}
                        faint={reveal && !isChosen && !isAnswer}
                      />
                      <span className="relative flex h-6 w-6 flex-none items-center justify-center">
                        {reveal && isAnswer ? (
                          <svg width="24" height="24" viewBox="0 0 28 28" aria-label="Correct answer" role="img" className="overflow-visible">
                            <path className="sk-draw green" pathLength={1} d="M5 15 C 8 17, 10 20, 11.5 22 C 15 15, 19 9, 24 4" />
                          </svg>
                        ) : reveal && isChosen ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" aria-label="Your answer, incorrect" role="img" className="overflow-visible">
                            <path className="sk-draw red" pathLength={1} d="M5 5 C 10 10, 14 14, 19 19" />
                            <path className="sk-draw red" pathLength={1} d="M19 5 C 14 10, 10 14, 5 19" style={{ animationDelay: ".25s" }} />
                          </svg>
                        ) : (
                          <SketchRing seed={`quiz:${lessonId}:${qi}:${oi}:o`} size={18} shading={false} />
                        )}
                      </span>
                      <span className="relative">{option}</span>
                    </button>
                  );
                })}
              </div>
              {chosen !== null && (
                <p className="sk-fade mt-3 border-l-[3px] border-dashed border-pen/60 pl-3 font-serif leading-relaxed">
                  <span className={cn("font-hand text-[22px] font-bold", chosen === q.answer ? "text-[#1f8a57]" : "text-pen")}>
                    {chosen === q.answer ? "Right. " : "Not quite. "}
                  </span>
                  {q.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {finished && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-hand text-[24px] font-bold">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {correct}/{questions.length} correct
            {correct >= passMark(questions.length) ? (
              <Brush color="green" variant={lessonId} className="px-1">
                · lesson complete
              </Brush>
            ) : (
              <span className="text-pen"> · review the lesson and try again ({passMark(questions.length)} needed to complete)</span>
            )}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setAnswers(questions.map(() => null))}>
            <span className="lbl">
              <RotateCcw />
              Try again
            </span>
          </Button>
        </div>
      )}
    </SketchCard>
  );
}

/** Mark the lesson complete (or not) without taking the quiz */
export function CompleteToggle({ lessonId, completed }: { lessonId: string; completed: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState(completed);
  const [saving, setSaving] = useState(false);
  // Stay in sync when the quiz completes the lesson (server props refresh)
  useEffect(() => setDone(completed), [completed]);
  const toggle = async () => {
    setSaving(true);
    try {
      const progress = await saveProgress(lessonId, { status: done ? "STARTED" : "COMPLETED" });
      setDone(progress.status === "COMPLETED");
      router.refresh();
    } catch {
      toast.error("Couldn't save your progress");
    } finally {
      setSaving(false);
    }
  };
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={done}
      className={cn("sk-btn w-full", done && "primary")}
    >
      <span className="sk-bsw" aria-hidden="true" />
      <SketchFrame seed={`complete:${lessonId}`} w={260} h={46} tone={done ? "green" : undefined} />
      <span className="lbl">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : done ? (
          <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden="true" className="overflow-visible">
            <path className="sk-draw green" pathLength={1} d="M5 15 C 8 17, 10 20, 11.5 22 C 15 15, 19 9, 24 4" />
          </svg>
        ) : (
          <SketchRing seed={`complete:${lessonId}:o`} size={20} shading={false} />
        )}
        {done ? "Completed" : "Mark complete"}
      </span>
    </button>
  );
}
