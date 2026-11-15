"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { SourceAggregate, StoryDTO, StoryItemDTO } from "@/lib/news/dto";
import { engagementLabel, formatCount, timeAgo } from "@/lib/news/format";
import { SketchCard, SketchFrame } from "@/components/sketch";
import { SourceGlyph } from "./source-badge";
import { BookmarkIcon, BreakingMark, ChevronIcon, CrossIcon, ExternalIcon, ReadMark } from "./sketch-icons";

function chipText(agg: SourceAggregate): string {
  switch (agg.source) {
    case "hackernews":
      return agg.topEngagement > 0 ? `HN ${formatCount(agg.topEngagement)} pts` : "Hacker News";
    case "reddit": {
      const name = agg.names[0] + (agg.names.length > 1 ? ` +${agg.names.length - 1}` : "");
      return agg.topEngagement > 0 ? `${name} · ${formatCount(agg.topEngagement)}` : name;
    }
    case "github":
      return agg.topEngagement > 0 ? `GitHub ★ ${formatCount(agg.topEngagement)}` : "GitHub";
    case "x":
      return agg.names.length > 1 ? `${agg.names.length} posts on X` : agg.names[0];
    default:
      return agg.names.length > 1 ? `${agg.names.length} outlets` : agg.names[0];
  }
}

export function SourceChips({ sources, className }: { sources: SourceAggregate[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1", className)}>
      {sources.map((agg) => (
        <span key={agg.source} title={agg.names.join(", ")} className="inline-flex max-w-full items-center gap-[7px] py-[3px] text-[13px]">
          <SourceGlyph source={agg.source} />
          <span className="truncate">{chipText(agg)}</span>
        </span>
      ))}
    </div>
  );
}

export function StoryItemRow({ item }: { item: StoryItemDTO }) {
  const engagement = engagementLabel(item.source, item.engagement);
  return (
    <li className="flex items-start gap-2.5 border-t border-dashed border-ink/25 py-2 first:border-t-0">
      <SourceGlyph source={item.source} className="mt-[3px]" still />
      <div className="min-w-0 flex-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="line-clamp-2 text-sm font-semibold no-underline hover:underline"
        >
          {item.title}
          <ExternalIcon />
        </a>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-pencil">
          <span>{item.sourceName}</span>
          <span>{timeAgo(item.publishedAt)}</span>
          {engagement && <span>{engagement}</span>}
          {item.discussionUrl && item.discussionUrl !== item.url && (
            <a
              href={item.discussionUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-pencil underline decoration-dotted underline-offset-2"
            >
              {item.comments > 0 ? `${formatCount(item.comments)} comments` : "discussion"}
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

interface StoryCardProps {
  story: StoryDTO;
  onDismiss: (id: string) => void;
  onToggleSave: (id: string, saved: boolean) => void;
  variant?: "default" | "breaking";
}

export function StoryCard({ story, onDismiss, onToggleSave, variant = "default" }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const saved = story.userState?.saved ?? false;
  const isRead = story.userState?.status === "READ";
  const href = `/news/${story.id}`;
  const breaking = variant === "breaking";

  return (
    <SketchCard
      as="article"
      seed={story.id}
      w={breaking ? 380 : 576}
      h={breaking ? 400 : 280}
      hover
      wedge
      className={cn("transition-opacity", isRead && "opacity-[.62] hover:opacity-100")}
    >
      {breaking && <SketchFrame seed={`${story.id}:red`} w={380} h={400} tone="red" faint />}
      <div className={cn("flex flex-col", breaking ? "gap-2.5 pb-4 pl-5 pr-4 pt-5" : "gap-2 pb-3.5 pl-5 pr-3.5 pt-[18px]")}>
        <div className="flex items-start gap-2">
          <div className="flex min-h-11 flex-1 flex-wrap items-center gap-x-2.5 gap-y-0.5">
            {story.isBreaking && <BreakingMark size={breaking ? 24 : 21} />}
            <span className="font-mono text-[11.5px] text-pencil">
              {timeAgo(story.lastSeenAt)} · {story.itemCount} {story.itemCount === 1 ? "source" : "sources"}
              {story.sourceCount > 1 ? ` on ${story.sourceCount} platforms` : ""}
            </span>
            {isRead && <ReadMark />}
          </div>
          <button
            type="button"
            onClick={() => onToggleSave(story.id, !saved)}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save story"}
            title={saved ? "Saved" : "Save"}
            className="sk-icon !h-11 !w-10"
          >
            <BookmarkIcon saved={saved} />
          </button>
          <button
            type="button"
            onClick={() => onDismiss(story.id)}
            aria-label="Dismiss story"
            title="Dismiss"
            className="sk-icon !h-11 !w-10"
          >
            <CrossIcon />
          </button>
        </div>

        <h3 className={cn("font-bold", breaking ? "text-[21px] leading-[1.25]" : "text-lg leading-[1.3]")}>
          <Link href={href} className={cn("no-underline", isRead && "text-pencil")}>
            {story.headline}
          </Link>
        </h3>

        {story.summary && (
          <p className={cn(breaking ? "line-clamp-4 text-[15px]" : "line-clamp-3 text-sm")}>{story.summary}</p>
        )}
        {story.whyItMatters && (
          <p className="text-sm">
            <span className={cn("font-hand font-bold text-pen", breaking ? "text-[21px]" : "text-[20px]")}>Why it matters: </span>
            {story.whyItMatters}
          </p>
        )}

        <SourceChips sources={story.sources} className="mt-0.5" />

        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-dashed border-ink/30">
          {story.items.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold hover:text-pen focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-pen"
            >
              <ChevronIcon open={expanded} />
              {expanded
                ? "Hide links"
                : `Show ${story.items.length === 1 ? "link" : `${story.items.length} links`}${
                    story.itemCount > story.items.length ? ` of ${story.itemCount}` : ""
                  }`}
            </button>
          )}
          <Link href={href} className={cn("ml-auto font-hand font-bold", breaking ? "text-[22px]" : "text-[21px]")}>
            Read the breakdown →
          </Link>
        </div>

        {expanded && (
          <ul className="sk-fade">
            {story.items.map((item) => (
              <StoryItemRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </SketchCard>
  );
}
