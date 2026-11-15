"use client";

import { C, FONT } from "../kit";

/**
 * The same matrix multiply on a CPU and a GPU (B2). Staged loop, 10 s. Schematic.
 * Output: a 16 × 16 matrix C = A·B, every cell an independent dot product.
 * CPU: 8 fast cores, each finishing one cell per step (0.2 s): 32 steps, done at 6.9 s.
 * GPU: 8 SMs, each finishing a whole 4 × 4 tile per step, but each step is slower
 * (0.8 s, lower clock, simpler lanes): 16 tiles in 2 waves, done at 2.1 s.
 * The real gap for a large layer is about a thousandfold; see the lesson's worked example.
 * Base layer (no animation) shows both matrices complete.
 */

const CYCLE = 10;
const START = 0.5;
const CPU_STEP = 0.2;
const GPU_WAVE = 0.8;
const N = 16;
const CELL = 15;
const PX = [24, 364]; // panel x
const MY = 58; // matrix y

const pct = (t: number) => ((t / CYCLE) * 100).toFixed(2);

function keyframes() {
  let css = "";
  const add = (name: string, t: number) => {
    css += `@keyframes ${name} { 0%, ${pct(t)}% { fill: ${C.grid} } ${pct(t + 0.08)}%, 94% { fill: ${C.primary} } 99%, 100% { fill: ${C.grid} } }
.${name} { animation: ${name} ${CYCLE}s linear infinite; }
@keyframes ${name}-now { 0%, ${pct(t - (name.startsWith("mg-c") ? CPU_STEP : GPU_WAVE))}% { opacity: 0 } ${pct(t - (name.startsWith("mg-c") ? CPU_STEP : GPU_WAVE) + 0.05)}%, ${pct(t)}% { opacity: 1 } ${pct(t + 0.05)}%, 100% { opacity: 0 } }
.${name}-now { opacity: 0; animation: ${name}-now ${CYCLE}s linear infinite; }\n`;
  };
  for (let s = 0; s < (N * N) / 8; s++) add(`mg-c${s}`, START + (s + 1) * CPU_STEP);
  for (let w = 0; w < 2; w++) add(`mg-g${w}`, START + (w + 1) * GPU_WAVE);
  const doneCpu = START + ((N * N) / 8) * CPU_STEP;
  const doneGpu = START + 2 * GPU_WAVE;
  for (const [name, t] of [
    ["mg-donec", doneCpu],
    ["mg-doneg", doneGpu],
  ] as const) {
    css += `@keyframes ${name} { 0%, ${pct(t)}% { opacity: 0 } ${pct(t + 0.1)}%, 94% { opacity: 1 } 99%, 100% { opacity: 0 } }
.${name} { animation: ${name} ${CYCLE}s linear infinite; }\n`;
  }
  return css;
}

function Units({ x, y, gpu }: { x: number; y: number; gpu: boolean }) {
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const ux = x + (i % 4) * 62;
        const uy = y + Math.floor(i / 4) * 34;
        return (
          <g key={i}>
            <rect x={ux} y={uy} width={56} height={28} rx={4} fill={C.wash} stroke={C.line} />
            {gpu ? (
              Array.from({ length: 32 }, (_, j) => (
                <rect key={j} x={ux + 4 + (j % 8) * 6.2} y={uy + 4 + Math.floor(j / 8) * 5.2} width={4.4} height={3.8} fill={C.primarySoft} />
              ))
            ) : (
              <rect x={ux + 8} y={uy + 6} width={40} height={16} rx={3} fill={C.primarySoft} />
            )}
          </g>
        );
      })}
    </g>
  );
}

export default function CpuVsGpuMatmulFigure() {
  const matrix = (panel: 0 | 1) => {
    const x0 = PX[panel] + 26;
    return Array.from({ length: N * N }, (_, i) => {
      const r = Math.floor(i / N);
      const c = i % N;
      let cls: string;
      if (panel === 0) {
        cls = `mg-c${Math.floor(i / 8)}`;
      } else {
        const tile = Math.floor(r / 4) * 4 + Math.floor(c / 4);
        cls = `mg-g${tile < 8 ? 0 : 1}`;
      }
      return <rect key={i} x={x0 + c * CELL} y={MY + r * CELL} width={CELL - 2} height={CELL - 2} rx={2} fill={C.primary} className={cls} />;
    });
  };

  // "Being computed now" highlight: CPU = 8 cells of the current step; GPU = the 8 tiles of the current wave
  const cpuNow = Array.from({ length: (N * N) / 8 }, (_, s) => {
    const r = Math.floor((s * 8) / N);
    const c = (s * 8) % N;
    return (
      <rect key={s} x={PX[0] + 26 + c * CELL - 1.5} y={MY + r * CELL - 1.5} width={8 * CELL} height={CELL + 1} rx={3} fill="none" stroke={C.active} strokeWidth={2.5} className={`mg-c${s}-now`} />
    );
  });
  const gpuNow = [0, 1].map((w) => (
    <rect key={w} x={PX[1] + 26 - 1.5} y={MY + w * 8 * CELL - 1.5} width={N * CELL} height={8 * CELL + 1} rx={3} fill="none" stroke={C.active} strokeWidth={2.5} className={`mg-g${w}-now`} />
  ));

  return (
    <div>
      <style>{keyframes()}</style>
      <svg
        viewBox="0 0 680 408"
        role="img"
        aria-label="Two copies of a 16 by 16 output matrix being filled: the CPU fills 8 cells at a time over many steps, the GPU fills whole blocks of cells in two waves and finishes first"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        {[0, 1].map((p) => (
          <g key={p}>
            <text x={PX[p] + 26} y={24} fontSize={15} fontWeight={700} fill={p ? C.primary : C.ink}>
              {p ? "GPU: 8 SMs × many lanes" : "CPU: 8 fast cores"}
            </text>
            <text x={PX[p] + 26} y={44} fontSize={13} fill={C.muted}>
              {p ? "each SM: a 4 × 4 tile per (slower) step" : "each core: one cell per step"}
            </text>
            {/* Tile grid lines for the GPU panel */}
            {p === 1 &&
              [1, 2, 3].map((k) => (
                <g key={k}>
                  <line x1={PX[1] + 26 + k * 4 * CELL - 1} y1={MY - 2} x2={PX[1] + 26 + k * 4 * CELL - 1} y2={MY + N * CELL} stroke="white" strokeWidth={2} />
                  <line x1={PX[1] + 24} y1={MY + k * 4 * CELL - 1} x2={PX[1] + 26 + N * CELL} y2={MY + k * 4 * CELL - 1} stroke="white" strokeWidth={2} />
                </g>
              ))}
            <Units x={PX[p] + 26} y={MY + N * CELL + 18} gpu={p === 1} />
            <text x={PX[p] + 26} y={MY + N * CELL + 100} fontSize={13} fill={C.muted}>
              {p ? "8 SMs × 32 lanes (H100: 132 SMs)" : "8 big out-of-order cores"}
            </text>
          </g>
        ))}
        {matrix(0)}
        {matrix(1)}
        {cpuNow}
        {gpuNow}
        <g className="mg-doneg">
          <rect x={PX[1] + 26 + (N * CELL) / 2 - 34} y={MY + (N * CELL) / 2 - 17} width={68} height={34} rx={8} fill={C.good} />
          <text x={PX[1] + 26 + (N * CELL) / 2} y={MY + (N * CELL) / 2 + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill="white">
            done
          </text>
        </g>
        <g className="mg-donec">
          <rect x={PX[0] + 26 + (N * CELL) / 2 - 34} y={MY + (N * CELL) / 2 - 17} width={68} height={34} rx={8} fill={C.good} />
          <text x={PX[0] + 26 + (N * CELL) / 2} y={MY + (N * CELL) / 2 + 6} textAnchor="middle" fontSize={16} fontWeight={700} fill="white">
            done
          </text>
        </g>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Schematic, not to scale. Each output cell is one independent dot product. The GPU&apos;s lanes are individually slower than CPU cores,
        but there are so many that whole tiles finish per step. For a real 4,096-wide layer the gap is hundreds of times, not three.
      </p>
    </div>
  );
}
