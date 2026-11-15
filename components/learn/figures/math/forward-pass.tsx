"use client";

import { useMemo } from "react";
import { C, FONT } from "../kit";

/**
 * Forward pass through a 3 → 4 → 4 → 2 network (A6). Staged loop, 9 s:
 *   0–1 s inputs light · 1–2 s W₁ edges · 2–3 s layer-1 nodes · 3–4 s W₂ edges
 *   4–5 s layer-2 nodes · 5–6 s W₃ edges · 6–7 s outputs · 7–9 s hold/reset.
 * Edge colour = weight sign (indigo positive, amber negative), width = magnitude.
 * All overlays share one keyframe; stage timing comes from animation-delay.
 */

const LAYERS = [3, 4, 4, 2];
const X = [80, 260, 440, 620];
const TOP = 60;
const HEIGHT = 200;
const CYCLE = 9;

function nodeY(count: number, i: number) {
  const gap = HEIGHT / Math.max(count - 1, 1);
  const offset = (HEIGHT - gap * (count - 1)) / 2;
  return TOP + offset + gap * i;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LABELS = ["h₁ = ReLU(W₁x + b₁)", "h₂ = ReLU(W₂h₁ + b₂)", "y = W₃h₂ + b₃"];

export default function ForwardPassFigure() {
  const edges = useMemo(() => {
    const rand = mulberry32(3);
    return LAYERS.slice(0, -1).flatMap((count, l) =>
      Array.from({ length: count }, (_, i) =>
        Array.from({ length: LAYERS[l + 1] }, (_, j) => {
          const w = rand() * 2 - 1;
          return { l, i, j, w };
        })
      ).flat()
    );
  }, []);

  return (
    <div>
      <style>{`
        .fp-glow { opacity: 0; animation: fp-flash ${CYCLE}s ease-in-out infinite; }
        @keyframes fp-flash { 0% { opacity: 0 } 3% { opacity: 1 } 10% { opacity: 1 } 16% { opacity: 0 } 100% { opacity: 0 } }
        .fp-out { opacity: 0; animation: fp-out ${CYCLE}s ease-in-out infinite; animation-delay: 6s; }
        @keyframes fp-out { 0% { opacity: 0 } 4% { opacity: 1 } 26% { opacity: 1 } 30% { opacity: 0 } 100% { opacity: 0 } }
      `}</style>
      <svg viewBox="0 0 700 330" role="img" aria-label="A signal flowing left to right through a small neural network, one layer at a time" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Base layer: all edges, neutral */}
        {edges.map(({ l, i, j, w }) => (
          <line
            key={`b${l}-${i}-${j}`}
            x1={X[l]}
            y1={nodeY(LAYERS[l], i)}
            x2={X[l + 1]}
            y2={nodeY(LAYERS[l + 1], j)}
            stroke={C.line}
            strokeWidth={0.6 + Math.abs(w) * 2.2}
          />
        ))}
        {/* Overlay: edges light up by weight layer */}
        {edges.map(({ l, i, j, w }) => (
          <line
            key={`o${l}-${i}-${j}`}
            className="fp-glow"
            style={{ animationDelay: `${1 + l * 2}s` }}
            x1={X[l]}
            y1={nodeY(LAYERS[l], i)}
            x2={X[l + 1]}
            y2={nodeY(LAYERS[l + 1], j)}
            stroke={w >= 0 ? C.primary : C.warn}
            strokeOpacity={0.35 + Math.abs(w) * 0.65}
            strokeWidth={0.6 + Math.abs(w) * 2.2}
            strokeLinecap="round"
          />
        ))}
        {/* Nodes */}
        {LAYERS.map((count, l) =>
          Array.from({ length: count }, (_, i) => (
            <g key={`n${l}-${i}`}>
              <circle cx={X[l]} cy={nodeY(count, i)} r={14} fill="white" stroke={C.muted} strokeWidth={1.5} />
              <circle
                cx={X[l]}
                cy={nodeY(count, i)}
                r={14}
                fill={C.active}
                className="fp-glow"
                style={{ animationDelay: `${l * 2}s` }}
              />
            </g>
          ))
        )}
        {/* Column labels */}
        {["input x", "hidden h₁", "hidden h₂", "output y"].map((label, l) => (
          <text key={label} x={X[l]} y={32} textAnchor="middle" fontSize={12} fontWeight={700} letterSpacing="0.06em" fill={C.text}>
            {label.toUpperCase()}
          </text>
        ))}
        {/* One matrix multiply per layer */}
        {LABELS.map((label, l) => (
          <g key={label}>
            <text x={(X[l] + X[l + 1]) / 2} y={292} textAnchor="middle" fontSize={12.5} fill={C.ink} fontFamily={FONT.mono}>
              {label}
            </text>
            <text x={(X[l] + X[l + 1]) / 2} y={312} textAnchor="middle" fontSize={11.5} fill={C.muted}>
              {`W${"₁₂₃"[l]}: ${LAYERS[l + 1]}×${LAYERS[l]} matrix`}
            </text>
          </g>
        ))}
        <g className="fp-out">
          <text x={X[3] + 26} y={nodeY(2, 0) + 4} fontSize={12} fill={C.active} fontWeight={600}>
            2.1
          </text>
          <text x={X[3] + 26} y={nodeY(2, 1) + 4} fontSize={12} fill={C.active} fontWeight={600}>
            −0.4
          </text>
        </g>
      </svg>
    </div>
  );
}
