"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, Slider } from "../kit";

/**
 * KV cache and decode speed calculator (B8). Idealised roofline model:
 * a decode step reads all weights once plus every active sequence's KV cache,
 * and does 2 FLOPs per parameter per sequence. Step time is the larger of the
 * memory time and the compute time, on the smallest number of 80 GB GPUs that
 * hold weights + cache, assuming perfect parallelism and no overheads.
 */

const MODELS = {
  "8b": { label: "8B model", params: 8.0e9, layers: 32, kvHeads: 8, headDim: 128 },
  "70b": { label: "70B model", params: 70.6e9, layers: 80, kvHeads: 8, headDim: 128 },
} as const;
type ModelId = keyof typeof MODELS;

const BYTES = 2; // BF16
const GPU_MEM = 80e9;
const GPU_BW = 3.35e12;
const GPU_FLOPS = 990e12;
const CONTEXTS = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 64_000, 128_000];

const gb = (bytes: number) => (bytes >= 100e9 ? `${Math.round(bytes / 1e9)} GB` : `${(bytes / 1e9).toFixed(1)} GB`);
const fmtTokens = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n));
const fmtRate = (r: number) => (r >= 100 ? Math.round(r).toLocaleString("en-US") : r.toFixed(r >= 10 ? 0 : 1));

export function kvStats(modelId: ModelId, context: number, batch: number) {
  const m = MODELS[modelId];
  const weights = m.params * BYTES;
  const kvPerToken = 2 * m.layers * m.kvHeads * m.headDim * BYTES; // K and V, every layer
  const kvTotal = kvPerToken * context * batch;
  const total = weights + kvTotal;
  const gpus = Math.max(1, Math.ceil(total / GPU_MEM));
  const memTime = total / (gpus * GPU_BW);
  const computeTime = (2 * m.params * batch) / (gpus * GPU_FLOPS);
  const step = Math.max(memTime, computeTime);
  return { weights, kvPerToken, kvTotal, total, gpus, memTime, computeTime, perUser: 1 / step, aggregate: batch / step, memoryBound: memTime >= computeTime };
}

export default function KvCacheCalculator() {
  const [model, setModel] = useState<ModelId>("8b");
  const [ctxIndex, setCtxIndex] = useState(3);
  const [batch, setBatch] = useState(1);
  const context = CONTEXTS[ctxIndex];
  const s = kvStats(model, context, batch);

  const W = 640;
  const scale = (bytes: number) => (bytes / Math.max(s.gpus * GPU_MEM, s.total)) * W;
  const wWidth = scale(s.weights);
  const kvWidth = scale(s.kvTotal);

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-ink">
        Memory needed: {gb(s.total)} → {s.gpus} × 80 GB GPU{s.gpus > 1 ? "s" : ""}
      </div>
      <svg viewBox={`0 0 ${W} 60`} role="img" aria-label="Stacked bar of model weights and KV cache against GPU memory" className="block h-auto w-full">
        <rect x={0} y={8} width={W} height={44} rx={6} fill={C.wash} stroke={C.grid} />
        <rect x={0} y={8} width={wWidth} height={44} rx={6} fill={C.primary} opacity={0.85} />
        <rect x={wWidth} y={8} width={Math.max(kvWidth, 1)} height={44} fill={C.warn} opacity={0.85} />
        {Array.from({ length: s.gpus - 1 }, (_, i) => {
          const x = scale((i + 1) * GPU_MEM);
          return <line key={i} x1={x} y1={2} x2={x} y2={58} stroke={C.ink} strokeDasharray="3 3" />;
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-[#2b6ec4]">■ weights {gb(s.weights)}</span>
        <span className="text-amber-700">
          ■ KV cache {gb(s.kvTotal)} ({(s.kvPerToken / 1e6).toFixed(2)} MB per token)
        </span>
        {s.gpus > 1 && <span className="text-pencil">┆ = one 80 GB GPU</span>}
      </div>
      <p className="mt-3 text-sm text-pencil">
        One decode step reads all of it: {gb(s.total)} ÷ ({s.gpus} × 3.35 TB/s) ={" "}
        <span className="font-mono">{(s.memTime * 1000).toFixed(1)} ms</span> of memory time, versus{" "}
        <span className="font-mono">{(s.computeTime * 1000).toFixed(2)} ms</span> of arithmetic for {batch} token{batch > 1 ? "s" : ""}.
      </p>
      <p className={`mt-1 text-sm font-semibold ${s.memoryBound ? "text-rose-700" : "text-emerald-700"}`}>
        {s.memoryBound ? "Memory-bound" : "Compute-bound"}: ≈ {fmtRate(s.perUser)} tokens/s per user · ≈ {fmtRate(s.aggregate)} tokens/s in total
      </p>
      <Controls>
        <ChoiceButtons
          label="Model"
          value={model}
          onChange={setModel}
          options={(Object.keys(MODELS) as ModelId[]).map((id) => ({ id, label: MODELS[id].label }))}
        />
        <Slider label="Context per user" value={ctxIndex} min={0} max={CONTEXTS.length - 1} step={1} onChange={setCtxIndex} format={(i) => `${fmtTokens(CONTEXTS[i])} tokens`} />
        <Slider label="Users decoding at once (batch)" value={batch} min={1} max={256} step={1} onChange={setBatch} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Idealised: BF16, H100-class GPUs (80 GB, 3.35 TB/s, 990 TFLOP/s), perfect scaling, no overheads. Real systems get noticeably less.
      </p>
    </div>
  );
}
