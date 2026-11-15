"use client";

import { useState, useEffect } from "react";
import { BrushTag, SketchCard, SketchRing } from "@/components/sketch";
import { ring, seedOf, shade } from "@/lib/sketch";

interface Paper {
  id: string;
  title: string;
  authors: Array<{ name: string }>;
  abstract?: string;
  noveltyScore: number | null;
  noveltySummary: string | null;
  categories?: string[];
  publicationDate?: Date | string;
}

interface NoveltyCarouselProps {
  papers: Paper[];
  onViewPaper?: (paperId: string) => void;
}

/** How long each featured paper stays up before the next one is drawn */
const SLIDE_MS = 6000;

/** Pencil dot for the slide picker: a small loop, scribbled in when selected */
function SlideDot({ index, on, onPick, label }: { index: number; on: boolean; onPick: () => void; label: string }) {
  const s = seedOf(`dot${index}`);
  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center border-0 bg-transparent focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-pen"
      aria-label={label}
      aria-pressed={on}
      onClick={onPick}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="overflow-visible">
        <path className="sk-ink" strokeWidth={1.8} d={ring(8, 8, 6, s, 1.05)} />
        {on && <path className="sk-ink" strokeWidth={1.3} d={shade(8, 8, 5.5, s + 1, -0.9, 1.6)} />}
      </svg>
    </button>
  );
}

/**
 * "Most novel this week": one featured paper at a time in a large sketched card,
 * with a pencil score dial and a red-pen note on why it's new. Auto-advances.
 */
export function NoveltyCarousel({ papers, onViewPaper }: NoveltyCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Get first 5 papers
  const displayPapers = papers.slice(0, 5);
  const count = displayPapers.length;
  const index = count ? active % count : 0;

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = setTimeout(() => setActive((prev) => (prev + 1) % count), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [active, paused, count]);

  if (count === 0) return null;

  const paper = displayPapers[index];
  const authors = paper.authors.slice(0, 3).map((a) => a.name).join(", ") + (paper.authors.length > 3 ? " et al." : "");

  return (
    <div
      className="mb-9"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <SketchCard
        seed="novelty-feature"
        w={1192}
        h={340}
        panel
        wedge
        hover
        as="section"
        aria-labelledby="novelty-heading"
        aria-roledescription="carousel"
        className="px-8 pb-4 pt-7"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="novelty-heading" className="m-0 font-hand text-[30px] font-bold text-pen">
            Most novel this week
          </h2>
          <span className="font-mono text-xs text-pencil" aria-live="polite">
            {index + 1} / {count}
          </span>
        </div>

        {/* Keyed so the pencil strokes redraw for every paper */}
        <div key={paper.id} className="flex flex-wrap items-center gap-x-9 gap-y-6 pb-2 pt-[18px]">
          <SketchRing seed={`feat:${paper.id}`} size={140} shading={0.25} className="flex-none">
            <span className="block text-center leading-none">
              <span className="sk-fade block font-hand text-[60px] font-bold" style={{ animationDelay: ".5s" }}>
                {paper.noveltyScore !== null ? paper.noveltyScore.toFixed(1) : "?"}
              </span>
              <span className="sk-fade mt-1 block font-mono text-[11px] text-pencil" style={{ animationDelay: ".7s" }}>
                {paper.noveltyScore !== null ? "novelty / 10" : "score pending"}
              </span>
            </span>
          </SketchRing>

          <div className="sk-fade flex min-w-0 flex-[1_1_380px] flex-col gap-2" style={{ animationDelay: ".25s" }}>
            <h3 className="m-0 text-[26px] font-bold leading-tight">
              {onViewPaper ? (
                <button
                  type="button"
                  onClick={() => onViewPaper(paper.id)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-inherit hover:text-pen"
                >
                  {paper.title}
                </button>
              ) : (
                paper.title
              )}
            </h3>
            <div className="text-pencil">{authors}</div>
            <p className="m-0 mt-1 line-clamp-4 max-w-[620px] text-base">{paper.noveltySummary || paper.abstract}</p>
            {paper.categories && paper.categories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3">
                {paper.categories.slice(0, 3).map((cat, i) => (
                  <BrushTag key={cat} label={cat} variant={paper.id + cat} delay={0.6 + i * 0.2} />
                ))}
              </div>
            )}
          </div>

          <div className="relative flex min-h-[110px] flex-[0_1_230px] flex-col justify-center">
            <svg width="90" height="60" viewBox="0 0 90 60" aria-hidden="true" className="overflow-visible">
              <path className="sk-draw red" pathLength={1} d="M86 50 C 60 52, 30 40, 12 14" style={{ animationDelay: "1s", animationDuration: ".7s" }} />
              <path className="sk-draw red p2" pathLength={1} d="M84 53 C 58 54, 31 43, 14 17" style={{ animationDelay: "1.4s", animationDuration: ".5s" }} />
              <path className="sk-draw red" pathLength={1} d="M8 26 L 11 12 L 24 17" style={{ animationDelay: "1.7s", animationDuration: ".3s" }} />
            </svg>
            <p className="sk-fade m-0 -rotate-3 font-hand text-[28px] leading-[1.1] text-pen" style={{ animationDelay: "1.4s" }}>
              {paper.noveltySummary ? "Why it's novel" : "Abstract (novelty summary pending)"}
            </p>
          </div>
        </div>

        {count > 1 && (
          <div className="flex justify-center gap-0.5">
            {displayPapers.map((p, i) => (
              <SlideDot
                key={p.id}
                index={i}
                on={i === index}
                onPick={() => setActive(i)}
                label={`Show paper ${i + 1} of ${count}`}
              />
            ))}
          </div>
        )}
      </SketchCard>
    </div>
  );
}
