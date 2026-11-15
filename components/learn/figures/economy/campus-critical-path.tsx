"use client";

import { C, FONT } from "../kit";

/**
 * The critical path of a gigawatt campus (D6). Staged loop, 11 s.
 * A cursor sweeps six years; each workstream fills as the cursor passes.
 * Chips and buildings take one to two years; a new large grid connection
 * often takes far longer, so it sets the date the campus can run on grid
 * power. On-site generation is the bypass that brings first power forward.
 * Durations are typical ranges from public reporting, rounded; they vary a lot
 * by region and project.
 */

const CYCLE = 11;
const SWEEP = 7; // seconds for the cursor to cross six years
const YEARS = 6;
const X0 = 200;
const PX = 75; // per year
const ROW_H = 38;
const Y0 = 34;
const xOf = (t: number) => X0 + t * PX;
const at = (t: number) => 0.4 + (t / YEARS) * SWEEP;
const pc = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;

const ROWS = [
  { label: "Land & site", from: 0, to: 0.5, color: C.primary },
  { label: "Permits & approvals", from: 0.3, to: 1.5, ext: 2.5, color: C.primary },
  { label: "Grid connection", from: 0.5, to: 4, ext: 6, color: C.active, critical: true },
  { label: "On-site generation", from: 0.5, to: 2.5, color: C.good },
  { label: "Building & cooling", from: 1, to: 2.3, color: C.primary },
  { label: "Chips & racks", from: 1.8, to: 2.4, color: C.primary },
];

export default function CampusCriticalPathFigure() {
  const H = Y0 + ROWS.length * ROW_H + 62;
  const css = ROWS.map(
    (r, i) => `
    .cp-bar-${i} { transform-box: fill-box; transform-origin: 0 50%; animation: cp-bar-${i} ${CYCLE}s linear infinite; }
    @keyframes cp-bar-${i} { 0%, ${pc(at(r.from))} { transform: scaleX(0) } ${pc(at(r.ext ?? r.to))}, 95% { transform: scaleX(1) } 100% { transform: scaleX(0) } }`
  ).join("\n");
  const firstPowerOnsite = 2.5;
  const gridPower = 4;
  return (
    <div>
      <style>{`
        ${css}
        .cp-cursor { animation: cp-cursor ${CYCLE}s linear infinite; }
        @keyframes cp-cursor { 0%, ${pc(0.4)} { transform: translateX(0); opacity: 1 } ${pc(0.4 + SWEEP)} { transform: translateX(${YEARS * PX}px); opacity: 1 } ${pc(0.4 + SWEEP + 0.3)}, 100% { transform: translateX(${YEARS * PX}px); opacity: 0 } }
        .cp-mark-a { animation: cp-mark-a ${CYCLE}s ease-out infinite; }
        @keyframes cp-mark-a { 0%, ${pc(at(firstPowerOnsite))} { opacity: 0 } ${pc(at(firstPowerOnsite) + 0.3)}, 95% { opacity: 1 } 100% { opacity: 0 } }
        .cp-mark-b { animation: cp-mark-b ${CYCLE}s ease-out infinite; }
        @keyframes cp-mark-b { 0%, ${pc(at(gridPower))} { opacity: 0 } ${pc(at(gridPower) + 0.3)}, 95% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>
      <svg viewBox={`0 0 680 ${H}`} role="img" aria-label="Timeline of a gigawatt data-center campus: land, permits, buildings and chips take one to two and a half years, but a grid connection often takes four years or more; on-site generation brings first power forward to about two and a half years" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {Array.from({ length: YEARS + 1 }, (_, t) => (
          <g key={t}>
            <line x1={xOf(t)} x2={xOf(t)} y1={Y0 - 8} y2={Y0 + ROWS.length * ROW_H} stroke={C.grid} />
            <text x={xOf(t)} y={Y0 - 14} textAnchor="middle" fontSize={16} fill={C.muted}>
              {t === 0 ? "start" : `yr ${t}`}
            </text>
          </g>
        ))}
        {ROWS.map((r, i) => {
          const y = Y0 + i * ROW_H + 8;
          return (
            <g key={r.label}>
              <text x={X0 - 10} y={y + 18} textAnchor="end" fontSize={17} fontWeight={r.critical ? 700 : 500} fill={r.critical ? C.active : C.ink}>
                {r.label}
              </text>
              {r.ext && <rect x={xOf(r.from)} y={y + 4} width={xOf(r.ext) - xOf(r.from)} height={16} rx={4} fill="none" stroke={r.color} strokeDasharray="4 4" opacity={0.7} />}
              <g className={`cp-bar-${i}`}>
                <rect x={xOf(r.from)} y={y + 4} width={xOf(r.to) - xOf(r.from)} height={16} rx={4} fill={r.color} opacity={0.85} />
                {r.ext && <rect x={xOf(r.to)} y={y + 4} width={xOf(r.ext) - xOf(r.to)} height={16} rx={4} fill={r.color} opacity={0.25} />}
              </g>
            </g>
          );
        })}

        {/* milestones */}
        {[
          { t: firstPowerOnsite, label: "first power (on-site)", cls: "cp-mark-a", color: C.good, dy: 0 },
          { t: gridPower, label: "full grid power", cls: "cp-mark-b", color: C.active, dy: 20 },
        ].map((m) => {
          const yb = Y0 + ROWS.length * ROW_H;
          return (
            <g key={m.label} className={m.cls}>
              <line x1={xOf(m.t)} x2={xOf(m.t)} y1={Y0 - 4} y2={yb + 10 + m.dy} stroke={m.color} strokeWidth={2} strokeDasharray="5 4" />
              <text x={xOf(m.t)} y={yb + 28 + m.dy} textAnchor="middle" fontSize={15} fontWeight={700} fill={m.color}>
                {m.label}
              </text>
            </g>
          );
        })}

        <line x1={xOf(0)} x2={xOf(0)} y1={Y0 - 4} y2={Y0 + ROWS.length * ROW_H + 4} stroke={C.ink} strokeWidth={2} className="cp-cursor" />
      </svg>
      <p className="mt-1 text-xs text-pencil/70">
        Typical durations, rounded from public reporting; they vary widely by region. Dashed extensions show common delays: contested permits, and grid
        connections in congested regions that can take five to seven years or more.
      </p>
    </div>
  );
}
