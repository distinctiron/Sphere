"use client";

import { C, FONT } from "../kit";

/**
 * Two price curves (D5). Staged loop, 9 s. Illustrative trend, log scale.
 * Band: blended list price (3 input : 1 output) of the newest frontier models,
 * which has stayed roughly within a few to a few tens of dollars per million
 * tokens since 2023, falling far more slowly than the fixed-capability line. Line: the cheapest price for a fixed capability level,
 * anchored at GPT-4's launch price (March 2023: $30 input, $60 output, so
 * $37.50 blended) and falling about 10× a year, a middle-of-the-range trend
 * estimate; published estimates span from a few times to far more per year.
 */

const CYCLE = 9;
const X0 = 86;
const X1 = 660;
const Y0 = 30; // $100
const PX_DEC = 55;
const T0 = 2023;
const T1 = 2026.5;
const xOf = (t: number) => X0 + ((t - T0) / (T1 - T0)) * (X1 - X0);
const yOf = (p: number) => Y0 + (2 - Math.log10(p)) * PX_DEC;

const START_T = 2023.2;
const START_P = 37.5;
const END_T = 2026.4;
const END_P = START_P / Math.pow(10, END_T - START_T);

export default function PriceDeclineFigure() {
  const len = Math.hypot(xOf(END_T) - xOf(START_T), yOf(END_P) - yOf(START_P));
  return (
    <div>
      <style>{`
        .pdc-line { stroke-dasharray: ${len.toFixed(0)}; animation: pdc-line ${CYCLE}s ease-in-out infinite; }
        @keyframes pdc-line { 0%, 8% { stroke-dashoffset: ${len.toFixed(0)} } 60%, 94% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: ${len.toFixed(0)} } }
        .pdc-band { animation: pdc-band ${CYCLE}s ease-in-out infinite; }
        @keyframes pdc-band { 0% { opacity: 0 } 8%, 94% { opacity: 1 } 100% { opacity: 0 } }
        .pdc-end { animation: pdc-end ${CYCLE}s ease-in-out infinite; }
        @keyframes pdc-end { 0%, 60% { opacity: 0 } 66%, 94% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>
      <svg viewBox="0 0 680 300" role="img" aria-label="Log-scale chart from 2023 to 2026: the price of frontier models stays in a band of a few to a few tens of dollars per million tokens, while the price for a fixed capability level falls about tenfold per year" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {[100, 10, 1, 0.1, 0.01].map((p) => (
          <g key={p}>
            <line x1={X0} x2={X1} y1={yOf(p)} y2={yOf(p)} stroke={C.grid} />
            <text x={X0 - 8} y={yOf(p) + 6} textAnchor="end" fontSize={16} fill={C.muted}>
              {p >= 1 ? `$${p}` : `$${p}`}
            </text>
          </g>
        ))}
        {[2023, 2024, 2025, 2026].map((t) => (
          <text key={t} x={xOf(t)} y={yOf(0.01) + 24} textAnchor="middle" fontSize={16} fill={C.muted}>
            {t}
          </text>
        ))}

        {/* frontier band */}
        <g className="pdc-band">
          <rect x={xOf(START_T)} y={yOf(40)} width={xOf(T1) - xOf(START_T)} height={yOf(3) - yOf(40)} fill={C.primary} opacity={0.14} />
        </g>
        <text x={xOf(2025.35)} y={yOf(40) - 8} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.primary} className="pdc-band">
          newest frontier models: a wide, slow band
        </text>

        {/* fixed capability line */}
        <line x1={xOf(START_T)} y1={yOf(START_P)} x2={xOf(END_T)} y2={yOf(END_P)} stroke={C.active} strokeWidth={3.5} strokeLinecap="round" className="pdc-line" />
        <circle cx={xOf(START_T)} cy={yOf(START_P)} r={5} fill={C.active} />
        <text x={xOf(START_T) - 4} y={yOf(40) - 8} fontSize={16} fontWeight={700} fill={C.active}>
          GPT-4 at launch, $37.50
        </text>
        <g className="pdc-end">
          <text x={xOf(2023.3)} y={yOf(0.5)} fontSize={17} fontWeight={700} fill={C.active}>
            same capability:
          </text>
          <text x={xOf(2023.3)} y={yOf(0.5) + 21} fontSize={17} fontWeight={700} fill={C.active}>
            ÷10 per year
          </text>
        </g>
        <text x={16} y={17} fontSize={16} fontWeight={600} fill={C.text}>
          $ per million tokens (blended, log scale)
        </text>
      </svg>
      <p className="mt-1 text-xs text-pencil/70">
        Illustrative trend, not a price list. Blended price = 3 parts input to 1 part output. The fixed-capability line starts at GPT-4’s launch list price
        (March 2023) and falls about 10× a year, a mid-range estimate; published estimates span from a few times to far more per year depending on the
        capability level measured. As of mid-2026.
      </p>
    </div>
  );
}
