import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { brushClass, corner, frame, line, ring, seedOf, shade, wedge, type BrushColor } from "@/lib/sketch";

/*
 * Sketchbook primitives. All geometry is seeded, so these render the same on
 * the server and the client and can be used from server or client components.
 * Pass a stable `seed` (an id or label) so each element gets its own wobble.
 */

const cache = new Map<string, unknown>();
function memo<T>(key: string, fn: () => T): T {
  if (!cache.has(key)) {
    if (cache.size > 2000) cache.clear();
    cache.set(key, fn());
  }
  return cache.get(key) as T;
}

type Seed = string | number;
const num = (s: Seed) => (typeof s === "number" ? s : seedOf(s));
const delay = (d?: number): CSSProperties | undefined => (d == null ? undefined : { animationDelay: `${d}s` });

/** Three-pass pencil outline that fills its positioned parent. w/h set the wobble scale (roughly the element's px size). */
export function SketchFrame({
  seed,
  w = 400,
  h = 160,
  tone,
  dashed,
  faint,
  className,
}: {
  seed: Seed;
  w?: number;
  h?: number;
  tone?: "red" | "green";
  dashed?: boolean;
  faint?: boolean;
  className?: string;
}) {
  const p = memo(`f:${w}:${h}:${seed}`, () => frame(w, h, num(seed)));
  return (
    <svg
      className={cn("sk-frame", tone === "red" && "redline", tone === "green" && "greenline", dashed && "dash", faint && "faint", className)}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="f1" d={p.a} />
      <path className="f2" d={p.b} />
      <path className="f3" d={p.c} />
    </svg>
  );
}

const CORNER_SIZES = {
  card: [60, 14, 40, 8],
  panel: [96, 16, 74, 12],
  button: [60, 14, 30, 7],
} as const;

/** Back-and-forth shading tucked under the bottom-right corner. */
export function SketchCorner({ seed, size = "card", delay: d = 0.7 }: { seed: Seed; size?: keyof typeof CORNER_SIZES; delay?: number }) {
  const [s, inset, len, wmax] = CORNER_SIZES[size];
  const p = memo(`c:${size}:${seed}`, () => corner(s, inset, len, wmax, num(seed)));
  return (
    <svg className="sk-corner br" width={s} height={s} viewBox={`0 0 ${s} ${s}`} aria-hidden="true">
      <path className="sk-draw sh" pathLength={1} d={p.a} style={delay(d)} />
      <path className="sk-draw sh2" pathLength={1} d={p.b} style={delay(d + 0.7)} />
    </svg>
  );
}

/** Small wedge of hatching in the top-left corner. */
export function SketchWedge({ seed, delay: d = 0.3 }: { seed: Seed; delay?: number }) {
  const p = memo(`w:${seed}`, () => wedge(6, 13, num(seed)));
  return (
    <svg className="sk-corner tl" width={26} height={26} viewBox="0 0 26 26" aria-hidden="true">
      <path className="sk-draw sh" pathLength={1} d={p} style={delay(d)} />
    </svg>
  );
}

/**
 * A sheet of paper with a sketched outline. `hover` adds the hatched drop shadow
 * and lift; `shadow` adds the corner shading; `wedge` the top-left hatch.
 */
export function SketchCard({
  seed,
  w = 576,
  h = 200,
  as: Tag = "div",
  hover = false,
  shadow = true,
  wedge: withWedge = false,
  panel = false,
  tone,
  dashed,
  className,
  wrapClassName,
  style,
  children,
  ...rest
}: {
  seed: Seed;
  w?: number;
  h?: number;
  as?: ElementType;
  hover?: boolean;
  shadow?: boolean;
  wedge?: boolean;
  panel?: boolean;
  tone?: "red" | "green";
  dashed?: boolean;
  className?: string;
  wrapClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Record<string, unknown>) {
  return (
    <div className={cn("sk-wrap", hover && "hover", wrapClassName)}>
      {hover && <div className="sk-hatch" aria-hidden="true" />}
      <Tag className={cn("sk-card", className)} style={style} {...rest}>
        <SketchFrame seed={seed} w={w} h={h} tone={tone} dashed={dashed} />
        {shadow && <SketchCorner seed={`${seed}:c`} size={panel ? "panel" : "card"} />}
        {withWedge && <SketchWedge seed={`${seed}:w`} />}
        <div className="sk-lift">{children}</div>
      </Tag>
    </div>
  );
}

/** A paintbrush stroke with a label inside. Pass an arXiv category as `label` and the colour follows it, or force a `color`. */
export function BrushTag({
  children,
  label,
  color,
  variant,
  size = "md",
  still,
  delay: d,
  className,
  title,
}: {
  children?: ReactNode;
  label?: string;
  color?: BrushColor;
  variant?: Seed;
  size?: "xs" | "sm" | "md";
  still?: boolean;
  delay?: number;
  className?: string;
  title?: string;
}) {
  const key = color ?? label ?? String(children ?? "");
  return (
    <span
      className={cn("sk-tag", brushClass(key, variant ?? label), size !== "md" && size, still && "still", className)}
      style={delay(d)}
      title={title}
    >
      {children ?? label}
    </span>
  );
}

/** Paint a brush stroke behind arbitrary inline content (headings, numbers). */
export function Brush({
  children,
  color = "yellow",
  variant = 0,
  wide,
  still,
  delay: d,
  className,
}: {
  children: ReactNode;
  color?: BrushColor;
  variant?: Seed;
  wide?: boolean;
  still?: boolean;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={cn("sk-bs", brushClass(color, variant), wide && "wide", still && "still", className)} style={delay(d)}>
      {children}
    </span>
  );
}

/** Pencil circle with optional crescent shading, e.g. score dials and avatars. */
export function SketchRing({
  seed,
  size = 44,
  shading = 0.55,
  tone,
  className,
  children,
  delay: d = 0,
}: {
  seed: Seed;
  size?: number;
  shading?: number | false;
  tone?: "red" | "green" | "amber";
  className?: string;
  children?: ReactNode;
  delay?: number;
}) {
  const c = size / 2;
  const s = num(seed);
  const p = memo(`r:${size}:${seed}:${shading}`, () => ({
    a: ring(c, c, c - 1, s, 1.08),
    b: ring(c, c, c + 0.5, s + 14, 0.7),
    sh: shading === false ? "" : shade(c, c, c - 2, s + 3, shading, Math.max(2.2, size / 22)),
  }));
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="absolute inset-0 overflow-visible" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {p.sh && <path className="sk-draw sh" pathLength={1} d={p.sh} style={delay(d + 0.6)} />}
        <path className={cn("sk-draw", tone)} pathLength={1} d={p.a} style={delay(d)} />
        <path className={cn("sk-draw p2", tone)} pathLength={1} d={p.b} style={delay(d + 0.3)} />
      </svg>
      {children != null && <span className="relative">{children}</span>}
    </span>
  );
}

/** Hand-drawn horizontal rule. */
export function SketchDivider({ seed, w = 800, className, tone }: { seed: Seed; w?: number; className?: string; tone?: "red" }) {
  const p = memo(`l:${w}:${seed}`, () => line(w, num(seed)));
  return (
    <svg className={cn("block h-3 w-full overflow-visible", className)} viewBox={`0 0 ${w} 12`} preserveAspectRatio="none" aria-hidden="true">
      <path className={cn("sk-ink", tone === "red" && "!stroke-pen")} strokeWidth={1.6} vectorEffect="non-scaling-stroke" d={p.a} />
      <path className="sk-ink" strokeWidth={1} opacity={0.45} vectorEffect="non-scaling-stroke" d={p.b} />
    </svg>
  );
}

/** Hatched progress bar inside a pencil frame. value is 0..1. */
export function SketchProgress({
  value,
  seed,
  tone,
  className,
  label,
}: {
  value: number;
  seed: Seed;
  tone?: "green" | "red" | "amber";
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn("sk-pbar", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <SketchFrame seed={seed} w={300} h={16} />
      <div className={cn("fill", tone)} style={{ width: `calc(${pct}% - 4px)` }} />
    </div>
  );
}

/** The Sphere mark: a sketched globe. */
export function SketchLogo({ size = 42 }: { size?: number }) {
  const p = memo("logo", () => ({ a: ring(21, 21, 17, 5, 1.1), b: ring(21, 21, 18, 41, 0.9), shade: shade(21, 21, 16, 9, 0.2, 2.2) }));
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" aria-hidden="true" className="overflow-visible">
      <path className="sk-draw sh" pathLength={1} d={p.shade} style={delay(0.8)} />
      <path className="sk-draw" pathLength={1} d={p.a} />
      <path className="sk-draw p2" pathLength={1} d={p.b} style={delay(0.35)} />
      <path className="sk-draw thin" pathLength={1} d="M7 22 C 14 27, 28 27, 35 20" style={delay(0.6)} />
      <path className="sk-draw thin" pathLength={1} d="M21 4 C 14 13, 14 29, 22 37" style={delay(0.7)} />
    </svg>
  );
}

/** Wraps a native input/select/textarea in a pencil frame. Give the control className="sk-inp". */
export function SketchField({
  seed,
  invalid,
  className,
  w = 400,
  h = 46,
  children,
}: {
  seed: Seed;
  invalid?: boolean;
  className?: string;
  w?: number;
  h?: number;
  children: ReactNode;
}) {
  return (
    <span className={cn("sk-field", invalid && "invalid", className)}>
      <SketchFrame seed={seed} w={w} h={h} />
      {children}
    </span>
  );
}
