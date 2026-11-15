import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LearnHeader } from "@/components/learn/learn-header";
import { LessonFeedLinks } from "@/components/learn/lesson-feed";
import { PATH_BRUSH } from "@/components/learn/path-brush";
import { BrushTag, SketchCard, SketchDivider } from "@/components/sketch";
import { CompleteToggle, LessonQuiz } from "@/components/learn/lesson-quiz";
import { TutorPanel } from "@/components/learn/tutor-panel";
import type { LessonLinkMap } from "@/components/learn/tutor-markdown";
import { allLessonRefs, getLessonRef, getMentalModel, lessonHref } from "@/lib/learn/curriculum";
import { getLeadsTo, getLessonMeta, getPrevNext, getRelated, safeLessonSource, type LessonMeta } from "@/lib/learn/content";
import { getProgressMap, recordLessonView, type LessonProgress } from "@/lib/learn/progress";
import { renderLessonBody } from "@/lib/learn/render";
import { requireLearner } from "@/lib/learn/session";

export const dynamic = "force-dynamic";

function LessonChip({ meta, progress }: { meta: LessonMeta; progress?: LessonProgress }) {
  const done = progress?.status === "COMPLETED";
  return (
    <Link href={lessonHref(meta.id)} className="group inline-flex max-w-full items-center gap-2 text-sm no-underline" title={meta.summary}>
      <BrushTag size="xs" color={PATH_BRUSH[meta.ref.path.color]} variant={meta.id} still>
        {meta.ref.code}
      </BrushTag>
      <span className="truncate group-hover:text-pen">{meta.title}</span>
      {done && <span className="font-hand text-lg font-bold leading-none text-[#1f8a57]" aria-label="completed">✓</span>}
    </Link>
  );
}

function LessonList({ title, lessons, progress }: { title: string; lessons: LessonMeta[]; progress: Record<string, LessonProgress> }) {
  if (lessons.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 font-hand text-[26px] font-bold leading-none">{title}</h3>
      <ul className="space-y-4">
        {lessons.map((m) => (
          <li key={m.id}>
            <SketchCard seed={`lesson:list:${title}:${m.id}`} h={90} hover shadow={false}>
              <Link href={lessonHref(m.id)} className="group block p-3 no-underline">
                <div className="flex items-center gap-2 font-semibold group-hover:text-pen">
                  <BrushTag size="xs" color={PATH_BRUSH[m.ref.path.color]} variant={m.id} still>
                    {m.ref.code}
                  </BrushTag>
                  <span className="min-w-0">{m.title}</span>
                  {progress[m.id]?.status === "COMPLETED" && (
                    <span className="font-hand text-lg font-bold leading-none text-[#1f8a57]" aria-label="completed">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-pencil">{m.summary}</p>
              </Link>
            </SketchCard>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A lesson: header with prerequisites, MDX body, quiz, cross-references, feed links and tutor */
export default async function LessonPage({ params }: { params: { path: string; lesson: string } }) {
  const ref = getLessonRef(params.lesson);
  if (!ref) notFound();
  if (ref.path.id !== params.path) redirect(lessonHref(ref.id));
  const userId = await requireLearner(lessonHref(ref.id));

  const source = safeLessonSource(ref.id);
  if (!source) redirect(`/learn/${ref.path.id}`);
  const { meta, body } = source;

  const [content, current] = await Promise.all([renderLessonBody(meta.id, body), recordLessonView(userId, meta.id)]);
  const progress = { ...(await getProgressMap(userId)), [meta.id]: current };

  const model = getMentalModel(meta.model);
  const buildsOn = meta.buildsOn.map(getLessonMeta).filter((m): m is LessonMeta => m !== null);
  const leadsTo = getLeadsTo(meta.id);
  const related = getRelated(meta.id).filter((m) => !meta.buildsOn.includes(m.id) && !leadsTo.some((l) => l.id === m.id));
  const { prev, next } = getPrevNext(meta.id);
  const prevMeta = prev ? getLessonMeta(prev.id) : null;
  const nextMeta = next ? getLessonMeta(next.id) : null;

  const lessonLinks: LessonLinkMap = Object.fromEntries(
    allLessonRefs().map((r) => [r.id, { code: r.code, title: getLessonMeta(r.id)?.title ?? r.id, href: lessonHref(r.id) }])
  );

  const brush = PATH_BRUSH[ref.path.color];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:p-8">
      <LearnHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
            <Link href="/learn" className="no-underline hover:text-pen">
              Learn
            </Link>
            <span aria-hidden>›</span>
            <Link href={`/learn/${ref.path.id}`} className="no-underline hover:text-pen">
              {ref.path.letter} · {ref.path.short}
            </Link>
            <span aria-hidden>›</span>
            <span>{ref.module.title}</span>
          </nav>
        }
        title={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <BrushTag color={brush} variant={meta.id} delay={0.2} className="text-xl">
              {ref.code}
            </BrushTag>
            {meta.title}
          </span>
        }
        subtitle={meta.summary}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <main className="min-w-0">
          <div className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-pencil">
            <span className="font-mono text-xs">{meta.minutes} min</span>
            {model && (
              <Link href={`/learn/${model.path.id}`} className="no-underline hover:text-pen">
                <span className="font-hand text-[20px] font-bold text-ink">Mental model:</span>{" "}
                <em className="font-serif">{model.model.name}</em>
              </Link>
            )}
            {meta.reviewed && <span className="font-mono text-xs">Facts as of {meta.reviewed}</span>}
          </div>

          {buildsOn.length > 0 && (
            <SketchCard seed={`lesson:${meta.id}:uses`} h={90} shadow={false} wedge wrapClassName="mb-10" className="px-5 py-4">
              <div className="mb-2 font-hand text-[22px] font-bold leading-none">You&apos;ll use</div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {buildsOn.map((m) => (
                  <LessonChip key={m.id} meta={m} progress={progress[m.id]} />
                ))}
              </div>
            </SketchCard>
          )}

          <article
            id="lesson-body"
            className="lesson-prose prose max-w-none prose-headings:scroll-mt-20 prose-h2:mt-12 prose-p:leading-relaxed prose-li:my-1"
          >
            {content}
          </article>

          <LessonQuiz lessonId={meta.id} questions={meta.quiz} initial={progress[meta.id] ?? null} />

          <nav aria-label="Lesson navigation" className="mt-12 grid gap-6 sm:grid-cols-2">
            {prev ? (
              <SketchCard seed={`lesson:prev:${prev.id}`} h={80} hover shadow={false}>
                <Link href={lessonHref(prev.id)} className="group block p-4 no-underline">
                  <div className="font-hand text-xl text-pencil">← Previous</div>
                  <div className="font-semibold group-hover:text-pen">
                    {prev.code} · {prevMeta?.title ?? prev.id}
                  </div>
                </Link>
              </SketchCard>
            ) : (
              <span />
            )}
            {next && (
              <SketchCard seed={`lesson:next:${next.id}`} h={80} hover>
                <Link href={lessonHref(next.id)} className="group block p-4 text-right no-underline">
                  <div className="font-hand text-xl text-pencil">Next →</div>
                  <div className="font-semibold group-hover:text-pen">
                    {next.code} · {nextMeta?.title ?? next.id}
                  </div>
                </Link>
              </SketchCard>
            )}
          </nav>

          <SketchDivider seed={`lesson:${meta.id}:rule`} className="mt-12" />
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <LessonList title="Where this comes back" lessons={leadsTo} progress={progress} />
            <LessonList title="Related in other lessons" lessons={related} progress={progress} />
          </div>
        </main>

        <aside className="space-y-8 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:p-3">
          <CompleteToggle lessonId={meta.id} completed={progress[meta.id]?.status === "COMPLETED"} />
          {buildsOn.length > 0 && (
            <section>
              <h2 className="mb-2 font-hand text-[24px] font-bold leading-none">Builds on</h2>
              <div className="flex flex-col items-start gap-2">
                {buildsOn.map((m) => (
                  <LessonChip key={m.id} meta={m} progress={progress[m.id]} />
                ))}
              </div>
            </section>
          )}
          <LessonFeedLinks lessonId={meta.id} />
        </aside>
      </div>

      <TutorPanel lessonId={meta.id} lessonTitle={`${ref.code} · ${meta.title}`} lessons={lessonLinks} />
    </div>
  );
}
