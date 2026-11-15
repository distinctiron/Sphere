"use client";

import { useState } from "react";
import { C, Controls, FONT, Slider, useAnimationFrame } from "../kit";

/**
 * The derivative as local slope (A3). A tangent line slides along
 * f(x) = 0.15x³ − 0.9x + 1, whose slope is f′(x) = 0.45x² − 0.9 (flat at x = ±√2).
 * An inset zooms in 25× around the point: the curve and its tangent become
 * indistinguishable, which is what "local linearity" means.
 */

const f = (x: number) => 0.15 * x ** 3 - 0.9 * x + 1;
const df = (x: number) => 0.45 * x * x - 0.9;

const W = 640;
const H = 324;
const X0 = 50;
const X1 = 620;
const XMIN = -3;
const XMAX = 3;
const YMIN = -0.8;
const YMAX = 2.8;
const PY0 = 290;
const PY1 = 20;
const px = (x: number) => X0 + ((x - XMIN) / (XMAX - XMIN)) * (X1 - X0);
const py = (y: number) => PY0 + ((y - YMIN) / (YMAX - YMIN)) * (PY1 - PY0);
const SX = (X1 - X0) / (XMAX - XMIN); // px per unit
const SY = (PY0 - PY1) / (YMAX - YMIN);

const ZOOM = 25;
const IW = 220;
const IH = 160;

const fmt = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d)).replace("-", "−");

function curvePath(from: number, to: number, map: (x: number, y: number) => [number, number], n = 160) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    const [a, b] = map(x, f(x));
    return `${i ? "L" : "M"}${a.toFixed(2)},${b.toFixed(2)}`;
  }).join(" ");
}

export default function TangentSlopeFigure() {
  const [x0, setX0] = useState(2.2);
  const [auto, setAuto] = useState(true);
  const [phase, setPhase] = useState(Math.asin(2.2 / 2.5) / 0.45);

  useAnimationFrame((dt) => {
    const next = phase + dt;
    setPhase(next);
    setX0(2.5 * Math.sin(0.45 * next));
  }, auto);

  const y0 = f(x0);
  const s = df(x0);
  const half = 0.9;
  const tx1 = x0 - half;
  const tx2 = x0 + half;

  // Rise/run triangle: run of 0.6 to the right
  const run = 0.6;
  const actual = f(x0 + 0.1) - y0;

  // Inset: window around (x0, y0), scaled ZOOM× relative to the main plot
  const isx = SX * ZOOM;
  const isy = SY * ZOOM;
  const hx = IW / 2 / isx;
  const ipx = (x: number) => IW / 2 + (x - x0) * isx;
  const ipy = (y: number) => IH / 2 - (y - y0) * isy;

  const state = Math.abs(s) < 0.03 ? "flat: a small nudge barely changes f" : s > 0 ? "uphill: f rises as x grows" : "downhill: f falls as x grows";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A curve with a tangent line sliding along it; the tangent's slope is the derivative at that point" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <clipPath id="ts-clip">
            <rect x={X0} y={PY1} width={X1 - X0} height={PY0 - PY1} />
          </clipPath>
        </defs>
        <rect x={X0} y={PY1} width={X1 - X0} height={PY0 - PY1} fill={C.wash} stroke={C.grid} />
        {[-2, -1, 1, 2].map((t) => (
          <g key={t}>
            <line x1={px(t)} y1={PY1} x2={px(t)} y2={PY0} stroke={C.grid} />
            <text x={px(t)} y={PY0 + 22} textAnchor="middle" fontSize={17} fill={C.muted}>
              {String(t).replace("-", "−")}
            </text>
          </g>
        ))}
        <line x1={X0} y1={py(0)} x2={X1} y2={py(0)} stroke={C.line} strokeWidth={1.2} />
        <line x1={px(0)} y1={PY1} x2={px(0)} y2={PY0} stroke={C.line} strokeWidth={1.2} />
        <text x={X1 - 4} y={py(0) - 8} textAnchor="end" fontSize={17} fill={C.muted} fontFamily={FONT.mono}>
          x
        </text>
        <text x={px(0) + 8} y={PY1 + 20} fontSize={17} fill={C.muted} fontFamily={FONT.mono}>
          f(x)
        </text>

        <g clipPath="url(#ts-clip)">
          <path d={curvePath(XMIN, XMAX, (x, y) => [px(x), py(y)])} fill="none" stroke={C.primary} strokeWidth={3} />
          {/* Flat points */}
          {[-Math.SQRT2, Math.SQRT2].map((x) => (
            <circle key={x} cx={px(x)} cy={py(f(x))} r={4} fill="white" stroke={C.primary} strokeWidth={2} />
          ))}
          {/* Tangent */}
          <line x1={px(tx1)} y1={py(y0 + s * (tx1 - x0))} x2={px(tx2)} y2={py(y0 + s * (tx2 - x0))} stroke={C.warn} strokeWidth={3} strokeLinecap="round" />
          {/* Rise over run */}
          <line x1={px(x0)} y1={py(y0)} x2={px(x0 + run)} y2={py(y0)} stroke={C.muted} strokeWidth={1.5} strokeDasharray="4 4" />
          <line x1={px(x0 + run)} y1={py(y0)} x2={px(x0 + run)} y2={py(y0 + s * run)} stroke={C.warn} strokeWidth={2} strokeDasharray="4 3" />
          <circle cx={px(x0)} cy={py(y0)} r={7} fill={C.active} stroke="white" strokeWidth={2} />
        </g>
        <rect x={X0 + 10} y={PY1 + 10} width={170} height={34} rx={6} fill="white" stroke={C.warnSoft} />
        <text x={X0 + 95} y={PY1 + 34} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.warn} fontFamily={FONT.mono}>
          slope {fmt(s)}
        </text>
      </svg>

      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[auto_1fr]">
        <div className="justify-self-center">
          <svg viewBox={`0 0 ${IW} ${IH}`} role="img" aria-label="Zoomed-in view: near the point the curve and its tangent line coincide" className="block h-auto w-full max-w-[13rem]" style={{ fontFamily: FONT.sans }}>
            <rect x={0.5} y={0.5} width={IW - 1} height={IH - 1} rx={8} fill={C.wash} stroke={C.line} />
            <clipPath id="ts-inset">
              <rect x={0} y={0} width={IW} height={IH} rx={8} />
            </clipPath>
            <g clipPath="url(#ts-inset)">
              <line x1={0} y1={ipy(y0 - s * hx)} x2={IW} y2={ipy(y0 + s * hx)} stroke={C.warn} strokeWidth={6} strokeOpacity={0.45} />
              <path d={curvePath(x0 - hx, x0 + hx, (x, y) => [ipx(x), ipy(y)], 40)} fill="none" stroke={C.primary} strokeWidth={2.5} />
              <circle cx={IW / 2} cy={IH / 2} r={5} fill={C.active} />
            </g>
            <text x={10} y={22} fontSize={13} fontWeight={700} fill={C.muted}>
              zoomed {ZOOM}×
            </text>
          </svg>
        </div>
        <div className="min-w-0 text-sm leading-relaxed text-pencil">
          <p>
            At <span className="font-mono">x = {fmt(x0)}</span>: <span className="font-mono">f(x) = {fmt(y0)}</span>, slope{" "}
            <span className="font-mono font-semibold text-amber-700">f′(x) = {fmt(s)}</span>. The curve is {state}.
          </p>
          <p className="mt-1">
            Nudge x by +0.1: the slope predicts f changes by{" "}
            <span className="font-mono">{fmt(s * 0.1, 3)}</span>; it actually changes by <span className="font-mono">{fmt(actual, 3)}</span>.
          </p>
          <p className="mt-1 text-xs text-pencil">Inset: zoom in far enough and the curve is indistinguishable from its tangent line.</p>
        </div>
      </div>

      <Controls>
        <Slider
          label="Point x"
          value={Math.round(x0 * 20) / 20}
          min={-2.8}
          max={2.8}
          step={0.05}
          onChange={(v) => {
            setAuto(false);
            setX0(v);
          }}
          format={(v) => fmt(v)}
        />
        <button
          type="button"
          onClick={() => {
            setPhase(Math.asin(Math.max(-1, Math.min(1, x0 / 2.5))) / 0.45);
            setAuto(true);
          }}
          disabled={auto}
          className="rounded-md bg-[#f1efe4] px-2.5 py-1 text-xs font-medium text-pencil hover:bg-[#e8e5d6] disabled:opacity-40"
        >
          Sweep automatically
        </button>
      </Controls>
      <p className="mt-2 font-mono text-xs text-pencil">f(x) = 0.15x³ − 0.9x + 1 · f′(x) = 0.45x² − 0.9 · hollow dots: flat points (x = ±1.41)</p>
    </div>
  );
}
