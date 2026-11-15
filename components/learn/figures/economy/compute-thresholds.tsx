"use client";

import { C, FONT } from "../kit";

/**
 * Fixed thresholds, moving frontier (D9). Staged loop, 10 s.
 * Log-scale training compute of frontier models: a trend line through two
 * widely cited estimates (GPT-3, 2020: ~3×10^23 FLOP; GPT-4, 2023: ~2×10^25
 * FLOP, an outside estimate), which implies roughly 4–5× growth a year,
 * matching published trend estimates. Solid to mid-2025, paler beyond (a
 * projection). Horizontal lines: 10^25 FLOP (EU AI Act presumption of
 * systemic risk for general-purpose models) and 10^26 FLOP (the reporting
 * threshold in the 2023 US executive order, since revoked, and in some state
 * laws). Each threshold lights up as the trend crosses it.
 */

const CYCLE = 10;
const X0 = 70;
const X1 = 660;
const T0 = 2018;
const T1 = 2027.5;
const E0 = 22; // 10^22 at the bottom
const E1 = 28;
const TOP = 30;
const BOTTOM = 270;
const xOf = (t: number) => X0 + ((t - T0) / (T1 - T0)) * (X1 - X0);
const yOf = (e: number) => BOTTOM - ((e - E0) / (E1 - E0)) * (BOTTOM - TOP);

const A = { t: 2020.4, e: Math.log10(3.1e23), label: "GPT-3 (2020)" };
const B = { t: 2023.2, e: Math.log10(2.1e25), label: "GPT-4 (2023, est.)" };
const SLOPE = (B.e - A.e) / (B.t - A.t); // decades per year (~0.65, i.e. ~4.5×/yr)
const eAt = (t: number) => A.e + SLOPE * (t - A.t);
const tAt = (e: number) => A.t + (e - A.e) / SLOPE;
const START = 2018.5;
const SOLID_END = 2025.5;
const DASH_END = 2027.3;
const pc = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;

const DRAW_FROM = 0.4;
const DRAW_TO = 6.4;
const timeAt = (t: number) => DRAW_FROM + ((t - START) / (DASH_END - START)) * (DRAW_TO - DRAW_FROM);

export default function ComputeThresholdsFigure() {
  const p1: [number, number] = [xOf(START), yOf(eAt(START))];
  const p2: [number, number] = [xOf(SOLID_END), yOf(eAt(SOLID_END))];
  const p3: [number, number] = [xOf(DASH_END), yOf(eAt(DASH_END))];
  const len = Math.hypot(p3[0] - p1[0], p3[1] - p1[1]);
  const cross25 = tAt(25);
  const cross26 = tAt(26);
  const perYear = Math.pow(10, SLOPE);
  return (
    <div>
      <style>{`
        .ct-draw { stroke-dasharray: ${len.toFixed(0)}; animation: ct-draw ${CYCLE}s linear infinite; }
        @keyframes ct-draw { 0%, ${pc(DRAW_FROM)} { stroke-dashoffset: ${len.toFixed(0)} } ${pc(DRAW_TO)}, 95% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: ${len.toFixed(0)} } }
        .ct-t25 { animation: ct-t25 ${CYCLE}s ease-out infinite; }
        @keyframes ct-t25 { 0%, ${pc(timeAt(cross25))} { opacity: .35 } ${pc(timeAt(cross25) + 0.3)}, 95% { opacity: 1 } 100% { opacity: .35 } }
        .ct-t26 { animation: ct-t26 ${CYCLE}s ease-out infinite; }
        @keyframes ct-t26 { 0%, ${pc(timeAt(cross26))} { opacity: .35 } ${pc(timeAt(cross26) + 0.3)}, 95% { opacity: 1 } 100% { opacity: .35 } }
      `}</style>
      <svg viewBox="0 0 680 310" role="img" aria-label="Training compute of frontier models on a log scale, growing about four to five times a year, crossing the 10 to the 25 threshold around 2023 and the 10 to the 26 threshold around 2024 to 2025" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <mask id="ct-dash-mask">
            <rect x={p2[0]} y={0} width={680} height={310} fill="white" />
          </mask>
          <mask id="ct-solid-mask">
            <rect x={0} y={0} width={p2[0]} height={310} fill="white" />
          </mask>
        </defs>
        {Array.from({ length: E1 - E0 + 1 }, (_, i) => E0 + i).map((e) => (
          <g key={e}>
            <line x1={X0} x2={X1} y1={yOf(e)} y2={yOf(e)} stroke={C.grid} />
            <text x={X0 - 8} y={yOf(e) + 6} textAnchor="end" fontSize={16} fill={C.muted}>
              10<tspan dy={-7} fontSize={13}>{e}</tspan>
            </text>
          </g>
        ))}
        {[2018, 2020, 2022, 2024, 2026].map((t) => (
          <text key={t} x={xOf(t)} y={BOTTOM + 24} textAnchor="middle" fontSize={16} fill={C.muted}>
            {t}
          </text>
        ))}
        <text x={X0} y={17} fontSize={16} fontWeight={600} fill={C.text}>
          Training compute (FLOP, log scale)
        </text>

        {/* thresholds */}
        <g className="ct-t25">
          <line x1={X0} x2={X1} y1={yOf(25)} y2={yOf(25)} stroke={C.warn} strokeWidth={2.5} />
          <text x={X0 + 6} y={yOf(25) - 8} fontSize={17} fontWeight={700} fill={C.warn}>
            10<tspan dy={-6}>25</tspan>
            <tspan dy={6}> FLOP · EU AI Act</tspan>
          </text>
        </g>
        <g className="ct-t26">
          <line x1={X0} x2={X1} y1={yOf(26)} y2={yOf(26)} stroke={C.active} strokeWidth={2.5} />
          <text x={X0 + 6} y={yOf(26) - 8} fontSize={17} fontWeight={700} fill={C.active}>
            10<tspan dy={-6}>26</tspan>
            <tspan dy={6}> FLOP · US reporting rules</tspan>
          </text>
        </g>

        {/* trend: solid part and dashed projection share one drawing animation */}
        <line x1={p1[0]} y1={p1[1]} x2={p3[0]} y2={p3[1]} stroke={C.primary} strokeWidth={3.5} strokeLinecap="round" className="ct-draw" mask="url(#ct-solid-mask)" />
        <g mask="url(#ct-dash-mask)">
          <line x1={p1[0]} y1={p1[1]} x2={p3[0]} y2={p3[1]} stroke={C.primarySoft} strokeWidth={3.5} strokeLinecap="round" className="ct-draw" />
        </g>
        {[A, B].map((m, i) => (
          <g key={m.label}>
            <circle cx={xOf(m.t)} cy={yOf(m.e)} r={5.5} fill={C.primary} />
            <text
              x={xOf(m.t) + 10}
              y={i === 0 ? yOf(m.e) + 20 : yOf(m.e) + 32}
              fontSize={16}
              fontWeight={700}
              fill={C.primary}
            >
              {m.label}
            </text>
          </g>
        ))}
        <text x={X1} y={yOf(26.5)} textAnchor="end" fontSize={15} fill={C.muted}>
          projection
        </text>
      </svg>
      <p className="mt-1 text-xs text-pencil/70">
        Trend line through two widely cited outside estimates (GPT-3 and GPT-4), about {perYear.toFixed(1)}× a year, close to published trend estimates of
        4–5×. Solid to mid-2025, paler beyond as a projection. The 10²⁶ line marks the reporting threshold of the 2023 US executive order (revoked in
        2025) and of some state laws.
      </p>
    </div>
  );
}
