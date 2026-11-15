"use client";

import { C, FONT } from "../kit";

/**
 * Export controls as edits to the flow map (D7). Staged loop, 12 s.
 * Stage 1: open flows of tools, chips and memory into China.
 * Stage 2: controls cut the flows at the leading edge (EUV and advanced
 *   DUV tools, top accelerators, HBM); only downgraded chips pass, thinly.
 * Stage 3: responses. China builds a domestic loop (domestic fabs → Huawei
 *   Ascend → labs), leaks appear (third countries, remote cloud access), and
 *   China controls minerals the other side needs.
 * The base (no animation) layer shows the end state.
 */

const CYCLE = 12;
const S2 = 3.6;
const S3 = 7.4;
const pc = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;

const LEFT = [
  { id: "tools", label: "Chipmaking tools", sub: "NL · JP · US", y: 34 },
  { id: "gpus", label: "Top AI chips", sub: "US design, Taiwan-made", y: 116 },
  { id: "hbm", label: "HBM memory", sub: "Korea · US", y: 198 },
];
const RIGHT = [
  { id: "fabs", label: "Domestic fabs", sub: "SMIC and others", y: 34 },
  { id: "ascend", label: "Domestic chips", sub: "Huawei Ascend, others", y: 116 },
  { id: "labs", label: "Chinese AI labs", sub: "and clouds", y: 198 },
];
const BOX_W = 200;
const BOX_H = 56;
const LX = 8;
const RX = 468;
const GATE = 338;

// open flows: [from left y, to right y]
const OPEN: Array<[number, number]> = [
  [34, 34], // tools -> fabs
  [116, 198], // gpus -> labs
  [198, 116], // hbm -> ascend
];

export default function ControlledFlowsFigure() {
  const mid = (y: number) => y + BOX_H / 2;
  return (
    <div>
      <style>{`
        .cf2-open { animation: cf2-open ${CYCLE}s ease-in-out infinite; opacity: .18; }
        @keyframes cf2-open { 0%, ${pc(S2)} { opacity: 1 } ${pc(S2 + 0.6)}, 100% { opacity: .18 } }
        .cf2-flow { stroke-dasharray: 9 9; animation: cf2-march .8s linear infinite; }
        @keyframes cf2-march { to { stroke-dashoffset: -18 } }
        .cf2-s2 { animation: cf2-s2 ${CYCLE}s ease-in-out infinite; }
        @keyframes cf2-s2 { 0%, ${pc(S2)} { opacity: 0 } ${pc(S2 + 0.5)}, 96% { opacity: 1 } 100% { opacity: 0 } }
        .cf2-s3 { animation: cf2-s3 ${CYCLE}s ease-in-out infinite; }
        @keyframes cf2-s3 { 0%, ${pc(S3)} { opacity: 0 } ${pc(S3 + 0.5)}, 96% { opacity: 1 } 100% { opacity: 0 } }
        .cf2-cap1 { animation: cf2-cap1 ${CYCLE}s ease-in-out infinite; }
        @keyframes cf2-cap1 { 0%, ${pc(S2 - 0.2)} { opacity: 1 } ${pc(S2 + 0.3)}, 100% { opacity: .35 } }
        .cf2-cap2 { animation: cf2-cap2 ${CYCLE}s ease-in-out infinite; }
        @keyframes cf2-cap2 { 0%, ${pc(S2 - 0.2)} { opacity: .35 } ${pc(S2 + 0.3)}, ${pc(S3 - 0.2)} { opacity: 1 } ${pc(S3 + 0.3)}, 100% { opacity: .35 } }
        .cf2-cap3 { animation: cf2-cap3 ${CYCLE}s ease-in-out infinite; }
        @keyframes cf2-cap3 { 0%, ${pc(S3 - 0.2)} { opacity: .35 } ${pc(S3 + 0.3)}, 97% { opacity: 1 } 100% { opacity: .35 } }
      `}</style>
      <svg viewBox="0 0 680 400" role="img" aria-label="Flows of tools, chips and memory into China are cut by export controls at the leading edge; China responds with a domestic chain, leaks through third countries and remote access, and its own controls on minerals" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <marker id="cf2-a-p" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.primary} />
          </marker>
          <marker id="cf2-a-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.good} />
          </marker>
          <marker id="cf2-a-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.warn} />
          </marker>
          <marker id="cf2-a-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.active} />
          </marker>
        </defs>

        {/* China region */}
        <rect x={RX - 12} y={14} width={680 - RX + 8} height={272} rx={14} fill="#fff1f2" opacity={0.6} stroke={C.activeSoft} strokeDasharray="6 5" />
        <text x={RX} y={278} fontSize={15} fontWeight={700} letterSpacing="0.08em" fill={C.active}>
          CHINA
        </text>

        {/* stage 1: open flows (fade once controls land) */}
        {OPEN.map(([a, b]) => (
          <g key={`${a}-${b}`} className="cf2-open">
            <path d={`M ${LX + BOX_W} ${mid(a)} C ${GATE} ${mid(a)}, ${GATE} ${mid(b)}, ${RX - 4} ${mid(b)}`} fill="none" stroke={C.primary} strokeWidth={3} className="cf2-flow" markerEnd="url(#cf2-a-p)" />
          </g>
        ))}

        {/* stage 2: the controls */}
        <g className="cf2-s2">
          <line x1={GATE} x2={GATE} y1={22} y2={258} stroke={C.ink} strokeWidth={3} />
          <text x={GATE} y={15} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
            controls
          </text>
          {OPEN.map(([a, b]) => {
            const y = (mid(a) + mid(b)) / 2;
            return (
              <g key={`${a}-${b}`} stroke={C.ink} strokeWidth={3} strokeLinecap="round">
                <line x1={GATE - 9} y1={y - 9} x2={GATE + 9} y2={y + 9} />
                <line x1={GATE + 9} y1={y - 9} x2={GATE - 9} y2={y + 9} />
              </g>
            );
          })}
          {/* downgraded chips still pass, thinly */}
          <path d={`M ${LX + BOX_W} ${mid(116) + 14} C ${GATE - 40} ${mid(116) + 14}, ${GATE + 40} ${mid(198) - 16}, ${RX - 4} ${mid(198) - 16}`} fill="none" stroke={C.primarySoft} strokeWidth={1.8} strokeDasharray="3 4" markerEnd="url(#cf2-a-p)" />
        </g>

        {/* stage 3: responses */}
        <g className="cf2-s3">
          {/* domestic loop */}
          <path d={`M ${RX + BOX_W / 2} ${34 + BOX_H} L ${RX + BOX_W / 2} ${116 - 3}`} stroke={C.good} strokeWidth={3} markerEnd="url(#cf2-a-g)" className="cf2-flow" />
          <path d={`M ${RX + BOX_W / 2} ${116 + BOX_H} L ${RX + BOX_W / 2} ${198 - 3}`} stroke={C.good} strokeWidth={3} markerEnd="url(#cf2-a-g)" className="cf2-flow" />
          {/* leaks via third countries and remote access */}
          <path d={`M ${LX + BOX_W / 2} ${198 + BOX_H} C ${LX + BOX_W / 2} 340, 234 350, 246 350`} fill="none" stroke={C.active} strokeWidth={2} strokeDasharray="6 5" />
          <rect x={246} y={330} width={184} height={40} rx={8} fill="white" stroke={C.activeSoft} />
          <text x={338} y={356} textAnchor="middle" fontSize={15} fill={C.active}>
            third countries, cloud
          </text>
          <path d={`M 430 350 C 520 350, ${RX + BOX_W / 2} 330, ${RX + BOX_W / 2} ${198 + BOX_H + 4}`} fill="none" stroke={C.active} strokeWidth={2} strokeDasharray="6 5" markerEnd="url(#cf2-a-r)" />
          {/* counter-controls on minerals */}
          <path d={`M ${RX - 14} 272 L ${LX + BOX_W + 24} 272`} fill="none" stroke={C.warn} strokeWidth={3} markerEnd="url(#cf2-a-w)" />
          <text x={(RX + LX + BOX_W) / 2 - 6} y={296} textAnchor="middle" fontSize={15} fill={C.warn}>
            gallium, germanium, rare earths (licensed)
          </text>
        </g>

        {/* nodes */}
        {[...LEFT.map((n) => ({ ...n, x: LX })), ...RIGHT.map((n) => ({ ...n, x: RX }))].map((n) => (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={BOX_W} height={BOX_H} rx={9} fill={C.wash} stroke={C.line} />
            <text x={n.x + BOX_W / 2} y={n.y + 24} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
              {n.label}
            </text>
            <text x={n.x + BOX_W / 2} y={n.y + 45} textAnchor="middle" fontSize={15} fill={C.muted}>
              {n.sub}
            </text>
          </g>
        ))}
      </svg>
      <ol className="mt-2 space-y-1 text-sm text-pencil">
        <li className="cf2-cap1">
          <span className="font-semibold text-[#2b6ec4]">1 · Open flows.</span> Tools, top chips and memory are sold into China like anywhere else.
        </li>
        <li className="cf2-cap2">
          <span className="font-semibold text-ink">2 · Controls (2022 onward).</span> Leading-edge tools, top accelerators and HBM are cut off;
          only downgraded chips pass, and even those are licensed on and off.
        </li>
        <li className="cf2-cap3">
          <span className="font-semibold text-emerald-700">3 · Responses.</span> A domestic chain (fabs → domestic accelerators → labs), leaks through
          third countries and remote cloud access, and <span className="text-amber-700">counter-controls on minerals</span> the other side needs.
        </li>
      </ol>
    </div>
  );
}
