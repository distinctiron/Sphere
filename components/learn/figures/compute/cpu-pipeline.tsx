"use client";

import { C, FONT } from "../kit";

/**
 * A five-stage CPU pipeline with one mispredicted branch (B1). Staged loop, 12 s.
 * Columns are clock cycles, revealed one per 0.75 s. Stages: F fetch, D decode,
 * X execute, M memory, W write back. I3 is a branch; the core guesses and keeps
 * fetching (I4, I5). The branch resolves in X at cycle 5, the guess was wrong,
 * so I4 and I5 are squashed and fetching restarts at the correct target (I6)
 * in cycle 6. Two cycles of work are lost (no instruction completes in 8 and 9).
 * Base layer (no animation) is the complete final diagram.
 */

const CYCLE = 12;
const COLS = 11;
const X0 = 124;
const PITCH = 50;
const CELL_W = 44;
const Y0 = 54;
const ROW = 34;
const CELL_H = 26;
const STAGES = ["F", "D", "X", "M", "W"];

type Kind = "ok" | "branch" | "wrong";
const ROWS: Array<{ label: string; start: number; kind: Kind; len: number }> = [
  { label: "I1 add", start: 1, kind: "ok", len: 5 },
  { label: "I2 load", start: 2, kind: "ok", len: 5 },
  { label: "I3 branch", start: 3, kind: "branch", len: 5 },
  { label: "I4 guess", start: 4, kind: "wrong", len: 2 },
  { label: "I5 guess", start: 5, kind: "wrong", len: 1 },
  { label: "I6 correct", start: 6, kind: "ok", len: 5 },
  { label: "I7 correct", start: 7, kind: "ok", len: 5 },
];
const DONE = [5, 6, 7, 10, 11];
const LOST = [8, 9];
const SQUASH_CYCLE = 6;

/** Time (as % of the loop) at which clock cycle c is revealed */
const revealPct = (c: number) => ((0.4 + (c - 1) * 0.75) / CYCLE) * 100;
const colX = (c: number) => X0 + (c - 1) * PITCH;

function keyframes() {
  let css = "";
  for (let c = 1; c <= COLS; c++) {
    const s = revealPct(c).toFixed(2);
    const e = (revealPct(c) + 2).toFixed(2);
    css += `@keyframes cp-c${c} { 0%, ${s}% { opacity: 0 } ${e}%, 93% { opacity: 1 } 100% { opacity: 0 } }\n.cp-c${c} { animation: cp-c${c} ${CYCLE}s linear infinite; }\n`;
  }
  return css;
}

export default function CpuPipelineFigure() {
  const doneY = Y0 + ROWS.length * ROW + 14;
  return (
    <div>
      <style>{keyframes()}</style>
      <svg
        viewBox={`0 0 ${X0 + COLS * PITCH + 6} ${doneY + 44}`}
        role="img"
        aria-label="Pipeline diagram: seven instructions overlap across eleven clock cycles; a mispredicted branch squashes two guessed instructions and costs two cycles"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        {/* Cycle header */}
        <text x={8} y={32} fontSize={13} fill={C.muted}>
          clock cycle
        </text>
        {Array.from({ length: COLS }, (_, i) => (
          <text key={i} x={colX(i + 1) + CELL_W / 2} y={32} textAnchor="middle" fontSize={14} fill={C.muted} fontFamily={FONT.mono}>
            {i + 1}
          </text>
        ))}
        {/* Column guides */}
        {Array.from({ length: COLS }, (_, i) => (
          <rect key={i} x={colX(i + 1) - 3} y={Y0 - 8} width={PITCH} height={ROWS.length * ROW + 4} fill={i % 2 ? C.wash : "white"} />
        ))}

        {ROWS.map((row, r) => {
          const y = Y0 + r * ROW;
          return (
            <g key={row.label}>
              <text x={8} y={y + 19} fontSize={16} fill={row.kind === "wrong" ? C.warn : C.text} fontWeight={row.kind === "branch" ? 700 : 400}>
                {row.label}
              </text>
              {Array.from({ length: row.len }, (_, s) => {
                const c = row.start + s;
                if (c > COLS) return null;
                const x = colX(c);
                const resolves = row.kind === "branch" && STAGES[s] === "X";
                return (
                  <g key={s} className={`cp-c${c}`}>
                    <rect
                      x={x}
                      y={y}
                      width={CELL_W}
                      height={CELL_H}
                      rx={5}
                      fill={row.kind === "wrong" ? C.primarySoft : resolves ? C.active : C.primary}
                    />
                    <text x={x + CELL_W / 2} y={y + 18} textAnchor="middle" fontSize={16} fontWeight={700} fill="white" fontFamily={FONT.mono}>
                      {STAGES[s]}
                    </text>
                    {row.kind === "wrong" && (
                      <g className={`cp-c${SQUASH_CYCLE}`}>
                        <rect x={x} y={y} width={CELL_W} height={CELL_H} rx={5} fill={C.warnSoft} />
                        <line x1={x + 6} y1={y + CELL_H - 6} x2={x + CELL_W - 6} y2={y + 6} stroke={C.warn} strokeWidth={2.5} />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Mispredict callout, appears when the branch resolves */}
        <g className={`cp-c${SQUASH_CYCLE}`}>
          <text x={colX(7) + 4} y={Y0 + 3 * ROW + 18} fontSize={14} fontWeight={700} fill={C.warn}>
            wrong guess: flushed
          </text>
        </g>

        {/* Completion row */}
        <text x={8} y={doneY + 20} fontSize={16} fill={C.text} fontWeight={700}>
          finished
        </text>
        {DONE.map((c) => (
          <g key={c} className={`cp-c${c}`}>
            <circle cx={colX(c) + CELL_W / 2} cy={doneY + 15} r={10} fill={C.good} />
            <path d={`M ${colX(c) + CELL_W / 2 - 5} ${doneY + 15} l 3.5 4 l 6.5 -8`} fill="none" stroke="white" strokeWidth={2.2} />
          </g>
        ))}
        {LOST.map((c) => (
          <g key={c} className={`cp-c${c}`}>
            <circle cx={colX(c) + CELL_W / 2} cy={doneY + 15} r={10} fill="none" stroke={C.warn} strokeWidth={2} strokeDasharray="3 3" />
          </g>
        ))}
        <g className={`cp-c${LOST[1]}`}>
          <text x={colX(LOST[0]) + PITCH} y={doneY + 42} textAnchor="middle" fontSize={13} fill={C.warn}>
            2 lost cycles
          </text>
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span>
          <span className="font-mono font-semibold text-pencil">F</span> fetch · <span className="font-mono font-semibold text-pencil">D</span> decode ·{" "}
          <span className="font-mono font-semibold text-pencil">X</span> execute · <span className="font-mono font-semibold text-pencil">M</span> memory ·{" "}
          <span className="font-mono font-semibold text-pencil">W</span> write result
        </span>
        <span className="text-rose-600">■ branch outcome known</span>
        <span className="text-amber-600">■ work thrown away</span>
      </div>
    </div>
  );
}
