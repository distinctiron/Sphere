import Link from "next/link";
import { LearnHeader } from "@/components/learn/learn-header";
import { PATH_BRUSH } from "@/components/learn/path-brush";
import { BrushTag, SketchCard, SketchDivider } from "@/components/sketch";
import { GLOSSARY } from "@/content/learn/glossary";
import { getLessonRef, lessonHref } from "@/lib/learn/curriculum";
import { getLessonMeta } from "@/lib/learn/content";
import { requireLearner } from "@/lib/learn/session";

export const dynamic = "force-dynamic";

/** A–Z glossary (Story 9.5): every term links to the lesson that teaches it */
export default async function GlossaryPage() {
  await requireLearner("/learn/glossary");
  const groups = new Map<string, typeof GLOSSARY>();
  for (const term of GLOSSARY) {
    const letter = /[a-z]/i.test(term.term[0]) ? term.term[0].toUpperCase() : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), term]);
  }
  const letters = Array.from(groups.keys());

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:p-8">
      <LearnHeader
        eyebrow={
          <Link href="/learn" className="no-underline hover:text-pen">
            ← Learn
          </Link>
        }
        title="Glossary"
        subtitle={`${GLOSSARY.length} terms used across the paths. Each links to the lesson that teaches it.`}
      />
      <nav
        aria-label="Letters"
        className="sk-segs sticky top-[env(safe-area-inset-top,0px)] z-10 mb-8 gap-0.5 border-b-2 border-dashed border-ink/20 bg-paper/95 py-1 backdrop-blur"
      >
        {letters.map((l) => (
          <a key={l} href={`#letter-${l}`} className="sk-seg min-h-[40px] px-2.5 text-[24px]">
            <span className="sk-bseg" aria-hidden="true" />
            <span className="lbl">{l}</span>
          </a>
        ))}
      </nav>
      {letters.map((letter) => (
        <section key={letter} id={`letter-${letter}`} className="mb-12 scroll-mt-16">
          <h2 className="mb-3 font-hand text-[52px] font-bold leading-none">{letter}</h2>
          <SketchCard seed={`glossary:${letter}`} h={Math.min(900, 90 * groups.get(letter)!.length)} wedge>
            <dl>
              {groups.get(letter)!.map((term, i) => {
                const ref = getLessonRef(term.lesson);
                return (
                  <div key={term.id} id={term.id} className="relative scroll-mt-16 px-5 py-4 target:bg-[rgba(255,212,59,0.25)]">
                    {i > 0 && <SketchDivider seed={`glossary:rule:${term.id}`} w={760} className="absolute -top-1.5 left-0 opacity-50" />}
                    <dt className="font-hand text-[26px] font-bold leading-tight">
                      {term.term}
                      {term.aliases?.length ? (
                        <span className="ml-2 font-sans text-xs font-normal text-pencil">also: {term.aliases.join(", ")}</span>
                      ) : null}
                    </dt>
                    <dd className="mt-1 font-serif leading-relaxed">
                      {term.definition}{" "}
                      {ref && (
                        <Link href={lessonHref(term.lesson)} className="mt-2 inline-flex items-center gap-2 whitespace-nowrap font-sans text-sm no-underline">
                          <BrushTag size="xs" color={PATH_BRUSH[ref.path.color]} variant={term.id} still>
                            {ref.code}
                          </BrushTag>
                          <span className="sk-uline">{getLessonMeta(term.lesson)?.title ?? term.lesson} →</span>
                        </Link>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </SketchCard>
        </section>
      ))}
    </div>
  );
}
