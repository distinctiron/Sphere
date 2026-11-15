"use client";

import { useMemo } from "react";
import { C, FONT } from "../kit";
import { mulberry32, stagedCss } from "./util";

/**
 * The residual stream (A12). Three tokens, each with its own running vector
 * (a lane). Blocks read from the lanes and add their result back (⊕): attention
 * moves information between lanes (only from earlier tokens to later ones), the
 * MLP works on each lane alone. The small strips under each lane show the
 * token's vector after every write: it changes a little each time, because
 * blocks add to it rather than replace it. The last lane's final vector is
 * turned into a next-token prediction.
 * Staged loop, 12 s. The base layer shows the full structure without colour.
 */

const CYCLE = 12;
const LANES = [
  { token: "The", y: 128 },
  { token: "cat", y: 214 },
  { token: "sat", y: 300 },
];
const X0 = 96;
const X1 = 596;
const BLOCKS = [
  { kind: "attn", x: 176, label: "attention" },
  { kind: "mlp", x: 284, label: "MLP" },
  { kind: "attn", x: 394, label: "attention" },
  { kind: "mlp", x: 502, label: "MLP" },
] as const;
const GLYPH_X = [96, 208, 314, 424, 532];
const CELLS = 6;

// When each block activates, and when its writes land
const T_EMBED = 0.3;
const T_BLOCK = [1.4, 3.8, 6.2, 8.4];
const T_WRITE = T_BLOCK.map((t) => t + 1.1);
const T_OUT = 10.2;

function useVectors() {
  return useMemo(() => {
    const rand = mulberry32(12);
    return LANES.map(() => {
      const states: number[][] = [];
      let v = Array.from({ length: CELLS }, () => rand() * 2 - 1);
      states.push(v);
      for (let k = 0; k < BLOCKS.length; k++) {
        v = v.map((x) => Math.max(-1, Math.min(1, x + (rand() < 0.45 ? (rand() * 2 - 1) * 0.9 : 0))));
        states.push(v);
      }
      return states;
    });
  }, []);
}

function Glyph({ x, y, v, colored }: { x: number; y: number; v: number[]; colored: boolean }) {
  return (
    <g>
      {v.map((val, i) => (
        <rect
          key={i}
          x={x + i * 8}
          y={y}
          width={7}
          height={12}
          rx={1.5}
          fill={colored ? (val >= 0 ? C.primary : C.warn) : C.muted}
          fillOpacity={0.15 + Math.abs(val) * 0.85}
        />
      ))}
    </g>
  );
}

export default function ResidualStreamFigure() {
  const vectors = useVectors();
  // Stage classes: 0 embed, 1–4 blocks, 5–8 writes, 9 output
  const starts = [T_EMBED, ...T_BLOCK, ...T_WRITE, T_OUT];

  return (
    <div>
      <style>{stagedCss("rs", CYCLE, starts)}</style>
      <svg viewBox="0 0 680 372" role="img" aria-label="Three tokens each carry a running vector along a horizontal lane; attention blocks pass information from earlier lanes to later ones, MLP blocks work on each lane separately, and every block adds its result back into the lane" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Column labels */}
        <text x={46} y={30} textAnchor="middle" fontSize={13} fontWeight={700} letterSpacing="0.05em" fill={C.text}>
          TOKEN
        </text>
        {BLOCKS.map((b, i) => (
          <text key={i} x={b.x} y={30} textAnchor="middle" fontSize={13} fontWeight={700} letterSpacing="0.05em" fill={b.kind === "attn" ? C.primary : C.text}>
            {b.label.toUpperCase()}
          </text>
        ))}
        <text x={640} y={30} textAnchor="middle" fontSize={13} fontWeight={700} letterSpacing="0.05em" fill={C.text}>
          PREDICT
        </text>

        {/* Attention bands span all lanes */}
        {BLOCKS.map((b, i) =>
          b.kind === "attn" ? (
            <g key={i}>
              <rect x={b.x - 30} y={62} width={60} height={270} rx={10} fill={C.primaryWash} stroke={C.primarySoft} />
              <rect className={`rs-s${1 + i}`} x={b.x - 30} y={62} width={60} height={270} rx={10} fill="none" stroke={C.primary} strokeWidth={2.5} />
              {/* Causal flows: earlier lanes to later lanes */}
              {[
                [0, 1],
                [0, 2],
                [1, 2],
              ].map(([from, to]) => {
                const y1 = LANES[from].y;
                const y2 = LANES[to].y;
                const bend = from === 0 && to === 2 ? 22 : 10;
                const d = `M ${b.x - 14} ${y1 + 4} C ${b.x - 14 + bend} ${(y1 + y2) / 2}, ${b.x + 14 - bend} ${(y1 + y2) / 2}, ${b.x + 12} ${y2 - 6}`;
                return (
                  <g key={`${from}${to}`}>
                    <path d={d} fill="none" stroke={C.primarySoft} strokeWidth={1.6} />
                    <path className={`rs-s${1 + i}`} d={d} fill="none" stroke={C.primary} strokeWidth={2.2} />
                  </g>
                );
              })}
            </g>
          ) : null
        )}

        {/* Lanes: the residual stream of each token */}
        {LANES.map((lane, li) => (
          <g key={lane.token}>
            <rect x={14} y={lane.y - 15} width={64} height={30} rx={6} fill="white" stroke={C.line} />
            <text x={46} y={lane.y + 5} textAnchor="middle" fontSize={15} fill={C.ink} fontFamily={FONT.mono}>
              {lane.token}
            </text>
            <line x1={X0} y1={lane.y} x2={X1} y2={lane.y} stroke={C.line} strokeWidth={4} strokeLinecap="round" />

            {/* Lane lights up segment by segment as the writes land */}
            {[X0, ...BLOCKS.map((b) => b.x + 22)].map((xa, k) => {
              const xb = k < BLOCKS.length ? BLOCKS[k].x + 22 : X1;
              return (
                <line
                  key={k}
                  className={`rs-s${k === 0 ? 0 : 4 + k}`}
                  x1={xa}
                  y1={lane.y}
                  x2={xb}
                  y2={lane.y}
                  stroke={C.active}
                  strokeOpacity={0.55}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              );
            })}

            {/* MLP boxes: one per lane, reading and writing that lane only */}
            {BLOCKS.map((b, i) =>
              b.kind === "mlp" ? (
                <g key={i}>
                  <path d={`M ${b.x - 22} ${lane.y} V ${lane.y - 34} H ${b.x - 18}`} fill="none" stroke={C.line} strokeWidth={1.5} />
                  <path d={`M ${b.x + 18} ${lane.y - 34} H ${b.x + 22} V ${lane.y - 7}`} fill="none" stroke={C.line} strokeWidth={1.5} />
                  <rect x={b.x - 18} y={lane.y - 46} width={36} height={24} rx={5} fill="white" stroke={C.muted} />
                  <rect className={`rs-s${1 + i}`} x={b.x - 18} y={lane.y - 46} width={36} height={24} rx={5} fill={C.primarySoft} stroke={C.primary} strokeWidth={1.5} />
                </g>
              ) : null
            )}

            {/* ⊕: every block adds to the lane */}
            {BLOCKS.map((b, i) => (
              <g key={`plus${i}`}>
                <circle cx={b.x + 22} cy={lane.y} r={7} fill="white" stroke={C.muted} strokeWidth={1.5} />
                <circle className={`rs-s${5 + i}`} cx={b.x + 22} cy={lane.y} r={7} fill={C.active} />
                <text x={b.x + 22} y={lane.y + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.muted}>
                  +
                </text>
              </g>
            ))}

            {/* The vector after each write */}
            {GLYPH_X.map((gx, k) => (
              <g key={`g${k}`}>
                <Glyph x={gx} y={lane.y + 12} v={vectors[li][k]} colored={false} />
                <g className={`rs-s${k === 0 ? 0 : 4 + k}`}>
                  <Glyph x={gx} y={lane.y + 12} v={vectors[li][k]} colored />
                </g>
              </g>
            ))}
          </g>
        ))}

        {/* Prediction from the last token's final vector */}
        <path d={`M ${X1 + 4} ${LANES[2].y} H ${616}`} stroke={C.line} strokeWidth={2} />
        <rect x={618} y={LANES[2].y - 16} width={48} height={32} rx={6} fill="white" stroke={C.line} />
        <text x={642} y={LANES[2].y + 5} textAnchor="middle" fontSize={15} fill={C.muted} fontFamily={FONT.mono}>
          on
        </text>
        <g className="rs-s9">
          <rect x={618} y={LANES[2].y - 16} width={48} height={32} rx={6} fill={C.active} />
          <text x={642} y={LANES[2].y + 5} textAnchor="middle" fontSize={15} fill="white" fontWeight={700} fontFamily={FONT.mono}>
            on
          </text>
        </g>
        <text x={642} y={LANES[2].y + 36} textAnchor="middle" fontSize={13} fill={C.muted}>
          next token
        </text>

        <text x={340} y={360} textAnchor="middle" fontSize={13} fill={C.muted}>
          real models repeat the attention + MLP pair 12 to 120+ times
        </text>
      </svg>
    </div>
  );
}
