"use client";

import { C, FONT } from "../kit";

/**
 * Training vs validation loss over a training run (A9). Staged loop, 10 s:
 *   0.3–6 s  both curves draw left to right
 *   ~3.6 s   the early-stopping marker appears at the validation minimum
 *   6–9.4 s  the generalisation gap and the overfitting region are labelled; hold
 * Illustrative curves (not measured):
 *   train(t) = 0.1 + 1.7·e^(−t/14),  val(t) = 0.3 + 1.7·e^(−t/14) + 0.008·t
 * The validation minimum is where 1.7/14·e^(−t/14) = 0.008, t = 14·ln(15.18) ≈ 38.
 * With animations removed (reduced motion) everything is simply drawn.
 */

const CYCLE = 10;
const W = 580;
const H = 290;
const L = 56;
const R = 20;
const T = 20;
const B = 44;
const T_MAX = 100;
const Y_MAX = 2.2;

const train = (t: number) => 0.1 + 1.7 * Math.exp(-t / 14);
const val = (t: number) => 0.3 + 1.7 * Math.exp(-t / 14) + 0.008 * t;
const T_STOP = 14 * Math.log(1.7 / 14 / 0.008);

const px = (t: number) => L + (t / T_MAX) * (W - L - R);
const py = (y: number) => T + (1 - y / Y_MAX) * (H - T - B);
const curve = (f: (t: number) => number) =>
  Array.from({ length: 101 }, (_, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(f(i)).toFixed(1)}`).join(" ");

export default function TrainValCurvesFigure() {
  const sx = px(T_STOP);
  const sy = py(val(T_STOP));
  const gapX = px(92);
  return (
    <div>
      <style>{`
        .tv-draw { stroke-dasharray: 1 1; stroke-dashoffset: 0; animation: tv-draw ${CYCLE}s linear infinite; }
        @keyframes tv-draw { 0%, 3% { stroke-dashoffset: 1 } 60% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 0 } }
        .tv-stop { animation: tv-stop ${CYCLE}s ease-out infinite; }
        @keyframes tv-stop { 0%, 34% { opacity: 0 } 38%, 94% { opacity: 1 } 100% { opacity: 0 } }
        .tv-late { animation: tv-late ${CYCLE}s ease-out infinite; }
        @keyframes tv-late { 0%, 60% { opacity: 0 } 65%, 94% { opacity: 1 } 100% { opacity: 0 } }
        .tv-fade { animation: tv-fade ${CYCLE}s linear infinite; }
        @keyframes tv-fade { 0%, 94% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Training loss falls throughout training; validation loss falls, reaches a minimum, then rises. Early stopping keeps the model from the minimum."
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        {/* Axes */}
        <line x1={L} y1={T} x2={L} y2={H - B} stroke={C.muted} />
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke={C.muted} />
        <text x={L - 10} y={T + 12} textAnchor="end" fontSize={14} fill={C.muted}>
          loss
        </text>
        <text x={W - R} y={H - B + 24} textAnchor="end" fontSize={14} fill={C.muted}>
          training steps →
        </text>

        {/* Overfitting region */}
        <g className="tv-late">
          <rect x={sx} y={T} width={W - R - sx} height={H - T - B} fill={C.activeSoft} opacity={0.12} />
          <text x={(sx + W - R) / 2} y={T + 18} textAnchor="middle" fontSize={14} fontWeight={600} fill={C.active}>
            overfitting
          </text>
        </g>
        <text x={(L + sx) / 2} y={T + 18} textAnchor="middle" fontSize={14} fontWeight={600} fill={C.muted} className="tv-fade">
          still learning
        </text>

        {/* Curves */}
        <g className="tv-fade">
          <path d={curve(val)} pathLength={1} fill="none" stroke={C.active} strokeWidth={3} className="tv-draw" />
          <path d={curve(train)} pathLength={1} fill="none" stroke={C.primary} strokeWidth={3} className="tv-draw" />
        </g>

        {/* Early stopping */}
        <g className="tv-stop">
          <line x1={sx} y1={sy - 6} x2={sx} y2={H - B} stroke={C.good} strokeWidth={2} strokeDasharray="5 4" />
          <circle cx={sx} cy={sy} r={7} fill={C.good} stroke="white" strokeWidth={2} />
          <text x={sx} y={H - B + 24} textAnchor="middle" fontSize={14} fontWeight={600} fill={C.good}>
            stop here
          </text>
        </g>

        {/* Generalisation gap */}
        <g className="tv-late">
          <line x1={gapX} y1={py(val(92)) + 4} x2={gapX} y2={py(train(92)) - 4} stroke={C.warn} strokeWidth={2} />
          <line x1={gapX - 6} y1={py(val(92)) + 4} x2={gapX + 6} y2={py(val(92)) + 4} stroke={C.warn} strokeWidth={2} />
          <line x1={gapX - 6} y1={py(train(92)) - 4} x2={gapX + 6} y2={py(train(92)) - 4} stroke={C.warn} strokeWidth={2} />
          <text x={gapX - 10} y={(py(val(92)) + py(train(92))) / 2 + 5} textAnchor="end" fontSize={14} fill={C.warn} fontWeight={600}>
            gap
          </text>
        </g>

        {/* Curve labels */}
        <g className="tv-late">
          <text x={px(70)} y={py(val(70)) - 12} textAnchor="middle" fontSize={14} fill={C.active} fontWeight={600}>
            validation
          </text>
          <text x={px(70)} y={py(train(70)) - 10} textAnchor="middle" fontSize={14} fill={C.primary} fontWeight={600}>
            training
          </text>
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-[#2b6ec4]">━ training loss (data the model learns from)</span>
        <span className="text-rose-700">━ validation loss (held-out data)</span>
        <span className="text-emerald-700">┆ early stopping point</span>
      </div>
    </div>
  );
}
