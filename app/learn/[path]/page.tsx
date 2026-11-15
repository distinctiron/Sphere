import Link from "next/link";
import { notFound } from "next/navigation";
import { LearnHeader } from "@/components/learn/learn-header";
import { PATH_BRUSH } from "@/components/learn/path-brush";
import { PathProgressBar } from "@/components/learn/path-progress";
import { Brush, BrushTag, SketchCard, SketchFrame, SketchRing } from "@/components/sketch";
import { getLessonRef, getPath, lessonHref, pathLessonIds } from "@/lib/learn/curriculum";
import { getLessonMeta } from "@/lib/learn/content";
import { getProgressMap } from "@/lib/learn/progress";
import { requireLearner } from "@/lib/learn/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Hand-drawn lesson status: green tick when completed, a half-shaded circle when started, an empty circle otherwise */
function StatusMark({ id, status }: { id: string; status?: string }) {
  const label = status === "COMPLETED" ? "Completed" : status === "STARTED" ? "Started" : "Not started";
  if (status === "COMPLETED") {
    return (
      <svg width="28" height="28" viewBox="0 0 28 28" role="img" aria-label={label} className="mt-0.5 flex-none overflow-visible">
        <path className="sk-draw green" pathLength={1} d="M5 15 C 8 17, 10 20, 11.5 22 C 15 15, 19 9, 24 4" />
        <path className="sk-draw green p2" pathLength={1} d="M6 16.5 C 8.5 18, 10 20.5, 12 22.5 C 15.5 15.5, 19.5 9.5, 24.5 5.5" style={{ animationDelay: ".3s" }} />
      </svg>
    );
  }
  return (
    <span role="img" aria-label={label} className="mt-0.5 flex-none">
      <SketchRing seed={`status:${id}`} size={28} shading={status === "STARTED" ? 0.05 : false} />
    </span>
  );
}

/** A path: its mental models and modules, with per-lesson status and prerequisites */
export default async function LearnPathPage({ params }: { params: { path: string } }) {
  const path = getPath(params.path);
  if (!path) notFound();
  const userId = await requireLearner(`/learn/${path.id}`);
  const progress = await getProgressMap(userId);
  const brush = PATH_BRUSH[path.color];
  const ids = pathLessonIds(path);
  const done = ids.filter((id) => progress[id]?.status === "COMPLETED").length;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:p-8">
      <LearnHeader
        eyebrow={
          <Link href="/learn" className="no-underline hover:text-pen">
            ← Learn
          </Link>
        }
        title={
          <span className="flex items-center gap-4">
            <Brush color={brush} variant={path.id} wide delay={0.2} className="px-2.5 pb-1 pt-0.5">
              {path.letter}
            </Brush>
            {path.title}
          </span>
        }
        subtitle={path.blurb}
      />

      <PathProgressBar done={done} total={ids.length} color={path.color} className="mb-10 max-w-sm" />

      <SketchCard seed={`path:${path.id}:models`} h={260} panel wedge className="mb-12 px-6 py-5">
        <h2 className="mb-3 font-hand text-[30px] font-bold leading-none">
          The mental {path.models.length > 1 ? "models" : "model"} for this path
        </h2>
        <div className="space-y-4">
          {path.models.map((model) => (
            <div key={model.id}>
              <h3 className="text-lg font-bold">{model.name}</h3>
              <p className="font-serif leading-relaxed">{model.picture}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 -rotate-1 font-hand text-[21px] text-pen">Every lesson in this path extends this picture; hold on to it.</p>
      </SketchCard>

      {path.modules.map((module) => (
        <section key={module.id} className="mb-12" aria-labelledby={`module-${module.id}`}>
          <h2 id={`module-${module.id}`} className="mb-4 font-hand text-[34px] font-bold leading-none">
            {module.title}
          </h2>
          <ol className="space-y-5">
            {module.lessons.map((id) => {
              const ref = getLessonRef(id)!;
              const meta = getLessonMeta(id);
              const status = progress[id]?.status;
              const missingPrereqs = (meta?.buildsOn ?? []).filter((p) => progress[p]?.status !== "COMPLETED");
              const body = (
                <>
                  <StatusMark id={id} status={status} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <BrushTag size="sm" color={brush} variant={id} still={!meta}>
                        {ref.code}
                      </BrushTag>
                      <span className={cn("text-lg font-bold leading-tight", meta && "group-hover:text-pen")}>{meta?.title ?? id}</span>
                      {meta && <span className="font-mono text-xs text-pencil">{meta.minutes} min</span>}
                    </div>
                    {meta ? (
                      <p className="mt-1 text-pencil">{meta.summary}</p>
                    ) : (
                      <p className="mt-1 font-hand text-xl text-pencil">Being written…</p>
                    )}
                    {meta && meta.buildsOn.length > 0 && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-1 text-sm text-pencil">
                        <span className="font-hand text-[19px] font-bold text-ink">Builds on</span>{" "}
                        {meta.buildsOn.map((p, i) => (
                          <span key={p} className={cn(progress[p]?.status === "COMPLETED" ? "text-pencil" : "font-semibold text-ink")}>
                            {getLessonRef(p)?.code} {getLessonMeta(p)?.title ?? p}
                            {i < meta.buildsOn.length - 1 ? "," : ""}
                          </span>
                        ))}
                        {missingPrereqs.length > 0 && !status && (
                          <span className="ml-1 -rotate-1 font-hand text-[19px] font-bold text-pen">
                            {missingPrereqs.length === meta.buildsOn.length ? "read these first" : "some not read yet"}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </>
              );
              return (
                <li key={id}>
                  {meta ? (
                    <SketchCard seed={`path:lesson:${id}`} h={110} hover shadow={false}>
                      <Link href={lessonHref(id)} className="group flex gap-3 p-4 no-underline">
                        {body}
                      </Link>
                    </SketchCard>
                  ) : (
                    <div className="relative flex gap-3 p-4 opacity-75">
                      <SketchFrame seed={`path:lesson:${id}`} h={110} dashed faint />
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
