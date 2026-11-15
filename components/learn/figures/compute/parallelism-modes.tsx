"use client";

import { useState } from "react";
import { C, ChoiceButtons, FONT } from "../kit";

/**
 * Three ways to split training across 4 GPUs (B5). Interactive choice.
 * Model = 4 layers (bars), batch = 4 shards (coloured squares).
 *   Data parallel: every GPU holds the whole model and a quarter of the batch;
 *     gradients are all-reduced once per step.
 *   Tensor parallel: every GPU holds a quarter of every layer's matrices and sees
 *     the whole batch; partial activations are combined in every layer.
 *   Pipeline parallel: GPU g holds layer g; the batch flows through in micro-batches,
 *     passing activations forward (and gradients back) between neighbours.
 * Memory readout: 70B parameters × 16 bytes (BF16 weights and gradients, FP32
 * master weights and two Adam moments) = 1,120 GB of training state, before activations.
 */

type Mode = "data" | "tensor" | "pipeline";
const SHARD = [C.primary, C.active, C.warn, C.good];
const X0 = 14;
const COL = 168;
const BW = 144;
const BY = 40;
const BH = 130;

const INFO: Record<Mode, { holds: string; talks: string; where: string; mem: string }> = {
  data: {
    holds: "The whole model, and a quarter of the batch.",
    talks: "Gradients, once per training step (an all-reduce of the full gradient).",
    where: "Tolerates slower links, so it spans nodes and the whole cluster. Sharding the weights, gradients and optimizer state across the copies (FSDP or ZeRO) removes the duplication at the cost of more traffic.",
    mem: "1,120 GB per GPU as drawn (every GPU keeps a full copy); 280 GB if the state is sharded four ways.",
  },
  tensor: {
    holds: "A quarter of every layer's weight matrices, and the whole batch.",
    talks: "Partial activations, in every layer, forward and backward.",
    where: "Very frequent, latency-sensitive traffic: kept inside one NVLink domain (a server or a rack).",
    mem: "280 GB per GPU.",
  },
  pipeline: {
    holds: "A quarter of the layers (one stage), and the batch in micro-batches.",
    talks: "Activations to the next stage, gradients back to the previous one: point to point.",
    where: "Modest traffic between neighbours, so stages can sit on different nodes. Stages wait while the pipeline fills and drains (the bubble).",
    mem: "280 GB per GPU (plus activations for micro-batches in flight).",
  },
};

export default function ParallelismModesFigure() {
  const [mode, setMode] = useState<Mode>("data");
  const info = INFO[mode];

  return (
    <div>
      <ChoiceButtons
        label="Parallelism"
        value={mode}
        onChange={setMode}
        options={[
          { id: "data", label: "Data parallel" },
          { id: "tensor", label: "Tensor parallel" },
          { id: "pipeline", label: "Pipeline parallel" },
        ]}
      />
      <svg viewBox="0 0 680 262" role="img" aria-label={`How ${mode} parallelism splits a four-layer model and a batch across four GPUs`} className="mt-3 block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <marker id="pm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.active} />
          </marker>
        </defs>
        {Array.from({ length: 4 }, (_, g) => {
          const x = X0 + g * COL;
          return (
            <g key={g}>
              <text x={x + BW / 2} y={24} textAnchor="middle" fontSize={15} fontWeight={700} fill={C.ink}>
                GPU {g + 1}
              </text>
              <rect x={x} y={BY} width={BW} height={BH} rx={8} fill={C.wash} stroke={C.line} />
              {Array.from({ length: 4 }, (_, l) => {
                const y = BY + 14 + l * 28;
                return (
                  <g key={l}>
                    <text x={x + 10} y={y + 15} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                      L{l + 1}
                    </text>
                    <rect x={x + 36} y={y} width={96} height={20} rx={3} fill="white" stroke={C.grid} />
                    {mode === "data" && <rect x={x + 36} y={y} width={96} height={20} rx={3} fill={C.primarySoft} />}
                    {mode === "tensor" && <rect x={x + 36 + g * 24} y={y} width={24} height={20} rx={3} fill={C.primarySoft} />}
                    {mode === "pipeline" && l === g && <rect x={x + 36} y={y} width={96} height={20} rx={3} fill={C.primarySoft} />}
                  </g>
                );
              })}
              {/* Batch shards this GPU works on */}
              {(mode === "data" ? [g] : mode === "tensor" ? [0, 1, 2, 3] : g === 0 ? [0, 1, 2, 3] : []).map((s, i) => (
                <rect key={s} x={x + 36 + i * 24} y={BY + BH + 12} width={20} height={20} rx={4} fill={SHARD[s]} />
              ))}
            </g>
          );
        })}
        <text x={X0} y={BY + BH + 50} fontSize={13} fill={C.muted}>
          {mode === "data" ? "each GPU: a quarter of the batch" : mode === "tensor" ? "every GPU sees the whole batch" : "the batch enters stage 1 in micro-batches"}
        </text>

        {/* Communication */}
        {mode === "data" && (
          <g>
            <path d={`M ${X0 + BW / 2} ${BY + BH + 62} L ${X0 + 3 * COL + BW / 2} ${BY + BH + 62}`} stroke={C.active} strokeWidth={3} markerStart="url(#pm-arrow)" markerEnd="url(#pm-arrow)" />
            <text x={340} y={BY + BH + 84} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.active}>
              all-reduce gradients, once per step
            </text>
          </g>
        )}
        {mode === "tensor" &&
          [0, 1, 2].map((g) => (
            <g key={g}>
              {[0, 1, 2, 3].map((l) => (
                <path key={l} d={`M ${X0 + g * COL + BW + 3} ${BY + 24 + l * 28} l ${COL - BW - 6} 0`} stroke={C.active} strokeWidth={2.5} markerStart="url(#pm-arrow)" markerEnd="url(#pm-arrow)" />
              ))}
            </g>
          ))}
        {mode === "tensor" && (
          <text x={680 - 8} y={BY + BH + 84} textAnchor="end" fontSize={14} fontWeight={700} fill={C.active}>
            combine partial results in every layer
          </text>
        )}
        {mode === "pipeline" &&
          [0, 1, 2].map((g) => (
            <path key={g} d={`M ${X0 + g * COL + BW + 3} ${BY + 24 + g * 28} C ${X0 + g * COL + BW + 14} ${BY + 24 + g * 28}, ${X0 + (g + 1) * COL - 14} ${BY + 24 + (g + 1) * 28}, ${X0 + (g + 1) * COL - 3} ${BY + 24 + (g + 1) * 28}`} fill="none" stroke={C.active} strokeWidth={3} markerEnd="url(#pm-arrow)" />
          ))}
        {mode === "pipeline" && (
          <text x={680 - 8} y={BY + BH + 84} textAnchor="end" fontSize={14} fontWeight={700} fill={C.active}>
            pass activations to the next stage
          </text>
        )}
      </svg>
      <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="font-semibold text-ink">Each GPU holds</dt>
        <dd className="text-pencil">{info.holds}</dd>
        <dt className="font-semibold text-ink">It exchanges</dt>
        <dd className="text-pencil">{info.talks}</dd>
        <dt className="font-semibold text-ink">Where it fits</dt>
        <dd className="text-pencil">{info.where}</dd>
        <dt className="font-semibold text-ink">70B, 4 GPUs</dt>
        <dd className="text-pencil">
          {info.mem} <span className="text-pencil/70">(16 bytes per parameter of training state; activations extra. Either way, far more than one 80 GB GPU.)</span>
        </dd>
      </dl>
    </div>
  );
}
