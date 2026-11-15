import Link from "next/link";
import type { ReactNode } from "react";
import { Brush, SketchFrame, SketchWedge } from "@/components/sketch";
import type { BrushColor } from "@/lib/sketch";
import { getTerm } from "@/content/learn/glossary";
import { getLessonRef, lessonHref } from "@/lib/learn/curriculum";
import { getLessonMeta } from "@/lib/learn/content";
import { Figure } from "./figure";
import { TermPopover } from "./term-popover";

/**
 * Components available inside lesson MDX (server components unless noted).
 * Rendered per lesson so cross-references can tell which lesson they are in.
 */

function lessonLabel(id: string): { code: string; title: string; href: string } | null {
  const ref = getLessonRef(id);
  if (!ref) return null;
  return { code: ref.code, title: getLessonMeta(id)?.title ?? id, href: lessonHref(id) };
}

export function createLessonComponents(currentLessonId: string) {
  /** Inline glossary term: <Term id="kv-cache">KV cache</Term> */
  function Term({ id, children }: { id: string; children?: ReactNode }) {
    const term = getTerm(id);
    if (!term) return <>{children}</>;
    const label = lessonLabel(term.lesson);
    return (
      <TermPopover
        id={term.id}
        term={term.term}
        definition={term.definition}
        lesson={label ? { ...label, isCurrent: term.lesson === currentLessonId } : undefined}
      >
        {children ?? term.term}
      </TermPopover>
    );
  }

  /**
   * Back-reference to an earlier lesson, with a short tailored recap as children:
   * <Recall id="tool-use">A tool call is …</Recall>. Only for buildsOn/earlier lessons.
   */
  function Recall({ id, children }: { id: string; children?: ReactNode }) {
    const label = lessonLabel(id);
    if (!label) return <>{children}</>;
    const summary = getLessonMeta(id)?.summary;
    return (
      <aside className="not-prose relative my-6 py-1 pl-5 font-serif text-[16px] leading-relaxed">
        <svg className="absolute bottom-0 left-0 top-0 h-full w-3 overflow-visible" viewBox="0 0 12 100" preserveAspectRatio="none" aria-hidden="true">
          <path className="sk-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" d="M4 1 C 5 25, 3 50, 4.5 75 S 4 95, 4 99" />
          <path className="sk-ink" strokeWidth={1} opacity={0.45} vectorEffect="non-scaling-stroke" d="M7 3 C 6 30, 8 55, 6.5 80 S 7 96, 6.8 98" />
        </svg>
        <Link href={label.href} className="mb-1 inline-block font-hand text-[21px] font-bold leading-tight text-pencil no-underline hover:text-pen">
          ↩ As we covered in {label.code} · {label.title}
        </Link>
        <div className="[&_p]:my-1">{children ?? summary}</div>
      </aside>
    );
  }

  /** Forward teaser (never relied on): <Preview id="inference">the KV cache</Preview> */
  function Preview({ id, children }: { id: string; children?: ReactNode }) {
    const label = lessonLabel(id);
    if (!label) return <>{children}</>;
    return (
      <span>
        {children}
        <Link href={label.href} className="ml-1 whitespace-nowrap font-hand text-lg text-pencil no-underline hover:text-pen">
          (more in {label.code})
        </Link>
      </span>
    );
  }

  /** Inline link to a lesson: <LessonLink id="attention" /> or with custom text */
  function LessonLink({ id, children }: { id: string; children?: ReactNode }) {
    const label = lessonLabel(id);
    if (!label) return <>{children}</>;
    return (
      <Link href={label.href} className="sk-uline font-semibold">
        {children ?? `${label.code} · ${label.title}`}
        <span aria-hidden> ↗</span>
      </Link>
    );
  }

  function Callout({ id, label, brush, tone, children }: { id: string; label: string; brush: BrushColor; tone?: "red"; children: ReactNode }) {
    return (
      <aside className="not-prose relative my-8 bg-sheet px-5 pb-4 pt-5 text-[16px] leading-relaxed">
        <SketchFrame seed={`callout:${currentLessonId}:${id}`} w={700} h={160} tone={tone} />
        <SketchWedge seed={`callout:${currentLessonId}:${id}:w`} />
        <div className="relative">
          <div className="mb-2">
            <Brush color={brush} variant={id} className="px-1 font-hand text-[24px] font-bold leading-none">
              {label}
            </Brush>
          </div>
          <div className="space-y-2 font-serif [&_p]:my-0 [&_strong]:text-ink">{children}</div>
        </div>
      </aside>
    );
  }

  let calloutCount = 0;

  /** The central idea of the lesson, stated once */
  function KeyIdea({ children }: { children: ReactNode }) {
    return (
      <Callout id={`key-${calloutCount++}`} label="Key idea" brush="yellow">
        {children}
      </Callout>
    );
  }

  /** A worked example with concrete numbers */
  function Example({ title, children }: { title?: string; children: ReactNode }) {
    return (
      <Callout id={`ex-${title ?? calloutCount++}`} label={title ? `Worked example · ${title}` : "Worked example"} brush="green">
        {children}
      </Callout>
    );
  }

  /** A common misconception or subtle point */
  function Caution({ children }: { children: ReactNode }) {
    return (
      <Callout id={`careful-${calloutCount++}`} label="Careful" brush="pink" tone="red">
        {children}
      </Callout>
    );
  }

  return { Figure, Term, Recall, Preview, LessonLink, KeyIdea, Example, Caution };
}

export const LESSON_COMPONENT_NAMES = ["Figure", "Term", "Recall", "Preview", "LessonLink", "KeyIdea", "Example", "Caution"];
