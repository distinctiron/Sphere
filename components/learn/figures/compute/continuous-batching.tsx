"use client";

import { useMemo } from "react";
import { C, FONT } from "../kit";

/**
 * Static vs continuous batching (B9). Staged loop, 12 s: a cursor sweeps 24 decode
 * steps and cells appear as it passes. Four batch slots; requests R1… arrive
 * queued with output lengths [6, 14, 4, 9, 5, 7, 3, 8, 6, 5, 4, 7, 5, 6].
 * Static: a batch of 4 starts together and the next batch waits until the longest
 * finishes, so finished slots sit idle. Continuous (iteration-level scheduling):
 * a slot takes the next queued request on the step after its request finishes.
 * Counts (finished requests, busy slot-steps) are computed from the same simulation.
 * Base layer (no animation) shows both complete timelines.
 */

const LENGTHS = [6, 14, 4, 9, 5, 7, 3, 8, 6, 5, 4, 7, 5, 6];
const SLOTS = 4;
const T = 24;
const X0 = 108;
const P = 23;
const CW = 21;
const CH = 20;
const ROW = 24;
const CYCLE = 12;
const START = 0.5;
const UNIT = 0.36;

type Cell = { req: number; first: boolean; last: boolean } | null;

function simulateStatic(): Cell[][] {
  const grid: Cell[][] = Array.from({ length: SLOTS }, () => Array(T).fill(null));
  let t = 0;
  let next = 0;
  while (t < T && next < LENGTHS.length) {
    const batch = LENGTHS.slice(next, next + SLOTS).map((len, i) => ({ req: next + i, len }));
    const span = Math.max(...batch.map((b) => b.len));
    batch.forEach((b, s) => {
      for (let k = 0; k < b.len && t + k < T; k++) grid[s][t + k] = { req: b.req, first: k === 0, last: k === b.len - 1 };
    });
    next += batch.length;
    t += span;
  }
  return grid;
}

function simulateContinuous(): Cell[][] {
  const grid: Cell[][] = Array.from({ length: SLOTS }, () => Array(T).fill(null));
  const free = Array(SLOTS).fill(0);
  let next = 0;
  while (next < LENGTHS.length) {
    const s = free.indexOf(Math.min(...free));
    if (free[s] >= T) break;
    const len = LENGTHS[next];
    for (let k = 0; k < len && free[s] + k < T; k++) grid[s][free[s] + k] = { req: next, first: k === 0, last: k === len - 1 };
    free[s] += len;
    next++;
  }
  return grid;
}

const stats = (g: Cell[][]) => ({
  done: g.flat().filter((c) => c?.last).length,
  busy: g.flat().filter(Boolean).length,
});

const pct = (t: number) => ((t / CYCLE) * 100).toFixed(2);

function keyframes() {
  let css = "";
  for (let t = 0; t < T; t++) {
    const s = START + t * UNIT;
    css += `@keyframes cb-t${t} { 0%, ${pct(s)}% { opacity: 0 } ${pct(s + 0.08)}%, 95% { opacity: 1 } 99%, 100% { opacity: 0 } }
.cb-t${t} { animation: cb-t${t} ${CYCLE}s linear infinite; }\n`;
  }
  const end = START + T * UNIT;
  css += `@keyframes cb-cursor { 0%, ${pct(START)}% { transform: translateX(0); opacity: 1 } ${pct(end)}% { transform: translateX(${T * P}px); opacity: 1 } ${pct(end + 0.2)}%, 100% { transform: translateX(${T * P}px); opacity: 0 } }
.cb-cursor { opacity: 0; animation: cb-cursor ${CYCLE}s linear infinite; }`;
  return css;
}

function Lane({ grid, y, label }: { grid: Cell[][]; y: number; label: string }) {
  return (
    <g>
      <text x={8} y={y - 10} fontSize={14} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
        {label}
      </text>
      {grid.map((row, s) => (
        <g key={s}>
          <text x={8} y={y + s * ROW + 15} fontSize={13} fill={C.text}>
            slot {s + 1}
          </text>
          {row.map((c, t) => {
            const x = X0 + t * P;
            const yy = y + s * ROW;
            return (
              <g key={t}>
                <rect x={x} y={yy} width={CW} height={CH} rx={3} fill={C.wash} stroke={C.grid} />
                <g className={`cb-t${t}`}>
                  {c ? (
                    <>
                      <rect x={x} y={yy} width={CW} height={CH} rx={3} fill={c.req % 2 ? C.primarySoft : C.primary} />
                      {c.first && (
                        <text x={x + CW / 2} y={yy + 14} textAnchor="middle" fontSize={13} fontWeight={700} fill={c.req % 2 ? C.ink : "white"}>
                          {c.req + 1}
                        </text>
                      )}
                      {c.last && <circle cx={x + CW - 4} cy={yy + 4} r={3.5} fill={C.good} stroke="white" strokeWidth={1} />}
                    </>
                  ) : (
                    <rect x={x + 2} y={yy + 8} width={CW - 4} height={4} rx={2} fill={C.warnSoft} />
                  )}
                </g>
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

export default function ContinuousBatchingFigure() {
  const staticGrid = useMemo(simulateStatic, []);
  const contGrid = useMemo(simulateContinuous, []);
  const a = stats(staticGrid);
  const b = stats(contGrid);
  const top1 = 34;
  const top2 = top1 + SLOTS * ROW + 46;
  const bottom = top2 + SLOTS * ROW;
  return (
    <div>
      <style>{keyframes()}</style>
      <svg viewBox={`0 0 680 ${bottom + 30}`} role="img" aria-label={`Static batching finishes ${a.done} requests in ${T} steps with idle slots; continuous batching finishes ${b.done}`} className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <Lane grid={staticGrid} y={top1} label="STATIC BATCHING" />
        <Lane grid={contGrid} y={top2} label="CONTINUOUS BATCHING" />
        <text x={8} y={bottom + 22} fontSize={13} fill={C.muted}>
          decode steps →
        </text>
        {[6, 12, 18, 24].map((t) => (
          <text key={t} x={X0 + t * P} y={bottom + 22} textAnchor="middle" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
            {t}
          </text>
        ))}
        <g className="cb-cursor">
          <line x1={X0} y1={top1 - 4} x2={X0} y2={bottom + 4} stroke={C.active} strokeWidth={2.5} />
        </g>
      </svg>
      <div className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
        <div className="text-pencil">
          <span className="font-semibold text-ink">Static:</span> {a.done} requests finished, slots busy{" "}
          <span className="font-mono">{Math.round((a.busy / (SLOTS * T)) * 100)}%</span> of the time
        </div>
        <div className="text-pencil">
          <span className="font-semibold text-ink">Continuous:</span> {b.done} requests finished, slots busy{" "}
          <span className="font-mono">{Math.round((b.busy / (SLOTS * T)) * 100)}%</span> of the time
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span>Numbers: request IDs, in arrival order</span>
        <span className="text-emerald-700">● request finished</span>
        <span className="text-amber-600">▬ slot idle</span>
      </div>
    </div>
  );
}
