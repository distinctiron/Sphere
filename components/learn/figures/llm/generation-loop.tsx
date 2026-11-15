"use client";

import { C, FONT } from "../kit";
import { stagedCss, windowCss } from "./util";
import { PROMPT, candidates } from "./story-model";

/**
 * The autoregressive loop (A14). Staged loop, 12.5 s, three turns:
 * the context goes into the model, a distribution over the next token comes
 * out, one token is sampled (not always the most likely), it is appended to
 * the context, and the longer context goes back in.
 * Probabilities come from the toy model in story-model.ts at temperature 1.
 * Under reduced motion the finished state is shown statically.
 */

const CYCLE = 12.5;
const CHOSEN = [" dragon", " lived", " in"];
const TURN = 3.7;
const T0 = (k: number) => 0.4 + TURN * k;

const contexts = CHOSEN.map((_, k) => [...PROMPT, ...CHOSEN.slice(0, k)]);
const dists = contexts.map((ctx) =>
  candidates(ctx, "temperature", 1, 6, 1)
    .sort((a, b) => b.raw - a.raw)
    .slice(0, 5)
);

const CHAR = 8.6;
const chipW = (t: string) => Math.max(22, t.trim().length * CHAR + 14);
const chips = (() => {
  let x = 20;
  return [...PROMPT, ...CHOSEN].map((t) => {
    const w = chipW(t);
    const c = { t: t.trim(), x, w };
    x += w + 6;
    return c;
  });
})();

const STEPS = ["read the context", "score next tokens", "sample one token", "append, repeat"];
const BOX = { x: 236, y: 92, w: 220, h: 44 };
const BAR = { x: 330, y: 176, w: 250, row: 24 };

// window classes: per turn k → 0 ctx glow, 1 model pulse, 2 bars, 3 chosen, 4 loop arrow; then 4 step labels
const windows: Array<[number, number]> = [];
CHOSEN.forEach((_, k) => {
  const t = T0(k);
  windows.push([t, t + 0.9], [t + 0.6, t + 1.4], [t + 1.1, t + 3.4], [t + 2.0, t + 3.4], [t + 2.4, t + 3.3]);
  windows.push([t, t + 1.0], [t + 1.0, t + 1.9], [t + 1.9, t + 2.8], [t + 2.8, t + 3.6]);
});
const W_PER_TURN = 9;
const w = (k: number, i: number) => `gl-w${k * W_PER_TURN + i}`;

export default function GenerationLoopFigure() {
  const staticCss = `.gl-static { display: none; }
@media (prefers-reduced-motion: reduce) { .learn-figure:not(.fig-force-motion) .gl-static { display: inline; } }`;
  const prompt = PROMPT.length;

  return (
    <div>
      <style>{`${windowCss("gl", CYCLE, windows)}\n${stagedCss("gl", CYCLE, CHOSEN.map((_, k) => T0(k) + 2.9))}\n${staticCss}`}</style>
      <svg viewBox="0 0 680 318" role="img" aria-label="Generation as a loop: the context goes into the model, it outputs probabilities for the next token, one token is sampled and appended, and the longer context goes back in" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Context strip */}
        {chips.map((c, i) => {
          const generated = i >= prompt;
          const k = i - prompt;
          return (
            <g key={i}>
              <rect x={c.x} y={16} width={c.w} height={32} rx={6} fill="white" stroke={generated ? C.faint : C.line} strokeDasharray={generated ? "4 3" : undefined} />
              {!generated && (
                <text x={c.x + c.w / 2} y={37} textAnchor="middle" fontSize={15} fill={C.ink} fontFamily={FONT.mono}>
                  {c.t}
                </text>
              )}
              {generated && (
                <>
                  <text className="gl-static" x={c.x + c.w / 2} y={37} textAnchor="middle" fontSize={15} fill={C.primary} fontFamily={FONT.mono}>
                    {c.t}
                  </text>
                  <g className={`gl-s${k}`}>
                    <rect x={c.x} y={16} width={c.w} height={32} rx={6} fill={C.primaryWash} stroke={C.primary} strokeWidth={1.5} />
                    <text x={c.x + c.w / 2} y={37} textAnchor="middle" fontSize={15} fill={C.primary} fontWeight={600} fontFamily={FONT.mono}>
                      {c.t}
                    </text>
                  </g>
                </>
              )}
            </g>
          );
        })}
        {/* Context glow per turn: everything so far goes in */}
        {CHOSEN.map((_, k) => {
          const last = chips[prompt + k - 1];
          return <rect key={k} className={w(k, 0)} x={14} y={10} width={last.x + last.w - 8} height={44} rx={9} fill="none" stroke={C.active} strokeWidth={2} />;
        })}

        {/* Into the model */}
        <line x1={BOX.x + BOX.w / 2} y1={56} x2={BOX.x + BOX.w / 2} y2={BOX.y - 6} stroke={C.line} strokeWidth={2} />
        <polygon points={`${BOX.x + BOX.w / 2},${BOX.y - 2} ${BOX.x + BOX.w / 2 - 5},${BOX.y - 10} ${BOX.x + BOX.w / 2 + 5},${BOX.y - 10}`} fill={C.line} />
        <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={8} fill={C.wash} stroke={C.muted} />
        {CHOSEN.map((_, k) => (
          <rect key={k} className={w(k, 1)} x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} rx={8} fill={C.primarySoft} stroke={C.primary} strokeWidth={2} />
        ))}
        <text x={BOX.x + BOX.w / 2} y={BOX.y + 27} textAnchor="middle" fontSize={14} fontWeight={600} fill={C.ink}>
          model: one forward pass
        </text>
        <line x1={BOX.x + BOX.w / 2} y1={BOX.y + BOX.h + 4} x2={BOX.x + BOX.w / 2} y2={BAR.y - 20} stroke={C.line} strokeWidth={2} />

        {/* Steps */}
        {STEPS.map((s, i) => (
          <g key={s}>
            <text x={20} y={112 + i * 30} fontSize={14} fontWeight={600} fill={C.faint}>
              {i + 1}. {s}
            </text>
            {CHOSEN.map((_, k) => (
              <text key={k} className={w(k, 5 + i)} x={20} y={112 + i * 30} fontSize={14} fontWeight={600} fill={C.active}>
                {i + 1}. {s}
              </text>
            ))}
          </g>
        ))}

        {/* Distributions, one per turn */}
        {dists.map((dist, k) => {
          const chosenIdx = dist.findIndex((c) => c.token === CHOSEN[k]);
          const chip = chips[prompt + k];
          const cy = BAR.y + chosenIdx * BAR.row;
          return (
            <g key={k}>
              <g className={k === 0 ? `${w(k, 2)}` : w(k, 2)}>
                {dist.map((c, i) => (
                  <g key={c.token}>
                    <text x={BAR.x - 8} y={BAR.y + i * BAR.row + 5} textAnchor="end" fontSize={14} fill={C.text} fontFamily={FONT.mono}>
                      {c.token.trim() || c.token}
                    </text>
                    <rect x={BAR.x} y={BAR.y + i * BAR.row - 8} width={BAR.w} height={14} rx={3} fill={C.wash} />
                    <rect x={BAR.x} y={BAR.y + i * BAR.row - 8} width={c.raw * BAR.w} height={14} rx={3} fill={C.primarySoft} />
                    <text x={BAR.x + c.raw * BAR.w + 6} y={BAR.y + i * BAR.row + 5} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                      {Math.round(c.raw * 100)}%
                    </text>
                  </g>
                ))}
              </g>
              <g className={w(k, 3)}>
                <rect x={BAR.x - 76} y={cy - 12} width={BAR.w + 124} height={22} rx={5} fill="none" stroke={C.active} strokeWidth={2} />
                <rect x={BAR.x} y={cy - 8} width={dist[chosenIdx].raw * BAR.w} height={14} rx={3} fill={C.active} />
              </g>
              <path
                className={w(k, 4)}
                d={`M ${BAR.x + BAR.w + 50} ${cy - 1} C ${672} ${cy - 1}, ${672} ${70}, ${chip.x + chip.w / 2} ${52}`}
                fill="none"
                stroke={C.active}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            </g>
          );
        })}
        {/* Static view (reduced motion): the first turn's distribution */}
        <g className="gl-static">
          {dists[0].map((c, i) => (
            <g key={c.token}>
              <text x={BAR.x - 8} y={BAR.y + i * BAR.row + 5} textAnchor="end" fontSize={14} fill={C.text} fontFamily={FONT.mono}>
                {c.token.trim()}
              </text>
              <rect x={BAR.x} y={BAR.y + i * BAR.row - 8} width={c.raw * BAR.w} height={14} rx={3} fill={c.token === CHOSEN[0] ? C.active : C.primarySoft} />
              <text x={BAR.x + c.raw * BAR.w + 6} y={BAR.y + i * BAR.row + 5} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                {Math.round(c.raw * 100)}%
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
