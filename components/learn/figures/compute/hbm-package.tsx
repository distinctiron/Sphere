"use client";

import { C, FONT } from "../kit";

/**
 * Static diagram (B3): why high-bandwidth memory is fast. Left, a top view of a
 * GPU package: the compute die with HBM stacks beside it on a silicon interposer.
 * Right, a side view of one stack: DRAM dies stacked on a base die, joined by
 * through-silicon vias, connected to the GPU through ~1,024 data wires only
 * millimetres long. Bottom, the contrast with a CPU's DDR5 channel: 64 data wires
 * running centimetres across a circuit board. Per-pin rates are similar (~5–6 Gb/s),
 * so the width of the interface is what multiplies bandwidth.
 */

export default function HbmPackageFigure() {
  const stacks = [0, 1, 2];
  return (
    <div>
      <svg viewBox="0 0 680 350" role="img" aria-label="A GPU die surrounded by stacks of memory on a shared silicon base, with a side view showing stacked memory dies joined by vertical connections and a thousand short wires to the GPU" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Top view */}
        <text x={20} y={22} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          TOP VIEW OF A GPU PACKAGE
        </text>
        <rect x={20} y={36} width={300} height={196} rx={10} fill={C.wash} stroke={C.line} />
        <rect x={32} y={48} width={276} height={172} rx={6} fill="white" stroke={C.grid} />
        <text x={170} y={226 + 22} textAnchor="middle" fontSize={13} fill={C.muted}>
          silicon interposer
        </text>
        <rect x={110} y={66} width={120} height={136} rx={6} fill={C.primary} />
        <text x={170} y={128} textAnchor="middle" fontSize={15} fontWeight={700} fill="white">
          GPU die
        </text>
        <text x={170} y={148} textAnchor="middle" fontSize={13} fill="white">
          compute
        </text>
        {stacks.map((i) => (
          <g key={i}>
            <rect x={44} y={62 + i * 48} width={54} height={40} rx={4} fill={C.goodSoft} stroke={C.good} />
            <text x={71} y={87 + i * 48} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink}>
              HBM
            </text>
            <rect x={242} y={62 + i * 48} width={54} height={40} rx={4} fill={C.goodSoft} stroke={C.good} />
            <text x={269} y={87 + i * 48} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink}>
              HBM
            </text>
            {/* wide short buses */}
            {Array.from({ length: 5 }, (_, k) => (
              <g key={k}>
                <line x1={98} y1={70 + i * 48 + k * 6} x2={110} y2={70 + i * 48 + k * 6} stroke={C.active} strokeWidth={1.5} />
                <line x1={230} y1={70 + i * 48 + k * 6} x2={242} y2={70 + i * 48 + k * 6} stroke={C.active} strokeWidth={1.5} />
              </g>
            ))}
          </g>
        ))}

        {/* Side view of one stack */}
        <text x={360} y={22} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          SIDE VIEW
        </text>
        <rect x={360} y={196} width={300} height={16} rx={3} fill={C.grid} stroke={C.line} />
        <text x={510} y={230} textAnchor="middle" fontSize={13} fill={C.muted}>
          interposer
        </text>
        {Array.from({ length: 8 }, (_, k) => (
          <rect key={k} x={376} y={172 - k * 16} width={110} height={12} rx={2} fill={C.goodSoft} stroke={C.good} strokeWidth={1} />
        ))}
        <rect x={376} y={184} width={110} height={10} rx={2} fill={C.good} />
        {[392, 412, 432, 452, 472].map((x) => (
          <line key={x} x1={x} y1={60} x2={x} y2={194} stroke={C.ink} strokeWidth={1.5} opacity={0.55} />
        ))}
        <text x={431} y={50} textAnchor="middle" fontSize={13} fill={C.text}>
          8–12 stacked DRAM dies
        </text>
        <rect x={540} y={146} width={110} height={48} rx={4} fill={C.primary} />
        <text x={595} y={175} textAnchor="middle" fontSize={14} fontWeight={700} fill="white">
          GPU die
        </text>
        {Array.from({ length: 6 }, (_, k) => (
          <line key={k} x1={486} y1={198 + (k % 2)} x2={540} y2={198 + (k % 2)} stroke={C.active} strokeWidth={1.4} />
        ))}
        <path d="M 486 204 L 540 204" stroke={C.active} strokeWidth={4} opacity={0.35} />
        <text x={600} y={104} textAnchor="middle" fontSize={13} fill={C.active} fontWeight={700}>
          ~1,024 wires
        </text>
        <text x={600} y={120} textAnchor="middle" fontSize={13} fill={C.active}>
          millimetres long
        </text>
        <line x1={560} y1={126} x2={514} y2={194} stroke={C.active} strokeDasharray="2 3" />

        {/* Contrast strip */}
        <line x1={20} y1={262} x2={660} y2={262} stroke={C.grid} />
        <text x={20} y={288} fontSize={14} fontWeight={700} fill={C.good}>
          One HBM3 stack
        </text>
        <text x={170} y={288} fontSize={14} fill={C.text}>
          1,024 data wires × ~6 Gb/s ≈ 0.7–0.8 TB/s
        </text>
        <text x={20} y={318} fontSize={14} fontWeight={700} fill={C.muted}>
          One DDR5 channel
        </text>
        <text x={170} y={318} fontSize={14} fill={C.text}>
          64 data wires × ~6 Gb/s ≈ 0.05 TB/s
        </text>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Schematic. An H100 has five active HBM3 stacks (80 GB, about 3.35 TB/s together). The per-wire speed is similar to ordinary DRAM; the gain
        comes from having thousands of wires, which is only possible when the memory sits millimetres from the die on a shared silicon base.
      </p>
    </div>
  );
}
