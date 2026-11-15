"use client";

import { useMemo, useState } from "react";
import { C, Controls, FONT, Slider } from "../kit";
import { mulberry32 } from "./anim";

/**
 * How many test cases does an eval need? (C8) Interactive.
 * Two versions of a system with true accuracies 80% and 80% + gap. Each dot is
 * the score one would measure on a fresh random sample of n cases (normal
 * approximation to the binomial, fixed seeded draws so the picture is stable).
 * The bar is the 95% interval ±1.96·√(p(1−p)/n).
 */

const SIZES = [20, 50, 100, 200, 500, 1000, 2000, 5000];
const BASE = 0.8;
const DOTS = 30;
const X0 = 40;
const X1 = 660;
const LO = 0.6;
const HI = 1.0;
const sx = (v: number) => X0 + ((Math.min(HI, Math.max(LO, v)) - LO) / (HI - LO)) * (X1 - X0);

export function margin(p: number, n: number) {
  return 1.96 * Math.sqrt((p * (1 - p)) / n);
}

function useDraws(seed: number) {
  return useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: DOTS }, () => {
      const z = Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
      return { z, jitter: rand() };
    });
  }, [seed]);
}

export default function EvalNoiseFigure() {
  const [sizeIndex, setSizeIndex] = useState(2);
  const [gapPts, setGapPts] = useState(3);
  const n = SIZES[sizeIndex];
  const pA = BASE;
  const pB = BASE + gapPts / 100;
  const drawsA = useDraws(11);
  const drawsB = useDraws(29);
  const mA = margin(pA, n);
  const mB = margin(pB, n);
  const seDiff = Math.sqrt((pA * (1 - pA) + pB * (1 - pB)) / n);
  const detectable = gapPts / 100 > 1.96 * seDiff;
  const needed = Math.ceil((2 * Math.pow(1.96 + 0.84, 2) * ((pA + pB) / 2) * (1 - (pA + pB) / 2)) / Math.pow(gapPts / 100, 2));

  const row = (label: string, p: number, m: number, draws: Array<{ z: number; jitter: number }>, y: number, color: string) => {
    const sd = Math.sqrt((p * (1 - p)) / n);
    return (
      <g>
        <text x={X0} y={y - 30} fontSize={14} fontWeight={700} fill={color}>
          {label} · true accuracy {Math.round(p * 100)}%
        </text>
        <rect x={sx(p - m)} y={y - 6} width={sx(p + m) - sx(p - m)} height={12} rx={6} fill={color} opacity={0.18} />
        {draws.map((d, i) => (
          <circle key={i} cx={sx(p + d.z * sd)} cy={y - 14 + d.jitter * 28} r={4} fill={color} opacity={0.7} />
        ))}
        <line x1={sx(p)} y1={y - 20} x2={sx(p)} y2={y + 20} stroke={C.ink} strokeWidth={2} />
      </g>
    );
  };

  return (
    <div>
      <svg viewBox="0 0 680 250" role="img" aria-label="Measured eval scores for two system versions, each dot a rerun on a fresh sample of test cases; with few cases the two clouds overlap, with many they separate." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {row("Version A", pA, mA, drawsA, 64, C.primary)}
        {row("Version B", pB, mB, drawsB, 160, C.active)}
        <line x1={X0} y1={210} x2={X1} y2={210} stroke={C.line} />
        {[0.6, 0.7, 0.8, 0.9, 1.0].map((v) => (
          <g key={v}>
            <line x1={sx(v)} y1={206} x2={sx(v)} y2={214} stroke={C.line} />
            <text x={sx(v)} y={232} textAnchor="middle" fontSize={13} fill={C.muted}>
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-sm text-pencil">
        With <span className="font-mono">{n.toLocaleString("en-US")}</span> cases, a measured score is within about{" "}
        <span className="font-mono">±{(mA * 100).toFixed(1)}</span> points of the truth (95% of the time). A {gapPts}-point gap is{" "}
        <span className={`font-semibold ${detectable ? "text-emerald-700" : "text-rose-700"}`}>{detectable ? "larger than the noise" : "hidden in the noise"}</span>.
        Detecting it reliably (80% of the time) takes roughly <span className="font-mono">{needed.toLocaleString("en-US")}</span> cases per version.
      </p>
      <Controls>
        <Slider label="Test cases (n)" value={sizeIndex} min={0} max={SIZES.length - 1} step={1} onChange={setSizeIndex} format={(i) => SIZES[i].toLocaleString("en-US")} />
        <Slider label="True gap between versions" value={gapPts} min={1} max={10} step={1} onChange={setGapPts} format={(v) => `${v} points`} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Each dot is the score from one rerun on a fresh random sample of n cases. Assumes independent cases and a perfect grader. Comparing both versions on
        the same cases (a paired comparison) needs fewer.
      </p>
    </div>
  );
}
