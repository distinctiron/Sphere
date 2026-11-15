"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * What one million output tokens costs to serve (D5). Interactive.
 * Same idealised roofline model as the inference lesson's KV-cache calculator
 * (B8): a decode step reads all weights once plus every sequence's KV cache
 * and does 2 FLOPs per parameter per sequence; step time is the larger of
 * memory time and compute time on the fewest 80 GB GPUs that hold it all.
 * Cost per token = GPU-hours rented ÷ tokens produced, where utilisation is
 * the share of paid hours actually spent decoding at this batch size.
 * Context is fixed at 2,000 tokens per sequence.
 */

const MODELS = {
  "8b": { label: "8B model", params: 8.0e9, layers: 32, kvHeads: 8, headDim: 128 },
  "70b": { label: "70B model", params: 70.6e9, layers: 80, kvHeads: 8, headDim: 128 },
} as const;
type ModelId = keyof typeof MODELS;

const BYTES = 2;
const GPU_MEM = 80e9;
const GPU_BW = 3.35e12;
const GPU_FLOPS = 990e12;
const CONTEXT = 2000;

function serve(modelId: ModelId, batch: number) {
  const m = MODELS[modelId];
  const weights = m.params * BYTES;
  const kv = 2 * m.layers * m.kvHeads * m.headDim * BYTES * CONTEXT * batch;
  const total = weights + kv;
  const gpus = Math.max(1, Math.ceil(total / GPU_MEM));
  const step = Math.max(total / (gpus * GPU_BW), (2 * m.params * batch) / (gpus * GPU_FLOPS));
  return { gpus, tokensPerSec: batch / step };
}

function costPerMillion(modelId: ModelId, batch: number, price: number, util: number) {
  const s = serve(modelId, batch);
  const tokensPerHour = s.tokensPerSec * 3600 * util;
  return { ...s, cost: ((s.gpus * price) / tokensPerHour) * 1e6 };
}

const fmt$ = (v: number) => (v >= 10 ? `$${v.toFixed(0)}` : v >= 1 ? `$${v.toFixed(2)}` : v >= 0.1 ? `$${v.toFixed(2)}` : `$${v.toFixed(3)}`);

const W = 680;
const AX0 = 40;
const AX1 = 640;
const LMIN = -2; // $0.01
const LMAX = 2; // $100
const xOf = (v: number) => AX0 + ((Math.log10(Math.min(Math.max(v, 10 ** LMIN), 10 ** LMAX)) - LMIN) / (LMAX - LMIN)) * (AX1 - AX0);

export default function TokenCostCalculator() {
  const [model, setModel] = useState<ModelId>("8b");
  const [batch, setBatch] = useState(1);
  const [price, setPrice] = useState(2);
  const [util, setUtil] = useState(60);
  const now = costPerMillion(model, batch, price, util / 100);
  const solo = costPerMillion(model, 1, price, util / 100);
  const ratio = solo.cost / now.cost;

  return (
    <div>
      <div className="mb-1 text-sm font-semibold text-ink">
        Cost to serve: <span className="font-mono text-rose-700">{fmt$(now.cost)}</span> per million output tokens
      </div>
      <svg viewBox={`0 0 ${W} 104`} role="img" aria-label="Log-scale axis of cost per million output tokens, from one cent to one hundred dollars, with the current setting marked" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <line x1={AX0} x2={AX1} y1={60} y2={60} stroke={C.line} strokeWidth={2} />
        {[-2, -1, 0, 1, 2].map((e) => (
          <g key={e}>
            <line x1={xOf(10 ** e)} x2={xOf(10 ** e)} y1={54} y2={66} stroke={C.faint} />
            <text x={xOf(10 ** e)} y={92} textAnchor="middle" fontSize={18} fill={C.muted}>
              {["$0.01", "$0.10", "$1", "$10", "$100"][e + 2]}
            </text>
          </g>
        ))}
        {batch > 1 && (
          <g>
            <circle cx={xOf(solo.cost)} cy={60} r={7} fill="white" stroke={C.faint} strokeWidth={2} />
            <text x={xOf(solo.cost)} y={38} textAnchor="middle" fontSize={16} fill={C.muted}>
              batch 1
            </text>
          </g>
        )}
        <circle cx={xOf(now.cost)} cy={60} r={9} fill={C.active} style={{ transition: "cx .25s ease" }} />
        <text x={Math.min(Math.max(xOf(now.cost), 80), 600)} y={22} textAnchor="middle" fontSize={18} fontWeight={700} fill={C.active} style={{ transition: "x .25s ease" }}>
          {fmt$(now.cost)} / M
        </text>
      </svg>
      <p className="mt-1 text-sm text-pencil">
        {now.gpus} GPU{now.gpus > 1 ? "s" : ""} × ${price.toFixed(2)}/hour produce about{" "}
        <span className="font-mono">{Math.round(now.tokensPerSec).toLocaleString("en-US")}</span> tokens/s while decoding, busy {util}% of paid hours.
        {batch > 1 && (
          <>
            {" "}
            Batching {batch} sequences makes each token <span className="font-semibold">{ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×</span>{" "}
            cheaper than serving one at a time.
          </>
        )}
      </p>
      <Controls>
        <ChoiceButtons label="Model" value={model} onChange={setModel} options={(Object.keys(MODELS) as ModelId[]).map((id) => ({ id, label: MODELS[id].label }))} />
        <Slider label="Sequences decoding together (batch)" value={batch} min={1} max={256} step={1} onChange={setBatch} />
        <Slider label="GPU rental price" value={price} min={1} max={6} step={0.25} onChange={setPrice} format={(v) => `$${v.toFixed(2)}/h`} />
        <Slider label="Utilisation (share of paid hours busy)" value={util} min={10} max={100} step={5} onChange={setUtil} format={(v) => `${v}%`} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Idealised roofline, as in the inference lesson: BF16, H100-class GPUs (80 GB, 3.35 TB/s, 990 TFLOP/s), 2,000 tokens of context per sequence,
        perfect scaling. Excludes prefill, power, networking, staff and profit. Real deployments reach noticeably less throughput.
      </p>
    </div>
  );
}
