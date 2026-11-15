import type { ReactNode } from "react";
import { SketchRing } from "@/components/sketch";

/* Small hand-drawn marks shared by the account and payment screens. */

/** Big handwritten page title with a double pencil underline. */
export function PageTitle({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <section>
      <h1 className="m-0 font-hand text-[64px] font-bold leading-none">{title}</h1>
      <svg width="220" height="18" viewBox="0 0 220 18" aria-hidden="true" className="mt-0.5 block overflow-visible">
        <path className="sk-draw" pathLength={1} d="M3 10 C 50 4, 110 13, 160 7 S 205 5, 217 9" style={{ animationDelay: ".2s", animationDuration: "1s" }} />
        <path className="sk-draw p2" pathLength={1} d="M212 12 C 170 11, 120 15, 70 11 S 18 12, 8 13" style={{ animationDelay: ".9s", animationDuration: ".7s" }} />
      </svg>
      {subtitle && <p className="sk-muted mt-2.5">{subtitle}</p>}
    </section>
  );
}

/** Red-pen tick used in feature lists. */
export function PenTick() {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true" className="sk-ink flex-none overflow-visible">
      <path d="M2 8.5 C 4 10, 5.4 11.6, 6.6 13.5 C 9 8.6, 12 5, 16 2" style={{ stroke: "#d6402b", strokeWidth: 2 }} />
      <path d="M3 8 C 4.8 9.8, 6 11, 7 12.6 C 9.6 8, 12.4 4.8, 16.4 2.6" style={{ stroke: "#d6402b", strokeWidth: 1, opacity: 0.5 }} />
    </svg>
  );
}

/** Green circle with a tick drawn on (payment success). */
export function SuccessMark() {
  return (
    <SketchRing seed="pay-ok" size={88} shading={0.6} tone="green">
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="absolute -left-[44px] -top-[44px] overflow-visible">
        <path className="sk-draw green" pathLength={1} d="M27 46 C 32 50, 36 55, 39 60 C 46 46, 54 36, 64 28" style={{ strokeWidth: 3.2, animationDelay: ".8s", animationDuration: ".5s" }} />
      </svg>
    </SketchRing>
  );
}

/** Red circle with a cross drawn on (payment cancelled). */
export function CancelMark() {
  return (
    <SketchRing seed="pay-no" size={88} shading={false} tone="red">
      <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="absolute -left-[44px] -top-[44px] overflow-visible">
        <path className="sk-draw red" pathLength={1} d="M29 28 C 38 37, 48 48, 59 60 M60 27 C 50 38, 39 49, 28 61" style={{ strokeWidth: 3.2, animationDelay: ".8s", animationDuration: ".5s" }} />
        <path className="sk-draw red p2" pathLength={1} d="M31 26 C 40 36, 49 47, 61 58 M58 29 C 48 40, 38 50, 30 62" style={{ animationDelay: "1.2s", animationDuration: ".4s" }} />
      </svg>
    </SketchRing>
  );
}

/** Sketched padlock (quota exhausted). */
export function LockMark() {
  return (
    <svg width="72" height="80" viewBox="0 0 72 80" aria-hidden="true" className="overflow-visible">
      <path className="sk-draw" pathLength={1} d="M22 36 C 21 26, 22 12, 36 11 C 50 10, 51 24, 50 36" style={{ strokeWidth: 2.6 }} />
      <path className="sk-draw p2" pathLength={1} d="M25 35 C 24 25, 26 15, 36 14 C 47 13, 48 25, 47.5 35" style={{ animationDelay: ".4s" }} />
      <path className="sk-draw" pathLength={1} d="M12 37 C 28 35.5, 46 36.5, 61 36 C 62 48, 61.5 60, 61 72 C 45 73, 28 72.5, 12.5 72 C 12 60, 12.5 48, 12 37" style={{ animationDelay: ".5s" }} />
      <path className="sk-draw p2" pathLength={1} d="M14 39 C 29 38, 45 39, 59 38.5 C 59.5 50, 59 61, 59.5 70 C 44 70.5, 29 70, 14.5 70.5" style={{ animationDelay: ".9s" }} />
      <path className="sk-draw sh" pathLength={1} d="M48 40 L58 40 L46 46 L58 46 L46 52 L58 52 L46 58 L58 58 L46 64 L58 64 L48 69" style={{ animationDelay: "1.2s" }} />
      <path className="sk-draw" pathLength={1} d="M36 50 C 36.5 54, 35.6 58, 36 62" style={{ strokeWidth: 3, animationDelay: "1.4s", animationDuration: ".3s" }} />
    </svg>
  );
}

/** Pencil warning triangle. */
export function WarnMark() {
  return (
    <svg width="22" height="20" viewBox="0 0 22 20" aria-hidden="true" className="sk-ink flex-none overflow-visible">
      <path d="M11 2 C 7.5 8, 5 12.5, 2 18.4 C 8 18.2, 14 18.3, 20 18.5 C 17 12.5, 14.5 8, 11 2 Z M11 8 C 11.2 10, 10.9 12, 11 13.4 M11 15.6 L 11.1 16" style={{ strokeWidth: 1.8 }} />
    </svg>
  );
}

/** Sketched credit card. */
export function CardMark() {
  return (
    <svg width="40" height="36" viewBox="0 0 40 36" aria-hidden="true" className="sk-ink flex-none overflow-visible">
      <path d="M3 8 C 14 7, 26 7.5, 37 7 C 37.5 15, 37 22, 37.4 29 C 26 29.5, 14 29, 3.2 29.4 C 2.8 22, 3.2 15, 3 8 M3.5 14 C 15 13.4, 26 14, 36.6 13.6 M8 23 L 17 22.8" style={{ strokeWidth: 2 }} />
      <path d="M4.5 9.5 C 15 9, 26 9.4, 35.8 9 C 36 16, 35.6 22, 36 28" style={{ strokeWidth: 1.2, opacity: 0.55 }} />
    </svg>
  );
}

/** Sketched calendar page. */
export function CalendarMark() {
  return (
    <svg width="40" height="36" viewBox="0 0 40 36" aria-hidden="true" className="sk-ink flex-none overflow-visible">
      <path d="M5 7 C 15 6.5, 26 7, 35 6.6 C 35.4 15, 35 24, 35.3 32 C 25 32.4, 15 32, 5.2 32.3 C 4.8 24, 5.2 15, 5 7 M5.4 13.5 C 15 13, 25 13.4, 34.8 13.2 M12 3 L 12.2 9.5 M28 3 L 28.1 9.5 M11 19 L 13 19 M19 19 L 21 19 M27 19 L 29 19 M11 25.5 L 13 25.5 M19 25.5 L 21 25.5" style={{ strokeWidth: 2 }} />
      <path d="M6.5 8.5 C 16 8, 26 8.4, 33.8 8.2 C 34 16, 33.6 24, 34 31" style={{ strokeWidth: 1.2, opacity: 0.55 }} />
    </svg>
  );
}
