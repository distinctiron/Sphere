"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider, useAnimationFrame, useFigure } from "../kit";

/**
 * Optimisers in a narrow valley (A7). Loss L(x, y) = ½(x² + 20y²): curvature 1
 * along x, 20 along y. Plain gradient descent is stable only for η < 2/20 = 0.1,
 * and at that step size it crawls along x (shrinking the x-distance by 1 − η per step).
 *
 * - GD: θ ← θ − η∇L
 * - Mini-batch: the same, with seeded Gaussian noise of s.d. 4/√B added to each gradient coordinate
 * - Momentum (heavy ball, β = 0.6): v ← βv + ∇L, θ ← θ − ηv
 * - Adam (β₁ = 0.9, β₂ = 0.999, step α = 0.5, bias-corrected)
 * Path length is capped at 80 steps; "steps to reach L < 0.01" is reported.
 */

type Opt = "gd" | "noisy" | "momentum" | "adam";
type Vec = [number, number];

const K = 20;
const loss = ([x, y]: Vec) => 0.5 * (x * x + K * y * y);
const grad = ([x, y]: Vec): Vec => [x, K * y];
const START: Vec = [-5, 1.5];
const STEPS = 80;
const BATCHES = [1, 4, 16, 64, 256];
const NOISE = 4;

const W = 560;
const H = 300;
const XR = 5.6;
const YR = (XR * H) / W; // same scale on both axes, so angles are true
const sx = (x: number) => ((x + XR) / (2 * XR)) * W;
const sy = (y: number) => H / 2 - (y / YR) * (H / 2);

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function run(opt: Opt, eta: number, batch: number): Vec[] {
  const rand = mulberry32(5);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  let p: Vec = [...START];
  let v: Vec = [0, 0];
  let m: Vec = [0, 0];
  let s: Vec = [0, 0];
  const out: Vec[] = [p];
  for (let t = 1; t <= STEPS; t++) {
    let g = grad(p);
    if (opt === "noisy") {
      const sd = NOISE / Math.sqrt(batch);
      g = [g[0] + gauss() * sd, g[1] + gauss() * sd];
    }
    if (opt === "gd" || opt === "noisy") p = [p[0] - eta * g[0], p[1] - eta * g[1]];
    else if (opt === "momentum") {
      v = [0.6 * v[0] + g[0], 0.6 * v[1] + g[1]];
      p = [p[0] - eta * v[0], p[1] - eta * v[1]];
    } else {
      m = [0.9 * m[0] + 0.1 * g[0], 0.9 * m[1] + 0.1 * g[1]];
      s = [0.999 * s[0] + 0.001 * g[0] ** 2, 0.999 * s[1] + 0.001 * g[1] ** 2];
      const c1 = 1 - 0.9 ** t;
      const c2 = 1 - 0.999 ** t;
      p = [p[0] - (0.5 * m[0]) / c1 / (Math.sqrt(s[0] / c2) + 1e-8), p[1] - (0.5 * m[1]) / c1 / (Math.sqrt(s[1] / c2) + 1e-8)];
    }
    out.push(p);
    if (!Number.isFinite(p[0]) || Math.abs(p[1]) > 50) break;
  }
  return out;
}

const OPTS: Array<{ id: Opt; label: string }> = [
  { id: "gd", label: "Gradient descent" },
  { id: "noisy", label: "Mini-batch SGD" },
  { id: "momentum", label: "Momentum" },
  { id: "adam", label: "Adam" },
];

const NOTES: Record<Opt, string> = {
  gd: "Each step follows the gradient, which points mostly across the narrow valley, not along it. Past η = 0.1 the across-valley bounce grows instead of shrinking.",
  noisy: "Each gradient is estimated from a mini-batch, so every step is jostled. Small batches jitter more; near the bottom the noise, not the slope, dominates.",
  momentum: "Steps follow a running average of gradients (β = 0.6). The across-valley bounces cancel, the consistent along-valley pull adds up.",
  adam: "Adam divides each coordinate's step by that coordinate's typical gradient size, so both directions move at a similar pace (step α = 0.5; the learning-rate slider does not apply).",
};

const STEP_S = 0.12;
const HOLD_S = 2.5;

export default function OptimizerPathsFigure() {
  const { reducedMotion } = useFigure();
  const [opt, setOpt] = useState<Opt>("gd");
  const [eta, setEta] = useState(0.09);
  const [batchIdx, setBatchIdx] = useState(2);
  const [step, setStep] = useState(0);
  const clock = useRef(0);
  const batch = BATCHES[batchIdx];

  const path = useMemo(() => run(opt, eta, batch), [opt, eta, batch]);
  const reference = useMemo(() => run("gd", 0.09, 1), []);
  const reached = path.findIndex((p) => loss(p) < 0.01);
  // animate until a few steps after reaching the bottom (or the whole capped path)
  const last = reached > 0 ? Math.min(reached + 6, path.length - 1) : path.length - 1;
  const end = path[path.length - 1];
  const diverged = !Number.isFinite(end[0]) || Math.abs(end[1]) > 50;

  useEffect(() => {
    clock.current = 0;
    setStep(reducedMotion ? last : 0);
  }, [opt, eta, batch, reducedMotion, last]);

  useAnimationFrame((dt) => {
    clock.current += dt;
    if (step < last && clock.current >= STEP_S) {
      clock.current = 0;
      setStep((s) => Math.min(s + 1, last));
    } else if (step >= last && clock.current >= HOLD_S) {
      clock.current = 0;
      setStep(0);
    }
  }, !reducedMotion);

  const contours = [0.5, 2, 5, 10, 18, 30].map((c) => ({
    rx: Math.sqrt(2 * c) * (W / (2 * XR)),
    ry: Math.sqrt((2 * c) / K) * (H / 2 / YR),
    c,
  }));
  const toPts = (pts: Vec[]) =>
    pts
      .filter((p) => Number.isFinite(p[0]) && Math.abs(p[1]) < 10)
      .map((p) => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`)
      .join(" ");
  const cur = path[Math.min(step, last)];
  const curOk = Number.isFinite(cur[0]) && Math.abs(cur[0]) < XR && Math.abs(cur[1]) < YR;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Contour map of a long narrow valley with the path an optimiser takes from the same start towards the minimum" className="block h-auto w-full select-none" style={{ fontFamily: FONT.sans }}>
        <defs>
          <clipPath id="op-clip">
            <rect x={0} y={0} width={W} height={H} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill={C.wash} stroke={C.grid} />
        <g clipPath="url(#op-clip)">
          {contours.map(({ rx, ry, c }) => (
            <ellipse key={c} cx={sx(0)} cy={sy(0)} rx={rx} ry={ry} fill="none" stroke={C.line} strokeWidth={1} />
          ))}
          <circle cx={sx(0)} cy={sy(0)} r={5} fill={C.good} />
          {opt !== "gd" && <polyline points={toPts(reference)} fill="none" stroke={C.faint} strokeWidth={1.3} strokeDasharray="4 4" />}
          <polyline points={toPts(path.slice(0, step + 1))} fill="none" stroke={C.active} strokeWidth={2} strokeLinejoin="round" />
          {path.slice(0, step + 1).map((p, i) =>
            Number.isFinite(p[0]) && Math.abs(p[1]) < 10 ? <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r={2.2} fill={C.active} /> : null
          )}
          {curOk && <circle cx={sx(cur[0])} cy={sy(cur[1])} r={7} fill={C.active} stroke="white" strokeWidth={2} />}
          <circle cx={sx(START[0])} cy={sy(START[1])} r={5} fill="white" stroke={C.ink} strokeWidth={1.5} />
        </g>
        <text x={sx(START[0])} y={sy(START[1]) - 12} textAnchor="middle" fontSize={15} fill={C.text}>
          start
        </text>
        <text x={sx(0)} y={sy(0) + 24} textAnchor="middle" fontSize={15} fill={C.good} fontWeight={600}>
          minimum
        </text>
        <text x={W - 8} y={H - 10} textAnchor="end" fontSize={15} fill={C.muted}>
          gentle along x · steep along y
        </text>
      </svg>

      <div className="mt-2 text-sm">
        <div className={`font-semibold ${diverged ? "text-amber-700" : reached > 0 ? "text-ink" : "text-pencil"}`}>
          {diverged
            ? "Diverges: each bounce across the valley is bigger than the last."
            : reached > 0
              ? `Reaches loss below 0.01 after ${reached} steps.`
              : opt === "noisy"
                ? `Still above loss 0.01 after ${STEPS} steps: it hovers near the bottom (final loss ${loss(end).toFixed(2)}).`
                : `Still above loss 0.01 after ${STEPS} steps (final loss ${loss(end).toFixed(2)}).`}
          {opt !== "gd" && <span className="font-normal text-pencil"> Dashed: plain gradient descent at η = 0.09 (38 steps).</span>}
        </div>
        <p className="mt-1 leading-relaxed text-pencil">{NOTES[opt]}</p>
      </div>

      <Controls>
        <ChoiceButtons label="Optimiser" value={opt} onChange={setOpt} options={OPTS} />
        {opt !== "adam" && <Slider label="Learning rate η" value={eta} min={0.01} max={0.11} step={0.005} onChange={setEta} format={(v) => v.toFixed(3)} />}
        {opt === "noisy" && (
          <Slider label="Batch size B" value={batchIdx} min={0} max={BATCHES.length - 1} step={1} onChange={setBatchIdx} format={(i) => String(BATCHES[i])} />
        )}
      </Controls>
      <div className="mt-2 text-xs text-pencil">Loss ½(x² + 20y²): curvature 1 along x and 20 along y, so plain gradient descent must keep η below 2/20 = 0.1.</div>
    </div>
  );
}
