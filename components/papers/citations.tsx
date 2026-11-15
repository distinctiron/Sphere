"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SketchFrame } from "@/components/sketch";
import { ChevronIcon } from "./sketch-icons";
import type { Citation, SectionType } from "@/lib/rag/types";
import { splitCitations } from "@/lib/rag/citation-text";

export { citedIdsIn } from "@/lib/rag/citation-text";

const SECTION_LABELS: Record<SectionType, string> = {
  abstract: "Abstract",
  introduction: "Introduction",
  methods: "Methods",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion",
  other: "Other",
};

function sourceLabel(citation: Citation): string {
  const section = SECTION_LABELS[citation.sectionType] ?? "Other";
  const title = citation.sectionTitle?.trim();
  return title && title.toLowerCase() !== section.toLowerCase() ? `${section} · ${title}` : section;
}

interface CitedTextProps {
  text: string;
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

/** Answer text with inline [n] markers rendered as clickable citation links */
export function CitedText({ text, citations, onCitationClick, className }: CitedTextProps) {
  const byId = new Map(citations.map((c) => [c.id, c]));
  const parts = splitCitations(text, new Set(byId.keys()));

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <span key={i}>{part}</span>
        ) : (
          <sup key={i} className="mx-0.5 whitespace-nowrap">
            {part.map((id, j) => {
              const citation = byId.get(id)!;
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => onCitationClick?.(citation)}
                  title={`${sourceLabel(citation)}: ${citation.content.slice(0, 160)}…`}
                  aria-label={`Source ${id}: ${sourceLabel(citation)}`}
                  className="sk-cite !align-baseline !px-0.5 hover:underline"
                >
                  [{id}]
                </button>
              );
            })}
          </sup>
        )
      )}
    </div>
  );
}

interface SourceListProps {
  citations: Citation[];
  /** Citations referenced in the answer; others are shown as "also consulted" */
  citedIds?: Set<number>;
  onNavigate?: (citation: Citation) => void;
  compact?: boolean;
}

/** Expandable list of the passages an answer was grounded in */
export function SourceList({ citations, citedIds, onNavigate, compact }: SourceListProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (citations.length === 0) return null;

  // Show cited sources; if the model cited none, show everything that was used as context
  const cited = citedIds && citedIds.size > 0 ? citations.filter((c) => citedIds.has(c.id)) : citations;
  const heading = citedIds && citedIds.size > 0 ? "Sources" : "Context used";
  const maxRelevance = Math.max(...cited.map((c) => c.relevance), 0.0001);

  return (
    <div className={cn("not-prose font-sans", compact ? "mt-2" : "mt-3")}>
      <p className="font-hand text-[21px] font-bold leading-none mb-1">{heading}</p>
      <ul className="list-none p-0 m-0">
        {cited.map((citation) => {
          const isOpen = expanded === citation.id;
          const relative = Math.max(0.1, citation.relevance / maxRelevance);
          return (
            <li key={citation.id} className="border-t-[1.5px] border-dashed border-ink/30 text-sm">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : citation.id)}
                aria-expanded={isOpen}
                className={cn(
                  "flex w-full items-center gap-2.5 text-left text-ink hover:text-pen",
                  compact ? "min-h-9 px-0.5 py-1" : "min-h-11 px-1.5 py-1",
                  "focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-pen"
                )}
              >
                <ChevronIcon
                  direction="right"
                  size={14}
                  className={cn("transition-transform duration-200", isOpen && "rotate-90")}
                />
                <span className="font-mono text-xs font-bold text-pen">[{citation.id}]</span>
                <span className="min-w-0 flex-1 truncate">{sourceLabel(citation)}</span>
                <span
                  className="sk-pbar !h-3 w-[70px] flex-shrink-0"
                  title={`Similarity ${citation.relevance.toFixed(2)}`}
                  aria-label={`Relevance ${Math.round(relative * 100)}%`}
                >
                  <SketchFrame seed={`source-bar:${citation.id}`} w={70} h={12} />
                  <span className="fill !top-0.5 !bottom-0.5" style={{ width: `calc(${relative * 100}% - 4px)` }} />
                </span>
              </button>
              {isOpen && (
                <div className={cn("sk-fade pb-3 pr-1.5", compact ? "pl-6" : "pl-[30px]")}>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap font-serif text-sm leading-relaxed text-ink">
                    {citation.content}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-pencil">Similarity {citation.relevance.toFixed(2)}</span>
                    {onNavigate && citation.anchorId && (
                      <button
                        type="button"
                        onClick={() => onNavigate(citation)}
                        className="sk-uline font-hand text-[20px] font-bold text-ink hover:text-pen"
                      >
                        Show in paper
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
