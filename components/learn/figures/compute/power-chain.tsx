"use client";

import { C, FONT } from "../kit";

/**
 * From the grid to the chip (B7). A Sankey-style chain with a continuously flowing
 * band; losses and overheads peel off at each stage. Illustrative round numbers for
 * a modern facility with PUE ≈ 1.2 (100 units in, 83.5 reach the IT equipment):
 *   grid 100 → transformers −1.5 → UPS and distribution −3 → cooling and other
 *   facility loads −12 → IT 83.5 → rack power supplies (AC→DC) −2.5 → board
 *   converters and voltage regulators −7 → ≈ 74 reaches the silicon.
 * All 100 units end as heat. Base layer (no animation) is the full diagram.
 */

const NODES = [
  { x: 24, label: ["Grid", ""], v: "100s of kV", flow: 100 },
  { x: 142, label: ["Substation", "transformers"], v: "10–35 kV", flow: 98.5 },
  { x: 260, label: ["UPS and", "switchgear"], v: "415/480 V AC", flow: 95.5 },
  { x: 378, label: ["Racks", "(IT load)"], v: "", flow: 83.5 },
  { x: 496, label: ["Power", "supplies"], v: "≈ 50 V DC", flow: 81 },
  { x: 614, label: ["Chips", ""], v: "< 1 V", flow: 74 },
];
const LOSSES = [
  { label: "−1.5", what: "transformers" },
  { label: "−3", what: "UPS, cables" },
  { label: "−12", what: "cooling etc." },
  { label: "−2.5", what: "AC→DC" },
  { label: "−7", what: "regulators" },
];
const TOP = 58;
const K = 1.5; // px per unit
const NW = 14;
const SINK_Y = 262;

export default function PowerChainFigure() {
  return (
    <div>
      <style>{`
        .pc-flow { stroke-dasharray: 6 14; animation: pc-flow 1.4s linear infinite; }
        @keyframes pc-flow { to { stroke-dashoffset: -20 } }
      `}</style>
      <svg viewBox="0 0 680 330" role="img" aria-label="Power flowing from the grid through transformers, backup power, rack power supplies and voltage regulators to the chips, with about a quarter lost or used for cooling along the way" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Main bands */}
        {NODES.slice(0, -1).map((n, i) => {
          const next = NODES[i + 1];
          const x1 = n.x + NW;
          const x2 = next.x;
          const h = next.flow * K;
          const lossH = (n.flow - next.flow) * K;
          const mid = (x1 + x2) / 2;
          return (
            <g key={i}>
              <path d={`M ${x1} ${TOP} L ${x2} ${TOP} L ${x2} ${TOP + h} L ${x1} ${TOP + h} Z`} fill={C.primarySoft} opacity={0.55} />
              <line x1={x1} y1={TOP + h / 2} x2={x2} y2={TOP + h / 2} stroke={C.primary} strokeWidth={3} className="pc-flow" />
              {/* loss peeling off the bottom of the band */}
              <path
                d={`M ${x1} ${TOP + h} C ${mid} ${TOP + h}, ${mid - 6} ${SINK_Y - 30}, ${mid - lossH / 2} ${SINK_Y}
                    L ${mid + lossH / 2} ${SINK_Y} C ${mid + lossH / 2 + 4} ${SINK_Y - 30}, ${mid + 6} ${TOP + h + lossH}, ${x1} ${TOP + h + lossH} Z`}
                fill={C.warnSoft}
                stroke={C.warn}
                strokeWidth={0.8}
              />
              <text x={mid} y={SINK_Y + 20} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.warn} fontFamily={FONT.mono}>
                {LOSSES[i].label}
              </text>
              <text x={mid} y={SINK_Y + 38} textAnchor="middle" fontSize={13} fill={C.muted}>
                {LOSSES[i].what}
              </text>
            </g>
          );
        })}
        {/* Nodes */}
        {NODES.map((n, i) => (
          <g key={i}>
            <rect x={n.x} y={TOP} width={NW} height={n.flow * K} rx={3} fill={i === NODES.length - 1 ? C.active : C.primary} />
            <text x={n.x + NW / 2} y={20} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>
              {n.label[0]}
            </text>
            {n.label[1] && (
              <text x={n.x + NW / 2} y={36} textAnchor="middle" fontSize={13} fill={C.muted}>
                {n.label[1]}
              </text>
            )}
            <text x={n.x + NW / 2} y={TOP + n.flow * K + 16} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.primary} fontFamily={FONT.mono}>
              {n.flow}
            </text>
          </g>
        ))}
        {/* Voltage row */}
        {NODES.map((n, i) =>
          n.v ? (
            <text key={i} x={i === 0 ? 4 : n.x + NW / 2} y={322} textAnchor={i === 0 ? "start" : "middle"} fontSize={13} fill={C.text} fontFamily={FONT.mono}>
              {n.v}
            </text>
          ) : null
        )}
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Illustrative round numbers for 100 units drawn from the grid by a modern facility with a PUE of about 1.2 (100 ÷ 83.5). Bottom row: typical
        voltage at each stage. Every unit, including what reaches the chips, ends up as heat that the cooling system must remove.
      </p>
    </div>
  );
}
