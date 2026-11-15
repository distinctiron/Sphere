"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChoiceButtons, Controls, Slider } from "../kit";
import { mulberry32 } from "./util";
import { END, PROMPT, candidates, pick, type Strategy } from "./story-model";

/**
 * Generate a story one token at a time (A14). A toy bigram "model" (see
 * story-model.ts) supplies logits for the next token; the reader chooses the
 * decoding strategy: greedy, temperature sampling, top-k or top-p, with a
 * temperature slider. Bars show the probabilities actually used for the next
 * pick; the thin mark shows the model's own probability at temperature 1.
 * Random draws are seeded (seed × step), so a run is reproducible and
 * "New seed" gives a different one.
 */

const MAX_NEW = 24;

export default function SamplingLabFigure() {
  const [strategy, setStrategy] = useState<Strategy>("temperature");
  const [temperature, setTemperature] = useState(1);
  const [k, setK] = useState(3);
  const [topP, setTopP] = useState(0.9);
  const [generated, setGenerated] = useState<string[]>([]);
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(false);

  const context = useMemo(() => [...PROMPT, ...generated], [generated]);
  const done = generated[generated.length - 1] === END || generated.length >= MAX_NEW;
  const cands = useMemo(() => candidates(context, strategy, temperature, k, topP), [context, strategy, temperature, k, topP]);

  const step = () =>
    setGenerated((g) => {
      if (g[g.length - 1] === END || g.length >= MAX_NEW) return g;
      const next = candidates([...PROMPT, ...g], strategy, temperature, k, topP);
      const u = mulberry32(seed * 7919 + g.length)();
      return [...g, pick(next, u).token];
    });

  useEffect(() => {
    if (!running) return;
    if (done) {
      setRunning(false);
      return;
    }
    const t = setTimeout(step, 380);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, generated, done]);

  const reset = () => {
    setRunning(false);
    setGenerated([]);
  };

  const sorted = [...cands].sort((a, b) => b.raw - a.raw);

  return (
    <div>
      <div className="min-h-[4.5rem] rounded-lg border border-ink/20 bg-paper px-3 py-2 font-mono text-[15px] leading-relaxed">
        {PROMPT.map((t, i) => (
          <span key={`p${i}`} className="whitespace-pre text-pencil">
            {t}
          </span>
        ))}
        {generated.map((t, i) => (
          <span
            key={`g${i}`}
            className={cn(
              "whitespace-pre",
              i === generated.length - 1 ? "rounded bg-rose-100 text-rose-700" : "text-[#2b6ec4]",
              t === END && "ml-1 text-xs text-pencil/70"
            )}
          >
            {t}
          </span>
        ))}
        {!done && <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-pencil/70 align-middle" aria-hidden />}
      </div>

      <div className="mt-3 text-sm font-semibold text-ink">
        {done ? (generated.length >= MAX_NEW ? "Stopped at the length limit" : "The model chose the end token: generation stops") : "Next token: probabilities used for the pick"}
      </div>
      {!done && (
        <div className="mt-2 space-y-1.5">
          {sorted.map((c) => (
            <div key={c.token} className="flex items-center gap-2 text-sm">
              <span className={cn("w-20 shrink-0 truncate whitespace-pre font-mono", c.kept ? "text-ink" : "text-pencil/70 line-through")}>
                {c.token === END ? "⟨end⟩" : c.token.trim() || c.token}
              </span>
              <span className="relative h-3.5 flex-1 rounded bg-[#f1efe4]">
                <span className={cn("block h-3.5 rounded", c.kept ? "bg-[#2b6ec4]" : "bg-[#e8e5d6]")} style={{ width: `${c.p * 100}%` }} />
                <span className="absolute top-[-3px] h-5 w-0.5 bg-pencil" style={{ left: `calc(${c.raw * 100}% - 1px)` }} title="probability at temperature 1" />
              </span>
              <span className="w-11 shrink-0 text-right font-mono tabular-nums text-ink">{c.kept ? `${Math.round(c.p * 100)}%` : "cut"}</span>
            </div>
          ))}
          <div className="text-xs text-pencil">
            <span className="mr-1 inline-block h-3 w-0.5 bg-pencil align-middle" /> the model’s own probability (temperature 1, nothing cut)
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={step}
          disabled={done || running}
          className="rounded-md bg-[#2b6ec4] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2459a0] disabled:opacity-40"
        >
          Next token
        </button>
        <button
          type="button"
          onClick={() => setRunning(true)}
          disabled={done || running}
          className="rounded-md bg-[#f1efe4] px-3 py-1.5 text-xs font-medium text-pencil hover:bg-[#e8e5d6] disabled:opacity-40"
        >
          Generate to the end
        </button>
        <button type="button" onClick={reset} className="rounded-md bg-[#f1efe4] px-3 py-1.5 text-xs font-medium text-pencil hover:bg-[#e8e5d6]">
          Reset
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setSeed((s) => s + 1);
          }}
          className="rounded-md bg-[#f1efe4] px-3 py-1.5 text-xs font-medium text-pencil hover:bg-[#e8e5d6]"
        >
          New seed ({seed})
        </button>
      </div>

      <Controls>
        <ChoiceButtons
          label="Decoding strategy"
          value={strategy}
          onChange={setStrategy}
          options={[
            { id: "greedy", label: "Greedy" },
            { id: "temperature", label: "Sample" },
            { id: "top-k", label: "Top-k" },
            { id: "top-p", label: "Top-p" },
          ]}
        />
        {strategy !== "greedy" && (
          <Slider label="Temperature" value={temperature} min={0.1} max={2} step={0.1} onChange={setTemperature} format={(v) => v.toFixed(1)} />
        )}
        {strategy === "top-k" && <Slider label="k (keep the k most likely)" value={k} min={1} max={6} step={1} onChange={setK} />}
        {strategy === "top-p" && (
          <Slider label="p (keep the smallest set with this much probability)" value={topP} min={0.5} max={1} step={0.05} onChange={setTopP} format={(v) => v.toFixed(2)} />
        )}
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">A toy model with a few candidates per step stands in for a real one, which scores its whole vocabulary using the whole context.</p>
    </div>
  );
}
