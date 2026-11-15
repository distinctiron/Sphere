"use client";

import { C, FONT } from "../kit";

/**
 * The frontier treadmill (D4). Staged loop, 11 s. Illustrative, not data.
 * Four model generations launched a year apart. Bottom: each generation's
 * training cost, about 3× the previous one. Top (log scale): the price of
 * that generation's capability starts high and falls roughly 10× a year as
 * rivals and open-weight models match it. The shaded wedge is the premium
 * window in which the lab can charge a frontier price, before the capability
 * becomes a commodity. Rates are rough published trend estimates.
 */

const CYCLE = 11;
const GEN_EVERY = 2.1; // seconds between generations in the loop
const pc = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;

const X0 = 90;
const PX_YEAR = 140;
const TOP = 46;
const BOTTOM = 186; // two decades of price on a log axis
const PX_DECADE = (BOTTOM - TOP) / 2;
const WINDOW_YEARS = 0.5;
const COST_BASE = 300;
const COSTS = [8, 24, 72, 216].map((c) => Math.min(c, 216) * (84 / 216)); // ×3 per generation, scaled to 84 px

export default function FrontierTreadmillFigure() {
  const gens = [0, 1, 2, 3];
  const css = gens
    .map((i) => {
      const t = 0.3 + i * GEN_EVERY;
      return `
      .ft-bar-${i} { transform-box: fill-box; transform-origin: 50% 100%; animation: ft-bar-${i} ${CYCLE}s ease-out infinite; }
      @keyframes ft-bar-${i} { 0%, ${pc(t)} { transform: scaleY(0) } ${pc(t + 0.6)}, 95% { transform: scaleY(1) } 100% { transform: scaleY(0) } }
      .ft-line-${i} { stroke-dasharray: 320; animation: ft-line-${i} ${CYCLE}s ease-out infinite; }
      @keyframes ft-line-${i} { 0%, ${pc(t + 0.5)} { stroke-dashoffset: 320 } ${pc(t + 1.9)}, 95% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 320 } }
      .ft-show-${i} { animation: ft-show-${i} ${CYCLE}s ease-out infinite; }
      @keyframes ft-show-${i} { 0%, ${pc(t + 0.4)} { opacity: 0 } ${pc(t + 0.9)}, 95% { opacity: 1 } 100% { opacity: 0 } }`;
    })
    .join("\n");

  const lineEnd = (x: number) => {
    // falls 1 decade per year until the bottom of the axis
    const years = (BOTTOM - TOP) / PX_DECADE; // 2 years to fall 2 decades
    return [x + years * PX_YEAR, BOTTOM];
  };

  return (
    <div>
      <style>{css}</style>
      <svg viewBox="0 0 680 352" role="img" aria-label="Four model generations a year apart: each costs about three times more to train, while the price of each generation's capability falls about tenfold a year after launch, leaving a short premium window" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <clipPath id="ft-clip">
            <rect x={X0} y={TOP - 4} width={680 - X0 - 10} height={BOTTOM - TOP + 8} />
          </clipPath>
        </defs>
        {/* price axis */}
        <text x={14} y={TOP - 18} fontSize={16} fontWeight={600} fill={C.text}>
          Price for that capability (log)
        </text>
        {[0, 1, 2].map((d) => (
          <g key={d}>
            <line x1={X0} x2={670} y1={TOP + d * PX_DECADE} y2={TOP + d * PX_DECADE} stroke={C.grid} />
            <text x={X0 - 8} y={TOP + d * PX_DECADE + 6} textAnchor="end" fontSize={16} fill={C.muted}>
              {d === 0 ? "launch" : d === 1 ? "÷10" : "÷100"}
            </text>
          </g>
        ))}

        <g clipPath="url(#ft-clip)">
          {gens.map((i) => {
            const x = X0 + i * PX_YEAR;
            const [x2, y2] = lineEnd(x);
            const wx = x + WINDOW_YEARS * PX_YEAR;
            const wy = TOP + WINDOW_YEARS * PX_DECADE;
            return (
              <g key={i}>
                <g className={`ft-show-${i}`}>
                  <polygon points={`${x},${TOP} ${wx},${wy} ${wx},${BOTTOM} ${x},${BOTTOM}`} fill={C.primary} opacity={0.14} />
                </g>
                <line x1={x} y1={TOP} x2={x2} y2={y2} stroke={C.primary} strokeWidth={3} strokeLinecap="round" className={`ft-line-${i}`} />
                <circle cx={x} cy={TOP} r={5} fill={C.primary} className={`ft-show-${i}`} />
              </g>
            );
          })}
        </g>
        <g className="ft-show-0">
          <text x={X0 + 5} y={BOTTOM - 28} fontSize={15} fontWeight={700} fill={C.primary}>
            premium
          </text>
          <text x={X0 + 5} y={BOTTOM - 10} fontSize={15} fontWeight={700} fill={C.primary}>
            window
          </text>
        </g>

        {/* cost axis */}
        <text x={14} y={218} fontSize={16} fontWeight={600} fill={C.text}>
          Training cost of each generation
        </text>
        <line x1={X0} x2={670} y1={COST_BASE} y2={COST_BASE} stroke={C.line} />
        {gens.map((i) => {
          const x = X0 + i * PX_YEAR;
          const h = COSTS[i];
          return (
            <g key={i}>
              <rect x={x - 22} y={COST_BASE - h} width={44} height={h} rx={3} fill={C.warn} opacity={0.85} className={`ft-bar-${i}`} />
              <text x={x} y={COST_BASE - h - 6} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.warn} className={`ft-show-${i}`}>
                {["1×", "3×", "9×", "27×"][i]}
              </text>
              <text x={x} y={COST_BASE + 22} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.ink}>
                Gen {i + 1}
              </text>
            </g>
          );
        })}
        <text x={670} y={COST_BASE + 44} textAnchor="end" fontSize={15} fill={C.muted}>
          one generation per year →
        </text>
      </svg>
      <p className="mt-1 text-xs text-pencil/70">
        Illustrative. Rates are rough trend estimates: frontier training cost has grown by very roughly 2–3× a year, and the price of a fixed level of
        capability has fallen by roughly 10× a year or more. Real generations are irregular and the window varies from weeks to many months.
      </p>
    </div>
  );
}
