"use client";

import { C, FONT } from "../kit";

/**
 * The chain rule as a nudge travelling down a chain (A3). Staged loop, 11 s.
 * x = 2 → y = 3x = 6 → z = y² = 36 → L = z/2 = 18.
 * Local slopes: dy/dx = 3, dz/dy = 2y = 12, dL/dz = 0.5, so dL/dx = 18.
 * A nudge of +0.01 in x becomes +0.03 in y, ≈ +0.36 in z (exactly 0.3609)
 * and ≈ +0.18 in L (exactly 0.18045): sensitivities multiply.
 * Base layer shows every value in neutral tones (meaningful without motion);
 * overlays light up stage by stage.
 */

const CYCLE = 11;
const HOLD_END = 10.2;
const FADE_END = 10.8;

const NODES = [
  { cx: 85, text: "x = 2", nudge: "+0.01" },
  { cx: 255, text: "y = 3x = 6", nudge: "+0.03" },
  { cx: 425, text: "z = y² = 36", nudge: "≈ +0.36" },
  { cx: 595, text: "L = z/2 = 18", nudge: "≈ +0.18" },
];
const LINKS = [
  { name: "dy/dx", gain: "×3" },
  { name: "dz/dy = 2y", gain: "×12" },
  { name: "dL/dz", gain: "×0.5" },
];
const BOX_W = 132;
const BOX_Y = 70;
const BOX_H = 54;

// Stage start times (s): nudge x, link 1, nudge y, link 2, nudge z, link 3, nudge L, total
const T = [0.4, 1.4, 2.2, 3.2, 4.0, 5.0, 5.8, 7.0];

const pct = (s: number) => ((s / CYCLE) * 100).toFixed(2);
const keyframes = T.map(
  (t, i) => `@keyframes cr-s${i} { 0%, ${pct(t)}% { opacity: 0 } ${pct(t + 0.35)}%, ${pct(HOLD_END)}% { opacity: 1 } ${pct(FADE_END)}%, 100% { opacity: 0 } }
.cr-s${i} { opacity: 0; animation: cr-s${i} ${CYCLE}s ease-out infinite; }`
).join("\n");

export default function ChainRuleFigure() {
  return (
    <div>
      <style>{keyframes}</style>
      <svg viewBox="0 0 680 250" role="img" aria-label="A nudge of 0.01 in x travels through y = 3x, z = y squared and L = z over 2, multiplied by each local slope: 3, then 12, then 0.5, giving 0.18 at the end" className="hidden h-auto w-full sm:block" style={{ fontFamily: FONT.sans }}>
        {/* Links */}
        {LINKS.map((l, i) => {
          const x1 = NODES[i].cx + BOX_W / 2 + 4;
          const x2 = NODES[i + 1].cx - BOX_W / 2 - 4;
          const mid = (x1 + x2) / 2;
          const y = BOX_Y + BOX_H / 2;
          return (
            <g key={l.name}>
              <text x={mid} y={40} textAnchor="middle" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                {l.name}
              </text>
              <text x={mid} y={60} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.faint}>
                {l.gain}
              </text>
              <line x1={x1} y1={y} x2={x2 - 6} y2={y} stroke={C.line} strokeWidth={3} />
              <path d={`M${x2 - 8},${y - 6} L${x2},${y} L${x2 - 8},${y + 6}`} fill="none" stroke={C.line} strokeWidth={3} />
              <g className={`cr-s${2 * i + 1}`}>
                <text x={mid} y={60} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.warn}>
                  {l.gain}
                </text>
                <line x1={x1} y1={y} x2={x2 - 6} y2={y} stroke={C.warn} strokeWidth={3} />
                <path d={`M${x2 - 8},${y - 6} L${x2},${y} L${x2 - 8},${y + 6}`} fill="none" stroke={C.warn} strokeWidth={3} />
              </g>
            </g>
          );
        })}

        {/* Nodes and their nudges */}
        {NODES.map((n, i) => (
          <g key={n.text}>
            <rect x={n.cx - BOX_W / 2} y={BOX_Y} width={BOX_W} height={BOX_H} rx={8} fill="white" stroke={C.line} strokeWidth={1.5} />
            <rect x={n.cx - BOX_W / 2} y={BOX_Y} width={BOX_W} height={BOX_H} rx={8} fill={C.primaryWash} stroke={C.primary} strokeWidth={1.5} className={`cr-s${2 * i}`} />
            <text x={n.cx} y={BOX_Y + BOX_H / 2 + 5} textAnchor="middle" fontSize={15} fill={C.ink} fontFamily={FONT.mono}>
              {n.text}
            </text>
            <text x={n.cx} y={158} textAnchor="middle" fontSize={15} fontWeight={600} fill={C.faint} fontFamily={FONT.mono}>
              {n.nudge}
            </text>
            <g className={`cr-s${2 * i}`}>
              <rect x={n.cx - 44} y={139} width={88} height={28} rx={14} fill={C.active} />
              <text x={n.cx} y={158} textAnchor="middle" fontSize={15} fontWeight={700} fill="white" fontFamily={FONT.mono}>
                {n.nudge}
              </text>
            </g>
          </g>
        ))}
        {/* Total */}
        <text x={340} y={230} textAnchor="middle" fontSize={15} fill={C.faint} fontFamily={FONT.mono}>
          dL/dx = 3 × 12 × 0.5 = 18
        </text>
        <text x={340} y={230} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink} fontFamily={FONT.mono} className="cr-s7">
          dL/dx = 3 × 12 × 0.5 = 18
        </text>
      </svg>

      {/* Phone: the same chain, stacked vertically */}
      <svg viewBox="0 0 340 470" role="img" aria-label="A nudge of 0.01 in x travels through y = 3x, z = y squared and L = z over 2, multiplied by each local slope: 3, then 12, then 0.5, giving 0.18 at the end" className="block h-auto w-full sm:hidden" style={{ fontFamily: FONT.sans }}>
        {NODES.map((n, i) => {
          const y = 12 + i * 106;
          return (
            <g key={n.text}>
              <rect x={8} y={y} width={180} height={50} rx={8} fill="white" stroke={C.line} strokeWidth={1.5} />
              <rect x={8} y={y} width={180} height={50} rx={8} fill={C.primaryWash} stroke={C.primary} strokeWidth={1.5} className={`cr-s${2 * i}`} />
              <text x={98} y={y + 31} textAnchor="middle" fontSize={17} fill={C.ink} fontFamily={FONT.mono}>
                {n.text}
              </text>
              <text x={266} y={y + 31} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.faint} fontFamily={FONT.mono}>
                {n.nudge}
              </text>
              <g className={`cr-s${2 * i}`}>
                <rect x={206} y={y + 9} width={120} height={32} rx={16} fill={C.active} />
                <text x={266} y={y + 31} textAnchor="middle" fontSize={17} fontWeight={700} fill="white" fontFamily={FONT.mono}>
                  {n.nudge}
                </text>
              </g>
              {i < LINKS.length && (
                <g>
                  <line x1={98} y1={y + 56} x2={98} y2={y + 96} stroke={C.line} strokeWidth={3} />
                  <path d={`M${92},${y + 90} L98,${y + 98} L104,${y + 90}`} fill="none" stroke={C.line} strokeWidth={3} />
                  <text x={116} y={y + 83} fontSize={17} fontWeight={700} fill={C.faint}>
                    {LINKS[i].gain}
                  </text>
                  <text x={170} y={y + 83} fontSize={15} fill={C.muted} fontFamily={FONT.mono}>
                    {LINKS[i].name}
                  </text>
                  <g className={`cr-s${2 * i + 1}`}>
                    <line x1={98} y1={y + 56} x2={98} y2={y + 96} stroke={C.warn} strokeWidth={3} />
                    <path d={`M${92},${y + 90} L98,${y + 98} L104,${y + 90}`} fill="none" stroke={C.warn} strokeWidth={3} />
                    <text x={116} y={y + 83} fontSize={17} fontWeight={700} fill={C.warn}>
                      {LINKS[i].gain}
                    </text>
                  </g>
                </g>
              )}
            </g>
          );
        })}
        <line x1={8} y1={400} x2={332} y2={400} stroke={C.grid} />
        <text x={170} y={440} textAnchor="middle" fontSize={17} fill={C.faint} fontFamily={FONT.mono}>
          dL/dx = 3 × 12 × 0.5 = 18
        </text>
        <text x={170} y={440} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink} fontFamily={FONT.mono} className="cr-s7">
          dL/dx = 3 × 12 × 0.5 = 18
        </text>
      </svg>
      <p className="mt-2 text-xs text-pencil">
        Exactly, L moves by 0.18045, not 0.18: the small gap is the curvature of y², which derivatives ignore for tiny nudges.
      </p>
    </div>
  );
}
