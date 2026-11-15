"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { C, FONT, useFigure } from "../kit";

/**
 * How a hidden layer reshapes space (A6). XOR-style data: two classes that no
 * straight line separates. Stage 1 applies h = W·x (rotate/squash), stage 2
 * applies ReLU (folds every negative coordinate onto the axes), and in the new
 * coordinates one straight line separates the classes.
 *
 * W = [[1, 0.9], [-0.9, -1]], b = 0; boundary h1 + h2 = 1.
 */

type Vec = [number, number];

const W: [Vec, Vec] = [
  [1, 0.9],
  [-0.9, -1],
];
const linear = ([x, y]: Vec): Vec => [W[0][0] * x + W[0][1] * y, W[1][0] * x + W[1][1] * y];
const relu = ([x, y]: Vec): Vec => [Math.max(0, x), Math.max(0, y)];
const STAGE_FNS: Array<(p: Vec) => Vec> = [(p) => p, linear, (p) => relu(linear(p)), (p) => relu(linear(p))];

const STAGES = [
  { label: "Input", title: "Input space", text: "Blue and rose points sit on opposite corners. No single straight line puts all blue on one side and all rose on the other." },
  { label: "Wx", title: "Linear step: z = W·x", text: "The weight matrix rotates and squashes the whole grid. Straight lines stay straight: a linear map alone can't untangle the corners." },
  { label: "ReLU", title: "Fold: h = ReLU(z)", text: "ReLU sets negative coordinates to zero, folding three quarters of the plane onto the two axes. Grid lines now bend where they cross an axis." },
  { label: "Separate", title: "One line now suffices", text: "In the new coordinates the rose points are pushed out along the axes and the blue points sit near the corner, so the single line h₁ + h₂ = 1 separates them." },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePoints() {
  const rand = mulberry32(7);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const clusters: Array<{ c: Vec; cls: 0 | 1 }> = [
    { c: [1, 1], cls: 1 },
    { c: [-1, -1], cls: 1 },
    { c: [1, -1], cls: 0 },
    { c: [-1, 1], cls: 0 },
  ];
  return clusters.flatMap(({ c, cls }) =>
    Array.from({ length: 12 }, () => ({ p: [c[0] + gauss() * 0.2, c[1] + gauss() * 0.2] as Vec, cls }))
  );
}

function makeGrid(): Vec[][] {
  const lines: Vec[][] = [];
  const ticks = [-2, -1, 0, 1, 2];
  const samples = Array.from({ length: 49 }, (_, i) => -2.4 + (i * 4.8) / 48);
  for (const k of ticks) {
    lines.push(samples.map((s) => [k, s] as Vec));
    lines.push(samples.map((s) => [s, k] as Vec));
  }
  return lines;
}

const SIZE = 360;
const RANGE = 2.6;
const toPx = ([x, y]: Vec): Vec => [((x + RANGE) / (2 * RANGE)) * SIZE, SIZE - ((y + RANGE) / (2 * RANGE)) * SIZE];
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const TWEEN_S = 1.3;
const HOLD_S = 2.4;

export default function SpaceFoldingFigure() {
  const { playing, reducedMotion } = useFigure();
  const points = useMemo(makePoints, []);
  const grid = useMemo(makeGrid, []);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const [t, setT] = useState(1);
  const [auto, setAuto] = useState(true);
  const tRef = useRef(1);

  // Tween between stages
  useEffect(() => {
    if (from === to) return;
    if (reducedMotion) {
      tRef.current = 1;
      setT(1);
      setFrom(to);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      start ??= now;
      const progress = Math.min((now - start) / (TWEEN_S * 1000), 1);
      tRef.current = progress;
      setT(progress);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else setFrom(to);
    };
    tRef.current = 0;
    setT(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, reducedMotion]);

  // Auto-advance while playing
  useEffect(() => {
    if (!playing || !auto || from !== to) return;
    const timer = setTimeout(() => setTo((to + 1) % STAGES.length), (to === STAGES.length - 1 ? HOLD_S * 1.6 : HOLD_S) * 1000);
    return () => clearTimeout(timer);
  }, [playing, auto, from, to]);

  const goTo = (stage: number) => {
    setAuto(false);
    setFrom(to === from ? from : to);
    setTo(stage);
  };

  const e = ease(t);
  const position = (p: Vec) => toPx(lerp(STAGE_FNS[from](p), STAGE_FNS[to](p), e));
  const boundaryOpacity = to === 3 ? (from === 3 ? 1 : e) : from === 3 ? 1 - e : 0;
  const stage = STAGES[t >= 0.5 ? to : from];

  // Boundary h1 + h2 = 1 in plot coordinates, clipped to the visible range
  const [bx1, by1] = toPx([-RANGE, 1 + RANGE]);
  const [bx2, by2] = toPx([1 + RANGE, -RANGE]);
  const [ox, oy] = toPx([0, 0]);

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,22rem)_1fr]">
      <svg viewBox={`-6 -6 ${SIZE + 12} ${SIZE + 12}`} role="img" aria-label="Points of two classes being transformed by a linear map and a ReLU fold until one line separates them" className="block h-auto w-full max-w-[22rem] justify-self-center">
        <defs>
          <clipPath id="sf-clip">
            <rect x={0} y={0} width={SIZE} height={SIZE} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={SIZE} height={SIZE} fill={C.wash} stroke={C.grid} />
        <g clipPath="url(#sf-clip)">
          <polygon
            points={`${bx1},${by1} ${bx2},${by2} ${SIZE},${SIZE} ${SIZE},0 0,0`}
            fill={C.activeSoft}
            opacity={0.18 * boundaryOpacity}
          />
          {grid.map((line, i) => (
            <polyline
              key={i}
              points={line.map((p) => position(p).join(",")).join(" ")}
              fill="none"
              stroke={C.line}
              strokeWidth={1}
            />
          ))}
          <line x1={0} y1={oy} x2={SIZE} y2={oy} stroke={C.muted} strokeWidth={1.2} />
          <line x1={ox} y1={0} x2={ox} y2={SIZE} stroke={C.muted} strokeWidth={1.2} />
          <line x1={bx1} y1={by1} x2={bx2} y2={by2} stroke={C.active} strokeWidth={2.5} strokeDasharray="7 5" opacity={boundaryOpacity} />
          {points.map(({ p, cls }, i) => {
            const [x, y] = position(p);
            return <circle key={i} cx={x} cy={y} r={5} fill={cls ? C.active : C.primary} fillOpacity={0.85} stroke="white" strokeWidth={1} />;
          })}
        </g>
        <text x={SIZE - 6} y={oy - 6} textAnchor="end" fontSize={12} fill={C.muted} fontFamily={FONT.mono}>
          {to === 0 && from === 0 ? "x₁" : "h₁"}
        </text>
        <text x={ox + 6} y={14} fontSize={12} fill={C.muted} fontFamily={FONT.mono}>
          {to === 0 && from === 0 ? "x₂" : "h₂"}
        </text>
      </svg>

      <div className="min-w-0">
        <div role="group" aria-label="Stage" className="mb-3 flex flex-wrap gap-1">
          {STAGES.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => goTo(i)}
              aria-pressed={to === i}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                to === i ? "bg-[#2b6ec4] text-white" : "bg-[#f1efe4] text-pencil hover:bg-[#e8e5d6]"
              }`}
            >
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
        <div className="text-sm font-semibold text-ink">{stage.title}</div>
        <p className="mt-1 text-sm leading-relaxed text-pencil">{stage.text}</p>
        <p className="mt-3 font-mono text-xs text-pencil">
          W = [[1, 0.9], [−0.9, −1]], b = 0 · boundary: h₁ + h₂ = 1
        </p>
      </div>
    </div>
  );
}
