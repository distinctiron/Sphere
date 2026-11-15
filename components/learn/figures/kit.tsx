"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared building blocks for lesson figures (see content/learn/AUTHORING.md).
 *
 * Two kinds of figure:
 * - Staged loops: SVG + CSS keyframes. Put a <style> block inside the component
 *   with class names prefixed by the figure name. The frame pauses them via
 *   `animation-play-state` when off-screen or paused, and replays by remounting.
 * - Interactive: React state + controls from this file. Use `useFigure().playing`
 *   to pause any requestAnimationFrame loop.
 */

/** Palette: the sketchbook's graphite, paper and pens, so SVG figures match the app */
export const C = {
  ink: "#22252e", // graphite
  text: "#3a3e49",
  muted: "#5b5f6b", // pencil
  faint: "#8a8d96",
  line: "#c4c5c0",
  grid: "#e3e2da",
  wash: "#f6f4ea", // paper, slightly darker than the page
  primary: "#2b6ec4", // blue pen: the main object / "signal"
  primarySoft: "#9cc2f0",
  primaryWash: "#e6effa",
  active: "#d6402b", // red pen: activity, flow, "now"
  activeSoft: "#f0a596",
  warn: "#c98d00", // amber: error, gradient, cost
  warnSoft: "#f5d36b",
  good: "#1f8a57", // green: success, available capacity
  goodSoft: "#8fd1ae",
} as const;

export const FONT = {
  sans: "var(--font-body), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "var(--font-code), ui-monospace, SFMono-Regular, Menlo, monospace",
};

export interface FigureState {
  /** False when paused by the user, scrolled off-screen, or reduced motion is preferred (until the user presses play) */
  playing: boolean;
  reducedMotion: boolean;
}

export const FigureContext = createContext<FigureState>({ playing: true, reducedMotion: false });

export function useFigure(): FigureState {
  return useContext(FigureContext);
}

/** requestAnimationFrame loop that only runs while the figure is playing. `dt` is in seconds (capped). */
export function useAnimationFrame(callback: (dt: number, elapsed: number) => void, active = true) {
  const { playing } = useFigure();
  const cb = useRef(callback);
  cb.current = callback;
  useEffect(() => {
    if (!playing || !active) return;
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      elapsed += dt;
      cb.current(dt, elapsed);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, active]);
}

/** Responsive SVG canvas: scales with width, never overflows */
export function FigureSvg({
  width,
  height,
  label,
  children,
  className,
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={cn("block h-auto w-full select-none", className)}
      style={{ fontFamily: FONT.sans }}
    >
      {children}
    </svg>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <label className="flex min-w-0 flex-1 basis-48 flex-col gap-1 text-xs text-pencil">
      <span className="flex justify-between gap-2">
        <span className="font-hand text-[19px] font-bold leading-none text-ink">{label}</span>
        <span className="font-mono font-bold tabular-nums text-ink">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#d6402b]"
      />
    </label>
  );
}

export function Controls({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">{children}</div>;
}

export function ChoiceButtons<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="sk-segs">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className="sk-seg min-h-[36px] px-3 text-[19px]"
        >
          <span className="sk-bseg" aria-hidden="true" />
          <span className="lbl">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Small legend row under a figure */
export function Legend({ items }: { items: Array<{ color: string; label: string; dashed?: boolean }> }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{ background: item.dashed ? `repeating-linear-gradient(90deg, ${item.color} 0 3px, transparent 3px 6px)` : item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
