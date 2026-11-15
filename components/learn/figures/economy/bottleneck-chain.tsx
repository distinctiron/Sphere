"use client";

import { useState } from "react";
import { C, ChoiceButtons, FONT } from "../kit";

/**
 * Follow the bottleneck (D1). Interactive, illustrative.
 * Four links in the chain that turns demand for AI compute into running
 * accelerators, each with a yearly capacity (index: demand = 100). Output is
 * the minimum of demand and every link's capacity. The binding link is the
 * one that sets that minimum; it is where prices (and profits) rise.
 * Presets are stylised, not measured: packaging bound in 2023, memory
 * tightened next, power and sites bind from about 2025.
 */

const LINKS = [
  { id: "wafers", label: "Wafers", long: "leading-edge wafers (fabs)" },
  { id: "packaging", label: "Packaging", long: "advanced packaging (CoWoS-class)" },
  { id: "hbm", label: "HBM", long: "high-bandwidth memory" },
  { id: "power", label: "Power", long: "powered data-center sites" },
] as const;

const PRESETS = {
  "2023": { label: "2023", caps: [150, 55, 80, 140] },
  "2024": { label: "2024–25", caps: [150, 105, 85, 115] },
  "2026": { label: "2025–26", caps: [160, 130, 120, 90] },
} as const;
type PresetId = keyof typeof PRESETS;

const DEMAND = 100;
const STEP = 20;
const MAX = 180;

const W = 680;
const H = 300;
const BASE = 250; // y of the bar baseline
const TOP = 40;
const scaleY = (v: number) => ((BASE - TOP) * v) / MAX;
const COL_W = 110;
const colX = (i: number) => 40 + i * 128;

export default function BottleneckChainFigure() {
  const [preset, setPreset] = useState<PresetId>("2023");
  const [caps, setCaps] = useState<number[]>([...PRESETS["2023"].caps]);

  const choosePreset = (id: PresetId) => {
    setPreset(id);
    setCaps([...PRESETS[id].caps]);
  };
  const expand = (i: number) => setCaps((c) => c.map((v, j) => (j === i ? Math.min(MAX, v + STEP) : v)));

  const output = Math.min(DEMAND, ...caps);
  const minCap = Math.min(...caps);
  const binding = minCap < DEMAND ? caps.indexOf(minCap) : -1;
  const outY = BASE - scaleY(output);
  const demandY = BASE - scaleY(DEMAND);
  const shortfall = DEMAND - output;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bar chart of four links in the AI supply chain against demand; output is set by the shortest bar" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <style>{`
          .bn-bind { animation: bn-bind 1.4s ease-in-out infinite alternate; }
          @keyframes bn-bind { from { opacity: .7 } to { opacity: 1 } }
          .bn-bar { transition: height .45s ease, y .45s ease; }
        `}</style>

        {/* demand line */}
        <line x1={24} x2={W - 16} y1={demandY} y2={demandY} stroke={C.muted} strokeDasharray="6 5" />
        <text x={W - 16} y={demandY - 8} textAnchor="end" fontSize={17} fill={C.muted}>
          demand = 100
        </text>

        {caps.map((cap, i) => {
          const x = colX(i);
          const h = scaleY(cap);
          const usedH = scaleY(Math.min(cap, output));
          const isBinding = i === binding;
          return (
            <g key={LINKS[i].id}>
              {/* capacity (slack shown in green above the output level) */}
              <rect className="bn-bar" x={x} y={BASE - h} width={COL_W} height={h} rx={4} fill={isBinding ? C.activeSoft : C.goodSoft} opacity={0.55} />
              {/* the part actually used */}
              <rect className={isBinding ? "bn-bar bn-bind" : "bn-bar"} x={x} y={BASE - usedH} width={COL_W} height={usedH} rx={4} fill={isBinding ? C.active : C.primary} opacity={isBinding ? 1 : 0.75} />
              <text x={x + COL_W / 2} y={BASE - h - 8} textAnchor="middle" fontSize={20} fontWeight={700} fill={isBinding ? C.active : C.text}>
                {cap}
              </text>
              <text x={x + COL_W / 2} y={BASE + 24} textAnchor="middle" fontSize={19} fontWeight={600} fill={isBinding ? C.active : C.ink}>
                {LINKS[i].label}
              </text>
              {isBinding && (
                <text x={x + COL_W / 2} y={BASE + 44} textAnchor="middle" fontSize={15} fontWeight={700} letterSpacing="0.06em" fill={C.active}>
                  BINDING
                </text>
              )}
            </g>
          );
        })}

        {/* output level across all links */}
        <line x1={24} x2={colX(3) + COL_W + 16} y1={outY} y2={outY} stroke={C.ink} strokeWidth={2} style={{ transition: "all .45s ease" }} />
        <text x={colX(3) + COL_W + 16} y={outY + 6} fontSize={18} fontWeight={700} fill={C.ink} style={{ transition: "all .45s ease" }}>
          output {output}
        </text>
        <line x1={24} x2={W - 16} y1={BASE} y2={BASE} stroke={C.line} />
      </svg>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {LINKS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            onClick={() => expand(i)}
            disabled={caps[i] >= MAX}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
              i === binding ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100" : "border-ink/20 bg-sheet text-pencil hover:bg-paper"
            }`}
          >
            + expand {l.label.toLowerCase()}
          </button>
        ))}
      </div>

      <p className="mt-3 text-sm text-pencil">
        {binding >= 0 ? (
          <>
            Output is <span className="font-semibold">{output}</span> of 100 demanded, capped by{" "}
            <span className="font-semibold text-rose-700">{LINKS[binding].long}</span>. The {shortfall} missing units bid for that one input, so its
            price and its supplier’s margin rise. Extra capacity anywhere else sits idle.
          </>
        ) : (
          <>
            Every link now exceeds demand, so output equals demand. No input is scarce: suppliers compete on price and margins fall back towards
            cost, until demand grows again.
          </>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-xs font-medium text-pencil">Stylised year:</span>
        <ChoiceButtons label="Preset" value={preset} onChange={choosePreset} options={(Object.keys(PRESETS) as PresetId[]).map((id) => ({ id, label: PRESETS[id].label }))} />
      </div>
      <p className="mt-2 text-xs text-pencil/70">
        Illustrative capacities (index, demand = 100), not measured data. The presets mimic the reported order in which constraints bound: packaging
        first, then memory, then power and sites.
      </p>
    </div>
  );
}
