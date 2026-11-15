"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type LazyExoticComponent } from "react";
import { Maximize2, Pause, Play, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SketchCorner, SketchFrame, SketchWedge } from "@/components/sketch";
import { FigureContext } from "./figures/kit";
import { FIGURE_LOADERS } from "./figures/registry";

const lazyCache = new Map<string, LazyExoticComponent<ComponentType>>();

function getLazyFigure(name: string): LazyExoticComponent<ComponentType> | null {
  const loader = FIGURE_LOADERS[name];
  if (!loader) return null;
  if (!lazyCache.has(name)) lazyCache.set(name, lazy(loader));
  return lazyCache.get(name)!;
}

interface FigureProps {
  /** Registry name (components/learn/figures/<path>/index.ts) */
  name: string;
  title: string;
  /** What the figure shows, in one or two sentences */
  caption?: string;
  /** "Watch for…": the one thing the reader should notice */
  notice?: string;
  /** Interactive figures don't need play/pause/replay */
  interactive?: boolean;
  /** Static diagrams: no playback controls */
  static?: boolean;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Lesson figure: frame with title, caption and playback controls around a
 * lazily loaded figure component. Animations run only while on screen; with
 * prefers-reduced-motion they stay still until the reader presses play.
 */
export function Figure({ name, title, caption, notice, interactive = false, static: isStatic = false }: FigureProps) {
  const Component = useMemo(() => getLazyFigure(name), [name]);
  const ref = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [forceMotion, setForceMotion] = useState(false);
  const [runKey, setRunKey] = useState(0);
  // Figures render client-only: they are decorative-interactive, and floating-point
  // geometry computed on the server would not hydrate identically
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Phones: an enlarged, sideways-scrollable view at the figure's design width
  const [enlarged, setEnlarged] = useState(false);
  useEffect(() => {
    if (!enlarged) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEnlarged(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [enlarged]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const motionAllowed = !reducedMotion || forceMotion;
  const playing = visible && !userPaused && motionAllowed;

  const togglePlay = () => {
    if (!motionAllowed) {
      setForceMotion(true);
      setUserPaused(false);
      return;
    }
    setUserPaused((p) => !p);
  };

  return (
    <figure
      ref={ref}
      className={cn(
        "learn-figure not-prose relative -mx-2 my-10 bg-sheet px-2.5 py-3 sm:mx-0 sm:px-6 sm:py-5",
        !playing && "fig-paused",
        forceMotion && "fig-force-motion"
      )}
    >
      <SketchFrame seed={`figure:${name}`} w={700} h={480} />
      <SketchCorner seed={`figure:${name}:c`} size="panel" delay={0.5} />
      <SketchWedge seed={`figure:${name}:w`} />
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-pencil">Figure</div>
          <div className="font-hand text-[28px] font-bold leading-[1.05]">{title}</div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {Component && (
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              aria-label="Enlarge figure"
              title="Enlarge"
              className="sk-icon sm:hidden"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        {!interactive && !isStatic && Component && (
          <>
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause animation" : "Play animation"}
              title={playing ? "Pause" : "Play"}
              className="sk-icon"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setRunKey((k) => k + 1);
                if (!motionAllowed) setForceMotion(true);
                setUserPaused(false);
              }}
              aria-label="Replay animation"
              title="Replay"
              className="sk-icon"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </>
        )}
        </div>
      </div>

      <FigureContext.Provider value={{ playing, reducedMotion: !motionAllowed }}>
        {!mounted ? (
          <div className="sk-pulse relative aspect-[16/9] w-full bg-[repeating-linear-gradient(-55deg,rgba(34,37,46,0.08)_0_1.3px,transparent_1.3px_7px)]" />
        ) : Component ? (
          <Suspense fallback={<div className="sk-pulse relative aspect-[16/9] w-full bg-[repeating-linear-gradient(-55deg,rgba(34,37,46,0.08)_0_1.3px,transparent_1.3px_7px)]" />}>
            <div key={runKey} className="relative">
              <Component />
            </div>
          </Suspense>
        ) : (
          <div className="relative border-2 border-dashed border-ink/30 p-6 text-center font-hand text-xl text-pencil">
            Figure “{name}” is not available.
          </div>
        )}
      </FigureContext.Provider>

      {enlarged && Component && (
        <div role="dialog" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-paper">
          <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-ink/25 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="min-w-0 truncate font-hand text-[24px] font-bold">{title}</div>
            <button
              type="button"
              onClick={() => setEnlarged(false)}
              aria-label="Close enlarged figure"
              className="sk-icon"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="min-w-[680px]">
              <FigureContext.Provider value={{ playing: motionAllowed, reducedMotion: !motionAllowed }}>
                <Suspense fallback={null}>
                  <Component />
                </Suspense>
              </FigureContext.Provider>
            </div>
          </div>
          <div className="border-t-2 border-dashed border-ink/20 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] font-hand text-lg text-pencil">
            Scroll sideways to see the whole figure. Turn your phone for a wider view.
          </div>
        </div>
      )}

      {(caption || notice) && (
        <figcaption className="relative mt-4 max-w-[60ch] space-y-1 font-serif text-[15px] leading-relaxed">
          {caption && <p>{caption}</p>}
          {notice && (
            <p>
              <span className="font-hand text-[21px] font-bold text-pen">Watch for: </span>
              {notice}
            </p>
          )}
        </figcaption>
      )}
    </figure>
  );
}
