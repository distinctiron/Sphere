"use client";

import { C } from "../kit";

/**
 * The end-to-end thread through the four paths (Learn overview).
 * Staged loop, 10s: each stage lights up in turn (≈1.6s apart) while the
 * connectors march; the static state shows all five stages in neutral colours.
 */

const STAGES = [
  { path: "A", title: "Meaning → vectors", detail: "words become directions", color: C.primary },
  { path: "B", title: "Vectors → matmuls", detail: "chips fed by memory", color: C.good },
  { path: "B", title: "Chips → watts", detail: "power in, heat out", color: C.good },
  { path: "C", title: "Model → product", detail: "a harness and a loop", color: C.warn },
  { path: "D", title: "Chain → leverage", detail: "who holds the bottleneck", color: C.active },
];

function Glyph({ index, color }: { index: number; color: string }) {
  switch (index) {
    case 0: // vector from origin
      return (
        <g>
          <line x1={-22} y1={16} x2={22} y2={16} stroke={C.line} />
          <line x1={-22} y1={16} x2={-22} y2={-22} stroke={C.line} />
          <line x1={-22} y1={16} x2={14} y2={-14} stroke={color} strokeWidth={3} strokeLinecap="round" className="thr-draw" />
          <circle cx={14} cy={-14} r={4} fill={color} />
        </g>
      );
    case 1: // grid of cores
      return (
        <g>
          {Array.from({ length: 16 }, (_, i) => (
            <rect
              key={i}
              x={-22 + (i % 4) * 12}
              y={-22 + Math.floor(i / 4) * 12}
              width={9}
              height={9}
              rx={1.5}
              fill={color}
              className="thr-core"
              style={{ animationDelay: `${(i % 4) * 0.08 + Math.floor(i / 4) * 0.08}s` }}
            />
          ))}
        </g>
      );
    case 2: // racks + bolt
      return (
        <g>
          {[-20, -6, 8].map((x) => (
            <rect key={x} x={x} y={-22} width={11} height={40} rx={1.5} fill="none" stroke={color} strokeWidth={2} />
          ))}
          {[-20, -6, 8].map((x) =>
            [-16, -8, 0, 8].map((y) => <line key={`${x}${y}`} x1={x + 3} y1={y} x2={x + 8} y2={y} stroke={color} strokeWidth={1.5} className="thr-blink" />)
          )}
          <path d="M 26 -26 L 20 -12 L 26 -12 L 20 2" fill="none" stroke={C.warn} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
      );
    case 3: // loop around a core
      return (
        <g>
          <circle r={9} fill={color} />
          <circle r={21} fill="none" stroke={color} strokeWidth={2} strokeDasharray="5 5" className="thr-spin" />
          <circle cx={21} cy={0} r={4} fill={color} className="thr-orbit" />
        </g>
      );
    default: // network of nodes with one chokepoint
      return (
        <g>
          {[
            [-20, -16],
            [-20, 14],
            [20, -16],
            [20, 14],
          ].map(([x, y]) => (
            <g key={`${x}${y}`}>
              <line x1={x} y1={y} x2={0} y2={0} stroke={C.line} strokeWidth={2} />
              <circle cx={x} cy={y} r={5} fill={C.muted} />
            </g>
          ))}
          <circle r={8} fill={color} className="thr-pulse" />
        </g>
      );
  }
}

export default function AiThreadFigure() {
  const cycle = 10;
  return (
    <div>
      <style>{`
        .thr-stage { opacity: .45; animation: thr-light ${cycle}s ease-in-out infinite; }
        @keyframes thr-light { 0%, 2% { opacity: .45 } 6%, 22% { opacity: 1 } 30%, 100% { opacity: .45 } }
        .thr-link { stroke-dasharray: 6 6; animation: thr-march 1s linear infinite; }
        @keyframes thr-march { to { stroke-dashoffset: -12 } }
        .thr-core { animation: thr-core 1.2s ease-in-out infinite alternate; }
        @keyframes thr-core { from { opacity: .35 } to { opacity: 1 } }
        .thr-blink { animation: thr-core .6s steps(2) infinite; }
        .thr-spin { transform-origin: 0 0; animation: thr-spin 6s linear infinite; }
        .thr-orbit { transform-origin: 0 0; animation: thr-spin 2.4s linear infinite; }
        @keyframes thr-spin { to { transform: rotate(360deg) } }
        .thr-pulse { transform-origin: 0 0; animation: thr-pulse 1.6s ease-in-out infinite; }
        @keyframes thr-pulse { 50% { transform: scale(1.35) } }
        .thr-draw { stroke-dasharray: 60; animation: thr-draw 3s ease-out infinite; }
        @keyframes thr-draw { 0% { stroke-dashoffset: 60 } 40%, 100% { stroke-dashoffset: 0 } }
      `}</style>

      {/* Wide screens: left to right */}
      <svg viewBox="0 0 1000 205" role="img" aria-label="Five stages from a word to geopolitics" className="hidden h-auto w-full sm:block">
        {STAGES.slice(0, -1).map((_, i) => (
          <line key={i} x1={100 + i * 200 + 48} y1={70} x2={100 + (i + 1) * 200 - 48} y2={70} stroke={C.line} strokeWidth={2} className="thr-link" />
        ))}
        {STAGES.map((stage, i) => (
          <g key={i} transform={`translate(${100 + i * 200}, 0)`} className="thr-stage" style={{ animationDelay: `${i * 1.6}s` }}>
            <circle cx={0} cy={70} r={42} fill={C.wash} stroke={stage.color} strokeWidth={2} />
            <g transform="translate(0,70)">
              <Glyph index={i} color={stage.color} />
            </g>
            <text x={0} y={140} textAnchor="middle" fontSize={14} fontWeight={700} letterSpacing="0.12em" fill={stage.color}>
              PATH {stage.path}
            </text>
            <text x={0} y={166} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.ink}>
              {stage.title}
            </text>
            <text x={0} y={192} textAnchor="middle" fontSize={17} fill={C.muted}>
              {stage.detail}
            </text>
          </g>
        ))}
      </svg>

      {/* Phones: top to bottom */}
      <svg viewBox="0 0 340 520" role="img" aria-label="Five stages from a word to geopolitics" className="block h-auto w-full sm:hidden">
        {STAGES.slice(0, -1).map((_, i) => (
          <line key={i} x1={50} y1={52 + i * 104 + 40} x2={50} y2={52 + (i + 1) * 104 - 40} stroke={C.line} strokeWidth={2} className="thr-link" />
        ))}
        {STAGES.map((stage, i) => (
          <g key={i} transform={`translate(0, ${52 + i * 104})`} className="thr-stage" style={{ animationDelay: `${i * 1.6}s` }}>
            <circle cx={50} cy={0} r={38} fill={C.wash} stroke={stage.color} strokeWidth={2} />
            <g transform="translate(50,0) scale(0.9)">
              <Glyph index={i} color={stage.color} />
            </g>
            <text x={104} y={-14} fontSize={11} fontWeight={700} letterSpacing="0.12em" fill={stage.color}>
              PATH {stage.path}
            </text>
            <text x={104} y={6} fontSize={16} fontWeight={600} fill={C.ink}>
              {stage.title}
            </text>
            <text x={104} y={27} fontSize={14} fill={C.muted}>
              {stage.detail}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
