"use client";

import { C, FONT } from "../kit";

/**
 * Where a leading-edge AI chip is made (D2). Staged loop, 11 s.
 * Inputs (design, tools, materials) flow into the logic fab and the HBM
 * makers; logic dies and HBM stacks meet in advanced packaging; packaged
 * chips go to server assembly. Then the four chokepoints pulse: links with
 * one or a handful of suppliers that nobody can route around quickly.
 * Wide screens flow left to right; phones get the same graph top to bottom.
 */

const CYCLE = 11;

type NodeId = "design" | "tools" | "materials" | "fab" | "hbm" | "pack" | "servers";

const NODES: Record<NodeId, { title: string; place: string; who: string; choke: boolean; stage: number }> = {
  design: { title: "Design & EDA", place: "US (Arm: UK)", who: "Nvidia, AMD", choke: false, stage: 1 },
  tools: { title: "Tools & EUV", place: "NL · US · JP", who: "ASML: only EUV", choke: true, stage: 1 },
  materials: { title: "Materials", place: "JP · others", who: "resists, wafers", choke: false, stage: 1 },
  fab: { title: "Leading-edge fab", place: "Taiwan", who: "TSMC", choke: true, stage: 1 },
  hbm: { title: "HBM memory", place: "Korea · US", who: "SK hynix leads", choke: true, stage: 1 },
  pack: { title: "Packaging", place: "Taiwan", who: "TSMC CoWoS", choke: true, stage: 2 },
  servers: { title: "AI servers", place: "Taiwan ODMs", who: "Foxconn, Quanta", choke: false, stage: 3 },
};

const EDGES: Array<[NodeId, NodeId, number]> = [
  ["design", "fab", 1],
  ["tools", "fab", 1],
  ["materials", "fab", 1],
  ["tools", "hbm", 1],
  ["fab", "pack", 2],
  ["hbm", "pack", 2],
  ["pack", "servers", 3],
];

const NODE_H = 76;

type Layout = { w: number; h: number; dir: "right" | "down"; pos: Record<NodeId, [number, number, number]> };

const WIDE: Layout = {
  w: 680,
  h: 360,
  dir: "right",
  pos: {
    design: [4, 14, 134],
    tools: [4, 142, 134],
    materials: [4, 270, 134],
    fab: [196, 70, 134],
    hbm: [196, 214, 134],
    pack: [388, 142, 134],
    servers: [544, 142, 132],
  },
};

const PHONE: Layout = {
  w: 360,
  h: 506,
  dir: "down",
  pos: {
    design: [2, 6, 116],
    tools: [122, 6, 116],
    materials: [242, 6, 116],
    fab: [24, 144, 150],
    hbm: [186, 144, 150],
    pack: [105, 282, 150],
    servers: [105, 422, 150],
  },
};

// stage s lights up at these seconds; chokepoints pulse after the flow completes
const STAGE_AT = [0, 0.3, 3.0, 5.2];
const CHOKE_AT = 7.2;
const pc = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;

function Graph({ layout, className }: { layout: Layout; className: string }) {
  const anchor = (id: NodeId, end: "out" | "in"): [number, number] => {
    const [x, y, w] = layout.pos[id];
    if (layout.dir === "right") return end === "out" ? [x + w, y + NODE_H / 2] : [x, y + NODE_H / 2];
    return end === "out" ? [x + w / 2, y + NODE_H] : [x + w / 2, y];
  };
  return (
    <svg
      viewBox={`0 0 ${layout.w} ${layout.h}`}
      role="img"
      aria-label="Supply chain of an AI accelerator: design, tools and materials feed a leading-edge fab in Taiwan and HBM makers in Korea; both feed advanced packaging in Taiwan, then server assembly. EUV tools, the fab, HBM and packaging are chokepoints."
      className={className}
      style={{ fontFamily: FONT.sans }}
    >
      <defs>
        <marker id={`ck-arrow-${layout.dir}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.faint} />
        </marker>
      </defs>
      {EDGES.map(([a, b, stage]) => {
        const [x1, y1] = anchor(a, "out");
        const [x2, y2] = anchor(b, "in");
        const d =
          layout.dir === "right"
            ? `M ${x1} ${y1} C ${x1 + 30} ${y1}, ${x2 - 30} ${y2}, ${x2 - 2} ${y2}`
            : `M ${x1} ${y1} C ${x1} ${y1 + 26}, ${x2} ${y2 - 26}, ${x2} ${y2 - 2}`;
        return (
          <g key={`${a}-${b}`} className={`ck-s${stage}`}>
            <path d={d} fill="none" stroke={C.line} strokeWidth={2} markerEnd={`url(#ck-arrow-${layout.dir})`} />
            <path d={d} fill="none" stroke={C.primary} strokeWidth={3} className="ck-flow" />
          </g>
        );
      })}
      {(Object.keys(NODES) as NodeId[]).map((id) => {
        const n = NODES[id];
        const [x, y, w] = layout.pos[id];
        return (
          <g key={id} className={`ck-s${n.stage}`}>
            {n.choke && <rect x={x - 4} y={y - 4} width={w + 8} height={NODE_H + 8} rx={12} fill="none" stroke={C.active} strokeWidth={2.5} className="ck-choke" />}
            <rect x={x} y={y} width={w} height={NODE_H} rx={9} fill={n.choke ? "#fff1f2" : C.wash} stroke={n.choke ? C.activeSoft : C.line} />
            <text x={x + w / 2} y={y + 24} textAnchor="middle" fontSize={14} fontWeight={700} fill={n.choke ? C.active : C.ink}>
              {n.title}
            </text>
            <text x={x + w / 2} y={y + 44} textAnchor="middle" fontSize={13} fill={C.text}>
              {n.place}
            </text>
            <text x={x + w / 2} y={y + 63} textAnchor="middle" fontSize={13} fill={C.muted}>
              {n.who}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function ChokepointMapFigure() {
  const stageKeyframes = [1, 2, 3]
    .map(
      (s) => `
      .ck-s${s} { animation: ck-s${s} ${CYCLE}s ease-in-out infinite; }
      @keyframes ck-s${s} { 0%, ${pc(STAGE_AT[s])} { opacity: .25 } ${pc(STAGE_AT[s] + 0.6)}, 95% { opacity: 1 } 100% { opacity: .25 } }`
    )
    .join("\n");
  return (
    <div>
      <style>{`
        ${stageKeyframes}
        .ck-flow { stroke-dasharray: 8 10; animation: ck-flow .8s linear infinite; }
        @keyframes ck-flow { to { stroke-dashoffset: -18 } }
        .ck-choke { animation: ck-choke ${CYCLE}s ease-in-out infinite; }
        @keyframes ck-choke { 0%, ${pc(CHOKE_AT)} { opacity: 0 } ${pc(CHOKE_AT + 0.4)} { opacity: 1 } ${pc(CHOKE_AT + 1)} { opacity: .35 } ${pc(CHOKE_AT + 1.5)}, 95% { opacity: 1 } 100% { opacity: 0 } }
      `}</style>
      <Graph layout={WIDE} className="hidden h-auto w-full sm:block" />
      <Graph layout={PHONE} className="block h-auto w-full sm:hidden" />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded border-2" style={{ borderColor: C.active }} />
          chokepoint: one or a few suppliers, years to replicate
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4" style={{ background: C.primary }} />
          flow of designs, tools, wafers and dies
        </span>
      </div>
    </div>
  );
}
