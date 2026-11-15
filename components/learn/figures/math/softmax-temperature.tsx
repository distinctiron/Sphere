"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * Softmax with temperature, and surprise (A4). Six candidate next words for
 * "The cat sat on the …" with fixed logits. p_i = exp(z_i/T) / Σ exp(z_j/T).
 * At T = 1: mat 0.490, floor 0.220, sofa 0.148, bed 0.099, roof 0.036, moon 0.007;
 * entropy 1.35 nats (uniform over six words: ln 6 = 1.79).
 * The reader picks which word actually came next; its surprise −ln p is read
 * off the curve on the right.
 */

const TOKENS = [
  { id: "mat", z: 3.2 },
  { id: "floor", z: 2.4 },
  { id: "sofa", z: 2.0 },
  { id: "bed", z: 1.6 },
  { id: "roof", z: 0.6 },
  { id: "moon", z: -1.0 },
] as const;
type TokenId = (typeof TOKENS)[number]["id"];

const tempFromSlider = (s: number) => 0.1 * Math.pow(30, s / 100);
const S_AT_1 = (100 * Math.log(10)) / Math.log(30);

export function softmax(logits: number[], T: number) {
  const scaled = logits.map((z) => z / T);
  const max = Math.max(...scaled);
  const e = scaled.map((v) => Math.exp(v - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

const fmt = (v: number, d = 2) => v.toFixed(d).replace("-", "−");
const pctText = (p: number) => (p >= 0.995 ? "≈100%" : p >= 0.1 ? `${(p * 100).toFixed(0)}%` : p >= 0.001 ? `${(p * 100).toFixed(1)}%` : "<0.1%");


// Surprise curve geometry
const SW = 320;
const SH = 210;
const SX0 = 48;
const SX1 = 300;
const SY0 = 170;
const SY1 = 20;
const SMAX = 5;
const sx = (p: number) => SX0 + p * (SX1 - SX0);
const sy = (s: number) => SY0 - (Math.min(s, SMAX) / SMAX) * (SY0 - SY1);

const surpriseCurve = Array.from({ length: 121 }, (_, i) => {
  const p = Math.exp(-SMAX) + (1 - Math.exp(-SMAX)) * (i / 120) ** 2;
  return `${i ? "L" : "M"}${sx(p).toFixed(1)},${sy(-Math.log(p)).toFixed(1)}`;
}).join(" ");

export default function SoftmaxTemperatureFigure() {
  const [s, setS] = useState(S_AT_1);
  const [truth, setTruth] = useState<TokenId>("floor");
  const T = tempFromSlider(s);
  const probs = softmax(
    TOKENS.map((t) => t.z),
    T
  );
  const entropy = -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
  const ti = TOKENS.findIndex((t) => t.id === truth);
  const pTrue = probs[ti];
  const surprise = -Math.log(Math.max(pTrue, 1e-300));
  const offChart = surprise > SMAX;

  return (
    <div>
      <div className="mb-1 text-sm text-pencil">
        Next word after <span className="font-medium text-ink">“The cat sat on the …”</span>
      </div>
      <div role="group" aria-label="Logits for six candidate words, divided by the temperature and turned into probabilities by softmax" className="grid grid-cols-[3.5rem_2.75rem_3.25rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[5rem_4rem_4.5rem_minmax(0,1fr)]">
        {["word", "logit z", "z ÷ T", "probability"].map((h, i) => (
          <div key={h} className={`text-xs font-semibold text-pencil ${i === 1 || i === 2 ? "text-right" : ""}`}>
            {h}
          </div>
        ))}
        {TOKENS.map((t, i) => {
          const p = probs[i];
          const isTrue = t.id === truth;
          return (
            <div key={t.id} className="contents">
              <div className={`text-sm sm:text-base ${isTrue ? "font-bold text-rose-600" : "font-medium text-ink"}`}>{t.id}</div>
              <div className="text-right font-mono text-sm text-pencil">{fmt(t.z, 1)}</div>
              <div className="text-right font-mono text-sm text-pencil">{Math.abs(t.z / T) >= 100 ? fmt(t.z / T, 0) : fmt(t.z / T, 1)}</div>
              <div className="flex min-w-0 items-center gap-2">
                <div className="h-5 min-w-0 flex-1 rounded bg-paper sm:h-6">
                  <div
                    className="h-full rounded"
                    style={{ width: `${Math.max(p * 100, 0.6)}%`, background: isTrue ? C.active : C.primary, opacity: isTrue ? 0.9 : 0.8 }}
                  />
                </div>
                <span className={`w-12 flex-shrink-0 text-right text-sm font-semibold tabular-nums ${isTrue ? "text-rose-600" : "text-pencil"}`}>{pctText(p)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid items-center gap-4 sm:grid-cols-[minmax(0,16rem)_1fr]">
        <svg viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label="Surprise, minus the log of the probability given to the word that came next, rising steeply as that probability falls toward zero" className="block h-auto w-full max-w-[18rem] justify-self-center" style={{ fontFamily: FONT.sans }}>
          <line x1={SX0} y1={SY0} x2={SX1} y2={SY0} stroke={C.line} />
          <line x1={SX0} y1={SY0} x2={SX0} y2={SY1} stroke={C.line} />
          {[0, 0.5, 1].map((p) => (
            <text key={p} x={sx(p)} y={SY0 + 18} textAnchor="middle" fontSize={13} fill={C.muted}>
              {p}
            </text>
          ))}
          {[0, 2, 4].map((v) => (
            <text key={v} x={SX0 - 8} y={sy(v) + 4} textAnchor="end" fontSize={13} fill={C.muted}>
              {v}
            </text>
          ))}
          <text x={(SX0 + SX1) / 2} y={SH - 4} textAnchor="middle" fontSize={13} fill={C.muted}>
            p given to the true word
          </text>
          <text x={SX0 + 8} y={SY1 - 4} fontSize={13} fill={C.muted}>
            surprise −ln p (nats)
          </text>
          <path d={surpriseCurve} fill="none" stroke={C.warn} strokeWidth={2.5} />
          <line x1={sx(pTrue)} y1={SY0} x2={sx(pTrue)} y2={sy(surprise)} stroke={C.active} strokeDasharray="4 4" />
          <line x1={SX0} y1={sy(surprise)} x2={sx(pTrue)} y2={sy(surprise)} stroke={C.active} strokeDasharray="4 4" />
          <circle cx={sx(pTrue)} cy={sy(surprise)} r={6} fill={C.active} stroke="white" strokeWidth={1.5} />
          {offChart && (
            <text x={sx(pTrue) + 10} y={SY1 + 14} fontSize={13} fontWeight={700} fill={C.active}>
              ↑ off the chart
            </text>
          )}
        </svg>
        <div className="min-w-0 space-y-1.5 text-sm leading-relaxed text-pencil">
          <p>
            The word that actually came next was <span className="font-semibold text-rose-700">{truth}</span>. The model gave it{" "}
            <span className="font-mono">p = {pTrue < 0.0001 ? pTrue.toExponential(1) : fmt(pTrue, 3)}</span>, a surprise of{" "}
            <span className="font-mono font-semibold text-amber-700">−ln p = {fmt(surprise)} nats</span>.
          </p>
          <p>
            Entropy of the prediction: <span className="font-mono">{fmt(entropy)} nats</span> (0 = certain; six equally likely words ={" "}
            <span className="font-mono">ln 6 = 1.79</span>).
          </p>
          <p className="text-xs text-pencil">
            {T < 0.3
              ? "Low temperature: small logit gaps become huge, so nearly all probability goes to the top word."
              : T > 1.8
                ? "High temperature: logit gaps shrink, so the distribution flattens towards uniform."
                : "Around T = 1 the logits are used as trained."}
          </p>
        </div>
      </div>

      <Controls>
        <Slider label="Temperature T" value={s} min={0} max={100} step={1} onChange={setS} format={(v) => fmt(tempFromSlider(v))} />
        <div className="flex flex-col gap-1 text-xs text-pencil">
          <span className="font-medium">Word that actually came next</span>
          <ChoiceButtons label="True next word" value={truth} onChange={setTruth} options={TOKENS.map((t) => ({ id: t.id, label: t.id }))} />
        </div>
      </Controls>
    </div>
  );
}
