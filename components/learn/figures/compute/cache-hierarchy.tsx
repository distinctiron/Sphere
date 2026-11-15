"use client";

import { C, FONT } from "../kit";

/**
 * How long a CPU core waits for data from each level of the memory hierarchy (B1).
 * Staged loop, 10 s. Every row starts a request at the same moment; each bar grows
 * on one linear time axis (cycles) and stops when the data arrives. The add takes
 * one cycle, L1 about 4, L2 about 14, L3 about 50 and DRAM about 350 (~90 ns at
 * ~4 GHz). Values are typical of recent desktop/server cores; exact numbers vary.
 * Base layer (no animation) shows all bars at full length.
 */

const CYCLE = 10;
const START = 0.5; // s
const SPAN = 6; // s for the full 350-cycle axis
const MAX_CYCLES = 350;

const ROWS = [
  { name: "Add two numbers", detail: "1 cycle", cycles: 1 },
  { name: "L1 cache · 32–48 KB", detail: "~4 cycles", cycles: 4 },
  { name: "L2 cache · 1–2 MB", detail: "~14 cycles", cycles: 14 },
  { name: "L3 cache · tens of MB", detail: "~50 cycles", cycles: 50 },
  { name: "DRAM · tens of GB", detail: "~350 cycles ≈ 90 ns", cycles: 350 },
];

const X0 = 214;
const X1 = 670;
const Y0 = 20;
const ROW = 54;
const BAR_H = 22;
const pxPerCycle = (X1 - X0) / MAX_CYCLES;

function keyframes() {
  return ROWS.map((r, i) => {
    const s = ((START / CYCLE) * 100).toFixed(2);
    const e = (((START + (r.cycles / MAX_CYCLES) * SPAN) / CYCLE) * 100 + 0.3).toFixed(2);
    return `@keyframes ch-g${i} { 0%, ${s}% { transform: scaleX(0.001) } ${e}%, 94% { transform: scaleX(1); opacity: 1 } 99%, 100% { transform: scaleX(1); opacity: 0 } }
.ch-g${i} { transform-box: fill-box; transform-origin: left center; animation: ch-g${i} ${CYCLE}s linear infinite; }
@keyframes ch-d${i} { 0%, ${e}% { opacity: 0 } ${(Number(e) + 1).toFixed(2)}%, 94% { opacity: 1 } 99%, 100% { opacity: 0 } }
.ch-d${i} { animation: ch-d${i} ${CYCLE}s linear infinite; }`;
  }).join("\n");
}

export default function CacheHierarchyFigure() {
  const axisY = Y0 + ROWS.length * ROW + 4;
  return (
    <div>
      <style>{keyframes()}</style>
      <svg
        viewBox={`0 0 680 ${axisY + 50}`}
        role="img"
        aria-label="Bars on one time axis: an add takes 1 cycle, L1 cache about 4, L2 about 14, L3 about 50, and main memory about 350 cycles"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        {[0, 100, 200, 300].map((c) => (
          <line key={c} x1={X0 + c * pxPerCycle} y1={Y0 - 6} x2={X0 + c * pxPerCycle} y2={axisY} stroke={C.grid} />
        ))}
        {ROWS.map((r, i) => {
          const y = Y0 + i * ROW;
          const w = Math.max(r.cycles * pxPerCycle, 3);
          const last = i === ROWS.length - 1;
          return (
            <g key={r.name}>
              <text x={6} y={y + 15} fontSize={16} fontWeight={600} fill={last ? C.ink : C.text}>
                {r.name}
              </text>
              <text x={6} y={y + 35} fontSize={14} fill={C.muted} fontFamily={FONT.mono}>
                {r.detail}
              </text>
              <rect x={X0} y={y + 4} width={X1 - X0} height={BAR_H} rx={4} fill={C.wash} stroke={C.grid} />
              <rect x={X0} y={y + 4} width={w} height={BAR_H} rx={3} fill={i === 0 ? C.primary : C.active} className={`ch-g${i}`} />
              <circle cx={X0 + w + 12} cy={y + 4 + BAR_H / 2} r={6} fill={C.good} className={`ch-d${i}`} style={last ? { display: "none" } : undefined} />
              {last && (
                <text x={X1 - 10} y={y + 20} textAnchor="end" fontSize={13} fontWeight={600} fill="white" className={`ch-d${i}`}>
                  data arrives
                </text>
              )}
            </g>
          );
        })}
        <line x1={X0} y1={axisY} x2={X1} y2={axisY} stroke={C.line} />
        {[0, 100, 200, 300].map((c) => (
          <text key={c} x={X0 + c * pxPerCycle} y={axisY + 18} textAnchor="middle" fontSize={14} fill={C.muted} fontFamily={FONT.mono}>
            {c}
          </text>
        ))}
        <text x={X1} y={axisY + 40} textAnchor="end" fontSize={14} fill={C.muted}>
          time in clock cycles →
        </text>
      </svg>
      <p className="mt-2 text-xs leading-relaxed text-pencil">
        One linear time axis. In the ~350 cycles one DRAM read takes, a core that can issue about four instructions per cycle could have
        started roughly 1,400. Typical of a recent ~4 GHz desktop or server core; exact figures vary by chip.
      </p>
    </div>
  );
}
