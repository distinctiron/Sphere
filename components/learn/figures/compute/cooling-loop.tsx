"use client";

import { C, FONT } from "../kit";

/**
 * Direct-to-chip liquid cooling (B6). Continuous loop animation (flowing dashes).
 * Inside the rack, cold plates on each GPU pass heat into a coolant loop; a
 * coolant distribution unit (CDU) transfers it to the facility water loop; outside,
 * dry coolers or cooling towers reject it to the air.
 * Numbers: 130 kW rack. Water: Q / (c·ΔT) = 130,000 / (4,186 × 10) ≈ 3.1 kg/s ≈ 3 L/s.
 * Air: 130,000 / (1.2 kg/m³ × 1,005 J/kg·K × 15 K) ≈ 7.2 m³/s. Temperatures are
 * typical warm-water designs and vary.
 * Base layer (no animation): all loops and labels drawn, dashes static.
 */

export default function CoolingLoopFigure() {
  const trays = [0, 1, 2, 3, 4];
  return (
    <div>
      <style>{`
        .cl-flow { stroke-dasharray: 8 10; animation: cl-flow 1.2s linear infinite; }
        @keyframes cl-flow { to { stroke-dashoffset: -18 } }
        .cl-heat { animation: cl-heat 2.4s ease-in-out infinite; }
        @keyframes cl-heat { 0% { opacity: .2; transform: translateY(6px) } 50% { opacity: 1 } 100% { opacity: .2; transform: translateY(-8px) } }
      `}</style>
      <svg viewBox="0 0 680 318" role="img" aria-label="Liquid cooling: cold plates on the chips feed warm coolant to a heat exchanger, which passes the heat to a facility water loop and out to coolers outside the building" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Rack */}
        <text x={20} y={24} fontSize={14} fontWeight={700} fill={C.ink}>
          Rack
        </text>
        <rect x={20} y={36} width={150} height={236} rx={6} fill={C.wash} stroke={C.line} />
        {trays.map((k) => {
          const y = 50 + k * 44;
          return (
            <g key={k}>
              <rect x={30} y={y} width={112} height={32} rx={3} fill="white" stroke={C.grid} />
              <rect x={42} y={y + 7} width={24} height={18} rx={2} fill={C.primary} />
              <rect x={78} y={y + 7} width={24} height={18} rx={2} fill={C.primary} />
              <rect x={40} y={y + 4} width={64} height={4} rx={1} fill={C.faint} />
              {/* branch to manifolds */}
              <line x1={104} y1={y + 12} x2={150} y2={y + 12} stroke={C.primary} strokeWidth={3} />
              <line x1={104} y1={y + 22} x2={160} y2={y + 22} stroke={C.warn} strokeWidth={3} />
            </g>
          );
        })}
        <text x={95} y={290} textAnchor="middle" fontSize={13} fill={C.muted}>
          cold plates on every chip
        </text>
        {/* Rack manifolds */}
        <line x1={150} y1={52} x2={150} y2={250} stroke={C.primary} strokeWidth={4} />
        <line x1={160} y1={60} x2={160} y2={250} stroke={C.warn} strokeWidth={4} />

        {/* Technology loop: rack <-> CDU */}
        <path d="M 160 60 L 160 44 L 244 44 L 244 130 L 262 130" fill="none" stroke={C.warn} strokeWidth={5} className="cl-flow" />
        <path d="M 262 180 L 230 180 L 230 262 L 150 262 L 150 250" fill="none" stroke={C.primary} strokeWidth={5} className="cl-flow" />
        <text x={196} y={36} fontSize={13} fill={C.warn} fontWeight={600} textAnchor="middle">
          ≈ 40 °C
        </text>
        <text x={198} y={254} fontSize={13} fill={C.primary} fontWeight={600} textAnchor="middle">
          ≈ 30 °C
        </text>

        {/* CDU */}
        <rect x={262} y={112} width={112} height={86} rx={8} fill="white" stroke={C.ink} strokeWidth={1.5} />
        <text x={318} y={146} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink}>
          CDU
        </text>
        <text x={318} y={166} textAnchor="middle" fontSize={13} fill={C.muted}>
          heat exchanger
        </text>
        <text x={318} y={182} textAnchor="middle" fontSize={13} fill={C.muted}>
          + pumps
        </text>

        {/* Building wall */}
        <line x1={462} y1={20} x2={462} y2={300} stroke={C.line} strokeWidth={2} strokeDasharray="6 6" />
        <text x={454} y={300} textAnchor="end" fontSize={13} fill={C.muted}>
          inside
        </text>
        <text x={470} y={300} fontSize={13} fill={C.muted}>
          outside
        </text>

        {/* Facility loop: CDU <-> cooler */}
        <path d="M 374 130 L 540 130 L 540 110" fill="none" stroke={C.warn} strokeWidth={5} className="cl-flow" />
        <path d="M 600 110 L 600 180 L 374 180" fill="none" stroke={C.primary} strokeWidth={5} className="cl-flow" />
        <text x={418} y={120} textAnchor="middle" fontSize={13} fill={C.muted}>
          facility water
        </text>

        {/* Dry cooler / tower */}
        <rect x={520} y={62} width={100} height={48} rx={6} fill={C.wash} stroke={C.ink} strokeWidth={1.5} />
        <circle cx={552} cy={86} r={14} fill="none" stroke={C.muted} strokeWidth={2} />
        <circle cx={588} cy={86} r={14} fill="none" stroke={C.muted} strokeWidth={2} />
        <text x={570} y={214} textAnchor="middle" fontSize={13} fill={C.text}>
          dry cooler
        </text>
        <text x={570} y={230} textAnchor="middle" fontSize={13} fill={C.text}>
          or cooling tower
        </text>
        {[540, 570, 600].map((x, k) => (
          <path key={x} d={`M ${x} 54 q 6 -8 0 -16 q -6 -8 0 -16`} fill="none" stroke={C.active} strokeWidth={2.5} className="cl-heat" style={{ animationDelay: `${k * 0.5}s` }} />
        ))}
        <text x={570} y={14} textAnchor="middle" fontSize={13} fill={C.active} fontWeight={600}>
          heat to air
        </text>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        To carry away 130 kW, water warming by 10 °C needs about 3 litres per second. Air warming by 15 °C would need about 7 cubic metres
        per second through one rack. Temperatures shown are a typical warm-water design; they vary by site and equipment.
      </p>
    </div>
  );
}
