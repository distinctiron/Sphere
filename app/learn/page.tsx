import Link from "next/link";
import { Figure } from "@/components/learn/figure";
import { LearnHeader } from "@/components/learn/learn-header";
import { PathProgressBar } from "@/components/learn/path-progress";
import { PATH_BRUSH } from "@/components/learn/path-brush";
import { Brush, BrushTag, SketchCard, SketchDivider } from "@/components/sketch";
import { AI_LEARN_TOPIC, getLessonRef, getPath, lessonHref, pathLessonIds } from "@/lib/learn/curriculum";
import { getLessonMeta } from "@/lib/learn/content";
import { getTrendingLessons } from "@/lib/learn/feed";
import { getContinueLesson, getProgressMap } from "@/lib/learn/progress";
import { requireLearner } from "@/lib/learn/session";

export const dynamic = "force-dynamic";

/** Where a path sits in the suggested route: first group, last group ("any time"), or after the earlier groups */
function routeLabel(stage: number): string {
  const route = AI_LEARN_TOPIC.route;
  if (stage === 0) return "Start here";
  if (stage === route.length - 1) return "Any time";
  const before = route.slice(0, stage).flat().map((id) => getPath(id)!.letter);
  return `After ${before.join(" & ")}`;
}

/** Learn overview (Epic 9): paths, progress, continue, and lessons that explain this week's feed */
export default async function LearnPage() {
  const userId = await requireLearner("/learn");
  const [progress, continueLesson, trending] = await Promise.all([
    getProgressMap(userId),
    getContinueLesson(userId),
    getTrendingLessons(userId),
  ]);

  const continueMeta = continueLesson ? getLessonMeta(continueLesson.lessonId) : null;
  const firstLesson = AI_LEARN_TOPIC.paths[0].modules[0].lessons[0];
  const trendingLessons = trending
    .map((t) => ({ ...t, meta: getLessonMeta(t.lessonId) }))
    .filter((t) => t.meta !== null);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:p-8">
      <LearnHeader
        title="Learn AI"
        subtitle="Four paths that build a working mental model of AI, from the math inside a model to the chips, the software around it, and the economics and politics of the build-out."
      />

      <section className="mb-14 grid gap-9 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 self-start [&_.learn-figure]:my-0">
          <Figure
            name="ai-thread"
            title="The thread through every path"
            caption={AI_LEARN_TOPIC.thread}
          />
          <p className="ml-2 mt-4 -rotate-1 font-hand text-[22px] text-pen">Every lesson is one link of this chain.</p>
        </div>

        <div className="flex flex-col gap-8">
          <SketchCard seed="learn:continue" h={220} hover wedge className="px-6 py-5">
            <h2 className="mb-2 flex items-center gap-2 font-hand text-[26px] font-bold leading-none">
              <PlayGlyph />
              {continueMeta ? "Continue where you left off" : "Start here"}
            </h2>
            {continueMeta ? (
              <Link href={lessonHref(continueMeta.id)} className="group block no-underline">
                <div className="flex flex-wrap items-center gap-2.5">
                  <BrushTag color={PATH_BRUSH[continueMeta.ref.path.color]} variant={continueMeta.id} delay={0.5}>
                    {continueMeta.ref.code}
                  </BrushTag>
                  <span className="font-mono text-xs text-pencil">{continueMeta.ref.path.short}</span>
                </div>
                <div className="mt-2 text-[22px] font-bold leading-tight group-hover:text-pen">{continueMeta.title}</div>
                <p className="mt-1 line-clamp-2 text-pencil">{continueMeta.summary}</p>
              </Link>
            ) : (
              <Link href={lessonHref(firstLesson)} className="group block no-underline">
                <div className="flex items-center gap-2.5">
                  <BrushTag color={PATH_BRUSH[AI_LEARN_TOPIC.paths[0].color]} variant={firstLesson} delay={0.5}>
                    A1
                  </BrushTag>
                </div>
                <div className="mt-2 text-[22px] font-bold leading-tight group-hover:text-pen">
                  {getLessonMeta(firstLesson)?.title ?? "Vectors & similarity"}
                </div>
                <p className="mt-1 text-pencil">
                  Begin with the Math and Compute paths (they can be read side by side), then Building with AI. The Economy path can be
                  read at any point.
                </p>
              </Link>
            )}
          </SketchCard>

          <SketchCard seed="learn:feed" h={300} hover wedge className="px-6 pb-3 pt-5">
            <h2 className="mb-2 flex items-center gap-2 font-hand text-[26px] font-bold leading-none">
              <NewsGlyph />
              In your feed this week
            </h2>
            {trendingLessons.length === 0 ? (
              <p className="pb-2 text-sm text-pencil">
                Lessons that explain this week&apos;s News stories will appear here once the news pipeline has run.
              </p>
            ) : (
              <ul>
                {trendingLessons.map((t, i) => (
                  <li key={t.lessonId} className="relative py-3">
                    {i > 0 && <SketchDivider seed={`learn:feed:${t.lessonId}`} w={560} className="absolute -top-1.5 left-0 opacity-60" />}
                    <Link href={lessonHref(t.lessonId)} className="group flex items-start gap-3 no-underline">
                      <BrushTag size="sm" color={PATH_BRUSH[t.meta!.ref.path.color]} variant={t.lessonId} delay={0.4 + i * 0.15} className="flex-none">
                        {t.meta!.ref.code}
                      </BrushTag>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold group-hover:text-pen">{t.meta!.title}</div>
                        <div className="line-clamp-1 text-sm text-pencil">
                          <span className="font-hand text-[19px] font-bold text-pen">
                            {t.storyCount} {t.storyCount === 1 ? "story" : "stories"}
                          </span>{" "}
                          · e.g. &ldquo;{t.topStory.headline}&rdquo;
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SketchCard>
        </div>
      </section>

      <section aria-labelledby="paths-heading">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 id="paths-heading" className="font-hand text-[44px] font-bold leading-none">
            Paths
          </h2>
          <Link href="/learn/glossary" className="sk-btn ghost small">
            <span className="sk-bsw" aria-hidden="true" />
            <span className="lbl">
              <BookGlyph />
              Glossary
            </span>
          </Link>
        </div>
        <div className="grid gap-x-10 gap-y-9 md:grid-cols-2">
          {AI_LEARN_TOPIC.route.flat().map((pathId, pi) => {
            const path = getPath(pathId)!;
            const ids = pathLessonIds(path);
            const done = ids.filter((id) => progress[id]?.status === "COMPLETED").length;
            const stage = AI_LEARN_TOPIC.route.findIndex((g) => g.includes(pathId));
            const minutes = ids.reduce((sum, id) => sum + (getLessonMeta(id)?.minutes ?? 0), 0);
            const nextId = ids.find((id) => progress[id]?.status !== "COMPLETED");
            return (
              <SketchCard
                key={path.id}
                seed={`learn:path:${path.id}`}
                w={590}
                h={330}
                hover
                wedge
                wrapClassName="h-full"
                className="flex h-full flex-col px-6 pb-5 pt-5"
              >
                <Link href={`/learn/${path.id}`} className="group flex h-full flex-col gap-2.5 no-underline">
                  <div className="flex items-center gap-4">
                    <Brush color={PATH_BRUSH[path.color]} variant={path.id} wide delay={0.2 + pi * 0.15} className="px-2.5 pb-1 pt-0.5 font-hand text-[46px] font-bold leading-none">
                      {path.letter}
                    </Brush>
                    <span className="font-mono text-xs text-pencil">
                      {routeLabel(stage)} · {ids.length} lessons · ~{Math.round(minutes / 60) || 1}h
                    </span>
                  </div>
                  <h3 className="text-[22px] font-bold leading-tight group-hover:text-pen">{path.title}</h3>
                  <p className="flex-1 text-pencil">{path.blurb}</p>
                  <p className="text-sm">
                    <span className="font-hand text-[21px] font-bold">Mental model: </span>
                    <em className="font-serif">{path.models.map((m) => m.name).join(" · ")}</em>
                  </p>
                  <PathProgressBar done={done} total={ids.length} color={path.color} className="mt-1" />
                  {nextId && done > 0 && (
                    <span className="self-end font-hand text-[21px] font-bold group-hover:text-pen">
                      Next: {getLessonRef(nextId)!.code} · {getLessonMeta(nextId)?.title ?? nextId} →
                    </span>
                  )}
                </Link>
              </SketchCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="sk-ink flex-none">
      <path strokeWidth={2} d="M7 4.5 C 7.3 9, 6.8 15, 7.2 19.5 C 11 17, 15 14.5, 19 12 C 15 9.5, 11 7, 7 4.5" />
      <path strokeWidth={1.2} opacity={0.55} d="M7.6 5.5 C 7.8 10, 7.4 14, 7.7 18.4 C 11.5 16, 15 13.6, 18 12" />
    </svg>
  );
}

function NewsGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="sk-ink flex-none">
      <path strokeWidth={2} d="M4 5.5 C 9 5.2, 14 5.8, 17 5.4 L 17.2 18.6 C 12 18.9, 8 18.4, 5.5 18.7 C 4.4 18.6, 4 17.8, 4.1 16.5 Z M17 9 L 20 9.2 L 19.8 17 C 19.6 18.4, 18 18.8, 17.2 18.6" />
      <path strokeWidth={1.2} opacity={0.55} d="M7 9 L 14 9.2 M7 12 L 14 11.8 M7 15 L 12 15.1" />
    </svg>
  );
}

function BookGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="sk-ink">
      <path strokeWidth={2} d="M12 6.5 C 9.5 4.8, 6.5 4.6, 3.5 5.2 L 3.6 18.6 C 6.6 18, 9.6 18.3, 12 19.8 C 14.4 18.3, 17.4 18, 20.4 18.6 L 20.5 5.2 C 17.5 4.6, 14.5 4.8, 12 6.5 Z M12 6.5 L 12 19.8" />
    </svg>
  );
}
