"use client";

import { C, FONT } from "../kit";

/**
 * Circular financing (D3). Staged loop, 10 s.
 * A chip supplier invests in a lab (1); the lab commits to buy compute from a
 * cloud (2), which borrows against that contract (lenders) and buys chips
 * from the supplier (3); the supplier books revenue. Money from end customers
 * (green) is the only cash entering from outside the loop. Stylised roles;
 * real deals mix these steps in different orders and sizes.
 */

const CYCLE = 10;
const pc = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;

const NODES = {
  supplier: { x: 170, y: 64, label: "Chip supplier" },
  cloud: { x: 510, y: 64, label: "Cloud / neocloud" },
  lab: { x: 340, y: 262, label: "AI lab" },
  lenders: { x: 590, y: 262, label: "Lenders" },
  customers: { x: 90, y: 262, label: "Customers" },
} as const;

const BOX_W = 170;
const BOX_H = 46;

// paths between box edges
const P = {
  invest: "M 200 90 L 312 236", // supplier -> lab
  contract: "M 368 236 L 480 90", // lab -> cloud
  buy: "M 422 56 L 258 56", // cloud -> supplier
  lend: "M 580 238 L 536 90", // lenders -> cloud
  revenue: "M 158 262 L 252 262", // customers -> lab
};

const ends = (d: string) => d.match(/-?\d+(\.\d+)?/g)!.map(Number) as [number, number, number, number];

const FLOWS: Array<{ d: string; start: number; dur: number; color: string }> = [
  { d: P.invest, start: 0.4, dur: 1.6, color: C.active },
  { d: P.contract, start: 2.3, dur: 1.6, color: C.active },
  { d: P.lend, start: 3.1, dur: 1.4, color: C.active },
  { d: P.buy, start: 4.6, dur: 1.6, color: C.active },
];
const REV = ends(P.revenue);

export default function CircularFinancingFigure() {
  const flowCss = FLOWS.map((f, i) => {
    const [x1, y1, x2, y2] = ends(f.d);
    const a = `translate(${x1}px, ${y1}px)`;
    const b = `translate(${x2}px, ${y2}px)`;
    return `
    .cf-dot-${i} { transform: ${b}; animation: cf-move-${i} ${CYCLE}s linear infinite; opacity: 0; }
    @keyframes cf-move-${i} {
      0%, ${pc(f.start)} { transform: ${a}; opacity: 0 }
      ${pc(f.start + 0.1)} { opacity: 1 }
      ${pc(f.start + f.dur)} { transform: ${b}; opacity: 1 }
      ${pc(f.start + f.dur + 0.2)}, 100% { transform: ${b}; opacity: 0 }
    }`;
  }).join("\n");
  return (
    <div>
      <style>{`
        ${flowCss}
        .cf-rev { opacity: 0; animation: cf-rev 2.5s linear infinite; }
        @keyframes cf-rev { from { transform: translate(${REV[0]}px, ${REV[1]}px); opacity: 0 } 15% { opacity: 1 } 85% { opacity: 1 } to { transform: translate(${REV[2] - 8}px, ${REV[3]}px); opacity: 0 } }
        .cf-book { animation: cf-book ${CYCLE}s ease-in-out infinite; }
        @keyframes cf-book { 0%, ${pc(6.2)} { opacity: 0 } ${pc(6.6)}, 94% { opacity: 1 } 100% { opacity: 0 } }
        .cf-march { stroke-dasharray: 7 7; animation: cf-march 1s linear infinite; }
        @keyframes cf-march { to { stroke-dashoffset: -14 } }
      `}</style>
      <svg viewBox="0 0 680 330" role="img" aria-label="A loop: a chip supplier invests in an AI lab, the lab commits to buy compute from a cloud, the cloud borrows against that contract and buys chips from the supplier. Customer revenue is the only money entering from outside." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <marker id="cf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.faint} />
          </marker>
          <marker id="cf-arrow-good" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.good} />
          </marker>
        </defs>

        {/* loop edges */}
        {[P.invest, P.contract, P.buy, P.lend].map((d) => (
          <path key={d} d={d} fill="none" stroke={C.line} strokeWidth={2.5} markerEnd="url(#cf-arrow)" />
        ))}
        <path d={P.revenue} fill="none" stroke={C.good} strokeWidth={2.5} className="cf-march" markerEnd="url(#cf-arrow-good)" />

        {/* edge labels */}
        <text x={340} y={40} textAnchor="middle" fontSize={16} fill={C.text}>
          ③ buys chips
        </text>
        <text x={214} y={170} textAnchor="end" fontSize={16} fill={C.text}>
          ① invests equity
        </text>
        <text x={446} y={168} fontSize={16} fill={C.text}>
          ② commits to
        </text>
        <text x={446} y={188} fontSize={16} fill={C.text}>
          buy compute
        </text>
        <text x={622} y={160} textAnchor="middle" fontSize={15} fill={C.muted}>
          lends against
        </text>
        <text x={622} y={179} textAnchor="middle" fontSize={15} fill={C.muted}>
          the contract
        </text>
        <text x={205} y={298} textAnchor="middle" fontSize={15} fill={C.good}>
          pays for AI
        </text>

        {/* nodes */}
        {Object.entries(NODES).map(([id, n]) => {
          const outside = id === "customers" || id === "lenders";
          return (
            <g key={id}>
              <rect
                x={n.x - (outside ? 65 : BOX_W / 2)}
                y={n.y - BOX_H / 2}
                width={outside ? 130 : BOX_W}
                height={BOX_H}
                rx={10}
                fill={id === "customers" ? "#ecfdf5" : outside ? C.wash : C.primaryWash}
                stroke={id === "customers" ? C.goodSoft : outside ? C.line : C.primarySoft}
              />
              <text x={n.x} y={n.y + 6} textAnchor="middle" fontSize={17} fontWeight={700} fill={id === "customers" ? C.good : outside ? C.text : C.primary}>
                {n.label}
              </text>
            </g>
          );
        })}

        {/* moving money */}
        {FLOWS.map((f, i) => (
          <circle key={i} r={7} cx={0} cy={0} fill={f.color} className={`cf-dot-${i}`} />
        ))}
        <circle r={6} cx={0} cy={0} fill={C.good} className="cf-rev" />

        {/* revenue booked */}
        <g className="cf-book">
          <rect x={90} y={100} width={160} height={28} rx={6} fill={C.active} />
          <text x={170} y={119} textAnchor="middle" fontSize={15} fontWeight={700} fill="white">
            revenue booked
          </text>
        </g>
      </svg>
      <p className="mt-1 text-xs text-pencil/70">
        Stylised roles. Real deals combine these steps in different orders: equity for chips, chips as loan collateral, capacity guarantees. The green
        flow, money from end customers, is the only cash entering from outside the loop.
      </p>
    </div>
  );
}
