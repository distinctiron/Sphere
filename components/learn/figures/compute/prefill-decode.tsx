"use client";

import { C, FONT } from "../kit";

/**
 * Prefill vs decode on the roofline (B8). Staged loop, 10 s.
 * Both rows stream the same weights from HBM to the compute units. In prefill
 * each weight is used for thousands of prompt tokens, so every compute unit is
 * busy. In decode each full pass over the weights yields one token per
 * sequence, so almost all compute units wait on memory.
 * Numbers: 8B-parameter model in BF16 (16 GB), H100-class GPU
 * (~3.35 TB/s HBM, ~990 dense BF16 TFLOP/s).
 */

const CYCLE = 10;
const ROWS = 6;
const COLS = 10;

function Row({ y, mode }: { y: number; mode: "prefill" | "decode" }) {
  const prefill = mode === "prefill";
  return (
    <g transform={`translate(0, ${y})`}>
      <text x={20} y={0} fontSize={13} fontWeight={700} letterSpacing="0.08em" fill={prefill ? C.primary : C.active}>
        {prefill ? "PREFILL: the whole prompt at once" : "DECODE: one new token per pass"}
      </text>

      {/* HBM with weight slabs */}
      <rect x={20} y={16} width={120} height={120} rx={8} fill={C.wash} stroke={C.line} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={32} y={26 + i * 18} width={96} height={12} rx={2} fill={C.primarySoft} opacity={0.8} />
      ))}
      <text x={80} y={154} textAnchor="middle" fontSize={12} fill={C.muted}>
        HBM · 16 GB weights
      </text>

      {/* The pipe: same bandwidth in both rows */}
      <rect x={146} y={62} width={150} height={28} rx={14} fill={C.grid} />
      <line x1={156} y1={76} x2={288} y2={76} stroke={C.primary} strokeWidth={8} strokeLinecap="round" className="pd-flow" />
      <text x={221} y={110} textAnchor="middle" fontSize={12} fill={C.muted}>
        ~3.35 TB/s
      </text>

      {/* Compute grid */}
      <rect x={304} y={16} width={COLS * 18 + 14} height={ROWS * 18 + 14} rx={8} fill="white" stroke={C.line} />
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const r = Math.floor(i / COLS);
        const c = i % COLS;
        const lit = prefill || c === 0;
        return (
          <rect
            key={i}
            x={311 + c * 18}
            y={23 + r * 18}
            width={14}
            height={14}
            rx={2.5}
            fill={lit ? (prefill ? C.primary : C.active) : C.grid}
            className={lit ? "pd-busy" : undefined}
            style={lit ? { animationDelay: `${(r + c) * 0.06}s` } : undefined}
          />
        );
      })}
      <text x={311 + (COLS * 18) / 2} y={154} textAnchor="middle" fontSize={12} fill={C.muted}>
        {prefill ? "compute units: nearly all busy" : "compute units: mostly waiting"}
      </text>

      {/* Tokens */}
      {prefill ? (
        <g>
          <rect x={516} y={40} width={150} height={24} rx={4} fill={C.primaryWash} stroke={C.primarySoft} />
          <text x={591} y={56} textAnchor="middle" fontSize={12} fill={C.primary} fontFamily={FONT.mono}>
            2,000 prompt tokens
          </text>
          <rect x={516} y={80} width={34} height={24} rx={4} fill={C.active} className="pd-first" />
          <text x={558} y={97} fontSize={12} fill={C.text} className="pd-first">
            1st token ≈ 0.03 s
          </text>
        </g>
      ) : (
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <rect key={i} x={516 + i * 25} y={52} width={20} height={24} rx={4} fill={C.active} className="pd-token" style={{ animationDelay: `${i * 1.25}s` }} />
          ))}
          <text x={516} y={100} fontSize={12} fill={C.text}>
            each ≈ 5 ms
          </text>
          <text x={516} y={117} fontSize={12} fill={C.muted}>
            16 GB ÷ 3.35 TB/s
          </text>
        </g>
      )}
    </g>
  );
}

export default function PrefillDecodeFigure() {
  return (
    <div>
      <style>{`
        .pd-flow { stroke-dasharray: 10 12; animation: pd-flow .6s linear infinite; }
        @keyframes pd-flow { to { stroke-dashoffset: -22 } }
        .pd-busy { animation: pd-busy 1.1s ease-in-out infinite alternate; }
        @keyframes pd-busy { from { opacity: .45 } to { opacity: 1 } }
        .pd-first { animation: pd-first ${CYCLE}s ease-out infinite; }
        @keyframes pd-first { 0%, 8% { opacity: 0 } 12%, 92% { opacity: 1 } 100% { opacity: 0 } }
        .pd-token { animation: pd-token ${CYCLE}s ease-out infinite; }
        @keyframes pd-token { 0% { opacity: 0; transform: translateY(6px) } 3%, 88% { opacity: 1; transform: none } 96%, 100% { opacity: 0 } }
      `}</style>
      <svg viewBox="0 0 680 370" role="img" aria-label="Prefill keeps all compute busy while the weights stream once; decode streams the same weights for a single token, leaving most compute idle" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <Row y={22} mode="prefill" />
        <Row y={210} mode="decode" />
        <line x1={20} y1={192} x2={660} y2={192} stroke={C.grid} />
      </svg>
    </div>
  );
}
