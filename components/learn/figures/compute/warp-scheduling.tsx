"use client";

import { C, FONT } from "../kit";

/**
 * Latency hiding on a GPU streaming multiprocessor (B2). Staged loop, 11 s.
 * Each warp alternates 2 time units of arithmetic with 6 units waiting for a
 * memory load. Alone, a warp keeps the arithmetic units busy 2/8 = 25% of the
 * time. With 4 resident warps staggered by 2 units, the scheduler always has a
 * ready warp, so the arithmetic units are busy 100% of the time: warps needed
 * = 1 + wait / compute = 1 + 6 / 2 = 4. A cursor sweeps time; cells appear as it passes.
 * Base layer (no animation) shows the complete timelines.
 */

const CYCLE = 11;
const START = 0.5;
const UNIT = 0.5; // s per time unit
const T = 16;
const X0 = 176;
const PITCH = 30;
const CW = 28;
const CH = 22;

const pct = (t: number) => ((t / CYCLE) * 100).toFixed(2);
const computes = (offset: number, t: number) => t >= offset && (t - offset) % 8 < 2;

function keyframes() {
  let css = "";
  for (let t = 0; t < T; t++) {
    const s = START + t * UNIT;
    css += `@keyframes ws-t${t} { 0%, ${pct(s)}% { opacity: 0 } ${pct(s + 0.12)}%, 94% { opacity: 1 } 99%, 100% { opacity: 0 } }
.ws-t${t} { animation: ws-t${t} ${CYCLE}s linear infinite; }\n`;
  }
  const end = START + T * UNIT;
  css += `@keyframes ws-cursor { 0%, ${pct(START)}% { transform: translateX(0); opacity: 1 } ${pct(end)}% { transform: translateX(${T * PITCH}px); opacity: 1 } ${pct(end + 0.3)}%, 100% { transform: translateX(${T * PITCH}px); opacity: 0 } }
.ws-cursor { opacity: 0; animation: ws-cursor ${CYCLE}s linear infinite; }
@keyframes ws-sum { 0%, ${pct(end)}% { opacity: 0 } ${pct(end + 0.2)}%, 94% { opacity: 1 } 99%, 100% { opacity: 0 } }
.ws-sum { animation: ws-sum ${CYCLE}s linear infinite; }\n`;
  return css;
}

function Row({ y, label, offset, busy, bold }: { y: number; label: string; offset?: number; busy?: number[]; bold?: boolean }) {
  return (
    <g>
      <text x={8} y={y + 16} fontSize={14} fill={bold ? C.ink : C.text} fontWeight={bold ? 700 : 400}>
        {label}
      </text>
      {Array.from({ length: T }, (_, t) => {
        const x = X0 + t * PITCH;
        const isBusyRow = busy !== undefined;
        const on = isBusyRow ? busy.some((o) => computes(o, t)) : computes(offset!, t);
        return (
          <g key={t}>
            <rect x={x} y={y} width={CW} height={CH} rx={3} fill={C.wash} stroke={C.grid} />
            {on ? (
              <rect x={x} y={y} width={CW} height={CH} rx={3} fill={isBusyRow ? C.good : C.primary} className={`ws-t${t}`} />
            ) : (
              !isBusyRow && <rect x={x + 1} y={y + 8} width={CW - 2} height={6} rx={3} fill={C.warnSoft} className={`ws-t${t}`} />
            )}
          </g>
        );
      })}
    </g>
  );
}

export default function WarpSchedulingFigure() {
  const top = 38;
  const secondTop = 150;
  const axisY = secondTop + 5 * 30 + 6;
  return (
    <div>
      <style>{keyframes()}</style>
      <svg
        viewBox={`0 0 680 ${axisY + 30}`}
        role="img"
        aria-label="Timelines: one warp alone keeps the arithmetic units busy a quarter of the time; four warps taking turns keep them busy all the time"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        <text x={8} y={22} fontSize={14} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          ONE WARP ALONE
        </text>
        <Row y={top} label="warp A" offset={0} />
        <Row y={top + 30} label="arithmetic busy" busy={[0]} bold />
        <text x={X0 + T * PITCH} y={top + 30 + 44} textAnchor="end" fontSize={14} fontWeight={700} fill={C.warn} className="ws-sum">
          busy 25% of the time
        </text>

        <text x={8} y={secondTop - 16} fontSize={14} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          FOUR WARPS TAKE TURNS
        </text>
        {["A", "B", "C", "D"].map((w, i) => (
          <Row key={w} y={secondTop + i * 30} label={`warp ${w}`} offset={i * 2} />
        ))}
        <Row y={secondTop + 4 * 30} label="arithmetic busy" busy={[0, 2, 4, 6]} bold />
        <text x={X0 + T * PITCH} y={axisY + 22} textAnchor="end" fontSize={14} fontWeight={700} fill={C.good} className="ws-sum">
          busy 100% of the time
        </text>
        <text x={8} y={axisY + 22} fontSize={13} fill={C.muted}>
          time →
        </text>

        {/* Sweeping cursor */}
        <g className="ws-cursor">
          <line x1={X0} y1={top - 6} x2={X0} y2={axisY} stroke={C.active} strokeWidth={2.5} />
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span className="text-[#2b6ec4]">■ warp doing arithmetic</span>
        <span className="text-amber-600">▬ warp waiting for memory</span>
        <span className="text-emerald-700">■ arithmetic units in use</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Each warp computes for 2 time units, then waits 6 for a load. Warps needed to stay busy = 1 + wait ÷ compute = 4. Real memory waits are
        hundreds of cycles, so an SM keeps dozens of warps resident (up to 64 on an H100).
      </p>
    </div>
  );
}
