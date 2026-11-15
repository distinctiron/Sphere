"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChoiceButtons } from "../kit";
import { softmax } from "./util";

/**
 * Causal attention patterns for one sentence (A11). Select a token to see how
 * it spreads its attention over itself and earlier tokens; later tokens are
 * masked. Three illustrative heads, modelled on patterns found in trained
 * models: a previous-token head, a head that links words to the noun they are
 * about, and a head that parks most of its weight on the first token. Scores
 * are hand-set; weights are the softmax of the scores over visible tokens, so
 * each row sums to 100%.
 */

type HeadId = "coref" | "prev" | "sink";
type Ending = "tired" | "wide";

const BASE = ["The", "animal", "didn", "’t", "cross", "the", "street", "because", "it", "was", "too"];
const ANIMAL = 1;
const STREET = 6;
const IT = 8;

const HEADS: Record<HeadId, { label: string; blurb: string }> = {
  coref: {
    label: "Who is this about?",
    blurb: "This head links words to the noun they concern. Watch ‘it’, then the last word.",
  },
  prev: {
    label: "Previous token",
    blurb: "This head mostly copies from the token just before, which helps the model track phrases and spelling-like patterns.",
  },
  sink: {
    label: "Resting on the first token",
    blurb: "When a head finds nothing relevant, softmax still has to put 100% somewhere. Many real heads park it on the first token.",
  },
};

function score(head: HeadId, tokens: string[], i: number, j: number): number {
  const last = tokens[i];
  switch (head) {
    case "prev":
      return j === i - 1 ? 4 : j === i ? 1 : 0;
    case "sink":
      return j === 0 ? 3 : j === i ? 1 : 0;
    case "coref": {
      if (i === IT) return j === ANIMAL ? 2.2 : j === STREET ? 2.0 : j === i ? 0.5 : 0;
      if (last === "tired") return j === ANIMAL ? 3.6 : j === IT ? 2.2 : j === STREET ? 0.6 : 0;
      if (last === "wide") return j === STREET ? 3.6 : j === IT ? 2.2 : j === ANIMAL ? 0.6 : 0;
      if (last === "cross") return j === ANIMAL ? 2.6 : j === i ? 1 : 0;
      return j === ANIMAL || j === STREET ? 1.2 : j === i ? 1 : 0;
    }
  }
}

export default function AttentionExplorerFigure() {
  const [head, setHead] = useState<HeadId>("coref");
  const [ending, setEnding] = useState<Ending>("tired");
  const tokens = [...BASE, ending];
  const [sel, setSel] = useState(tokens.length - 1);

  const visible = tokens.slice(0, sel + 1);
  const w = softmax(visible.map((_, j) => score(head, tokens, sel, j)));
  const top = w
    .map((x, j) => ({ j, x }))
    .sort((a, b) => b.x - a.x)
    .slice(0, 4);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tokens of the sentence; select one to see its attention">
        {tokens.map((t, j) => {
          const masked = j > sel;
          const weight = masked ? 0 : w[j];
          return (
            <button
              key={j}
              type="button"
              onClick={() => setSel(j)}
              aria-pressed={j === sel}
              aria-label={`${t}${masked ? " (masked)" : `: ${Math.round(weight * 100)}%`}`}
              className={cn(
                "relative rounded-md border px-2 py-1 font-mono text-sm transition-colors",
                j === sel ? "border-[#2b6ec4] ring-2 ring-[#2b6ec4]/30" : "border-ink/20",
                masked ? "border-dashed text-pencil/50" : "text-ink"
              )}
              style={masked ? undefined : { backgroundColor: `rgba(225, 29, 72, ${Math.min(0.08 + weight * 0.85, 0.93)})`, color: weight > 0.5 ? "white" : undefined }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr]">
        <div>
          <div className="text-sm font-semibold text-ink">
            “{tokens[sel]}” attends to{sel < tokens.length - 1 ? ` (${tokens.length - 1 - sel} later token${tokens.length - 1 - sel > 1 ? "s" : ""} masked)` : ""}
          </div>
          <div className="mt-2 space-y-1.5">
            {top.map(({ j, x }) => (
              <div key={j} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 truncate font-mono text-pencil">
                  {tokens[j]}
                  {j === sel ? " (self)" : ""}
                </span>
                <span className="h-3 flex-1 rounded bg-[#f1efe4]">
                  <span className="block h-3 rounded bg-rose-600" style={{ width: `${x * 100}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right font-mono tabular-nums text-ink">{Math.round(x * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-sm leading-relaxed text-pencil">{HEADS[head].blurb}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChoiceButtons label="Head" value={head} onChange={setHead} options={(Object.keys(HEADS) as HeadId[]).map((id) => ({ id, label: HEADS[id].label }))} />
        <ChoiceButtons
          label="Last word"
          value={ending}
          onChange={(e) => setEnding(e)}
          options={[
            { id: "tired", label: "…too tired" },
            { id: "wide", label: "…too wide" },
          ]}
        />
      </div>
      <p className="mt-2 text-xs text-pencil">Illustrative heads with hand-set scores; the weights are their softmax over the visible tokens.</p>
    </div>
  );
}
