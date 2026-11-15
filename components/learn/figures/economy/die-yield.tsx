"use client";

import { useMemo, useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * Why yield learning is a moat, and why big AI dies hurt (D2). Interactive.
 * A 300 mm wafer is tiled with rectangular dies (3 mm edge exclusion).
 * Each die is good with probability Y = exp(-D0 · A) (simple Poisson yield
 * model; A in cm², D0 = defects per cm²). Every die gets a fixed seeded random
 * rank, so the pattern is stable as you drag; the round(Y · n) best-ranked
 * dies are drawn as good, so the picture matches the expected count.
 * Wafer prices are rough for leading-edge nodes (~$15–30k in 2024–26).
 */

const WAFER_D = 300; // mm
const USABLE_R = WAFER_D / 2 - 3; // edge exclusion
const DIES = {
  phone: { label: "Phone chip · 100 mm²", w: 10, h: 10 },
  ai: { label: "AI accelerator die · ~800 mm²", w: 26, h: 31 },
} as const;
type DieId = keyof typeof DIES;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layoutDies(w: number, h: number) {
  const dies: Array<{ x: number; y: number; u: number }> = [];
  const rand = mulberry32(w * 1000 + h);
  // grid centred on the wafer, offset by half a die so it is symmetric
  const nx = Math.ceil(WAFER_D / w) + 2;
  const ny = Math.ceil(WAFER_D / h) + 2;
  for (let j = -ny; j <= ny; j++) {
    for (let i = -nx; i <= nx; i++) {
      const x0 = i * w - w / 2;
      const y0 = j * h - h / 2;
      const corners = [
        [x0, y0],
        [x0 + w, y0],
        [x0, y0 + h],
        [x0 + w, y0 + h],
      ];
      if (corners.every(([cx, cy]) => Math.hypot(cx, cy) <= USABLE_R)) dies.push({ x: x0, y: y0, u: 0 });
    }
  }
  // Each die gets a seeded random rank; the best-ranked round(Y · n) dies are
  // drawn as good, so the picture always matches the expected count.
  const keys = dies.map(() => rand());
  const order = keys.map((k, i) => [k, i] as const).sort((a, b) => a[0] - b[0]);
  order.forEach(([, i], rank) => (dies[i].u = rank));
  return dies;
}

const money = (v: number) => (v >= 1000 ? `$${Math.round(v).toLocaleString("en-US")}` : `$${v.toFixed(v >= 100 ? 0 : 1)}`);

export default function DieYieldFigure() {
  const [die, setDie] = useState<DieId>("ai");
  const [d0, setD0] = useState(0.1);
  const [price, setPrice] = useState(20000);
  const spec = DIES[die];
  const dies = useMemo(() => layoutDies(spec.w, spec.h), [spec.w, spec.h]);
  const areaCm2 = (spec.w * spec.h) / 100;
  const y = Math.exp(-d0 * areaCm2);
  const good = Math.round(y * dies.length);
  const costPerGood = good > 0 ? price / good : Infinity;

  const S = 330; // svg px for the wafer
  const k = S / (WAFER_D + 12);
  const c = S / 2;

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,19rem)_1fr]">
      <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label="A 300 millimetre wafer tiled with dies; defective dies are marked" className="block h-auto w-full max-w-[19rem] justify-self-center" style={{ fontFamily: FONT.sans }}>
        <circle cx={c} cy={c} r={(WAFER_D / 2) * k} fill={C.grid} stroke={C.line} />
        <circle cx={c} cy={c} r={USABLE_R * k} fill="none" stroke={C.line} strokeDasharray="3 3" />
        {dies.map((d, i) => {
          const bad = d.u >= good;
          const x = c + d.x * k;
          const yy = c + d.y * k;
          const w = spec.w * k;
          const h = spec.h * k;
          return (
            <g key={i}>
              <rect x={x + 0.4} y={yy + 0.4} width={w - 0.8} height={h - 0.8} rx={die === "ai" ? 2 : 0.6} fill={bad ? C.warnSoft : C.primary} opacity={bad ? 0.9 : 0.8} />
              {bad && die === "ai" && (
                <g stroke={C.warn} strokeWidth={2} strokeLinecap="round">
                  <line x1={x + w * 0.3} y1={yy + h * 0.3} x2={x + w * 0.7} y2={yy + h * 0.7} />
                  <line x1={x + w * 0.7} y1={yy + h * 0.3} x2={x + w * 0.3} y2={yy + h * 0.7} />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="min-w-0">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-paper p-2">
            <div className="text-xs text-pencil">Dies per wafer</div>
            <div className="font-mono text-lg font-semibold text-ink">{dies.length}</div>
          </div>
          <div className="rounded-lg bg-paper p-2">
            <div className="text-xs text-pencil">Yield e^(−D₀·A)</div>
            <div className="font-mono text-lg font-semibold text-ink">{Math.round(y * 100)}%</div>
          </div>
          <div className="rounded-lg bg-paper p-2">
            <div className="text-xs text-pencil">Good dies</div>
            <div className="font-mono text-lg font-semibold text-[#2b6ec4]">{good}</div>
          </div>
          <div className="rounded-lg bg-amber-50 p-2">
            <div className="text-xs text-pencil">Wafer cost per good die</div>
            <div className="font-mono text-lg font-semibold text-amber-700">{Number.isFinite(costPerGood) ? money(costPerGood) : "n/a"}</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-pencil">
          Area {areaCm2.toFixed(1)} cm² × {d0.toFixed(2)} defects/cm² = {(areaCm2 * d0).toFixed(2)} expected defects per die. A single defect usually
          kills a die, so the bigger the die, the faster yield falls as defects rise.
        </p>
        <Controls>
          <ChoiceButtons label="Die size" value={die} onChange={setDie} options={(Object.keys(DIES) as DieId[]).map((id) => ({ id, label: DIES[id].label }))} />
          <Slider label="Defect density D₀ (early ramp → mature)" value={d0} min={0.03} max={0.5} step={0.01} onChange={setD0} format={(v) => `${v.toFixed(2)} /cm²`} />
          <Slider label="Wafer price" value={price} min={10000} max={30000} step={1000} onChange={setPrice} format={(v) => `$${(v / 1000).toFixed(0)}k`} />
        </Controls>
        <p className="mt-2 text-xs text-pencil/70">
          Simple Poisson yield model with rough, illustrative inputs. Real fabs also recover partly defective dies by disabling units, and chips add
          packaging and HBM costs well above the die.
        </p>
      </div>
    </div>
  );
}
