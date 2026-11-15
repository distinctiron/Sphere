"use client";

import { useState } from "react";
import { C, Controls, FONT, Slider } from "../kit";

/**
 * Vanishing and exploding gradients (A8). On the way back, each layer
 * multiplies the error signal by its local sensitivity. If that factor is
 * about g at every layer, the signal reaching layer k of an N-layer network
 * has been multiplied (N − k) times: size g^(N−k) relative to the output.
 * Bars on a log scale; the emerald band marks a healthy range (0.1 to 10).
 */

const W = 520;
const H = 280;
const PAD_L = 60;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 44;
const LOG_MIN = -8;
const LOG_MAX = 8;

const yOf = (log: number) => PAD_T + ((LOG_MAX - Math.max(LOG_MIN, Math.min(LOG_MAX, log))) / (LOG_MAX - LOG_MIN)) * (H - PAD_T - PAD_B);

function fmt(v: number) {
  if (v === 0) return "0";
  if (v >= 0.01 && v < 1000) return v.toPrecision(3).replace(/\.?0+$/, "");
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  const sup = String(e).replace(/-/g, "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
  return `${m.toFixed(1)} × 10${sup}`;
}

export default function VanishingGradientsFigure() {
  const [gain, setGain] = useState(0.8);
  const [depth, setDepth] = useState(30);

  const plotW = W - PAD_L - PAD_R;
  const slot = plotW / depth;
  const y1 = yOf(0);
  const first = gain ** (depth - 1);
  const firstLog = Math.log10(first);
  const tone = firstLog < -1 ? "text-amber-700" : firstLog > 1 ? "text-rose-700" : "text-emerald-700";
  const verdict = firstLog < -1 ? "vanishing: the first layers barely learn" : firstLog > 1 ? "exploding: the first layers take wild steps" : "healthy: every layer gets a usable signal";

  return (
    <div>
      <p className="mb-2 text-sm text-pencil">
        Signal reaching layer 1 = {gain.toFixed(2)}
        <sup>{depth - 1}</sup> = <span className="font-mono font-semibold text-ink">{fmt(first)}</span> × the signal at the output ·{" "}
        <span className={`font-semibold ${tone}`}>{verdict}</span>
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Bar chart of gradient size at each layer on a log scale; with a per-layer factor below one the bars shrink towards the input, above one they grow"
        className="mx-auto block h-auto w-full max-w-[600px]"
        style={{ fontFamily: FONT.sans }}
      >
        {/* Healthy band and gridlines */}
        <rect x={PAD_L} y={yOf(1)} width={plotW} height={yOf(-1) - yOf(1)} fill={C.good} opacity={0.08} />
        {[-8, -4, 0, 4, 8].map((e) => (
          <g key={e}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yOf(e)} y2={yOf(e)} stroke={e === 0 ? C.muted : C.grid} strokeWidth={e === 0 ? 1.2 : 1} />
            <text x={PAD_L - 8} y={yOf(e) + 4.5} textAnchor="end" fontSize={14} fill={C.muted} fontFamily={FONT.mono}>
              {e === 0 ? "1" : `10${e < 0 ? "⁻" : ""}${"⁰¹²³⁴⁵⁶⁷⁸⁹"[Math.abs(e)]}`}
            </text>
          </g>
        ))}
        {/* Bars: layer k has been multiplied (depth − k) times */}
        {Array.from({ length: depth }, (_, idx) => {
          const k = idx + 1;
          const log = (depth - k) * Math.log10(gain);
          const clipped = log < LOG_MIN || log > LOG_MAX;
          const y = yOf(log);
          const top = Math.min(y, y1);
          const h = Math.max(Math.abs(y - y1), 1.5);
          const healthy = Math.abs(log) <= 1;
          return (
            <rect
              key={k}
              x={PAD_L + idx * slot + slot * 0.15}
              y={top}
              width={slot * 0.7}
              height={h}
              fill={healthy ? C.good : log < 0 ? C.warn : C.active}
              opacity={clipped ? 0.45 : 0.85}
              rx={Math.min(2, slot * 0.2)}
            />
          );
        })}
        <text x={PAD_L} y={H - 16} fontSize={14} fill={C.muted}>
          ← layer 1 (input)
        </text>
        <text x={W - PAD_R} y={H - 16} textAnchor="end" fontSize={14} fill={C.muted}>
          layer {depth} (output) →
        </text>
      </svg>
      <Controls>
        <Slider label="Factor per layer on the way back" value={gain} min={0.5} max={1.5} step={0.05} onChange={setGain} format={(v) => `× ${v.toFixed(2)}`} />
        <Slider label="Number of layers" value={depth} min={5} max={50} step={1} onChange={setDepth} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Log scale: each gridline is 10,000× the one below. Green band: between 0.1 and 10. Faded bars run off the chart.
      </p>
    </div>
  );
}
