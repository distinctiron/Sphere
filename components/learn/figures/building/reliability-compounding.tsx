"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * Why reliability compounds (C5). Interactive.
 * If each step of a task succeeds independently with probability p, a task of
 * n steps succeeds with probability pⁿ. With a check that catches a fraction
 * of failures and retries once, a step succeeds with p + (1 − p)·catch·p.
 * Independence is an idealisation; real errors are correlated.
 */

const N_MAX = 100;
const CATCH = 0.8;
const X0 = 56;
const X1 = 664;
const Y0 = 20;
const Y1 = 250;
const sx = (n: number) => X0 + ((n - 1) / (N_MAX - 1)) * (X1 - X0);
const sy = (v: number) => Y1 - v * (Y1 - Y0);

export const withRetry = (p: number) => p + (1 - p) * CATCH * p;

function curve(p: number) {
  return Array.from({ length: N_MAX }, (_, i) => `${sx(i + 1).toFixed(1)},${sy(Math.pow(p, i + 1)).toFixed(1)}`).join(" ");
}

const pctText = (v: number) => (v >= 0.995 ? ">99%" : v < 0.005 ? "<1%" : `${Math.round(v * 100)}%`);

export default function ReliabilityCompoundingFigure() {
  const [p, setP] = useState(0.95);
  const [n, setN] = useState(20);
  const [check, setCheck] = useState<"off" | "on">("off");
  const plain = Math.pow(p, n);
  const pr = withRetry(p);
  const checked = Math.pow(pr, n);
  const shown = check === "on" ? checked : plain;

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-ink">
        {Math.round(p * 1000) / 10}% per step, {n} steps → task succeeds{" "}
        <span className={shown >= 0.5 ? "text-emerald-700" : "text-rose-700"}>{pctText(shown)}</span> of the time
        {check === "on" && <span className="font-normal text-pencil"> (without the check: {pctText(plain)})</span>}
      </div>
      <svg viewBox="0 0 680 290" role="img" aria-label="Task success probability falling with the number of steps, for the chosen per-step reliability, with and without a check-and-retry" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={X0} y1={sy(v)} x2={X1} y2={sy(v)} stroke={C.grid} />
            <text x={X0 - 8} y={sy(v) + 5} textAnchor="end" fontSize={13} fill={C.muted}>
              {v * 100}%
            </text>
          </g>
        ))}
        {[1, 25, 50, 75, 100].map((s) => (
          <text key={s} x={sx(s)} y={Y1 + 20} textAnchor="middle" fontSize={13} fill={C.muted}>
            {s}
          </text>
        ))}
        <text x={(X0 + X1) / 2} y={Y1 + 38} textAnchor="middle" fontSize={13} fill={C.text}>
          steps in the task
        </text>
        <polyline points={curve(p)} fill="none" stroke={C.active} strokeWidth={2.5} opacity={check === "on" ? 0.45 : 1} />
        {check === "on" && <polyline points={curve(pr)} fill="none" stroke={C.good} strokeWidth={2.5} />}
        <line x1={sx(n)} y1={Y0} x2={sx(n)} y2={Y1} stroke={C.ink} strokeDasharray="4 4" />
        <circle cx={sx(n)} cy={sy(plain)} r={5} fill={C.active} />
        {check === "on" && <circle cx={sx(n)} cy={sy(checked)} r={5} fill={C.good} />}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-rose-600" />pⁿ: every step must succeed</span>
        {check === "on" && (
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 bg-emerald-600" />with check and one retry: {Math.round(pr * 1000) / 10}% per step</span>
        )}
      </div>
      <Controls>
        <Slider label="Per-step success p" value={p} min={0.8} max={0.999} step={0.001} onChange={setP} format={(v) => `${(v * 100).toFixed(1)}%`} />
        <Slider label="Steps n" value={n} min={1} max={N_MAX} step={1} onChange={setN} />
        <ChoiceButtons
          label="Check and retry"
          value={check}
          onChange={setCheck}
          options={[
            { id: "off", label: "No check" },
            { id: "on", label: "Check catches 80%, retry once" },
          ]}
        />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">Assumes steps fail independently. Real failures are often correlated, which can make things better or worse.</p>
    </div>
  );
}
