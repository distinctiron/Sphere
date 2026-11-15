"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { C, ChoiceButtons, Controls, Slider } from "../kit";

/**
 * Where a transformer's parameters live (A12). Classic GPT-style block:
 * attention has W_Q, W_K, W_V, W_O (4·d²); the MLP maps d → 4d → d (8·d²);
 * so 12·d² per block. Plus one embedding table of V·d, shared with the output
 * layer (as in GPT-2 and GPT-3). Biases, norms and learned position tables are
 * ignored (under 1%). Presets reproduce GPT-2 small (≈124M) and GPT-3 (≈175B).
 */

const WIDTHS = [512, 768, 1024, 2048, 4096, 5120, 8192, 12288, 16384];
const VOCABS = { "32k": 32_000, "50k": 50_257, "128k": 128_256, "256k": 256_000 } as const;
type VocabId = keyof typeof VOCABS;
const PRESETS = {
  gpt2: { label: "GPT-2 small", w: 1, layers: 12, vocab: "50k" as VocabId },
  gpt3: { label: "GPT-3", w: 7, layers: 96, vocab: "50k" as VocabId },
};

function fmt(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e11 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  return `${Math.round(n / 1e3)}k`;
}
function flops(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} TFLOP`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e11 ? 0 : 1)} GFLOP`;
  return `${(n / 1e6).toFixed(0)} MFLOP`;
}
function bytes(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} TB`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)} GB`;
  return `${Math.round(n / 1e6)} MB`;
}

export default function TransformerParamCountFigure() {
  const [wi, setWi] = useState(4);
  const [layers, setLayers] = useState(32);
  const [vocab, setVocab] = useState<VocabId>("128k");
  const d = WIDTHS[wi];
  const V = VOCABS[vocab];
  const attn = 4 * d * d * layers;
  const mlp = 8 * d * d * layers;
  const emb = V * d;
  const total = attn + mlp + emb;
  const preset = (Object.keys(PRESETS) as Array<keyof typeof PRESETS>).find(
    (k) => PRESETS[k].w === wi && PRESETS[k].layers === layers && PRESETS[k].vocab === vocab
  );

  const segments = [
    { label: "attention", value: attn, color: C.primary, cls: "text-[#2b6ec4]" },
    { label: "MLP", value: mlp, color: C.primarySoft, cls: "text-[#2b6ec4]/70" },
    { label: "embedding table", value: emb, color: C.warn, cls: "text-amber-700" },
  ];

  let x = 0;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-ink">
          ≈ {fmt(total)} parameters{preset ? ` (${PRESETS[preset].label})` : ""}
        </div>
        <div className="text-xs text-pencil">
          per block: 12 × {d.toLocaleString("en-US")}² = {fmt(12 * d * d)}
        </div>
      </div>
      <svg viewBox="0 0 640 44" role="img" aria-label="Stacked bar of attention, MLP and embedding parameters" className="mt-2 block h-auto w-full">
        <rect x={0} y={4} width={640} height={36} rx={6} fill={C.wash} stroke={C.grid} />
        {segments.map((s) => {
          const w = (s.value / total) * 640;
          const el = <rect key={s.label} x={x} y={4} width={Math.max(w, 1)} height={36} fill={s.color} />;
          x += w;
          return el;
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((s) => (
          <span key={s.label} className={s.cls}>
            ■ {s.label} {fmt(s.value)} ({Math.round((s.value / total) * 100)}%)
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-pencil">
        Forward pass ≈ 2 × parameters = <span className="font-mono">{flops(2 * total)}</span> per token.
        Weights in BF16 (2 bytes each): <span className="font-mono">{bytes(2 * total)}</span>.
      </p>
      <Controls>
        <Slider label="Width d (model dimension)" value={wi} min={0} max={WIDTHS.length - 1} step={1} onChange={setWi} format={(i) => WIDTHS[i].toLocaleString("en-US")} />
        <Slider label="Layers (blocks)" value={layers} min={2} max={128} step={2} onChange={setLayers} />
      </Controls>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChoiceButtons label="Vocabulary" value={vocab} onChange={setVocab} options={(Object.keys(VOCABS) as VocabId[]).map((id) => ({ id, label: `${id} vocab` }))} />
        <div role="group" aria-label="Presets" className="inline-flex flex-wrap gap-1">
          {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setWi(PRESETS[k].w);
                setLayers(PRESETS[k].layers);
                setVocab(PRESETS[k].vocab);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                preset === k ? "bg-[#2b6ec4] text-white" : "bg-[#f1efe4] text-pencil hover:bg-[#e8e5d6]"
              )}
            >
              {PRESETS[k].label}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-pencil/70">
        Classic block (4d² attention + 8d² MLP), one embedding table shared with the output layer; biases and norms ignored.
      </p>
    </div>
  );
}
