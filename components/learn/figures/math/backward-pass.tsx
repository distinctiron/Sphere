"use client";

import { useMemo } from "react";
import { C, FONT, useFigure } from "../kit";

/**
 * Backpropagation through the same 3 → 4 → 4 → 2 network style as the
 * forward-pass figure (A8). A real computation drives the drawing:
 * seeded weights, input x = (1, −0.5, 0.8), ReLU hidden layers, softmax +
 * cross-entropy loss with target class 1. Staged loop, 12 s:
 *   0.2–3 s   forward sweep (rose): each layer's values are computed and kept
 *   3.4 s     loss lights (amber)
 *   4.4–8.4 s backward sweep (amber): δ at each layer, then each weight
 *             matrix's gradient (edge width ∝ |δ_j · input_i|, per layer)
 *   8.4–11.2 s hold, then fade.
 * Neurons that output 0 in the forward pass (ReLU off) pass no gradient back.
 */

const LAYERS = [3, 4, 4, 2];
const X = [70, 215, 360, 505];
const LOSS_X = 635;
const TOP = 70;
const HEIGHT = 190;
const CYCLE = 12;

function nodeY(count: number, i: number) {
  const gap = HEIGHT / Math.max(count - 1, 1);
  const offset = (HEIGHT - gap * (count - 1)) / 2;
  return TOP + offset + gap * i;
}
const MID = TOP + HEIGHT / 2;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Mat = number[][];
const matVec = (W: Mat, v: number[]) => W.map((row) => row.reduce((s, w, i) => s + w * v[i], 0));
const matTVec = (W: Mat, d: number[]) => W[0].map((_, i) => W.reduce((s, row, j) => s + row[i] * d[j], 0));

function compute() {
  const rand = mulberry32(16);
  const mat = (rows: number, cols: number) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => rand() * 2 - 1));
  const Ws = [mat(4, 3), mat(4, 4), mat(2, 4)];
  const x = [1, -0.5, 0.8];
  const target = 0;
  const z1 = matVec(Ws[0], x);
  const h1 = z1.map((z) => Math.max(0, z));
  const z2 = matVec(Ws[1], h1);
  const h2 = z2.map((z) => Math.max(0, z));
  const y = matVec(Ws[2], h2);
  const m = Math.max(...y);
  const e = y.map((v) => Math.exp(v - m));
  const p = e.map((v) => v / e.reduce((a, b) => a + b, 0));
  const loss = -Math.log(p[target]);
  // Backward: softmax + cross-entropy gives δ = p − t at the logits
  const d3 = p.map((v, i) => v - (i === target ? 1 : 0));
  const d2 = matTVec(Ws[2], d3).map((v, i) => (z2[i] > 0 ? v : 0));
  const d1 = matTVec(Ws[1], d2).map((v, i) => (z1[i] > 0 ? v : 0));
  const acts = [x, h1, h2, y];
  const deltas = [null, d1, d2, d3];
  // Edge (l, i → j): weight Ws[l][j][i], gradient δ_{l+1}[j] · acts[l][i]
  const edges = Ws.flatMap((W, l) =>
    W.flatMap((row, j) => row.map((w, i) => ({ l, i, j, w, g: (deltas[l + 1] as number[])[j] * acts[l][i] })))
  );
  const maxG = [0, 1, 2].map((l) => Math.max(1e-9, ...edges.filter((e) => e.l === l).map((e) => Math.abs(e.g))));
  return { acts, deltas, edges, maxG, loss, p };
}

// Stage timings in seconds: [on, off]
const T_OFF = 11.2;
const FWD_NODE = [0.2, 1.0, 1.8, 2.6];
const FWD_EDGE = [0.6, 1.4, 2.2];
const LOSS_ON = 3.4;
const LOSS_EDGE = 3.0;
const DELTA_ON = [0, 7.6, 6.0, 4.4];
const GRAD_ON = [8.4, 6.8, 5.2];

const pct = (s: number) => ((s / CYCLE) * 100).toFixed(2);
function keyframes(name: string, on: number, off: number) {
  return `@keyframes ${name} { 0% { opacity: 0 } ${pct(on)}% { opacity: 0 } ${pct(on + 0.3)}% { opacity: 1 } ${pct(off)}% { opacity: 1 } ${pct(
    Math.min(off + 0.4, CYCLE)
  )}% { opacity: 0 } 100% { opacity: 0 } }`;
}

export default function BackwardPassFigure() {
  const { acts, deltas, edges, maxG, loss } = useMemo(compute, []);
  const { reducedMotion } = useFigure();

  const css = [
    ...FWD_NODE.map((on, l) => keyframes(`bp-fn${l}`, on, T_OFF)),
    ...FWD_EDGE.map((on, l) => keyframes(`bp-fe${l}`, on, on + 0.8)),
    keyframes("bp-le", LOSS_EDGE, LOSS_EDGE + 0.8),
    keyframes("bp-loss", LOSS_ON, T_OFF),
    ...DELTA_ON.map((on, l) => (l > 0 ? keyframes(`bp-d${l}`, on, T_OFF) : "")),
    ...GRAD_ON.map((on, l) => keyframes(`bp-g${l}`, on, T_OFF)),
    keyframes("bp-s0", 0.1, 3.0),
    keyframes("bp-s1", 3.0, 4.2),
    keyframes("bp-s2", 4.2, T_OFF),
  ].join("\n");
  // Without motion, show the end state: stored values, error signals and gradients
  const anim = (name: string, visibleAtEnd = false) =>
    reducedMotion ? { opacity: visibleAtEnd ? 1 : 0 } : { opacity: 0, animation: `${name} ${CYCLE}s linear infinite` };

  const nodeMax = acts.map((a) => Math.max(1e-9, ...a.map(Math.abs)));
  const deltaMax = deltas.map((d) => (d ? Math.max(1e-9, ...d.map(Math.abs)) : 1));

  const steps = [
    { key: "bp-s0", color: "bg-rose-600", text: "Forward: compute each layer and keep its values." },
    { key: "bp-s1", color: "bg-amber-600", text: `Loss: compare the output with the target (L = ${loss.toFixed(2)}).` },
    { key: "bp-s2", color: "bg-amber-600", text: "Backward: the error signal δ flows right to left. Each weight’s gradient is δ (at its output end) × the stored value at its input end." },
  ];

  return (
    <div>
      <style>{css}</style>
      <svg
        viewBox="0 0 700 340"
        role="img"
        aria-label="A small network: values flow forward to the loss, then error signals flow backwards layer by layer, giving every weight a gradient"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        {/* Base: all edges, neutral, width by |weight| */}
        {edges.map(({ l, i, j, w }) => (
          <line key={`b${l}-${i}-${j}`} x1={X[l]} y1={nodeY(LAYERS[l], i)} x2={X[l + 1]} y2={nodeY(LAYERS[l + 1], j)} stroke={C.grid} strokeWidth={0.6 + Math.abs(w) * 2.2} />
        ))}
        {LAYERS[3] > 0 &&
          Array.from({ length: LAYERS[3] }, (_, i) => (
            <line key={`bl${i}`} x1={X[3]} y1={nodeY(2, i)} x2={LOSS_X} y2={MID} stroke={C.grid} strokeWidth={1.5} />
          ))}

        {/* Forward flash on edges (rose) */}
        {edges.map(({ l, i, j, w }) => (
          <line
            key={`f${l}-${i}-${j}`}
            style={anim(`bp-fe${l}`)}
            x1={X[l]}
            y1={nodeY(LAYERS[l], i)}
            x2={X[l + 1]}
            y2={nodeY(LAYERS[l + 1], j)}
            stroke={C.active}
            strokeOpacity={0.55}
            strokeWidth={0.6 + Math.abs(w) * 2.2}
          />
        ))}
        {Array.from({ length: 2 }, (_, i) => (
          <line key={`fl${i}`} style={anim("bp-le")} x1={X[3]} y1={nodeY(2, i)} x2={LOSS_X} y2={MID} stroke={C.active} strokeOpacity={0.6} strokeWidth={2} />
        ))}

        {/* Gradients on edges (amber), width ∝ |δ_j · a_i| within each layer */}
        {edges.map(({ l, i, j, g }) => {
          const n = Math.abs(g) / maxG[l];
          if (n < 0.02) return null;
          return (
            <line
              key={`g${l}-${i}-${j}`}
              style={anim(`bp-g${l}`, true)}
              x1={X[l]}
              y1={nodeY(LAYERS[l], i)}
              x2={X[l + 1]}
              y2={nodeY(LAYERS[l + 1], j)}
              stroke={C.warn}
              strokeOpacity={0.3 + 0.7 * n}
              strokeWidth={1 + 4 * n}
              strokeLinecap="round"
            />
          );
        })}

        {/* Nodes */}
        {LAYERS.map((count, l) =>
          Array.from({ length: count }, (_, i) => {
            const cx = X[l];
            const cy = nodeY(count, i);
            const a = acts[l][i];
            const off = l > 0 && l < 3 && a === 0;
            const d = deltas[l]?.[i] ?? 0;
            return (
              <g key={`n${l}-${i}`}>
                <circle cx={cx} cy={cy} r={14} fill="white" stroke={C.muted} strokeWidth={1.5} strokeDasharray={off ? "3 3" : undefined} />
                {!off && <circle cx={cx} cy={cy} r={14} fill={C.active} fillOpacity={0.3 + 0.7 * (Math.abs(a) / nodeMax[l])} style={anim(`bp-fn${l}`, true)} />}
                {off && (
                  <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                    0
                  </text>
                )}
                {l > 0 && Math.abs(d) > 1e-9 && (
                  <circle cx={cx} cy={cy} r={19} fill="none" stroke={C.warn} strokeWidth={1.5 + 3.5 * (Math.abs(d) / deltaMax[l])} style={anim(`bp-d${l}`, true)} />
                )}
              </g>
            );
          })
        )}

        {/* Loss node */}
        <rect x={LOSS_X - 22} y={MID - 18} width={44} height={36} rx={8} fill="white" stroke={C.muted} strokeWidth={1.5} />
        <rect x={LOSS_X - 22} y={MID - 18} width={44} height={36} rx={8} fill={C.warn} style={anim("bp-loss", true)} />
        <text x={LOSS_X} y={MID + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>
          L
        </text>
        <text x={LOSS_X} y={MID + 40} textAnchor="middle" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
          {loss.toFixed(2)}
        </text>

        {/* Column labels */}
        {["INPUT x", "h₁", "h₂", "OUTPUT y"].map((label, l) => (
          <text key={label} x={X[l]} y={36} textAnchor="middle" fontSize={13} fontWeight={700} letterSpacing="0.04em" fill={C.text}>
            {label}
          </text>
        ))}
        <text x={LOSS_X} y={36} textAnchor="middle" fontSize={13} fontWeight={700} letterSpacing="0.04em" fill={C.text}>
          LOSS
        </text>

        {/* What each gap computes on the way back (desktop; listed in HTML on phones) */}
        <g className="hidden sm:inline">
        {["∂L/∂W₁ = δ₁ xᵀ", "∂L/∂W₂ = δ₂ h₁ᵀ", "∂L/∂W₃ = δ₃ h₂ᵀ"].map((label, l) => (
          <text key={label} x={(X[l] + X[l + 1]) / 2} y={298} textAnchor="middle" fontSize={13} fill={C.warn} fontFamily={FONT.mono}>
            {label}
          </text>
        ))}
        <text x={(X[3] + LOSS_X) / 2} y={298} textAnchor="middle" fontSize={13} fill={C.warn} fontFamily={FONT.mono}>
          δ₃ = p − t
        </text>
        {["δ₁ = W₂ᵀδ₂ ⊙ f′", "δ₂ = W₃ᵀδ₃ ⊙ f′"].map((label, k) => (
          <text key={label} x={X[k + 1]} y={324} textAnchor="middle" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
            {label}
          </text>
        ))}
        </g>
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-xs text-amber-700 sm:hidden">
        <span>δ₃ = p − t</span>
        <span>∂L/∂W₃ = δ₃ h₂ᵀ</span>
        <span className="text-pencil">δ₂ = W₃ᵀδ₃ ⊙ f′</span>
        <span>∂L/∂W₂ = δ₂ h₁ᵀ</span>
        <span className="text-pencil">δ₁ = W₂ᵀδ₂ ⊙ f′</span>
        <span>∂L/∂W₁ = δ₁ xᵀ</span>
      </div>

      <ol className="mt-2 space-y-1 text-sm text-pencil">
        {steps.map((s, k) => (
          <li key={s.key} className="relative flex gap-2 rounded-md px-2 py-1">
            <span className="absolute inset-0 rounded-md bg-[#f1efe4]" style={anim(s.key)} aria-hidden />
            <span className={`relative mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full ${s.color}`} />
            <span className="relative">
              <span className="font-semibold text-ink">{k + 1}.</span> {s.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
