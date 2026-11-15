"use client";

import { useMemo, useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * Underfitting → overfitting (A9). 14 noisy training points and 60 validation
 * points from f(x) = sin(3x) + 0.4x with Gaussian noise (σ = 0.25), seeded.
 * A polynomial of the chosen degree is fitted to the training points by least
 * squares (Legendre basis, Householder QR). Weight decay adds λ·Σc² to the
 * squared error (ridge regression), solved by stacking √λ·I under the design
 * matrix. Errors are root-mean-square (RMSE); the noise floor is σ = 0.25.
 */

const NOISE = 0.25;
const N_TRAIN = 14;
const N_VAL = 60;
const MAX_DEG = 13;
const truth = (x: number) => Math.sin(3 * x) + 0.4 * x;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];

function makeData(): { train: Pt[]; val: Pt[] } {
  const rand = mulberry32(7);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const train = Array.from({ length: N_TRAIN }, (_, i) => {
    const x = -1 + (2 * (i + 0.2 + 0.6 * rand())) / N_TRAIN;
    return [x, truth(x) + NOISE * gauss()] as Pt;
  });
  const val = Array.from({ length: N_VAL }, () => {
    const x = -1 + 2 * rand();
    return [x, truth(x) + NOISE * gauss()] as Pt;
  });
  return { train, val };
}

function legendre(n: number, x: number): number[] {
  const P = [1, x];
  for (let k = 1; k < n; k++) P.push(((2 * k + 1) * x * P[k] - k * P[k - 1]) / (k + 1));
  return P.slice(0, n + 1);
}

/** Least squares via Householder QR (A is m×n, m ≥ n) */
function lstsq(A0: number[][], b0: number[]): number[] {
  const A = A0.map((r) => r.slice());
  const b = b0.slice();
  const m = A.length;
  const n = A[0].length;
  for (let k = 0; k < n; k++) {
    let norm = 0;
    for (let i = k; i < m; i++) norm += A[i][k] ** 2;
    norm = Math.sqrt(norm);
    if (norm === 0) continue;
    const alpha = A[k][k] > 0 ? -norm : norm;
    const v = new Array(m).fill(0);
    for (let i = k; i < m; i++) v[i] = A[i][k];
    v[k] -= alpha;
    const vv = v.reduce((s, x) => s + x * x, 0);
    if (vv === 0) continue;
    for (let j = k; j < n; j++) {
      let s = 0;
      for (let i = k; i < m; i++) s += v[i] * A[i][j];
      s *= 2 / vv;
      for (let i = k; i < m; i++) A[i][j] -= s * v[i];
    }
    let s = 0;
    for (let i = k; i < m; i++) s += v[i] * b[i];
    s *= 2 / vv;
    for (let i = k; i < m; i++) b[i] -= s * v[i];
  }
  const c = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * c[j];
    c[i] = s / A[i][i];
  }
  return c;
}

function fit(train: Pt[], degree: number, lambda: number) {
  const A = train.map(([x]) => legendre(degree, x));
  const b = train.map(([, y]) => y);
  if (lambda > 0) {
    for (let j = 0; j <= degree; j++) {
      const row = new Array(degree + 1).fill(0);
      row[j] = Math.sqrt(lambda);
      A.push(row);
      b.push(0);
    }
  }
  const c = lstsq(A, b);
  return (x: number) => legendre(degree, x).reduce((s, p, j) => s + p * c[j], 0);
}

const rmse = (f: (x: number) => number, pts: Pt[]) => Math.sqrt(pts.reduce((s, [x, y]) => s + (f(x) - y) ** 2, 0) / pts.length);

const DECAY = [
  { id: "0", label: "off", lambda: 0 },
  { id: "0.001", label: "λ = 0.001", lambda: 0.001 },
  { id: "0.01", label: "λ = 0.01", lambda: 0.01 },
  { id: "0.1", label: "λ = 0.1", lambda: 0.1 },
] as const;
type DecayId = (typeof DECAY)[number]["id"];

// Fit plot geometry
const FW = 340;
const FH = 260;
const fx = (x: number) => 10 + ((x + 1) / 2) * (FW - 20);
const Y_RANGE = 2.2;
const fy = (y: number) => 10 + ((Y_RANGE - y) / (2 * Y_RANGE)) * (FH - 20);

// Error plot geometry
const EW = 340;
const EH = 260;
const EL = 44;
const ER = 10;
const ET = 12;
const EB = 40;
const E_MAX = 1.2;
const ex = (d: number) => EL + (d / MAX_DEG) * (EW - EL - ER);
const ey = (e: number) => ET + (1 - Math.min(e, E_MAX) / E_MAX) * (EH - ET - EB);

export default function FitComplexityFigure() {
  const { train, val } = useMemo(makeData, []);
  const [degree, setDegree] = useState(3);
  const [decay, setDecay] = useState<DecayId>("0");
  const lambda = DECAY.find((d) => d.id === decay)!.lambda;

  const curves = useMemo(
    () =>
      Array.from({ length: MAX_DEG + 1 }, (_, d) => {
        const f = fit(train, d, lambda);
        return { d, f, train: rmse(f, train), val: rmse(f, val) };
      }),
    [train, val, lambda]
  );
  const current = curves[degree];
  const best = curves.reduce((a, b) => (b.val < a.val ? b : a));

  const samples = Array.from({ length: 161 }, (_, i) => -1 + i / 80);
  const path = (f: (x: number) => number) =>
    samples.map((x, i) => `${i ? "L" : "M"}${fx(x).toFixed(1)},${fy(Math.max(-9, Math.min(9, f(x)))).toFixed(1)}`).join(" ");
  const errPath = (key: "train" | "val") => curves.map((c, i) => `${i ? "L" : "M"}${ex(c.d).toFixed(1)},${ey(c[key]).toFixed(1)}`).join(" ");

  const verdict =
    current.val > current.train * 1.35 && degree > best.d
      ? { text: "Overfitting: the curve chases the noise in the training points.", cls: "text-rose-700" }
      : degree < best.d && current.train > 0.3
      ? { text: "Underfitting: too simple to follow the pattern, even on the training points.", cls: "text-amber-700" }
      : { text: "Close to the best trade-off for this data.", cls: "text-emerald-700" };

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-pencil">Degree-{degree} polynomial fit</div>
          <svg viewBox={`0 0 ${FW} ${FH}`} role="img" aria-label={`A degree ${degree} polynomial fitted to 14 noisy training points, with validation points it never saw`} className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
            <defs>
              <clipPath id="fc-clip">
                <rect x={0} y={0} width={FW} height={FH} />
              </clipPath>
            </defs>
            <rect x={0} y={0} width={FW} height={FH} fill={C.wash} stroke={C.grid} />
            <line x1={0} x2={FW} y1={fy(0)} y2={fy(0)} stroke={C.grid} />
            <path d={path(truth)} fill="none" stroke={C.faint} strokeWidth={1.5} strokeDasharray="5 5" />
            {val.map(([x, y], i) => (
              <circle key={`v${i}`} cx={fx(x)} cy={fy(y)} r={3.2} fill="white" stroke={C.active} strokeWidth={1.3} />
            ))}
            <g clipPath="url(#fc-clip)">
              <path d={path(current.f)} fill="none" stroke={C.primary} strokeWidth={2.5} />
            </g>
            {train.map(([x, y], i) => (
              <circle key={`t${i}`} cx={fx(x)} cy={fy(y)} r={4.5} fill={C.primary} stroke="white" strokeWidth={1} />
            ))}
          </svg>
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-pencil">Error vs degree</div>
          <svg viewBox={`0 0 ${EW} ${EH}`} role="img" aria-label="Training error falls steadily with degree; validation error falls then rises, a U shape" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
            {[0, 0.4, 0.8, 1.2].map((e) => (
              <g key={e}>
                <line x1={EL} x2={EW - ER} y1={ey(e)} y2={ey(e)} stroke={C.grid} />
                <text x={EL - 6} y={ey(e) + 4.5} textAnchor="end" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                  {e.toFixed(1)}
                </text>
              </g>
            ))}
            <line x1={EL} x2={EW - ER} y1={ey(NOISE)} y2={ey(NOISE)} stroke={C.good} strokeDasharray="4 4" strokeWidth={1.5} />
            <line x1={ex(degree)} x2={ex(degree)} y1={ET} y2={EH - EB} stroke={C.line} strokeWidth={8} opacity={0.6} />
            <path d={errPath("train")} fill="none" stroke={C.primary} strokeWidth={2.5} />
            <path d={errPath("val")} fill="none" stroke={C.active} strokeWidth={2.5} />
            {curves.map((c) => (
              <g key={c.d}>
                <circle cx={ex(c.d)} cy={ey(c.train)} r={c.d === degree ? 5 : 2.5} fill={C.primary} />
                <circle cx={ex(c.d)} cy={ey(c.val)} r={c.d === degree ? 5 : 2.5} fill={c.val > E_MAX ? "white" : C.active} stroke={C.active} strokeWidth={1.5} />
              </g>
            ))}
            {[0, 5, 10, 13].map((d) => (
              <text key={d} x={ex(d)} y={EH - EB + 18} textAnchor="middle" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                {d}
              </text>
            ))}
            <text x={(EL + EW - ER) / 2} y={EH - 4} textAnchor="middle" fontSize={13} fill={C.muted}>
              polynomial degree
            </text>
          </svg>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-[#2b6ec4]">● training points · training error</span>
        <span className="text-rose-700">○ validation points · validation error</span>
        <span className="text-pencil">┄ true pattern</span>
        <span className="text-emerald-700">┄ noise floor (0.25)</span>
      </div>
      <p className="mt-3 text-sm text-pencil">
        Training error <span className="font-mono font-semibold text-[#2b6ec4]">{current.train.toFixed(2)}</span> · validation error{" "}
        <span className="font-mono font-semibold text-rose-700">{current.val.toFixed(2)}</span>
        {current.val > E_MAX ? " (off the chart)" : ""}. <span className={`font-semibold ${verdict.cls}`}>{verdict.text}</span>
      </p>
      <Controls>
        <Slider label="Model capacity (polynomial degree)" value={degree} min={0} max={MAX_DEG} step={1} onChange={setDegree} />
        <div className="flex flex-col gap-1 text-xs text-pencil">
          <span className="font-medium">Weight decay</span>
          <ChoiceButtons label="Weight decay" value={decay} onChange={setDecay} options={DECAY.map((d) => ({ id: d.id, label: d.label }))} />
        </div>
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        14 training points, 60 validation points, noise σ = 0.25. Errors are root-mean-square. Degree 13 has 14 coefficients, enough to pass through every training point. Weight decay adds λ × (sum of squared coefficients) to the summed squared error.
      </p>
    </div>
  );
}
