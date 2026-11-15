"use client";

import { useState } from "react";
import { C, Controls, FONT, Slider } from "../kit";

/**
 * pass@k versus pass^k (C8). Interactive.
 * With per-attempt success p and independent attempts:
 *   pass@k = 1 − (1 − p)^k  (at least one of k attempts succeeds)
 *   pass^k = p^k            (all k attempts succeed)
 * Real attempts on the same task are correlated, so both are idealised.
 */

const K_MAX = 10;
const X0 = 56;
const X1 = 660;
const Y0 = 20;
const Y1 = 230;
const sx = (k: number) => X0 + ((k - 1) / (K_MAX - 1)) * (X1 - X0);
const sy = (v: number) => Y1 - v * (Y1 - Y0);

export const passAt = (p: number, k: number) => 1 - Math.pow(1 - p, k);
export const passAll = (p: number, k: number) => Math.pow(p, k);

const pct = (v: number) => (v >= 0.995 && v < 1 ? ">99%" : v > 0 && v < 0.005 ? "<1%" : `${Math.round(v * 100)}%`);

export default function PassAtKFigure() {
  const [p, setP] = useState(0.6);
  const [k, setK] = useState(5);
  const ks = Array.from({ length: K_MAX }, (_, i) => i + 1);
  const line = (f: (p: number, k: number) => number) => ks.map((kk) => `${sx(kk)},${sy(f(p, kk))}`).join(" ");

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        <span className="text-emerald-700">pass@{k} = {pct(passAt(p, k))}</span>
        <span className="text-rose-700">pass^{k} = {pct(passAll(p, k))}</span>
        <span className="font-normal text-pencil">from the same {Math.round(p * 100)}% per attempt</span>
      </div>
      <svg viewBox="0 0 680 270" role="img" aria-label="Two curves against the number of attempts k: the chance that at least one attempt succeeds rises towards 100%, the chance that all attempts succeed falls towards zero." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={X0} y1={sy(v)} x2={X1} y2={sy(v)} stroke={C.grid} />
            <text x={X0 - 8} y={sy(v) + 5} textAnchor="end" fontSize={13} fill={C.muted}>
              {v * 100}%
            </text>
          </g>
        ))}
        {ks.map((kk) => (
          <text key={kk} x={sx(kk)} y={Y1 + 20} textAnchor="middle" fontSize={13} fill={C.muted}>
            {kk}
          </text>
        ))}
        <text x={(X0 + X1) / 2} y={Y1 + 38} textAnchor="middle" fontSize={13} fill={C.text}>
          attempts k
        </text>
        <line x1={sx(k)} y1={Y0} x2={sx(k)} y2={Y1} stroke={C.ink} strokeDasharray="4 4" />
        <polyline points={line(passAt)} fill="none" stroke={C.good} strokeWidth={2.5} />
        <polyline points={line(passAll)} fill="none" stroke={C.active} strokeWidth={2.5} />
        <circle cx={sx(k)} cy={sy(passAt(p, k))} r={5} fill={C.good} />
        <circle cx={sx(k)} cy={sy(passAll(p, k))} r={5} fill={C.active} />
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-emerald-600" />pass@k: at least one of k attempts succeeds</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-rose-600" />pass^k: all k attempts succeed</span>
      </div>
      <Controls>
        <Slider label="Success per attempt p" value={p} min={0.05} max={0.99} step={0.01} onChange={setP} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Attempts k" value={k} min={1} max={K_MAX} step={1} onChange={setK} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">Assumes independent attempts. Real attempts at the same task are correlated, which pulls both curves towards p.</p>
    </div>
  );
}
