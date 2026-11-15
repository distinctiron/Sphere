"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * Interactive roofline (B3). Attainable throughput = min(peak FLOP/s,
 * bandwidth × arithmetic intensity), on log-log axes. Chips use approximate
 * dense 16-bit tensor throughput (FP16 for V100, BF16 otherwise) and HBM
 * bandwidth from public spec sheets:
 *   V100 SXM2 (2017) 125 TFLOP/s, 0.90 TB/s → ridge ≈ 139
 *   A100 80GB SXM (2020) 312 TFLOP/s, 2.04 TB/s → ridge ≈ 153
 *   H100 SXM (2022) 989 TFLOP/s, 3.35 TB/s → ridge ≈ 295
 *   B200 (2024) ≈ 2,250 TFLOP/s, ≈ 8 TB/s → ridge ≈ 281
 * Workload intensities (BF16, 2 bytes per number):
 *   vector add: 1 FLOP per 6 bytes (read 2, write 1) ≈ 0.17
 *   decode, 1 user: 2 FLOPs per 2-byte weight = 1; 64 users ≈ 64
 *   square matmul n: 2n³ FLOPs / (3 · n² · 2 bytes) = n / 3 → 512: 171, 4096: 1,365
 */

const CHIPS = {
  v100: { label: "V100 · 2017", peak: 125, bw: 0.9 },
  a100: { label: "A100 · 2020", peak: 312, bw: 2.04 },
  h100: { label: "H100 · 2022", peak: 989, bw: 3.35 },
  b200: { label: "B200 · 2024", peak: 2250, bw: 8.0 },
} as const;
type ChipId = keyof typeof CHIPS;

const WORKLOADS = [
  { id: "add", label: "Vector add", ai: 1 / 6 },
  { id: "dec1", label: "Decode, 1 user", ai: 1 },
  { id: "dec64", label: "Decode, 64 users", ai: 64 },
  { id: "mm512", label: "Matmul 512", ai: 512 / 3 },
  { id: "mm4096", label: "Matmul 4096", ai: 4096 / 3 },
] as const;

const X_MIN = -1; // log10 FLOPs/byte
const X_MAX = 4;
const Y_MIN = -1; // log10 TFLOP/s
const Y_MAX = 4;
const PL = 72;
const PR = 636;
const PT = 34;
const PB = 314;
const sx = (lg: number) => PL + ((lg - X_MIN) / (X_MAX - X_MIN)) * (PR - PL);
const sy = (lg: number) => PB - ((lg - Y_MIN) / (Y_MAX - Y_MIN)) * (PB - PT);

const fmt = (v: number) => (v >= 100 ? Math.round(v).toLocaleString("en-US") : v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
const TICKS = ["0.1", "1", "10", "100", "1,000", "10,000"];

function roofPath(peak: number, bw: number) {
  const ridge = Math.log10(peak / bw);
  const yAt = (lg: number) => Math.log10(bw) + lg;
  const startLg = Math.max(X_MIN, Y_MIN - Math.log10(bw));
  return `M ${sx(startLg)} ${sy(yAt(startLg))} L ${sx(ridge)} ${sy(Math.log10(peak))} L ${sx(X_MAX)} ${sy(Math.log10(peak))}`;
}

export default function RooflineFigure() {
  const [chip, setChip] = useState<ChipId>("h100");
  const [lg, setLg] = useState(0); // log10 of arithmetic intensity
  const c = CHIPS[chip];
  const ai = Math.pow(10, lg);
  const ridge = c.peak / c.bw;
  const attainable = Math.min(c.peak, c.bw * ai);
  const share = attainable / c.peak;
  const memoryBound = ai < ridge;
  const px = sx(lg);
  const py = sy(Math.log10(attainable));

  return (
    <div>
      <svg viewBox="0 0 680 362" role="img" aria-label={`Roofline for ${c.label}: at ${fmt(ai)} FLOPs per byte the chip attains ${fmt(attainable)} TFLOP/s, ${memoryBound ? "memory-bound" : "compute-bound"}`} className="block h-auto w-full select-none" style={{ fontFamily: FONT.sans }}>
        {/* Grid */}
        {Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => (
          <g key={`x${i}`}>
            <line x1={sx(X_MIN + i)} y1={PT} x2={sx(X_MIN + i)} y2={PB} stroke={C.grid} />
            <text x={sx(X_MIN + i)} y={PB + 20} textAnchor="middle" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
              {TICKS[i]}
            </text>
          </g>
        ))}
        {Array.from({ length: Y_MAX - Y_MIN + 1 }, (_, i) => (
          <g key={`y${i}`}>
            <line x1={PL} y1={sy(Y_MIN + i)} x2={PR} y2={sy(Y_MIN + i)} stroke={C.grid} />
            <text x={PL - 8} y={sy(Y_MIN + i) + 4} textAnchor="end" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
              {TICKS[i]}
            </text>
          </g>
        ))}
        <text x={PL} y={18} fontSize={13} fill={C.text} fontWeight={600}>
          attainable TFLOP/s
        </text>
        <text x={PR} y={PB + 44} textAnchor="end" fontSize={13} fill={C.text} fontWeight={600}>
          arithmetic intensity (FLOPs per byte) →
        </text>


        {/* Regions under the selected roof */}
        <path d={`${roofPath(c.peak, c.bw)} L ${sx(X_MAX)} ${PB} L ${sx(Math.max(X_MIN, Y_MIN - Math.log10(c.bw)))} ${PB} Z`} fill={C.primaryWash} />
        {/* Other chips, faint */}
        {(Object.keys(CHIPS) as ChipId[])
          .filter((id) => id !== chip)
          .map((id) => (
            <path key={id} d={roofPath(CHIPS[id].peak, CHIPS[id].bw)} fill="none" stroke={C.faint} strokeWidth={2} />
          ))}
        <line x1={sx(Math.log10(ridge))} y1={sy(Math.log10(c.peak))} x2={sx(Math.log10(ridge))} y2={PB} stroke={C.primarySoft} strokeDasharray="4 4" />
        <text x={sx(Math.log10(ridge)) - 10} y={PB - 12} textAnchor="end" fontSize={13} fill={C.warn} fontWeight={600}>
          memory-bound
        </text>
        <text x={sx(Math.log10(ridge)) + 10} y={PB - 12} fontSize={13} fill={C.good} fontWeight={600}>
          compute-bound
        </text>
        <path d={roofPath(c.peak, c.bw)} fill="none" stroke={C.primary} strokeWidth={3.5} strokeLinejoin="round" />
        <text x={sx(Math.log10(ridge))} y={sy(Math.log10(c.peak)) - 10} textAnchor="middle" fontSize={13} fill={C.primary} fontWeight={700}>
          ridge ≈ {fmt(ridge)}
        </text>

        {/* Workload marker */}
        <line x1={px} y1={py} x2={px} y2={PB} stroke={C.active} strokeDasharray="3 3" />
        <circle cx={px} cy={py} r={8} fill={C.active} stroke="white" strokeWidth={2} />
      </svg>

      <div className="mt-1 grid gap-1 text-sm text-pencil sm:grid-cols-2">
        <div>
          Intensity <span className="font-mono text-ink">{fmt(ai)}</span> FLOPs/byte →{" "}
          <span className="font-mono text-ink">{fmt(attainable)}</span> TFLOP/s
        </div>
        <div>
          {c.label.split(" · ")[0]}: peak <span className="font-mono">{fmt(c.peak)}</span> TFLOP/s ÷ <span className="font-mono">{c.bw}</span> TB/s = ridge{" "}
          <span className="font-mono">{fmt(ridge)}</span>
        </div>
      </div>
      <p className={`mt-1 text-sm font-semibold ${memoryBound ? "text-rose-700" : "text-emerald-700"}`}>
        {memoryBound
          ? `Memory-bound: ${(share * 100).toFixed(share < 0.01 ? 2 : share < 0.1 ? 1 : 0)}% of peak. The arithmetic units wait ${((1 - share) * 100).toFixed(share < 0.1 ? 1 : 0)}% of the time.`
          : "Compute-bound: running at the peak. More bandwidth would not help; more arithmetic would."}
      </p>

      <Controls>
        <ChoiceButtons label="Chip" value={chip} onChange={setChip} options={(Object.keys(CHIPS) as ChipId[]).map((id) => ({ id, label: CHIPS[id].label }))} />
        <div role="group" aria-label="Workload" className="flex flex-wrap gap-1">
          {WORKLOADS.map((w) => {
            const on = Math.abs(Math.log10(w.ai) - lg) < 0.005;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setLg(Math.log10(w.ai))}
                aria-pressed={on}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${on ? "bg-rose-600 text-white" : "bg-[#f1efe4] text-pencil hover:bg-[#e8e5d6]"}`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
        <Slider label="Arithmetic intensity (log scale)" value={lg} min={X_MIN} max={X_MAX} step={0.01} onChange={setLg} format={(v) => `${fmt(Math.pow(10, v))} FLOPs/byte`} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Dense 16-bit tensor throughput and HBM bandwidth, rounded from public spec sheets (V100 uses FP16; B200 figures approximate). Grey lines: the
        other chips. Real kernels reach less than the roof.
      </p>
    </div>
  );
}
