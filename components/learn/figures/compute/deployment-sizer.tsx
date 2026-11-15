"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * Self-hosting sizer (B10). Pick a model, precision, hardware, context per user,
 * concurrent users, rental price and average utilisation; see how many devices it
 * takes and a back-of-envelope decode speed and cost per million output tokens.
 *
 * Assumptions (stated in the UI):
 * - Memory = (weights + KV cache) × 1.1 for activations and runtime overhead.
 *   Weights: total params × bytes (BF16 2, FP8 1, 4-bit ≈ 0.56 incl. block scales).
 *   KV per token = 2 × layers × KV heads × head dim × bytes (2 for BF16, else 1 = FP8 cache).
 * - Devices: smallest of 1, 2, 4, 8 per server (tensor parallel), then whole 8-GPU servers.
 * - Decode step = max(bytes read ÷ total bandwidth, FLOPs ÷ total peak), where bytes read =
 *   active params × bytes + all users' KV cache and FLOPs = 2 × active params × users;
 *   real engines reach ~50% of that ideal (EFFICIENCY).
 * - Cost per 1M output tokens = devices × $/hour ÷ (tokens/s × 3,600) × 10⁶ ÷ utilisation.
 * Architectures: 8B (32 layers, 8 KV heads × 128), 32B (64, 8 × 128), 70B (80, 8 × 128),
 * 405B (126, 8 × 128), MoE 117B total / 5.1B active (36, 8 × 64).
 */

const MODELS = {
  "8b": { label: "8B", total: 8e9, active: 8e9, layers: 32, kv: 8, hd: 128 },
  "32b": { label: "32B", total: 32.8e9, active: 32.8e9, layers: 64, kv: 8, hd: 128 },
  "70b": { label: "70B", total: 70.6e9, active: 70.6e9, layers: 80, kv: 8, hd: 128 },
  moe: { label: "MoE 117B (5B active)", total: 117e9, active: 5.1e9, layers: 36, kv: 8, hd: 64 },
  "405b": { label: "405B", total: 405e9, active: 405e9, layers: 126, kv: 8, hd: 128 },
} as const;
type ModelId = keyof typeof MODELS;

const PRECISIONS = {
  bf16: { label: "BF16", w: 2, kv: 2, fp8: false },
  fp8: { label: "FP8", w: 1, kv: 1, fp8: true },
  int4: { label: "4-bit", w: 0.5625, kv: 1, fp8: true },
} as const;
type PrecId = keyof typeof PRECISIONS;

const HW = {
  h100: { label: "H100 80 GB", mem: 80e9, bw: 3.35e12, bf16: 990e12, fp8: 1979e12, price: 2.5, multi: true },
  h200: { label: "H200 141 GB", mem: 141e9, bw: 4.8e12, bf16: 990e12, fp8: 1979e12, price: 3.5, multi: true },
  b200: { label: "B200 180 GB", mem: 180e9, bw: 8e12, bf16: 2250e12, fp8: 4500e12, price: 5, multi: true },
  laptop: { label: "Laptop 64 GB", mem: 64e9, bw: 0.4e12, bf16: 25e12, fp8: 25e12, price: 0, multi: false },
} as const;
type HwId = keyof typeof HW;

const CONTEXTS = [2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000];
const USERS = [1, 2, 4, 8, 16, 32, 64, 128, 256];
const OVERHEAD = 1.1;
const EFFICIENCY = 0.5;

const gb = (b: number) => (b >= 1e12 ? `${(b / 1e12).toFixed(2)} TB` : b >= 100e9 ? `${Math.round(b / 1e9)} GB` : `${(b / 1e9).toFixed(1)} GB`);
const fmtK = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));
const fmtRate = (r: number) => (r >= 100 ? Math.round(r).toLocaleString("en-US") : r.toFixed(r >= 10 ? 0 : 1));
const fmtUsd = (x: number) => (x >= 100 ? `$${Math.round(x).toLocaleString("en-US")}` : x >= 1 ? `$${x.toFixed(2)}` : `$${x.toFixed(3)}`);

export function sizeDeployment(modelId: ModelId, precId: PrecId, hwId: HwId, context: number, users: number, price: number, util: number) {
  const m = MODELS[modelId];
  const p = PRECISIONS[precId];
  const h = HW[hwId];
  const weights = m.total * p.w;
  const kvPerToken = 2 * m.layers * m.kv * m.hd * p.kv;
  const kv = kvPerToken * context * users;
  const total = (weights + kv) * OVERHEAD;
  let devices = Math.ceil(total / h.mem);
  const fits = h.multi || devices <= 1;
  if (h.multi) devices = devices <= 1 ? 1 : devices <= 2 ? 2 : devices <= 4 ? 4 : devices <= 8 ? 8 : Math.ceil(devices / 8) * 8;
  else devices = 1;
  const bytesRead = m.active * p.w + kv;
  const flops = 2 * m.active * users;
  const peak = p.fp8 ? h.fp8 : h.bf16;
  const memTime = bytesRead / (devices * h.bw);
  const computeTime = flops / (devices * peak);
  const step = Math.max(memTime, computeTime) / EFFICIENCY;
  const perUser = 1 / step;
  const aggregate = users * perUser;
  const costFull = h.price > 0 ? ((devices * price) / (aggregate * 3600)) * 1e6 : 0;
  const prefill = (2 * m.active * context) / (devices * peak * EFFICIENCY);
  return { weights, kv, kvPerToken, total, devices, fits, perUser, aggregate, costFull, cost: costFull / util, memoryBound: memTime >= computeTime, prefill };
}

export default function DeploymentSizer() {
  const [model, setModel] = useState<ModelId>("70b");
  const [prec, setPrec] = useState<PrecId>("fp8");
  const [hw, setHw] = useState<HwId>("h100");
  const [ctxI, setCtxI] = useState(2);
  const [userI, setUserI] = useState(5);
  const [price, setPrice] = useState<number>(HW.h100.price);
  const [util, setUtil] = useState(50);
  const h = HW[hw];
  const context = CONTEXTS[ctxI];
  const users = USERS[userI];
  const s = sizeDeployment(model, prec, hw, context, users, price, util / 100);

  const shown = Math.min(s.devices, 16);
  const perBox = s.total / s.devices;
  const boxW = 36;
  const gap = 6;

  return (
    <div>
      <Controls>
        <ChoiceButtons label="Model" value={model} onChange={setModel} options={(Object.keys(MODELS) as ModelId[]).map((id) => ({ id, label: MODELS[id].label }))} />
        <ChoiceButtons label="Precision" value={prec} onChange={setPrec} options={(Object.keys(PRECISIONS) as PrecId[]).map((id) => ({ id, label: PRECISIONS[id].label }))} />
        <ChoiceButtons
          label="Hardware"
          value={hw}
          onChange={(id) => {
            setHw(id);
            if (HW[id].price > 0) setPrice(HW[id].price);
          }}
          options={(Object.keys(HW) as HwId[]).map((id) => ({ id, label: HW[id].label }))}
        />
      </Controls>
      <Controls>
        <Slider label="Context per user" value={ctxI} min={0} max={CONTEXTS.length - 1} step={1} onChange={setCtxI} format={(i) => `${fmtK(CONTEXTS[i])} tokens`} />
        <Slider label="Users generating at once" value={userI} min={0} max={USERS.length - 1} step={1} onChange={setUserI} format={(i) => String(USERS[i])} />
      </Controls>
      {h.price > 0 && (
        <Controls>
          <Slider label="Rental price per GPU-hour" value={price} min={1} max={8} step={0.25} onChange={setPrice} format={(v) => `$${v.toFixed(2)}`} />
          <Slider label="Average utilisation" value={util} min={5} max={100} step={5} onChange={setUtil} format={(v) => `${v}%`} />
        </Controls>
      )}

      <div className="mt-4 rounded-lg border border-ink/20 bg-paper p-3">
        {!s.fits ? (
          <p className="text-sm font-semibold text-rose-700">
            Does not fit: needs {gb(s.total)} but the laptop has 64 GB of memory. Try 4-bit, a smaller model, fewer users or a shorter context.
          </p>
        ) : (
          <>
            <div className="text-sm font-semibold text-ink">
              {gb(s.total)} → {s.devices} × {h.label}
              {s.devices > 8 && ` (${s.devices / 8} servers)`}
            </div>
            <svg viewBox={`0 0 ${shown * (boxW + gap)} 50`} role="img" aria-label={`${s.devices} devices, each about ${Math.round((perBox / h.mem) * 100)}% full`} className="mt-2 block h-auto w-full" style={{ fontFamily: FONT.sans, maxWidth: `${shown * (boxW + gap) * 1.2}px` }}>
              {Array.from({ length: shown }, (_, i) => {
                const x = i * (boxW + gap);
                const fillW = (s.weights * OVERHEAD) / s.devices / h.mem;
                const fillK = (s.kv * OVERHEAD) / s.devices / h.mem;
                return (
                  <g key={i}>
                    <rect x={x} y={2} width={boxW} height={44} rx={4} fill="white" stroke={C.line} />
                    <rect x={x + 3} y={46 - 3 - 38 * Math.min(fillW, 1)} width={boxW - 6} height={38 * Math.min(fillW, 1)} fill={C.primary} opacity={0.85} />
                    <rect x={x + 3} y={46 - 3 - 38 * Math.min(fillW + fillK, 1)} width={boxW - 6} height={38 * Math.max(0, Math.min(fillK, 1 - fillW))} fill={C.warn} opacity={0.85} />
                  </g>
                );
              })}
            </svg>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="text-[#2b6ec4]">■ weights {gb(s.weights)}</span>
              <span className="text-amber-700">
                ■ KV cache {gb(s.kv)} ({(s.kvPerToken / 1e3).toFixed(0)} KB per token)
              </span>
              {s.devices > shown && <span className="text-pencil">showing {shown} of {s.devices}</span>}
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-pencil">Speed per user</dt>
              <dd className={`font-semibold ${s.perUser < 10 ? "text-rose-700" : "text-ink"}`}>
                ≈ {fmtRate(s.perUser)} tokens/s{s.perUser < 10 ? " (too slow for comfortable chat)" : ""}
              </dd>
              <dt className="text-pencil">Total throughput</dt>
              <dd className="font-semibold text-ink">
                ≈ {fmtRate(s.aggregate)} tokens/s <span className="font-normal text-pencil">({s.memoryBound ? "memory-bound" : "compute-bound"})</span>
              </dd>
              <dt className="text-pencil">Full-context prompt</dt>
              <dd className="text-ink">≈ {s.prefill < 1 ? `${Math.round(s.prefill * 1000)} ms` : `${s.prefill.toFixed(1)} s`} to prefill</dd>
              {h.price > 0 && (
                <>
                  <dt className="text-pencil">Cost per 1M output tokens</dt>
                  <dd className="font-semibold text-emerald-700">
                    ≈ {fmtUsd(s.cost)} <span className="font-normal text-pencil">at {util}% utilisation ({fmtUsd(s.costFull)} if always full)</span>
                  </dd>
                </>
              )}
            </dl>
          </>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-pencil/70">
        Back-of-envelope. Memory = (weights + KV cache) × 1.1; KV cache in FP8 unless BF16 is chosen. Decode speed is the roofline ideal (weights
        of the active parameters plus every user&apos;s cache read each step) at 50% efficiency; no speculative decoding, prefix caching or
        prefill load. For the MoE model, a large batch touches more experts per step than one token does, so its many-user speed is optimistic.
        Rental prices vary widely by provider and contract; the defaults are illustrative, rough 2026 figures. The laptop assumes about
        400 GB/s of unified memory bandwidth.
      </p>
    </div>
  );
}
