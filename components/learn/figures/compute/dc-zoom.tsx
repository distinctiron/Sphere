"use client";

import type { ReactNode } from "react";
import { C, FONT } from "../kit";

/**
 * From one GPU to a gigawatt campus (B6). Staged loop, 11 s: each level is
 * highlighted in turn and a marker steps along a log-scale power axis.
 * Rounded, approximate figures for a GB200 NVL72-class build (2025–26):
 *   GPU ≈ 1.2 kW · compute tray (4 GPUs + 2 CPUs) ≈ 6 kW
 *   rack (72 GPUs, NVLink domain) ≈ 130 kW · hall (~200 racks) ≈ 26 MW, ~14,000 GPUs
 *   campus ≈ 1 GW from the grid (PUE ≈ 1.2 → ~830 MW IT ≈ 6,400 racks ≈ 460,000 GPUs)
 * Base layer (no animation) shows all levels and all markers.
 */

const CYCLE = 11;
const START = 0.4;
const DWELL = 1.9;
const LEVELS = [
  { name: "GPU", count: "1 GPU", power: "≈ 1.2 kW", watts: 1.2e3 },
  { name: "Tray", count: "4 GPUs", power: "≈ 6 kW", watts: 6e3 },
  { name: "Rack", count: "72 GPUs", power: "≈ 130 kW", watts: 1.3e5 },
  { name: "Hall", count: "≈ 14,000", power: "≈ 26 MW", watts: 2.6e7 },
  { name: "Campus", count: "≈ 460,000", power: "≈ 1 GW", watts: 1e9 },
];
const CW = 124;
const GAP = 13;
const X0 = 8;
const CY = 12;
const CH = 196;
const AX0 = 40;
const AX1 = 640;
const AY = 262;
const logX = (w: number) => AX0 + ((Math.log10(w) - 3) / 6) * (AX1 - AX0);

const pct = (t: number) => ((t / CYCLE) * 100).toFixed(2);

function keyframes() {
  return LEVELS.map((_, i) => {
    const on = START + i * DWELL;
    const off = on + DWELL;
    const last = i === LEVELS.length - 1;
    return `@keyframes dz-h${i} { 0%, ${pct(on)}% { opacity: 0 } ${pct(on + 0.2)}%, ${last ? "95" : pct(off)}% { opacity: 1 } ${last ? "99" : pct(off + 0.2)}%, 100% { opacity: 0 } }
.dz-h${i} { opacity: 0; animation: dz-h${i} ${CYCLE}s ease-in-out infinite; }
@keyframes dz-m${i} { 0%, ${pct(on)}% { opacity: 0.25 } ${pct(on + 0.2)}%, 95% { opacity: 1 } 99%, 100% { opacity: 0.25 } }
.dz-m${i} { animation: dz-m${i} ${CYCLE}s ease-in-out infinite; }`;
  }).join("\n");
}

function Icon({ i, x, y }: { i: number; x: number; y: number }): ReactNode {
  const cx = x + CW / 2;
  switch (i) {
    case 0:
      return (
        <g>
          <rect x={cx - 22} y={y + 14} width={44} height={44} rx={4} fill={C.primary} />
          {[0, 1, 2].map((k) => (
            <g key={k}>
              <rect x={cx - 36} y={y + 16 + k * 14} width={10} height={11} rx={2} fill={C.goodSoft} />
              <rect x={cx + 26} y={y + 16 + k * 14} width={10} height={11} rx={2} fill={C.goodSoft} />
            </g>
          ))}
        </g>
      );
    case 1:
      return (
        <g>
          <rect x={cx - 50} y={y + 18} width={100} height={36} rx={4} fill={C.wash} stroke={C.line} />
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={cx - 44 + k * 23} y={y + 26} width={18} height={20} rx={2} fill={C.primary} />
          ))}
        </g>
      );
    case 2:
      return (
        <g>
          <rect x={cx - 20} y={y + 2} width={40} height={70} rx={3} fill={C.wash} stroke={C.line} />
          {Array.from({ length: 12 }, (_, k) => (
            <rect key={k} x={cx - 16} y={y + 6 + k * 5.4} width={32} height={3.6} fill={k === 5 || k === 6 ? C.faint : C.primary} />
          ))}
        </g>
      );
    case 3:
      return (
        <g>
          <rect x={cx - 50} y={y + 8} width={100} height={58} rx={3} fill={C.wash} stroke={C.line} />
          {Array.from({ length: 4 }, (_, r) =>
            Array.from({ length: 10 }, (_, k) => <rect key={`${r}-${k}`} x={cx - 44 + k * 9} y={y + 14 + r * 13} width={6} height={8} fill={C.primary} />)
          )}
        </g>
      );
    default:
      return (
        <g>
          {[0, 1, 2, 3].map((k) => (
            <rect key={k} x={cx - 50 + (k % 2) * 46} y={y + 8 + Math.floor(k / 2) * 30} width={40} height={24} rx={2} fill={C.primarySoft} stroke={C.primary} />
          ))}
          <rect x={cx + 44} y={y + 20} width={12} height={30} fill={C.warnSoft} stroke={C.warn} />
        </g>
      );
  }
}

export default function DcZoomFigure() {
  return (
    <div>
      <style>{keyframes()}</style>
      <svg
        viewBox="0 0 680 300"
        role="img"
        aria-label="Five levels from one GPU at about 1.2 kilowatts, to a tray, a 72-GPU rack at about 130 kilowatts, a hall of about 26 megawatts and a campus of about 1 gigawatt, on a logarithmic power axis"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        {LEVELS.map((l, i) => {
          const x = X0 + i * (CW + GAP);
          return (
            <g key={l.name}>
              <rect x={x} y={CY} width={CW} height={CH} rx={10} fill="white" stroke={C.grid} />
              <rect x={x} y={CY} width={CW} height={CH} rx={10} fill={C.primaryWash} stroke={C.active} strokeWidth={2.5} className={`dz-h${i}`} />
              <Icon i={i} x={x} y={CY + 8} />
              <text x={x + CW / 2} y={CY + 112} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink}>
                {l.name}
              </text>
              <text x={x + CW / 2} y={CY + 140} textAnchor="middle" fontSize={15} fill={C.text}>
                {l.count}
              </text>
              <text x={x + CW / 2} y={CY + 170} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.warn} fontFamily={FONT.mono}>
                {l.power}
              </text>
            </g>
          );
        })}
        {/* Log power axis */}
        <line x1={AX0} y1={AY} x2={AX1} y2={AY} stroke={C.line} strokeWidth={2} />
        {["1 kW", "1 MW", "1 GW"].map((t, k) => (
          <g key={t}>
            <line x1={logX(Math.pow(10, 3 + 3 * k))} y1={AY - 6} x2={logX(Math.pow(10, 3 + 3 * k))} y2={AY + 6} stroke={C.muted} />
            <text x={logX(Math.pow(10, 3 + 3 * k))} y={AY + 24} textAnchor="middle" fontSize={14} fill={C.muted} fontFamily={FONT.mono}>
              {t}
            </text>
          </g>
        ))}
        {LEVELS.map((l, i) => (
          <circle key={l.name} cx={logX(l.watts)} cy={AY} r={8} fill={C.warn} stroke="white" strokeWidth={2} className={`dz-m${i}`} />
        ))}
        <text x={AX0} y={AY - 16} fontSize={13} fill={C.muted}>
          power, log scale
        </text>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Rounded figures for a GB200 NVL72-class build, 2025–26. Rack power is IT load; the campus figure is total draw from the grid,
        including cooling (PUE ≈ 1.2). Earlier air-cooled H100 racks drew about 40 kW; a traditional enterprise rack draws 5–10 kW.
      </p>
    </div>
  );
}
