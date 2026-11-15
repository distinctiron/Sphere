"use client";

import { C, FONT } from "../kit";

/**
 * Weight-stationary systolic array (B4), 4 × 4 processing elements (PEs). Staged loop, 10 s.
 * Weights w[r][c] are loaded once and stay in place. Four input vectors (tokens
 * t = 0..3) enter from the left, skewed so that element r of token t enters row r
 * at step t + r. Each PE multiplies the input passing through by its weight, adds
 * the partial sum arriving from above, passes the input right and the sum down.
 * PE (r, c) is busy at steps t + r + c, so busy PEs form a diagonal wavefront.
 * Token t's finished dot product for column c leaves the bottom at step t + c + 4.
 * Step = 0.6 s. Base layer (no animation): the complete structure with all outputs.
 */

const CYCLE = 10;
const START = 0.6;
const STEP = 0.6;
const N = 4;
const AX = 236; // array x
const AY = 64;
const P = 76; // PE pitch
const S = 62; // PE size
const OUT_Y = AY + N * P + 26;

const pct = (t: number) => ((t / CYCLE) * 100).toFixed(2);

function keyframes() {
  let css = "";
  for (let d = 0; d <= 2 * (N - 1); d++) {
    // PE diagonal d = r + c busy from step d to d + N - 1
    const on = START + d * STEP;
    const off = START + (d + N) * STEP;
    css += `@keyframes sa-pe${d} { 0%, ${pct(on)}% { opacity: 0 } ${pct(on + 0.1)}%, ${pct(off - 0.05)}% { opacity: 1 } ${pct(off + 0.1)}%, 100% { opacity: 0 } }
.sa-pe${d} { opacity: 0; animation: sa-pe${d} ${CYCLE}s linear infinite; }
@keyframes sa-in${d} { 0%, ${pct(on - 0.05)}% { opacity: 1 } ${pct(on + 0.1)}%, 97% { opacity: 0 } 100% { opacity: 1 } }
.sa-in${d} { animation: sa-in${d} ${CYCLE}s linear infinite; }
@keyframes sa-out${d} { 0%, ${pct(START + (d + N) * STEP)}% { opacity: 0 } ${pct(START + (d + N) * STEP + 0.1)}%, 95% { opacity: 1 } 99%, 100% { opacity: 0 } }
.sa-out${d} { animation: sa-out${d} ${CYCLE}s linear infinite; }\n`;
  }
  return css;
}

const sub = (n: number) => "₀₁₂₃"[n];

export default function SystolicArrayFigure() {
  return (
    <div>
      <style>{keyframes()}</style>
      <svg
        viewBox={`0 0 680 ${OUT_Y + 4 * 14 + 30}`}
        role="img"
        aria-label="A 4 by 4 grid of multiply-accumulate units holding fixed weights; skewed input vectors enter from the left and a diagonal wave of activity sweeps across while finished sums leave from the bottom"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        <text x={AX} y={22} fontSize={14} fontWeight={700} fill={C.active}>
          inputs flow right →
        </text>
        <text x={AX + N * P + 6} y={AY + 20} fontSize={14} fontWeight={700} fill={C.good}>
          sums
        </text>
        <text x={AX + N * P + 6} y={AY + 38} fontSize={14} fontWeight={700} fill={C.good}>
          flow ↓
        </text>
        <text x={AX + N * P + 6} y={AY + 76} fontSize={13} fill={C.muted}>
          weights
        </text>
        <text x={AX + N * P + 6} y={AY + 93} fontSize={13} fill={C.muted}>
          stay put
        </text>

        {/* Skewed input queue: element r of token t, waiting to enter row r */}
        {Array.from({ length: N }, (_, r) =>
          Array.from({ length: N }, (_, t) => {
            const x = AX - 30 - (t + r) * 24;
            const y = AY + r * P + S / 2 - 9;
            return <rect key={`${r}-${t}`} x={x} y={y} width={18} height={18} rx={3} fill={C.activeSoft} stroke={C.active} className={`sa-in${t + r}`} />;
          })
        )}
        <text x={12} y={AY + N * P + 2} fontSize={13} fill={C.muted}>
          4 token vectors, skewed
        </text>

        {/* PE grid */}
        {Array.from({ length: N * N }, (_, i) => {
          const r = Math.floor(i / N);
          const c = i % N;
          const x = AX + c * P;
          const y = AY + r * P;
          return (
            <g key={i}>
              <rect x={x} y={y} width={S} height={S} rx={6} fill={C.primaryWash} stroke={C.primarySoft} />
              <rect x={x} y={y} width={S} height={S} rx={6} fill={C.primary} className={`sa-pe${r + c}`} />
              <text x={x + S / 2} y={y + S / 2 + 5} textAnchor="middle" fontSize={15} fontFamily={FONT.mono} fill={C.ink} fontWeight={600}>
                w{sub(r)}
                {sub(c)}
              </text>
              {c < N - 1 && <path d={`M ${x + S + 2} ${y + S / 2} l 9 0`} stroke={C.active} strokeWidth={2} markerEnd="" />}
              {r < N - 1 && <path d={`M ${x + S / 2} ${y + S + 2} l 0 9`} stroke={C.good} strokeWidth={2} />}
            </g>
          );
        })}

        {/* Outputs: token t, column c */}
        <text x={12} y={OUT_Y + 26} fontSize={13} fill={C.muted}>
          finished dot products
        </text>
        {Array.from({ length: N }, (_, c) =>
          Array.from({ length: N }, (_, t) => (
            <rect key={`${c}-${t}`} x={AX + c * P + 8} y={OUT_Y + t * 14} width={S - 16} height={10} rx={2} fill={C.good} className={`sa-out${t + c}`} />
          ))
        )}
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Each input value is read from memory once and then used by every processing element in its row as it moves right; each weight is loaded
        once and used for every token. No value makes a round trip to a register file or memory between operations. Google&apos;s first TPU had
        a 256 × 256 array like this: 65,536 multiply-accumulate units, each input reused up to 256 times.
      </p>
    </div>
  );
}
