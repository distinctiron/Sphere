"use client";

import { useMemo, useState } from "react";
import { C, Controls, FigureSvg, Legend, Slider } from "../kit";

/**
 * Preference optimisation on a leash (A15). A 1-D sketch of "behaviour space"
 * for one prompt. Grey: the starting model's distribution π_ref. Amber: the
 * reward model's score, which has learned a real preference (helpful answers)
 * and a flaw (it also loves flattering, confident, wrong answers, which the
 * starting model rarely produces). Indigo: the policy that maximises
 * reward − β·KL(π‖π_ref), which has the closed form π ∝ π_ref · exp(r/β).
 * Pushing harder (smaller β) raises the proxy reward every time, while true
 * quality rises and then collapses: reward hacking.
 */

const N = 400;
const XS = Array.from({ length: N }, (_, i) => (i + 0.5) / N);
const gauss = (x: number, m: number, s: number) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
const bump = (x: number, m: number, s: number) => Math.exp(-0.5 * ((x - m) / s) ** 2);

const REF = (() => {
  const raw = XS.map((x) => 0.45 * gauss(x, 0.2, 0.09) + 0.53 * gauss(x, 0.5, 0.08) + 0.02 * gauss(x, 0.85, 0.04));
  const z = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / z);
})();
const REWARD = XS.map((x) => bump(x, 0.5, 0.1) + 1.3 * bump(x, 0.85, 0.04));
const TRUE_Q = XS.map((x) => bump(x, 0.5, 0.1) - 0.6 * bump(x, 0.85, 0.04));

const betaOf = (push: number) => Math.pow(10, 0.3 - 2 * push);

function policy(push: number) {
  const beta = betaOf(push);
  const w = REF.map((p, i) => p * Math.exp(REWARD[i] / beta));
  const z = w.reduce((a, b) => a + b, 0);
  const pi = w.map((v) => v / z);
  let kl = 0;
  let proxy = 0;
  let quality = 0;
  pi.forEach((p, i) => {
    if (p > 0) kl += p * Math.log(p / REF[i]);
    proxy += p * REWARD[i];
    quality += p * TRUE_Q[i];
  });
  return { beta, pi, kl, proxy, quality };
}

const W = 640;
const TOP = { y: 16, h: 190 };
const LOW = { y: 276, h: 104 };
const H = 408;
const PADX = 16;
const px = (x: number) => PADX + x * (W - 2 * PADX);

export default function KlLeashFigure() {
  const [push, setPush] = useState(0.45);
  const cur = policy(push);
  const sweep = useMemo(() => Array.from({ length: 51 }, (_, i) => ({ s: i / 50, ...policy(i / 50) })), []);

  const yMax = Math.max(...REF, ...cur.pi) * 1.05;
  const dens = (arr: number[]) =>
    `M ${px(0)} ${TOP.y + TOP.h} ` + arr.map((v, i) => `L ${px(XS[i]).toFixed(1)} ${(TOP.y + TOP.h - (v / yMax) * TOP.h).toFixed(1)}`).join(" ") + ` L ${px(1)} ${TOP.y + TOP.h} Z`;
  const rewardLine = REWARD.map((r, i) => `${i ? "L" : "M"} ${px(XS[i]).toFixed(1)} ${(TOP.y + TOP.h - (r / 1.4) * TOP.h * 0.9).toFixed(1)}`).join(" ");

  // Lower chart: proxy reward and true quality against push
  const ly = (v: number) => LOW.y + LOW.h - ((v + 0.7) / 2.1) * LOW.h;
  const lx = (s: number) => PADX + 40 + s * (W - 2 * PADX - 50);
  const line = (key: "proxy" | "quality") => sweep.map((p, i) => `${i ? "L" : "M"} ${lx(p.s).toFixed(1)} ${ly(p[key]).toFixed(1)}`).join(" ");

  return (
    <div>
      <FigureSvg width={W} height={H} label="The policy distribution moving from the starting model toward the reward model’s peaks as optimisation pressure grows, with true quality rising and then falling">
        {/* Upper: distributions over behaviour space */}
        <rect x={PADX} y={TOP.y} width={W - 2 * PADX} height={TOP.h} fill={C.wash} />
        <path d={dens(REF)} fill={C.faint} fillOpacity={0.35} stroke={C.muted} strokeWidth={1.2} />
        <path d={dens(cur.pi)} fill={C.primary} fillOpacity={0.25} stroke={C.primary} strokeWidth={2.2} />
        <path d={rewardLine} fill="none" stroke={C.warn} strokeWidth={2} strokeDasharray="6 4" />
        {[
          { x: 0.2, t: "curt or unhelpful" },
          { x: 0.5, t: "helpful and honest" },
          { x: 0.85, t: "flattering, wrong" },
        ].map((r) => (
          <text key={r.t} x={px(r.x)} y={TOP.y + TOP.h + 20} textAnchor="middle" fontSize={13} fill={C.text}>
            {r.t}
          </text>
        ))}
        <text x={px(0.5)} y={TOP.y + TOP.h + 38} textAnchor="middle" fontSize={13} fill={C.muted}>
          kinds of response to one prompt (a 1-D sketch)
        </text>

        {/* Lower: what the optimiser sees vs what we wanted */}
        <text x={lx(0)} y={LOW.y - 6} fontSize={13} fontWeight={700} fill={C.text}>
          average score as the push grows
        </text>
        <line x1={lx(0)} y1={ly(0)} x2={lx(1)} y2={ly(0)} stroke={C.line} />
        <path d={line("proxy")} fill="none" stroke={C.warn} strokeWidth={2.5} />
        <path d={line("quality")} fill="none" stroke={C.good} strokeWidth={2.5} />
        <line x1={lx(push)} y1={LOW.y - 4} x2={lx(push)} y2={LOW.y + LOW.h} stroke={C.active} strokeDasharray="3 4" />
        <circle cx={lx(push)} cy={ly(cur.proxy)} r={5} fill={C.warn} />
        <circle cx={lx(push)} cy={ly(cur.quality)} r={5} fill={C.good} />
        <text x={lx(0) - 6} y={ly(0) + 4} textAnchor="end" fontSize={13} fill={C.muted}>
          0
        </text>
        <text x={lx(1)} y={LOW.y + LOW.h + 18} textAnchor="end" fontSize={13} fill={C.muted}>
          push harder →
        </text>
        <text x={lx(0)} y={LOW.y + LOW.h + 18} fontSize={13} fill={C.muted}>
          ← tight leash
        </text>
      </FigureSvg>
      <Legend
        items={[
          { color: C.muted, label: "starting model" },
          { color: C.primary, label: "after optimisation" },
          { color: C.warn, label: "reward model’s score", dashed: true },
          { color: C.good, label: "true quality (bottom)" },
        ]}
      />
      <p className="mt-3 text-sm text-pencil">
        β = <span className="font-mono">{cur.beta.toFixed(2)}</span> · drift from the start (KL) ={" "}
        <span className="font-mono">{cur.kl.toFixed(2)}</span> nats · reward model says <span className="font-mono font-semibold text-amber-700">{cur.proxy.toFixed(2)}</span> · true
        quality <span className="font-mono font-semibold text-emerald-700">{cur.quality.toFixed(2)}</span>
      </p>
      <Controls>
        <Slider label="Optimisation pressure (smaller β, looser leash)" value={push} min={0} max={1} step={0.01} onChange={setPush} format={(v) => `${Math.round(v * 100)}%`} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Toy numbers. The optimised policy is the exact solution π ∝ π_ref · exp(reward / β) of “maximise reward minus β × KL from the start”.
      </p>
    </div>
  );
}
