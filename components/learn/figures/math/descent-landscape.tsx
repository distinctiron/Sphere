"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider, useAnimationFrame, useFigure } from "../kit";

/**
 * Gradient descent on a one-parameter landscape (A7).
 * L(θ) = 0.1θ⁴ − θ² + 0.4θ + 3.5, L'(θ) = 0.4θ³ − 2θ + 0.4.
 * Minima: θ ≈ −2.33 (L ≈ 0.09, curvature L'' ≈ 4.5, so steps settle only if η < 2/4.5 ≈ 0.44)
 * and θ ≈ 2.13 (L ≈ 1.87, curvature ≈ 3.4, settles only if η < 0.58). Ridge at θ ≈ 0.20.
 * Each step: θ ← θ − η·L'(θ). The outcome line simulates 300 steps ahead.
 */

const L = (t: number) => 0.1 * t ** 4 - t * t + 0.4 * t + 3.5;
const dL = (t: number) => 0.4 * t ** 3 - 2 * t + 0.4;
const DEEP = -2.33;
const SHALLOW = 2.128;

const W = 560;
const H = 320;
const PAD = { l: 40, r: 14, t: 14, b: 46 };
const TMIN = -4;
const TMAX = 4;
const LMAX = 7;
const sx = (t: number) => PAD.l + ((t - TMIN) / (TMAX - TMIN)) * (W - PAD.l - PAD.r);
const sy = (l: number) => PAD.t + (1 - l / LMAX) * (H - PAD.t - PAD.b);
const ESCAPE = 4.2;

const STARTS = {
  right: { label: "Start right", t: 3.3 },
  ridge: { label: "Start by the ridge", t: 0.8 },
  left: { label: "Start left", t: -3.3 },
} as const;
type StartId = keyof typeof STARTS;

const STEP_S = 0.45;
const MAX_STEPS = 30;
const HOLD_S = 2.5;

function trajectory(t0: number, eta: number, n: number) {
  const out = [t0];
  let t = t0;
  for (let i = 0; i < n; i++) {
    t = t - eta * dL(t);
    out.push(t);
    if (!Number.isFinite(t) || Math.abs(t) > ESCAPE) break;
  }
  return out;
}

function outcome(t0: number, eta: number) {
  const path = trajectory(t0, eta, 300);
  const last = path[path.length - 1];
  if (!Number.isFinite(last) || Math.abs(last) > ESCAPE) {
    return { text: `Diverges: thrown off the landscape after ${path.length - 1} steps`, tone: "text-amber-700" };
  }
  const deep = Math.abs(last - DEEP) < 0.02;
  if ((deep || Math.abs(last - SHALLOW) < 0.02) && Math.abs(dL(last)) < 0.02) {
    // first step from which the ball stays within 0.01 of where it ends
    let settled = path.length - 1;
    while (settled > 0 && Math.abs(path[settled - 1] - last) < 0.01) settled--;
    return deep
      ? { text: `Settles in the deeper valley (loss ${L(DEEP).toFixed(2)}) after ${settled} steps`, tone: "text-emerald-700" }
      : { text: `Settles in the shallower valley (loss ${L(SHALLOW).toFixed(2)}) after ${settled} steps`, tone: "text-ink" };
  }
  const near = Math.abs(last - DEEP) < 0.6 ? "deeper" : Math.abs(last - SHALLOW) < 0.6 ? "shallower" : null;
  if (near) return { text: `Never settles: keeps bouncing across the ${near} valley`, tone: "text-amber-700" };
  return { text: "Never settles: hops chaotically between the valleys", tone: "text-amber-700" };
}

export default function DescentLandscapeFigure() {
  const { playing, reducedMotion } = useFigure();
  const [start, setStart] = useState<StartId>("right");
  const [eta, setEta] = useState(0.1);
  const [step, setStep] = useState(0);
  const clock = useRef(0);

  const path = useMemo(() => trajectory(STARTS[start].t, eta, MAX_STEPS), [start, eta]);
  const result = useMemo(() => outcome(STARTS[start].t, eta), [start, eta]);
  const last = path.length - 1;

  useEffect(() => {
    clock.current = 0;
    setStep(reducedMotion ? last : 0);
  }, [start, eta, reducedMotion, last]);

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

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 200; i++) {
      const t = TMIN + (i / 200) * (TMAX - TMIN);
      pts.push(`${sx(t).toFixed(1)},${sy(Math.min(L(t), LMAX + 1)).toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);

  const shown = path.slice(0, step + 1);
  const t = path[Math.min(step, last)];
  const offChart = !Number.isFinite(t) || Math.abs(t) > ESCAPE;
  const slope = dL(t);
  const next = -eta * slope;
  const inView = (u: number) => u >= TMIN && u <= TMAX;
  const clampY = (u: number) => sy(Math.min(L(u), LMAX));

  // Tangent segment at the ball (half-width 0.5 in θ)
  const tan = inView(t) ? { x1: sx(t - 0.5), y1: sy(L(t) - 0.5 * slope), x2: sx(t + 0.5), y2: sy(L(t) + 0.5 * slope) } : null;
  const nextT = t + next;

  const fmt = (v: number, d = 2) => (v < 0 ? `−${Math.abs(v).toFixed(d)}` : v.toFixed(d));
  const regime = eta < 0.04 ? "tiny steps" : eta <= 0.3 ? "moderate steps" : eta < 0.58 ? "large steps" : "very large steps";

  return (
    <div>
      <style>{`.dl-ball { transition: cx .3s ease-out, cy .3s ease-out; }`}</style>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A ball stepping downhill on a one-parameter loss curve with two valleys; each step moves against the slope by the learning rate times the slope" className="block h-auto w-full select-none" style={{ fontFamily: FONT.sans }}>
        <defs>
          <clipPath id="dl-clip">
            <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} />
          </clipPath>
          <marker id="dl-head" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={C.warn} />
          </marker>
        </defs>
        {/* axes */}
        <line x1={PAD.l} y1={sy(0)} x2={W - PAD.r} y2={sy(0)} stroke={C.line} />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={sy(0)} stroke={C.line} />
        {[0, 2, 4, 6].map((l) => (
          <text key={l} x={PAD.l - 8} y={sy(l) + 4} textAnchor="end" fontSize={15} fill={C.faint}>
            {l}
          </text>
        ))}
        {[-4, -2, 0, 2, 4].map((u) => (
          <text key={u} x={sx(u)} y={sy(0) + 20} textAnchor="middle" fontSize={15} fill={C.faint}>
            {u < 0 ? `−${-u}` : u}
          </text>
        ))}
        <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize={15} fill={C.muted}>
          parameter θ →
        </text>
        <text x={sx(-3.1)} y={PAD.t + 14} fontSize={15} fill={C.muted}>
          loss L(θ)
        </text>

        <g clipPath="url(#dl-clip)">
          <polyline points={curve} fill="none" stroke={C.ink} strokeWidth={2.2} />
          {/* minima markers */}
          <circle cx={sx(DEEP)} cy={sy(L(DEEP))} r={3.5} fill={C.good} />
          <circle cx={sx(SHALLOW)} cy={sy(L(SHALLOW))} r={3.5} fill={C.faint} />
          {/* trail */}
          {shown.slice(1).map((u, i) => {
            const prev = shown[i];
            if (!inView(prev) || !inView(u)) return null;
            return <line key={i} x1={sx(prev)} y1={clampY(prev)} x2={sx(u)} y2={clampY(u)} stroke={C.activeSoft} strokeWidth={1.2} strokeDasharray="3 3" />;
          })}
          {shown.slice(0, -1).map((u, i) => (inView(u) ? <circle key={i} cx={sx(u)} cy={clampY(u)} r={3} fill={C.activeSoft} /> : null))}
          {tan && <line {...tan} stroke={C.warn} strokeWidth={2.5} strokeLinecap="round" />}
          {!offChart && inView(t) && <circle className="dl-ball" cx={sx(t)} cy={clampY(t)} r={10} fill={C.active} stroke="white" strokeWidth={2} />}
        </g>
        {/* next step, drawn on the θ axis */}
        {!offChart && inView(t) && step < last && Math.abs(next) > 0.02 && (
          <line
            x1={sx(t)}
            y1={sy(0) - 10}
            x2={sx(Math.max(TMIN, Math.min(TMAX, nextT)))}
            y2={sy(0) - 10}
            stroke={C.warn}
            strokeWidth={2.5}
            markerEnd="url(#dl-head)"
          />
        )}
      </svg>

      <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="font-mono text-xs leading-relaxed text-pencil">
          step {step} · θ = {offChart ? "off the chart" : fmt(t)} · L = {offChart ? "—" : fmt(L(t))}
          <br />
          slope L′(θ) = {offChart ? "—" : fmt(slope)} → next step −η·L′ = {offChart ? "—" : fmt(next)}
        </div>
        <div className={`font-semibold ${result.tone}`}>{result.text}</div>
      </div>

      <Controls>
        <ChoiceButtons label="Starting point" value={start} onChange={setStart} options={(Object.keys(STARTS) as StartId[]).map((id) => ({ id, label: STARTS[id].label }))} />
        <Slider label={`Learning rate η (${regime})`} value={eta} min={0.01} max={0.9} step={0.01} onChange={setEta} format={(v) => v.toFixed(2)} />
      </Controls>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span>
          <span className="text-amber-600">━</span> slope at the ball, and the step it causes
        </span>
        <span>
          <span className="text-emerald-600">●</span> deeper valley (θ ≈ −2.33)
        </span>
        <span>
          <span className="text-pencil/70">●</span> shallower valley (θ ≈ 2.13)
        </span>
      </div>
    </div>
  );
}
