"use client";

import { useEffect, useMemo, useState } from "react";
import { C, FONT, useFigure } from "../kit";

/**
 * Ring all-reduce across 4 GPUs (B5). Stepped animation, auto-advancing while
 * playing (1.6 s per step, longer hold at the end); step buttons for manual use.
 * Each GPU's gradient is split into 4 chunks (A–D). Cell bars show how many GPUs'
 * contributions each chunk copy contains (1–4).
 * Reduce-scatter step s (0..2): GPU i sends chunk (i − s) mod 4 to GPU i+1, which adds it.
 *   After 3 steps GPU i holds the full sum of chunk (i + 1) mod 4.
 * All-gather step s (0..2): GPU i sends chunk (i + 1 − s) mod 4 (complete) to GPU i+1.
 * Each GPU sends 6 chunks = 2(N−1)/N of its gradient in total, independent of N.
 */

const N = 4;
const CHUNKS = ["A", "B", "C", "D"];
const STEP_MS = 1600;
const HOLD_MS = 3200;

type State = number[][]; // [gpu][chunk] = contributions

function simulate() {
  const states: State[] = [Array.from({ length: N }, () => Array(N).fill(1))];
  const sends: Array<Array<{ from: number; chunk: number }>> = [[]];
  for (let phase = 0; phase < 2; phase++) {
    for (let s = 0; s < N - 1; s++) {
      const prev = states[states.length - 1];
      const next = prev.map((row) => [...row]);
      const step: Array<{ from: number; chunk: number }> = [];
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        const k = phase === 0 ? (((i - s) % N) + N) % N : (((i + 1 - s) % N) + N) % N;
        step.push({ from: i, chunk: k });
        next[j][k] = phase === 0 ? prev[j][k] + prev[i][k] : N;
      }
      states.push(next);
      sends.push(step);
    }
  }
  return { states, sends };
}

const STEP_TEXT = [
  { title: "Start", text: "Each GPU has computed a gradient on its own share of the batch. Every GPU needs the sum of all four. Each gradient is split into four chunks." },
  { title: "Reduce-scatter 1 of 3", text: "Every GPU sends one chunk to its right-hand neighbour, which adds it to its own copy. All four links are busy at once." },
  { title: "Reduce-scatter 2 of 3", text: "Each GPU passes on the partial sum it just received, one chunk further round the ring." },
  { title: "Reduce-scatter 3 of 3", text: "Now each GPU holds one chunk that contains all four contributions (green): the full sum for that quarter." },
  { title: "All-gather 1 of 3", text: "The finished chunks travel round the ring. Receivers replace their copy instead of adding." },
  { title: "All-gather 2 of 3", text: "Each GPU forwards the finished chunk it just received." },
  { title: "All-gather 3 of 3", text: "Every GPU has the full summed gradient. Each sent 6 chunks, 1.5 times its gradient size: 2(N−1)/N, which approaches 2 however many GPUs join the ring." },
];

const COL = 168;
const X0 = 14;
const BOX_W = 144;
const Y0 = 34;
const ROW = 34;

export default function RingAllReduceFigure() {
  const { playing, reducedMotion } = useFigure();
  const { states, sends } = useMemo(simulate, []);
  const [step, setStep] = useState(reducedMotion ? states.length - 1 : 0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!playing || !auto) return;
    const last = step === states.length - 1;
    const t = setTimeout(() => setStep(last ? 0 : step + 1), last ? HOLD_MS : STEP_MS);
    return () => clearTimeout(t);
  }, [playing, auto, step, states.length]);

  const state = states[step];
  const active = sends[step];
  const sentChunks = Math.max(0, step);

  return (
    <div>
      <style>{`
        .ar-dot { animation: ar-move ${STEP_MS / 1000}s ease-in-out both; }
        @keyframes ar-move { from { transform: translateX(0) } to { transform: translateX(var(--ar-dx)) } }
      `}</style>
      <svg viewBox="0 0 680 256" role="img" aria-label={`Ring all-reduce across four GPUs, ${STEP_TEXT[step].title}`} className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {Array.from({ length: N }, (_, g) => {
          const x = X0 + g * COL;
          return (
            <g key={g}>
              <text x={x + BOX_W / 2} y={22} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
                GPU {g + 1}
              </text>
              <rect x={x} y={Y0} width={BOX_W} height={N * ROW + 10} rx={8} fill={C.wash} stroke={C.line} />
              {CHUNKS.map((name, k) => {
                const y = Y0 + 8 + k * ROW;
                const count = state[g][k];
                const sending = active.some((a) => a.from === g && a.chunk === k);
                const receiving = active.some((a) => (a.from + 1) % N === g && a.chunk === k);
                return (
                  <g key={k}>
                    <text x={x + 12} y={y + 19} fontSize={15} fontWeight={700} fill={C.muted} fontFamily={FONT.mono}>
                      {name}
                    </text>
                    {Array.from({ length: N }, (_, seg) => (
                      <rect
                        key={seg}
                        x={x + 34 + seg * 25}
                        y={y + 4}
                        width={22}
                        height={20}
                        rx={3}
                        fill={seg < count ? (count === N ? C.good : C.primary) : "white"}
                        stroke={seg < count ? "none" : C.grid}
                      />
                    ))}
                    {(sending || receiving) && (
                      <rect x={x + 30} y={y} width={106} height={28} rx={5} fill="none" stroke={sending ? C.active : C.activeSoft} strokeWidth={2.5} strokeDasharray={receiving && !sending ? "4 3" : undefined} />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
        {/* Ring links */}
        {Array.from({ length: N - 1 }, (_, g) => {
          const x1 = X0 + g * COL + BOX_W;
          return <path key={g} d={`M ${x1 + 2} ${Y0 + 76} l ${COL - BOX_W - 6} 0`} stroke={step > 0 ? C.activeSoft : C.line} strokeWidth={3} markerEnd="url(#ar-arrow)" />;
        })}
        <path d={`M ${X0 + 3 * COL + BOX_W / 2} ${Y0 + N * ROW + 12} L ${X0 + 3 * COL + BOX_W / 2} ${Y0 + N * ROW + 34} L ${X0 + BOX_W / 2} ${Y0 + N * ROW + 34} L ${X0 + BOX_W / 2} ${Y0 + N * ROW + 16}`} fill="none" stroke={step > 0 ? C.activeSoft : C.line} strokeWidth={3} markerEnd="url(#ar-arrow)" />
        <text x={340} y={Y0 + N * ROW + 54} textAnchor="middle" fontSize={13} fill={C.muted}>
          ring: each GPU sends only to its right-hand neighbour
        </text>
        <defs>
          <marker id="ar-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.line} />
          </marker>
        </defs>
        {/* Moving dots on the links during a step */}
        {step > 0 &&
          playing &&
          Array.from({ length: N - 1 }, (_, g) => {
            const x1 = X0 + g * COL + BOX_W + 2;
            return (
              <circle key={`${step}-${g}`} cx={x1} cy={Y0 + 76} r={6} fill={C.active} className="ar-dot" style={{ ["--ar-dx" as string]: `${COL - BOX_W - 8}px` }} />
            );
          })}
      </svg>

      <div role="group" aria-label="Step" className="mt-2 flex flex-wrap gap-1">
        {STEP_TEXT.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setAuto(false);
              setStep(i);
            }}
            aria-pressed={step === i}
            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${step === i ? "bg-[#2b6ec4] text-white" : "bg-[#f1efe4] text-pencil hover:bg-[#e8e5d6]"}`}
          >
            {i === 0 ? "Start" : i <= 3 ? `RS ${i}` : `AG ${i - 3}`}
          </button>
        ))}
      </div>
      <div className="mt-2 text-sm font-semibold text-ink">{STEP_TEXT[step].title}</div>
      <p className="mt-0.5 text-sm leading-relaxed text-pencil">{STEP_TEXT[step].text}</p>
      <p className="mt-1 text-xs text-pencil">
        Sent so far by each GPU: <span className="font-mono text-ink">{sentChunks}</span> chunk{sentChunks === 1 ? "" : "s"} ={" "}
        <span className="font-mono text-ink">{(sentChunks / N).toFixed(2)}×</span> its gradient. Bars: how many GPUs&apos; contributions a chunk
        holds (green = all four).
      </p>
    </div>
  );
}
