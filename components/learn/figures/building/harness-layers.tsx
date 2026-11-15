"use client";

import { C, FONT } from "../kit";
import { flash } from "./anim";

/**
 * The harness around a coding agent (C6). Staged loop, 12 s.
 * One lap of the agent loop drawn as a circuit. Inbound (top): the harness
 * assembles the context from the system prompt, memory files, skill index and
 * history. The model decides. Outbound (bottom): its tool call passes hooks,
 * a permission check (which may ask the human), the sandbox, then the tool;
 * the result returns through the context manager (trimming, compaction).
 * A marker travels the circuit at constant speed; each station lights as it passes.
 */

const CYCLE = 12;
const TRAVEL = 10.5;
const L = 70;
const R = 610;
const T = 84;
const B = 304;
const MID = (T + B) / 2;

// Waypoints of the circuit, starting at the context manager (left middle)
const PATH: Array<[number, number]> = [
  [L, MID],
  [L, T],
  [R, T],
  [R, B],
  [L, B],
  [L, MID],
];
const SEG = PATH.slice(1).map((p, i) => Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]));
const TOTAL = SEG.reduce((a, b) => a + b, 0);

/** Time at which the marker reaches distance d along the circuit */
const timeAt = (d: number) => (d / TOTAL) * TRAVEL;

type Station = { id: string; x: number; y: number; title: string; sub: string; dist: number; color: string };

const TOPX = [176, 294, 412, 530];
const STATIONS: Station[] = [
  { id: "ctx", x: L, y: MID, title: "Context", sub: "trim · compact", dist: 0, color: C.primary },
  ...["System prompt|role, rules", "Memory files|CLAUDE.md", "Skill index|names only", "History|task so far"].map((s, i) => {
    const [title, sub] = s.split("|");
    return { id: `in${i}`, x: TOPX[i], y: T, title, sub, dist: MID - T + (TOPX[i] - L), color: C.primary };
  }),
  { id: "model", x: R, y: MID, title: "Model", sub: "decides", dist: MID - T + (R - L) + (MID - T), color: C.active },
  ...["Hooks|your scripts", "Permissions|allow · ask · deny", "Sandbox|files, network", "Tools|Read, Edit, Bash"].map((s, i) => {
    const [title, sub] = s.split("|");
    const x = TOPX[3 - i];
    return { id: `out${i}`, x, y: B, title, sub, dist: MID - T + (R - L) + (B - T) + (R - x), color: C.ink };
  }),
];

function keyframesForMarker() {
  let d = 0;
  const stops = PATH.map((p, i) => {
    if (i > 0) d += SEG[i - 1];
    return `${((timeAt(d) / CYCLE) * 100).toFixed(2)}% { opacity: 1; transform: translate(${p[0] - L}px, ${p[1] - MID}px) }`;
  });
  return `@keyframes hl-move { ${stops.join(" ")} 100% { opacity: 1; transform: translate(0px, 0px) } }`;
}

export default function HarnessLayersFigure() {
  const perm = STATIONS.find((s) => s.id === "out1")!;
  const css = [
    keyframesForMarker(),
    `.hl-dot { opacity: 0; transform-box: view-box; animation: hl-move ${CYCLE}s linear infinite }`,
    ...STATIONS.map((s) => `${flash(`hl-${s.id}`, CYCLE, Math.max(0, timeAt(s.dist) - 0.25), 0.9)} .hl-${s.id} { opacity: 0; animation: hl-${s.id} ${CYCLE}s linear infinite }`),
    `${flash("hl-human", CYCLE, timeAt(perm.dist), 1.3)} .hl-human { opacity: 0; animation: hl-human ${CYCLE}s linear infinite }`,
  ].join("\n");

  return (
    <div>
      <style>{css}</style>
      <svg viewBox="0 0 680 396" role="img" aria-label="A coding agent's harness as a circuit. Inbound, the context is assembled from the system prompt, memory files, skill index and history, then the model decides. Outbound, its tool call passes hooks, permission checks (which may ask the human), a sandbox and the tool itself; the result returns through context management." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <text x={340} y={22} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.primary} letterSpacing="0.06em">
          INBOUND · WHAT THE MODEL READS
        </text>
        <text x={L - 50} y={B + 50} fontSize={13} fontWeight={700} fill={C.ink} letterSpacing="0.06em">
          OUTBOUND · WHAT ITS OUTPUT MAY DO
        </text>
        <rect x={L} y={T} width={R - L} height={B - T} rx={18} fill="none" stroke={C.line} strokeWidth={2} />
        {/* flow direction hints */}
        {[
          [235, T, 0],
          [R, 130, 90],
          [235, B, 180],
          [L, 128, 270],
        ].map(([x, y, a], i) => (
          <path key={i} d="M -6 -6 L 4 0 L -6 6" fill="none" stroke={C.faint} strokeWidth={2} transform={`translate(${x}, ${y}) rotate(${a})`} />
        ))}

        <g className="hl-dot">
          <circle cx={L} cy={MID} r={7} fill={C.active} stroke="white" strokeWidth={2} />
        </g>

        {/* Human, reached from the permission check */}
        <line x1={perm.x} y1={B + 23} x2={perm.x} y2={B + 60} stroke={C.line} strokeDasharray="4 4" />
        <rect x={perm.x - 58} y={B + 60} width={116} height={30} rx={15} fill="white" stroke={C.warn} strokeWidth={1.5} />
        <text x={perm.x} y={B + 80} textAnchor="middle" fontSize={13} fill={C.warn} fontWeight={600}>
          You: approve?
        </text>
        <rect x={perm.x - 62} y={B + 56} width={124} height={38} rx={19} fill="none" stroke={C.warn} strokeWidth={3} className="hl-human" />

        {STATIONS.map((s) => {
          const w = s.id === "model" ? 96 : 112;
          const h = s.id === "model" ? 60 : 46;
          return (
            <g key={s.id}>
              <rect x={s.x - w / 2} y={s.y - h / 2} width={w} height={h} rx={8} fill={s.id === "model" ? C.active : "white"} stroke={s.color} strokeWidth={1.5} />
              <text x={s.x} y={s.y - 4} textAnchor="middle" fontSize={13.5} fontWeight={700} fill={s.id === "model" ? "white" : s.color}>
                {s.title}
              </text>
              <text x={s.x} y={s.y + 14} textAnchor="middle" fontSize={13} fill={s.id === "model" ? "white" : C.muted}>
                {s.sub}
              </text>
              <rect x={s.x - w / 2 - 4} y={s.y - h / 2 - 4} width={w + 8} height={h + 8} rx={10} fill="none" stroke={C.active} strokeWidth={3} className={`hl-${s.id}`} />
            </g>
          );
        })}

      </svg>
    </div>
  );
}
