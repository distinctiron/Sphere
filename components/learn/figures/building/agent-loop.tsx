"use client";

import { C, FONT } from "../kit";
import { appear } from "./anim";

/**
 * The agent loop and its growing context (C5). Staged loop, 12 s.
 * A marker goes round observe → think → act → check three times (3 s per lap).
 * Each lap is one model call plus one tool execution, and appends the call and
 * its result to the context (right). After the third lap the model answers
 * without a tool call, which ends the loop. Token counts are illustrative:
 * task 1,500; each step's call + result 2,000; answer 800; window 10,000.
 */

const CYCLE = 12;
const LAP = 3;
const LAPS = 3;
const CX = 190;
const CY = 172;
const RING = 104;

const STATIONS = [
  { label: "Observe", sub: "read context", x: CX, y: CY - RING },
  { label: "Think", sub: "model call", x: CX + RING, y: CY },
  { label: "Act", sub: "run tool", x: CX, y: CY + RING },
  { label: "Check", sub: "done yet?", x: CX - RING, y: CY },
];

const BAR_X = 470;
const BAR_W = 150;
const BASE = 318;
const S = 0.026; // px per token
const LIMIT = 10000;
const BLOCKS = [
  { id: "task", label: "task + tools", tokens: 1500, at: 0, color: C.grid, text: C.text },
  { id: "s1", label: "step 1", tokens: 2000, at: LAP * 0.75, color: C.primaryWash, text: C.primary },
  { id: "s2", label: "step 2", tokens: 2000, at: LAP * 1.75, color: C.primaryWash, text: C.primary },
  { id: "s3", label: "step 3", tokens: 2000, at: LAP * 2.75, color: C.primaryWash, text: C.primary },
  { id: "ans", label: "answer", tokens: 800, at: LAP * LAPS + 0.3, color: C.active, text: "white" },
];

export default function AgentLoopFigure() {
  const spin = (LAP * LAPS) / CYCLE;
  const css = [
    `.al-dot { transform-box: view-box; transform-origin: ${CX}px ${CY}px; animation: al-spin ${CYCLE}s linear infinite }`,
    `@keyframes al-spin { 0% { transform: rotate(0deg) } ${(spin * 100).toFixed(2)}%, 100% { transform: rotate(${360 * LAPS}deg) } }`,
    ...BLOCKS.filter((b) => b.at > 0).map((b) => `${appear(`al-${b.id}`, CYCLE, b.at)} .al-${b.id} { animation: al-${b.id} ${CYCLE}s linear infinite }`),
    `${appear("al-stop", CYCLE, LAP * LAPS + 0.3)} .al-stop { animation: al-stop ${CYCLE}s linear infinite }`,
  ].join("\n");

  const limitY = BASE - LIMIT * S;
  let y = BASE;

  return (
    <div>
      <style>{css}</style>
      <svg viewBox="0 0 680 340" role="img" aria-label="An agent loop: observe, think, act, check, repeated three times. Each lap appends a tool call and its result to the context, which grows towards the window limit; the loop ends when the model answers instead of calling a tool." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <marker id="al-head" viewBox="0 0 10 10" refX={5} refY={5} markerWidth={7} markerHeight={7} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.line} />
          </marker>
        </defs>
        <circle cx={CX} cy={CY} r={RING} fill="none" stroke={C.line} strokeWidth={2} />
        {/* direction arrows between stations (clockwise) */}
        {[45, 135, 225, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          const x = CX + RING * Math.sin(r);
          const yy = CY - RING * Math.cos(r);
          return <path key={a} d={`M ${x} ${yy} l ${Math.cos(r) * 0.1} ${Math.sin(r) * 0.1}`} stroke={C.line} markerEnd="url(#al-head)" />;
        })}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={13} fill={C.muted}>
          one lap =
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize={13} fill={C.muted}>
          one model call
        </text>

        {/* moving marker */}
        <g className="al-dot">
          <circle cx={CX} cy={CY - RING} r={9} fill={C.active} opacity={0.9} />
        </g>

        {STATIONS.map((s) => (
          <g key={s.label}>
            <rect x={s.x - 50} y={s.y - 22} width={100} height={44} rx={8} fill="white" stroke={s.label === "Think" ? C.primary : C.ink} strokeWidth={1.5} />
            <text x={s.x} y={s.y - 3} textAnchor="middle" fontSize={14} fontWeight={700} fill={s.label === "Think" ? C.primary : C.ink}>
              {s.label}
            </text>
            <text x={s.x} y={s.y + 14} textAnchor="middle" fontSize={13} fill={C.muted}>
              {s.sub}
            </text>
          </g>
        ))}

        {/* Context */}
        <text x={BAR_X + BAR_W / 2} y={20} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          CONTEXT
        </text>
        <line x1={BAR_X - 16} y1={limitY} x2={BAR_X + BAR_W + 16} y2={limitY} stroke={C.warn} strokeWidth={1.5} strokeDasharray="6 5" />
        <text x={BAR_X + BAR_W + 16} y={limitY - 6} textAnchor="end" fontSize={13} fill={C.warn} fontWeight={600}>
          window
        </text>
        <rect x={BAR_X - 4} y={limitY} width={BAR_W + 8} height={BASE - limitY + 4} rx={6} fill="none" stroke={C.grid} />
        {BLOCKS.map((b) => {
          const h = b.tokens * S - 2;
          y -= b.tokens * S;
          return (
            <g key={b.id} className={b.at > 0 ? `al-${b.id}` : undefined}>
              <rect x={BAR_X} y={y} width={BAR_W} height={h} rx={3} fill={b.color} stroke={b.id === "ans" ? C.active : C.line} />
              <text x={BAR_X + BAR_W / 2} y={y + h / 2 + 5} textAnchor="middle" fontSize={13} fill={b.text} fontWeight={600}>
                {b.label}
              </text>
            </g>
          );
        })}
        <text x={BAR_X + BAR_W / 2} y={limitY + 18} textAnchor="middle" fontSize={13} fill={C.active} fontWeight={700} className="al-stop">
          no tool call → stop
        </text>
      </svg>
      <p className="mt-2 text-sm text-pencil">
        Each step appends a tool call and its result (here about 2,000 tokens), and every later lap re-reads all of it. The four model calls read 1,500,
        3,500, 5,500 and 7,500 tokens: 18,000 input tokens for a context that ends at 8,300.
      </p>
    </div>
  );
}
