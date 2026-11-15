"use client";

import { C, FONT } from "../kit";
import { stagedCss, windowCss } from "./util";

/**
 * Text is its own label (A13). For "The capital of France is Paris." each
 * position predicts the next token. Upper bars: probability the model gave to
 * the token that actually came next. Lower bars: the surprise −ln p, the loss
 * at that position. The training loss is the average, here 1.56 nats.
 * Probabilities are illustrative; the surprises and average are computed.
 * Staged loop, 12 s: positions one by one (how you would read it), then all at
 * once (how training computes it, thanks to the causal mask).
 */

const CYCLE = 12;
const TOKENS = ["The", "capital", "of", "France", "is", "Paris", "."];
const P = [0.01, 0.8, 0.04, 0.5, 0.9, 0.6]; // p(token i+1 | tokens ≤ i)
const S = P.map((p) => -Math.log(p));
const AVG = S.reduce((a, b) => a + b, 0) / S.length;
const S_MAX = Math.max(...S);

const COL0 = 40;
const COL_W = 98;
const colX = (i: number) => COL0 + i * COL_W; // centre of column for target token i (1..6)
const BASE_P = 186;
const BASE_S = 206;
const H_P = 92;
const H_S = 74;

// Stage i (0..5): position i predicts token i+1; then .nt-all shows every position at once
const starts = P.map((_, i) => 0.4 + i * 1.1);

export default function NextTokenLossFigure() {
  return (
    <div>
      <style>{`${stagedCss("nt", CYCLE, starts, 0.35, 0.62)}
${windowCss("nt", CYCLE, starts.map((t) => [t, t + 0.85] as [number, number]), 0.25)}
        .nt-all { opacity: 0; animation: nt-all ${CYCLE}s linear infinite; }
        @keyframes nt-all { 0%, 63% { opacity: 0 } 66%, 92% { opacity: 1 } 96%, 100% { opacity: 0 } }`}</style>
      <svg viewBox="0 0 680 356" role="img" aria-label="For the sentence ‘The capital of France is Paris.’, each position’s predicted probability for the true next token and the resulting surprise; the loss is their average, 1.56 nats" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Token chips */}
        {TOKENS.map((t, i) => {
          const x = i === 0 ? 40 : colX(i);
          return (
            <g key={i}>
              <rect x={x - 40} y={16} width={80} height={30} rx={6} fill="white" stroke={C.line} />
              <text x={x} y={36} textAnchor="middle" fontSize={15} fill={C.ink} fontFamily={FONT.mono}>
                {t}
              </text>
            </g>
          );
        })}
        {/* Sequential highlight: the context so far, and the target */}
        {P.map((_, i) => (
          <g key={`ctx${i}`} className={`nt-w${i}`}>
            <rect x={0} y={16} width={(i === 0 ? 80 : colX(i) + 40)} height={30} rx={6} fill={C.primary} opacity={0.12} />
            <rect x={colX(i + 1) - 40} y={16} width={80} height={30} rx={6} fill="none" stroke={C.active} strokeWidth={2.5} />
          </g>
        ))}

        <text x={8} y={BASE_P - H_P + 4} fontSize={13} fontWeight={700} letterSpacing="0.05em" fill={C.primary}>
          p(next)
        </text>
        <text x={8} y={BASE_S + 18} fontSize={13} fontWeight={700} letterSpacing="0.05em" fill={C.warn}>
          −ln p
        </text>
        <line x1={84} y1={BASE_P} x2={668} y2={BASE_P} stroke={C.line} />
        <line x1={84} y1={BASE_S} x2={668} y2={BASE_S} stroke={C.line} />

        {P.map((p, i) => {
          const x = colX(i + 1);
          const hp = p * H_P;
          const hs = (S[i] / S_MAX) * H_S;
          const bars = (colored: boolean) => (
            <>
              <rect x={x - 18} y={BASE_P - hp} width={36} height={hp} rx={3} fill={colored ? C.primary : C.grid} />
              <rect x={x - 18} y={BASE_S} width={36} height={hs} rx={3} fill={colored ? C.warn : C.grid} />
            </>
          );
          return (
            <g key={i}>
              {bars(false)}
              <text x={x} y={BASE_P - hp - 6} textAnchor="middle" fontSize={13} fill={C.text} fontFamily={FONT.mono}>
                {p.toFixed(2)}
              </text>
              <text x={x} y={BASE_S + hs + 17} textAnchor="middle" fontSize={13} fill={C.text} fontFamily={FONT.mono}>
                {S[i].toFixed(2)}
              </text>
              <g className={`nt-s${i}`}>{bars(true)}</g>
              <g className="nt-all">{bars(true)}</g>
            </g>
          );
        })}

        <text x={340} y={346} textAnchor="middle" fontSize={14} fill={C.ink}>
          loss = average surprise = <tspan fontWeight={700}>{AVG.toFixed(2)} nats</tspan> per token
        </text>
        <text className="nt-all" x={340} y={322} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.active}>
          training: all six predictions from one forward pass
        </text>
      </svg>
    </div>
  );
}
