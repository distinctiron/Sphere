"use client";

import { useMemo, useState } from "react";
import { C, ChoiceButtons, FONT } from "../kit";

/**
 * Random directions become nearly orthogonal as dimension grows (A1).
 * For each dimension d, draw 300 pairs of random directions (Gaussian
 * coordinates, seeded) and histogram the cosine of the angle between them.
 * For uniformly random directions E[cos²θ] = 1/d exactly, so the spread
 * (root-mean-square) is 1/√d: the dashed markers.
 */

const DIMS = ["2", "3", "10", "100", "1000", "10000"] as const;
type Dim = (typeof DIMS)[number];
const PAIRS = 300;
const BINS = 40;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleCosines(d: number): number[] {
  const rand = mulberry32(11 + d);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const out: number[] = [];
  for (let p = 0; p < PAIRS; p++) {
    let ab = 0;
    let aa = 0;
    let bb = 0;
    for (let i = 0; i < d; i++) {
      const x = gauss();
      const y = gauss();
      ab += x * y;
      aa += x * x;
      bb += y * y;
    }
    out.push(ab / Math.sqrt(aa * bb));
  }
  return out;
}

const W = 520;
const H = 236;
const PAD_L = 20;
const PAD_R = 20;
const BASE = 196;
const TOP = 16;
const xPx = (c: number) => PAD_L + ((c + 1) / 2) * (W - PAD_L - PAD_R);

export default function RandomDirectionsFigure() {
  const [dim, setDim] = useState<Dim>("2");
  const d = Number(dim);
  const cosines = useMemo(() => sampleCosines(d), [d]);

  const counts = new Array(BINS).fill(0);
  for (const c of cosines) counts[Math.min(BINS - 1, Math.floor(((c + 1) / 2) * BINS))]++;
  const maxCount = Math.max(...counts);
  const rms = Math.sqrt(cosines.reduce((s, c) => s + c * c, 0) / cosines.length);
  const within = cosines.filter((c) => Math.abs(c) < 0.1).length / cosines.length;
  const spread = 1 / Math.sqrt(d);
  const binW = (W - PAD_L - PAD_R) / BINS;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-pencil">
        <span className="font-medium">Dimensions d:</span>
        <ChoiceButtons label="Dimensions" value={dim} onChange={setDim} options={DIMS.map((id) => ({ id, label: Number(id).toLocaleString("en-US") }))} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Histogram of the cosine between 300 pairs of random directions in ${d} dimensions`} className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <rect x={xPx(-0.1)} y={TOP} width={xPx(0.1) - xPx(-0.1)} height={BASE - TOP} fill={C.goodSoft} opacity={0.25} />
        {counts.map((n, i) => {
          const h = (n / maxCount) * (BASE - TOP - 6);
          return <rect key={i} x={PAD_L + i * binW + 1} y={BASE - h} width={binW - 2} height={h} rx={2} fill={C.primary} opacity={0.85} />;
        })}
        {[-spread, spread].map((s) => (
            <line key={s} x1={xPx(s)} y1={TOP} x2={xPx(s)} y2={BASE} stroke={C.warn} strokeWidth={2} strokeDasharray="5 4" />
        ))}
        <line x1={PAD_L} y1={BASE} x2={W - PAD_R} y2={BASE} stroke={C.muted} />
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={xPx(t)} y1={BASE} x2={xPx(t)} y2={BASE + 6} stroke={C.muted} />
            <text x={xPx(t)} y={BASE + 28} textAnchor={t === -1 ? "start" : t === 1 ? "end" : "middle"} fontSize={18} fill={C.text} fontFamily={FONT.mono}>
              {t === 0 ? "0" : `${t < 0 ? "−" : ""}${Math.abs(t)}`}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-pencil">
        <span>← opposite</span>
        <span>cos θ (0 = perpendicular)</span>
        <span>same way →</span>
      </div>
      <div className="mt-2 grid gap-1 text-sm text-pencil sm:grid-cols-2">
        <div>
          Spread of cos θ (root-mean-square): <span className="font-mono font-semibold text-ink">{rms.toFixed(3)}</span>{" "}
          <span className="text-amber-700">(theory 1/√d = {spread.toFixed(3)})</span>
        </div>
        <div>
          Pairs within ±0.1 of perpendicular: <span className="font-mono font-semibold text-emerald-700">{Math.round(within * 100)}%</span>
        </div>
      </div>
      <p className="mt-1 text-xs text-pencil/70">300 random pairs per setting, each coordinate drawn from a bell curve. Bars are scaled to the tallest bin.</p>
    </div>
  );
}
