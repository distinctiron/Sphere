"use client";

import { C, FONT } from "../kit";

/**
 * Hyperscaler capex (D3). Staged loop, 9 s: the bars grow year by year.
 * Combined capital expenditure of Microsoft, Alphabet, Amazon and Meta,
 * calendar years, rounded to the nearest ~$50bn from company reports
 * (Microsoft includes finance leases). 2026 is the mid-point of guidance and
 * analyst estimates given in early 2026, not an outcome. All capex, not only AI.
 */

const CYCLE = 9;
const DATA = [
  { year: "2022", value: 150 },
  { year: "2023", value: 150 },
  { year: "2024", value: 250 },
  { year: "2025", value: 400 },
  { year: "2026", value: 650, guidance: true },
];

const W = 680;
const H = 330;
const BASE = 270;
const MAXV = 700;
const PLOT_H = 220;
const scale = (v: number) => (v / MAXV) * PLOT_H;
const pc = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;

export default function CapexBarsFigure() {
  const barW = 84;
  const gap = (W - 120 - DATA.length * barW) / (DATA.length - 1);
  const x = (i: number) => 90 + i * (barW + gap);
  return (
    <div>
      <style>{`
        .cx-bar { transform-box: fill-box; transform-origin: 50% 100%; animation-duration: ${CYCLE}s; animation-iteration-count: infinite; animation-timing-function: ease-out; }
        .cx-label { animation-duration: ${CYCLE}s; animation-iteration-count: infinite; }
        ${DATA.map(
          (_, i) => `
          @keyframes cx-grow-${i} { 0%, ${pc(0.3 + i * 1.1)} { transform: scaleY(0) } ${pc(1.2 + i * 1.1)}, 94% { transform: scaleY(1) } 100% { transform: scaleY(0) } }
          @keyframes cx-show-${i} { 0%, ${pc(0.9 + i * 1.1)} { opacity: 0 } ${pc(1.3 + i * 1.1)}, 94% { opacity: 1 } 100% { opacity: 0 } }`
        ).join("\n")}
      `}</style>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Combined capital expenditure of Microsoft, Alphabet, Amazon and Meta: about 150 billion dollars in 2022 and 2023, about 250 in 2024, about 400 in 2025, and guidance of about 650 for 2026" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <pattern id="cx-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill={C.primarySoft} />
            <line x1="0" y1="0" x2="0" y2="8" stroke={C.primary} strokeWidth="3" />
          </pattern>
        </defs>
        {[0, 200, 400, 600].map((v) => (
          <g key={v}>
            <line x1={74} x2={W - 16} y1={BASE - scale(v)} y2={BASE - scale(v)} stroke={v === 0 ? C.line : C.grid} />
            <text x={66} y={BASE - scale(v) + 6} textAnchor="end" fontSize={16} fill={C.muted}>
              {v === 0 ? "0" : `$${v}bn`}
            </text>
          </g>
        ))}
        {DATA.map((d, i) => {
          const h = scale(d.value);
          return (
            <g key={d.year}>
              <rect
                x={x(i)}
                y={BASE - h}
                width={barW}
                height={h}
                rx={4}
                fill={d.guidance ? "url(#cx-hatch)" : C.primary}
                className="cx-bar"
                style={{ animationName: `cx-grow-${i}` }}
              />
              <text x={x(i) + barW / 2} y={BASE - h - 10} textAnchor="middle" fontSize={20} fontWeight={700} fill={C.ink} className="cx-label" style={{ animationName: `cx-show-${i}` }}>
                ~${d.value}bn
              </text>
              <text x={x(i) + barW / 2} y={BASE + 24} textAnchor="middle" fontSize={18} fontWeight={600} fill={C.text}>
                {d.year}
              </text>
              {d.guidance && (
                <text x={x(i) + barW / 2} y={BASE + 46} textAnchor="middle" fontSize={16} fill={C.muted}>
                  guidance
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-xs text-pencil/70">
        Rounded to the nearest ~$50bn; Microsoft figures include finance leases; company definitions differ. 2026 is guidance as given in early 2026; later revisions are not shown.
      </p>
    </div>
  );
}
