"use client";

import { useMemo, useState } from "react";
import { C, Controls, FONT, FigureSvg, Legend, Slider } from "../kit";

/**
 * Scaling laws (A13). Loss predicted by the parametric fit
 *   L(N, D) = E + A / N^α + B / D^β
 * with the constants of Besiroglu et al. (2024)'s refit of the Chinchilla
 * study: E = 1.82, A = 482.01, B = 2085.43, α = 0.3478, β = 0.3658 (loss in
 * nats per token on the Chinchilla training data). Training compute C = 6·N·D.
 * Thin curves: one model size N trained on more and more tokens. Thick curve:
 * the lowest loss reachable at each compute budget (the compute-optimal
 * frontier), found by searching over N. The optional marker is an 8B model
 * trained on 15T tokens (C = 7.2e23), far past the compute-optimal ratio.
 */

const E = 1.82;
const A = 482.01;
const B = 2085.43;
const ALPHA = 0.3478;
const BETA = 0.3658;
const loss = (N: number, D: number) => E + A / Math.pow(N, ALPHA) + B / Math.pow(D, BETA);

function optimum(C: number) {
  let best = { L: Infinity, N: 0, D: 0 };
  for (let lg = 6; lg <= 14; lg += 0.005) {
    const N = Math.pow(10, lg);
    const D = C / (6 * N);
    const L = loss(N, D);
    if (L < best.L) best = { L, N, D };
  }
  return best;
}

const W = 640;
const H = 360;
const M = { l: 58, r: 14, t: 14, b: 46 };
const X_MIN = 18;
const X_MAX = 26;
const Y_MIN = Math.log(1.8);
const Y_MAX = Math.log(4.2);
const sx = (logC: number) => M.l + ((logC - X_MIN) / (X_MAX - X_MIN)) * (W - M.l - M.r);
const sy = (L: number) => M.t + ((Y_MAX - Math.log(L)) / (Y_MAX - Y_MIN)) * (H - M.t - M.b);

const SIZES = [
  { N: 1e8, label: "100M" },
  { N: 1e9, label: "1B" },
  { N: 1e10, label: "10B" },
  { N: 1e11, label: "100B" },
  { N: 1e12, label: "1T" },
];

const OVER = { N: 8e9, D: 15e12 };

const sup = (n: number) => String(n).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]);
function fmt(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(n >= 1e13 ? 0 : 1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  return `${Math.round(n / 1e6)}M`;
}
const sci = (x: number) => {
  const e = Math.floor(Math.log10(x));
  return `${(x / Math.pow(10, e)).toFixed(1)} × 10${sup(e)}`;
};

export default function ScalingLawsFigure() {
  const [logC, setLogC] = useState(22);
  const [showOver, setShowOver] = useState(false);

  const { curves, frontier } = useMemo(() => {
    const grid = Array.from({ length: 161 }, (_, i) => X_MIN + (i * (X_MAX - X_MIN)) / 160);
    const curves = SIZES.map(({ N, label }) => {
      const pts = grid
        .map((lc) => ({ lc, L: loss(N, Math.pow(10, lc) / (6 * N)) }))
        .filter((p) => p.L <= 4.2);
      // label where the curve enters the plot at the top
      return { N, label, pts, labelAt: pts[0] };
    });
    const frontier = grid.map((lc) => ({ lc, L: optimum(Math.pow(10, lc)).L })).filter((p) => p.L <= 4.2);
    return { curves, frontier };
  }, []);

  const C_ = Math.pow(10, logC);
  const opt = optimum(C_);
  const overC = 6 * OVER.N * OVER.D;
  const overL = loss(OVER.N, OVER.D);
  // Compute a compute-optimal model needs to reach the same loss (bisection on log C)
  const sameLoss = useMemo(() => {
    let lo = 18;
    let hi = 26;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (optimum(Math.pow(10, mid)).L > overL) lo = mid;
      else hi = mid;
    }
    const c = Math.pow(10, (lo + hi) / 2);
    return { C: c, ...optimum(c) };
  }, [overL]);

  const path = (pts: Array<{ lc: number; L: number }>) => pts.map((p, i) => `${i ? "L" : "M"} ${sx(p.lc).toFixed(1)} ${sy(p.L).toFixed(1)}`).join(" ");

  return (
    <div>
      <FigureSvg width={W} height={H} label="Log-log plot of loss against training compute: each model size flattens out, and the best achievable loss falls smoothly as compute grows">
        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill={C.wash} />
        {[18, 20, 22, 24, 26].map((e) => (
          <g key={e}>
            <line x1={sx(e)} y1={M.t} x2={sx(e)} y2={H - M.b} stroke={C.grid} />
            <text x={sx(e)} y={H - M.b + 20} textAnchor="middle" fontSize={13} fill={C.muted}>
              10{sup(e)}
            </text>
          </g>
        ))}
        {[2, 2.5, 3, 4].map((l) => (
          <g key={l}>
            <line x1={M.l} y1={sy(l)} x2={W - M.r} y2={sy(l)} stroke={C.grid} />
            <text x={M.l - 8} y={sy(l) + 4.5} textAnchor="end" fontSize={13} fill={C.muted}>
              {l.toFixed(1)}
            </text>
          </g>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize={13} fill={C.text}>
          training compute (FLOPs, log scale)
        </text>
        <text x={14} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize={13} fill={C.text} transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`}>
          loss (nats per token)
        </text>

        {curves.map((c) => (
          <g key={c.label}>
            <path d={path(c.pts)} fill="none" stroke={C.primarySoft} strokeWidth={1.8} />
            <text x={sx(c.labelAt.lc) + 8} y={sy(c.labelAt.L) + 14} fontSize={13} fill={C.primary} style={{ fontFamily: FONT.sans }}>
              {c.label}
            </text>
          </g>
        ))}
        <path d={path(frontier)} fill="none" stroke={C.primary} strokeWidth={3.5} strokeLinecap="round" />

        {showOver && (
          <g>
            <line x1={sx(Math.log10(sameLoss.C))} y1={sy(overL)} x2={sx(Math.log10(overC))} y2={sy(overL)} stroke={C.warn} strokeWidth={2} strokeDasharray="5 4" />
            <circle cx={sx(Math.log10(sameLoss.C))} cy={sy(overL)} r={5} fill="white" stroke={C.primary} strokeWidth={2} />
            <circle cx={sx(Math.log10(overC))} cy={sy(overL)} r={7} fill={C.warn} />
            <text x={sx(Math.log10(overC)) + 10} y={sy(overL) - 10} fontSize={13} fontWeight={700} fill={C.warn}>
              8B on 15T
            </text>
          </g>
        )}

        <line x1={sx(logC)} y1={M.t} x2={sx(logC)} y2={H - M.b} stroke={C.active} strokeWidth={1.2} strokeDasharray="3 4" />
        <circle cx={sx(logC)} cy={sy(opt.L)} r={7} fill={C.active} stroke="white" strokeWidth={2} />
      </FigureSvg>
      <Legend
        items={[
          { color: C.primarySoft, label: "one model size, trained on ever more tokens" },
          { color: C.primary, label: "best loss for each compute budget" },
        ]}
      />
      <p className="mt-3 text-sm text-pencil">
        With <span className="font-mono">{sci(C_)}</span> FLOPs, the lowest loss (<span className="font-semibold">{opt.L.toFixed(2)}</span>) comes from about{" "}
        <span className="font-semibold text-rose-700">{fmt(opt.N)} parameters</span> trained on{" "}
        <span className="font-semibold text-rose-700">{fmt(opt.D)} tokens</span>: {Math.round(opt.D / opt.N)} tokens per parameter.
      </p>
      {showOver && (
        <p className="mt-1 text-sm text-pencil">
          The 8B model on 15T tokens uses <span className="font-mono">{sci(overC)}</span> FLOPs to reach loss {overL.toFixed(2)}. A compute-optimal model
          ({fmt(sameLoss.N)} on {fmt(sameLoss.D)} tokens) gets there with {sci(sameLoss.C)}, about {(overC / sameLoss.C).toFixed(1)}× less, but it is{" "}
          {(sameLoss.N / OVER.N).toFixed(1)}× larger to serve.
        </p>
      )}
      <Controls>
        <Slider label="Compute budget" value={logC} min={19} max={26} step={0.1} onChange={setLogC} format={(v) => `10^${v.toFixed(1)} FLOPs`} />
        <label className="inline-flex items-center gap-2 text-xs font-medium text-pencil">
          <input type="checkbox" checked={showOver} onChange={(e) => setShowOver(e.target.checked)} className="accent-amber-600" />
          Show an 8B model trained on 15T tokens
        </label>
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Fit from a 2024 refit of the Chinchilla study (Besiroglu et al.), extrapolated beyond the sizes it was fitted on. Absolute losses depend on the dataset.
      </p>
    </div>
  );
}
