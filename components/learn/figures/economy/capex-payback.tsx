"use client";

import { useState } from "react";
import { C, Controls, FONT, Slider } from "../kit";

/**
 * Useful life and the ROI debate (D3). Interactive.
 * $100bn of accelerators and servers. Top row: the depreciation an accountant
 * books each year (straight line over the assumed accounting life). Bottom
 * row: the cost that actually has to be earned back each year if the fleet
 * only earns for its economic life. The required cash per year to recover the
 * capex plus a cost of capital r over n years is the annuity
 * capex · r / (1 − (1 + r)^−n).
 */

const CAPEX = 100; // $bn
const YEARS = 7;

const annuity = (r: number, n: number) => (CAPEX * r) / (1 - Math.pow(1 + r, -n));
const bn = (v: number) => `$${v.toFixed(v >= 10 ? 1 : 2)}bn`;

const W = 680;
const COL = 80;
const X0 = 110;
const MAX_ANNUAL = 50;
const ROW_H = 90;

function Row({ y, life, color, label }: { y: number; life: number; color: string; label: string }) {
  const per = CAPEX / life;
  const h = (per / MAX_ANNUAL) * ROW_H;
  return (
    <g>
      <text x={X0 - 10} y={y - ROW_H / 2 + 6} textAnchor="end" fontSize={17} fontWeight={700} fill={color}>
        {label}
      </text>
      <line x1={X0} x2={X0 + YEARS * COL} y1={y} y2={y} stroke={C.line} />
      {Array.from({ length: YEARS }, (_, i) =>
        i < life ? (
          <g key={i}>
            <rect x={X0 + i * COL + 6} y={y - h} width={COL - 12} height={h} rx={3} fill={color} opacity={0.8} style={{ transition: "all .3s ease" }} />
            <text x={X0 + i * COL + COL / 2} y={y - h - 7} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.text}>
              {per.toFixed(per >= 10 ? 0 : 1)}
            </text>
          </g>
        ) : null
      )}
    </g>
  );
}

export default function CapexPaybackFigure() {
  const [acct, setAcct] = useState(6);
  const [econ, setEcon] = useState(3);
  const [rate, setRate] = useState(8);
  const r = rate / 100;
  const reported = CAPEX / acct;
  const trueCost = CAPEX / econ;
  const required = annuity(r, econ);
  const gap = trueCost - reported;
  const leftover = acct > econ ? CAPEX - reported * econ : 0;

  return (
    <div>
      <svg viewBox={`0 0 ${W} 310`} role="img" aria-label="Two rows of yearly bars: depreciation booked over the accounting life, and the cost that must be recovered over the economic life of 100 billion dollars of accelerators" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <Row y={130} life={acct} color={C.primary} label="Booked" />
        <Row y={262} life={econ} color={C.warn} label="Must earn" />
        {Array.from({ length: YEARS }, (_, i) => (
          <text key={i} x={X0 + i * COL + COL / 2} y={290} textAnchor="middle" fontSize={16} fill={C.muted}>
            yr {i + 1}
          </text>
        ))}
        <text x={X0} y={18} fontSize={16} fill={C.muted}>
          $bn per year, for $100bn of accelerators and servers
        </text>
      </svg>

      <div className="mt-1 space-y-1 text-sm text-pencil">
        <p>
          <span className="font-semibold text-[#2b6ec4]">Booked depreciation:</span> {bn(reported)} a year for {acct} years.{" "}
          <span className="font-semibold text-amber-700">Economic cost:</span> {bn(trueCost)} a year for {econ} years.
        </p>
        {gap > 0.001 ? (
          <p>
            Reported profit is flattered by <span className="font-semibold">{bn(gap)}</span> a year while the chips earn, and{" "}
            <span className="font-semibold">{bn(leftover)}</span> of book value is still on the balance sheet when they stop earning: a later write-down
            or years of cost with no revenue.
          </p>
        ) : gap < -0.001 ? (
          <p>The accounting life is shorter than the economic life, so reported profit is conservative: the chips keep earning after they are fully depreciated.</p>
        ) : (
          <p>Accounting life matches economic life, so reported profit tracks economic reality.</p>
        )}
        <p>
          To recover the $100bn plus a {rate}% cost of capital in {econ} years, the fleet must generate about{" "}
          <span className="font-mono font-semibold">{bn(required)}</span> a year of gross profit, before power, staff and networking.
        </p>
      </div>

      <Controls>
        <Slider label="Accounting useful life" value={acct} min={2} max={7} step={1} onChange={setAcct} format={(v) => `${v} years`} />
        <Slider label="Economic life (years it earns)" value={econ} min={2} max={7} step={1} onChange={setEcon} format={(v) => `${v} years`} />
        <Slider label="Cost of capital" value={rate} min={4} max={14} step={1} onChange={setRate} format={(v) => `${v}%`} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">Straight-line depreciation, no residual value, illustrative round numbers.</p>
    </div>
  );
}
