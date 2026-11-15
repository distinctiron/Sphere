"use client";

import { C, FONT } from "../kit";
import { softmax, stagedCss } from "./util";

/**
 * One attention step in 2-D, with the numbers of the A11 worked example.
 * The token "it" asks with query q = (2, 1). Keys: the (0, 1), cat (1.5, 2),
 * it (1, 0). Scores q·k = 1, 5, 2; divided by √2 and softmaxed: 0.050, 0.848,
 * 0.102. Values: the (0, 1), cat (3, 1), it (1, −1). Output = Σ wᵢ vᵢ ≈ (2.65, 0.80).
 * Staged loop, 11 s: query → keys → scores → weights → scaled values → output.
 * The base layer (reduced motion) shows the finished state in neutral colours.
 */

type P = [number, number];
const CYCLE = 11;
const Q: P = [2, 1];
const TOK = [
  { name: "the", k: [0, 1] as P, v: [0, 1] as P },
  { name: "cat", k: [1.5, 2] as P, v: [3, 1] as P },
  { name: "it", k: [1, 0] as P, v: [1, -1] as P },
];
const scores = TOK.map((t) => t.k[0] * Q[0] + t.k[1] * Q[1]);
const weights = softmax(scores.map((s) => s / Math.SQRT2));
const out: P = [0, 1].map((d) => TOK.reduce((acc, t, i) => acc + weights[i] * t.v[d], 0)) as P;

// Panel geometry
const L = { ox: 48, oy: 270, s: 64 }; // query/key plane
const R = { ox: 500, oy: 186, s: 50 }; // value plane
const toL = ([x, y]: P): P => [L.ox + x * L.s, L.oy - y * L.s];
const toR = ([x, y]: P): P => [R.ox + x * R.s, R.oy - y * R.s];

function Arrow({ a, b, color, width = 2.5, className, dashed }: { a: P; b: P; color: string; width?: number; className?: string; dashed?: boolean }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 1) return null;
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  const hx = b[0] - ux * 10;
  const hy = b[1] - uy * 10;
  return (
    <g className={className}>
      <line x1={a[0]} y1={a[1]} x2={hx} y2={hy} stroke={color} strokeWidth={width} strokeDasharray={dashed ? "5 4" : undefined} />
      <polygon points={`${b[0]},${b[1]} ${hx - uy * 5},${hy + ux * 5} ${hx + uy * 5},${hy - ux * 5}`} fill={color} />
    </g>
  );
}

const starts = [0.3, 1.4, 3.0, 4.4, 6.0, 7.6];

// Three panels drawn from one scene: side by side on wide screens, two rows on phones
const PANELS = [
  { x: 6, w: 242, h: 336, cls: "w-[54%] sm:w-[35.5%]" },
  { x: 254, w: 204, h: 336, cls: "w-[46%] sm:w-[30%]" },
  { x: 462, w: 216, h: 312, cls: "w-[62%] sm:w-[31.5%]" },
];
const LABEL =
  "The query of the token ‘it’ is compared with the keys of ‘the’, ‘cat’ and ‘it’; the best-aligned key, cat, gets 85% of the weight, and the output is mostly cat’s value vector";

export default function AttentionGeometryFigure() {
  const qTip = toL(Q);
  // Head-to-tail chain of weighted values
  const chain: P[] = [[0, 0]];
  TOK.forEach((t, i) => {
    const prev = chain[chain.length - 1];
    chain.push([prev[0] + weights[i] * t.v[0], prev[1] + weights[i] * t.v[1]]);
  });
  const barX = 318;
  const barMax = 110;

  const content = (
    <>
        {/* Panel titles */}
        {[
          { x: 20, t: "1 · QUERY MEETS KEYS" },
          { x: 262, t: "2 · ALIGN → WEIGHTS" },
          { x: 470, t: "3 · MIX THE VALUES" },
        ].map((p) => (
          <text key={p.t} x={p.x} y={24} fontSize={13} fontWeight={700} letterSpacing="0.05em" fill={C.text}>
            {p.t}
          </text>
        ))}

        {/* Panel 1: query and keys */}
        <line x1={L.ox - 10} y1={L.oy} x2={L.ox + 180} y2={L.oy} stroke={C.grid} />
        <line x1={L.ox} y1={L.oy + 10} x2={L.ox} y2={L.oy - 200} stroke={C.grid} />
        {TOK.map((t) => {
          const tip = toL(t.k);
          return (
            <g key={t.name}>
              <Arrow a={toL([0, 0])} b={tip} color={C.primarySoft} />
              <text
                x={t.name === "the" ? tip[0] : tip[0] + 6}
                y={t.name === "the" ? tip[1] - 14 : tip[1] + (t.name === "it" ? 20 : -6)}
                textAnchor={t.name === "the" ? "middle" : "start"}
                fontSize={14}
                fill={C.text}
              >
                key: {t.name}
              </text>
            </g>
          );
        })}
        <Arrow a={toL([0, 0])} b={qTip} color={C.faint} width={3} />
        <Arrow className="ag-s0" a={toL([0, 0])} b={qTip} color={C.active} width={3} />
        <text x={qTip[0] + 4} y={qTip[1] - 12} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.active}>
          query: it
        </text>
        <g className="ag-s1">
          {TOK.map((t) => (
            <Arrow key={t.name} a={toL([0, 0])} b={toL(t.k)} color={C.primary} />
          ))}
        </g>

        {/* Panel 2: scores and softmax weights */}
        {TOK.map((t, i) => {
          const y = 92 + i * 78;
          return (
            <g key={t.name}>
              <text x={264} y={y} fontSize={14} fontWeight={600} fill={C.ink}>
                {t.name}
              </text>
              <text x={264} y={y + 22} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                q·k
              </text>
              <text x={292} y={y + 22} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                = {scores[i]}
              </text>
              <text className="ag-s2" x={292} y={y + 22} fontSize={13} fill={C.ink} fontFamily={FONT.mono} fontWeight={700}>
                = {scores[i]}
              </text>
              <rect x={barX} y={y - 13} width={barMax} height={14} rx={3} fill={C.wash} stroke={C.grid} />
              <rect x={barX} y={y - 13} width={weights[i] * barMax} height={14} rx={3} fill={C.faint} />
              <rect className="ag-s3" x={barX} y={y - 13} width={weights[i] * barMax} height={14} rx={3} fill={C.primary} />
              <text x={barX + barMax} y={y + 22} textAnchor="end" fontSize={14} fontWeight={700} fill={C.ink}>
                {Math.round(weights[i] * 100)}%
              </text>
            </g>
          );
        })}
        <text x={264} y={322} fontSize={13} fill={C.muted}>
          softmax of q·k ÷ √2
        </text>

        {/* Panel 3: values, weighted and summed */}
        <line x1={R.ox - 20} y1={R.oy} x2={R.ox + 170} y2={R.oy} stroke={C.grid} />
        <line x1={R.ox} y1={R.oy + 70} x2={R.ox} y2={R.oy - 120} stroke={C.grid} />
        {TOK.map((t) => {
          const tip = toR(t.v);
          return (
            <g key={t.name}>
              <Arrow a={toR([0, 0])} b={tip} color={C.line} width={2} dashed />
              <text x={tip[0] + (t.name === "cat" ? 0 : 6)} y={tip[1] + (t.name === "it" ? 18 : -12)} textAnchor={t.name === "cat" ? "end" : "start"} fontSize={13} fill={C.muted}>
                value: {t.name}
              </text>
            </g>
          );
        })}
        <g className="ag-s4">
          {TOK.map((t, i) =>
            Math.hypot(...(toR(chain[i + 1]).map((v, d) => v - toR(chain[i])[d]) as P)) < 8 ? null : (
              <Arrow key={t.name} a={toR(chain[i])} b={toR(chain[i + 1])} color={C.primary} width={2.5} />
            )
          )}
        </g>
        <Arrow a={toR([0, 0])} b={toR(out)} color={C.faint} width={3} />
        <Arrow className="ag-s5" a={toR([0, 0])} b={toR(out)} color={C.active} width={3.5} />
        <text x={668} y={300} textAnchor="end" fontSize={14} fontWeight={700} fill={C.active}>
          output ≈ ({out[0].toFixed(2)}, {out[1].toFixed(2)})
        </text>
    </>
  );

  return (
    <div>
      <style>{stagedCss("ag", CYCLE, starts)}</style>
      <div className="flex flex-wrap items-start justify-center sm:flex-nowrap">
        {PANELS.map((pnl, i) => (
          <svg
            key={i}
            viewBox={`${pnl.x} 0 ${pnl.w} ${pnl.h}`}
            role={i === 0 ? "img" : undefined}
            aria-hidden={i === 0 ? undefined : true}
            aria-label={i === 0 ? LABEL : undefined}
            className={`block h-auto ${pnl.cls}`}
            style={{ fontFamily: FONT.sans }}
          >
            {content}
          </svg>
        ))}
      </div>
    </div>
  );
}
