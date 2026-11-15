import { cn } from "@/lib/utils";
import { ring, rng, shade } from "@/lib/sketch";

/*
 * Hand-drawn icons and marks for the news pages. Strokes are doubled
 * (a firm pass and a lighter offset pass) like the rest of the sketch kit.
 */

const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function BookmarkIcon({ saved, size = 20 }: { saved: boolean; size?: number }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 20 22" aria-hidden="true" className="overflow-visible">
      {saved ? (
        <path d="M4 2.5 C 8 2.2, 12 2.6, 16 2.4 L 16.2 19.5 L 10 15 L 3.8 19.8 Z" fill="#d6402b" stroke="#22252e" strokeWidth={1.8} strokeLinejoin="round" />
      ) : (
        <>
          <path {...stroke} strokeWidth={2} d="M4 2.5 C 8 2.2, 12 2.6, 16 2.4 L 16.2 19.5 L 10 15 L 3.8 19.8 Z" />
          <path {...stroke} strokeWidth={1.2} opacity={0.55} d="M4.6 3.2 C 8 3, 12.4 3.3, 15.4 3 L 15.6 18.6 L 10.2 14.4 L 4.4 18.8 Z" />
        </>
      )}
    </svg>
  );
}

export function CrossIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path {...stroke} strokeWidth={2.2} d="M6 6.5 C 10 10, 14 14.5, 18 18 M18 6 C 14 10.5, 10 14, 6.2 18" />
      <path {...stroke} strokeWidth={1.2} opacity={0.55} d="M6.6 6 C 10.5 10.5, 14.4 14, 17.6 18.6 M17.4 6.6 C 14 10, 10.4 14.6, 6 17.4" />
    </svg>
  );
}

export function RefreshIcon({ spinning, size = 18 }: { spinning?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn(spinning && "animate-spin motion-reduce:animate-none")}
    >
      <path {...stroke} strokeWidth={2.2} d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" />
    </svg>
  );
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      aria-hidden="true"
      className={cn("transition-transform duration-200", open && "rotate-90")}
    >
      <path {...stroke} strokeWidth={2} d="M4 2.5 L 9.5 7 L 4 11.5" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg width={11} height={11} viewBox="0 0 12 12" aria-hidden="true" className="ml-1 inline align-[-1px] text-pencil">
      <path {...stroke} strokeWidth={1.5} d="M5 2.5 L 2.5 2.6 L 2.4 9.6 L 9.5 9.5 L 9.4 7 M6.5 2.2 L 9.8 2.3 L 9.7 5.5 M9.6 2.4 L 5 7" />
    </svg>
  );
}

export function SparkleIcon() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true" className="flex-none overflow-visible">
      <path className="sk-draw thin" pathLength={1} d="M12 2 C 12.6 8, 13.5 10.8, 22 12 C 13.6 13.2, 12.6 15.8, 12 22 C 11.4 15.8, 10.4 13.2, 2 12 C 10.4 10.8, 11.4 8, 12 2 Z" style={{ animationDelay: ".3s" }} />
      <path className="sk-draw p2" pathLength={1} d="M19 3 L 19.5 5.5 L 22 6 L 19.5 6.5 L 19 9" style={{ animationDelay: ".9s" }} />
    </svg>
  );
}

export function CapIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 flex-none" {...stroke} strokeWidth={1.7}>
      <path d="M2 9 L 12 4.5 L 22 9 L 12 13.5 Z" />
      <path d="M6 11 L 6 16 C 9 18.5, 15 18.5, 18 16 L 18 11" />
      <path d="M22 9 L 22 15" />
    </svg>
  );
}

export function PaperIcon() {
  return (
    <svg width={20} height={22} viewBox="0 0 20 22" aria-hidden="true" className="mt-0.5 flex-none" {...stroke} strokeWidth={1.7}>
      <path d="M3 2 L 12 2 L 17 7 L 17 20 L 3 20 Z" />
      <path d="M12 2 L 12 7 L 17 7 M6 11 L 14 11 M6 15 L 12 15" />
    </svg>
  );
}

export function NewspaperIcon() {
  return (
    <svg width={22} height={20} viewBox="0 0 22 20" aria-hidden="true" className="mt-0.5 flex-none" {...stroke} strokeWidth={1.7}>
      <path d="M3 3 L 17 3 L 17 17 L 5 17 C 3.5 17, 3 16, 3 15 Z" />
      <path d="M17 7 L 20 7 L 20 15 C 20 16.5, 19 17, 17 17 M6 7 L 14 7 M6 10.5 L 14 10.5 M6 14 L 11 14" />
    </svg>
  );
}

export function WarningIcon() {
  return (
    <svg width={26} height={24} viewBox="0 0 26 24" aria-hidden="true" className="flex-none overflow-visible">
      <path className="sk-draw" pathLength={1} d="M13 2 L 24 21 L 2 21.5 Z" style={{ stroke: "#b07800", strokeWidth: 1.8, animationDelay: ".5s" }} />
      <path className="sk-draw p2" pathLength={1} d="M12.5 3 L 23 20 L 3 20.5 L 13 2.5" style={{ stroke: "#b07800", animationDelay: "1s" }} />
      <path className="sk-draw" pathLength={1} d="M13 9 L 13 14.5 M13 17.5 L 13 18" style={{ stroke: "#b07800", strokeWidth: 2, animationDelay: "1.3s" }} />
    </svg>
  );
}

const DOT = ring(7, 7, 4.5, 333, 1.1) + " " + shade(7, 7, 4, 334, -0.9, 1.3);

/** Pulsing red "Breaking" mark with a shaded pencil dot */
export function BreakingMark({ size = 24 }: { size?: number }) {
  return (
    <span className="sk-pulse inline-flex items-center gap-1 font-hand font-bold text-pen" style={{ fontSize: size }}>
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
        <path d={DOT} fill="none" stroke="#d6402b" strokeWidth={1.6} strokeLinecap="round" />
      </svg>
      Breaking
    </span>
  );
}

/** Red-pen tick + "read" */
export function ReadMark() {
  return (
    <span className="inline-flex items-center gap-0.5 font-hand text-[20px] text-pen">
      <svg width={22} height={18} viewBox="0 0 34 28" aria-hidden="true" className="overflow-visible">
        <path className="sk-draw red" pathLength={1} d="M3 15 C 7 18, 10 21, 12 24 C 17 15, 23 8, 31 3" style={{ animationDuration: ".5s" }} />
        <path className="sk-draw red p2" pathLength={1} d="M5 14 C 8 17, 11 20, 13 22 C 18 14, 24 8, 32 5" style={{ animationDelay: ".45s", animationDuration: ".4s" }} />
      </svg>
      read
    </span>
  );
}

/** Double pencil underline drawn under a big heading */
export function HandUnderline({ width = 300 }: { width?: number }) {
  const w = width;
  return (
    <svg width={w} height={18} viewBox={`0 0 ${w} 18`} aria-hidden="true" className="mt-1 block max-w-full overflow-visible">
      <path
        className="sk-draw"
        pathLength={1}
        d={`M3 10 C ${w * 0.23} 4, ${w * 0.5} 13, ${w * 0.73} 7 S ${w * 0.95} 5, ${w - 3} 9`}
        style={{ animationDelay: ".2s", animationDuration: "1.1s" }}
      />
      <path
        className="sk-draw p2"
        pathLength={1}
        d={`M${w - 8} 12 C ${w * 0.77} 11, ${w * 0.53} 15, ${w * 0.3} 11 S ${w * 0.07} 12, 8 13`}
        style={{ animationDelay: "1s", animationDuration: ".8s" }}
      />
    </svg>
  );
}

/** Pencil scribble standing in for loading text: back-and-forth strokes across each skeleton bar */
export function ScribbleSkeleton({ widths = [90, 100, 75, 95, 60] }: { widths?: number[] }) {
  const R = rng(4242);
  const parts = widths.map((pct, row) => {
    const y0 = 8 + row * 21;
    const x1 = (700 * pct) / 100;
    const pts: string[] = [];
    let i = 0;
    for (let x = 4; x <= x1; x += 7 + R() * 4) {
      const y = i % 2 ? y0 + 10 + (R() - 0.5) * 2 : y0 + (R() - 0.5) * 2;
      pts.push(`${(x + (R() - 0.5) * 3).toFixed(1)} ${y.toFixed(1)}`);
      i++;
    }
    return "M" + pts.join(" L");
  });
  return (
    <svg width="100%" height={110} viewBox="0 0 700 110" preserveAspectRatio="none" aria-hidden="true">
      <path className="sk-draw sh sk-loop" pathLength={1} d={parts.join(" ")} />
    </svg>
  );
}
