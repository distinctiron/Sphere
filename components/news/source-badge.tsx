import { cn } from "@/lib/utils";
import { Brush } from "@/components/sketch";
import type { BrushColor } from "@/lib/sketch";
import { NEWS_SOURCE_LABELS, type NewsSourceId } from "@/lib/news/types";

/** Each platform keeps one brush colour everywhere (glyphs, filter tags, coverage headings) */
export const SOURCE_STYLES: Record<NewsSourceId, { glyph: string; color: BrushColor }> = {
  hackernews: { glyph: "Y", color: "orange" },
  reddit: { glyph: "r/", color: "pink" },
  github: { glyph: "GH", color: "green" },
  rss: { glyph: "N", color: "blue" },
  x: { glyph: "X", color: "yellow" },
};

/** Small platform marker painted with a short brush stroke (brand-neutral glyphs, no logos) */
export function SourceGlyph({ source, className, still }: { source: NewsSourceId; className?: string; still?: boolean }) {
  const style = SOURCE_STYLES[source];
  return (
    <span aria-hidden className={cn("inline-flex flex-shrink-0", className)}>
      <Brush
        color={style.color}
        variant={source}
        still={still}
        className="px-[6px] py-[2px] pr-[9px] font-mono text-[10.5px] font-bold leading-[1.3] text-[#1b1d24] before:bottom-[-2px] before:left-[-3px] before:right-[-5px] before:top-[-2px]"
      >
        {style.glyph}
      </Brush>
    </span>
  );
}

export function sourceLabel(source: NewsSourceId): string {
  return NEWS_SOURCE_LABELS[source];
}
