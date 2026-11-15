import type { ReactNode } from "react";
import { AppHeader } from "@/components/sketch/app-header";

/** Page header for Learn pages: shared app header, then a handwritten title block with a pencil underline */
export function LearnHeader({ title, subtitle, eyebrow }: { title: ReactNode; subtitle?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-8">
      <AppHeader active="learn" />
      <header className="min-w-0">
        {eyebrow && <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-pencil">{eyebrow}</div>}
        <h1 className="font-hand text-5xl font-bold leading-none sm:text-[64px]">{title}</h1>
        <svg width="190" height="18" viewBox="0 0 190 18" aria-hidden="true" className="mt-0.5 block overflow-visible">
          <path className="sk-draw" pathLength={1} d="M3 10 C 50 4, 100 13, 140 7 S 180 5, 187 9" style={{ animationDelay: ".2s" }} />
          <path
            className="sk-draw p2"
            pathLength={1}
            d="M184 12 C 140 11, 90 15, 50 11 S 14 12, 6 13"
            style={{ animationDelay: ".9s", animationDuration: ".7s" }}
          />
        </svg>
        {subtitle && <p className="mt-3 max-w-3xl text-base text-pencil">{subtitle}</p>}
      </header>
    </div>
  );
}
