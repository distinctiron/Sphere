"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useFigure } from "../kit";

/**
 * Post-training reshapes where a model's responses land (A15).
 * For one prompt, the share of sampled responses falling into five kinds of
 * behaviour after each stage: base model → SFT → preference tuning → RL with
 * verifiable rewards. Shares are illustrative (each column sums to 100%); the
 * pattern, not the exact numbers, is the point. Auto-advances while playing;
 * the stage buttons pick a stage directly.
 */

const KINDS = [
  { label: "Continues the web page", tone: "bg-pencil/70" },
  { label: "Off-topic or rambling", tone: "bg-ink/25" },
  { label: "Unsafe or rude", tone: "bg-amber-600" },
  { label: "Answers, but wrong", tone: "bg-[#9cc2f0]" },
  { label: "Answers correctly", tone: "bg-emerald-600" },
];

const STAGES = [
  {
    short: "Base",
    title: "Base model",
    shares: [55, 18, 5, 12, 10],
    text: "Pretraining learned to continue any text. A question on its own often looks like the start of a forum page, so the model continues the page: more questions, links, comments. Answering is only one of many plausible continuations.",
  },
  {
    short: "SFT",
    title: "Supervised fine-tuning: imitate good answers",
    shares: [4, 10, 3, 42, 41],
    text: "Training on example conversations moves almost all the mass into answer-shaped responses. But of those answers, still only about half are right, as before: the model now sounds like an assistant, including when it does not know.",
  },
  {
    short: "Preferences",
    title: "Preference tuning: learn what people prefer",
    shares: [2, 5, 1, 36, 56],
    text: "Comparisons between answers push toward helpful, polite and safe replies and away from harmful ones. Whatever the raters systematically reward, including things they should not, gets amplified too.",
  },
  {
    short: "RL (verifiable)",
    title: "Reinforcement on checkable answers",
    shares: [1, 2, 1, 16, 80],
    text: "On tasks where correctness can be checked automatically, attempts that succeed are reinforced. Probability concentrates on reasoning paths that reach right answers, paths the model could already sometimes find.",
  },
];

const HOLD_MS = 3200;

export default function PostTrainingStagesFigure() {
  const { playing } = useFigure();
  const [stage, setStage] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!playing || !auto) return;
    const t = setTimeout(() => setStage((s) => (s + 1) % STAGES.length), stage === STAGES.length - 1 ? HOLD_MS * 1.5 : HOLD_MS);
    return () => clearTimeout(t);
  }, [playing, auto, stage]);

  const s = STAGES[stage];

  return (
    <div>
      <div className="mb-1 text-xs text-pencil">
        Prompt: <span className="font-mono text-pencil">How do I reverse a list in Python?</span>
      </div>
      <div role="group" aria-label="Training stage" className="mb-3 flex flex-wrap items-center gap-1">
        {STAGES.map((st, i) => (
          <span key={st.short} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-pencil/50">→</span>}
            <button
              type="button"
              onClick={() => {
                setAuto(false);
                setStage(i);
              }}
              aria-pressed={stage === i}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                stage === i ? "bg-[#2b6ec4] text-white" : "bg-[#f1efe4] text-pencil hover:bg-[#e8e5d6]"
              )}
            >
              {st.short}
            </button>
          </span>
        ))}
      </div>

      <div className="space-y-2" role="img" aria-label={`Share of responses by kind after the ${s.short} stage: ${KINDS.map((k, i) => `${k.label} ${s.shares[i]}%`).join(", ")}`}>
        {KINDS.map((k, i) => (
          <div key={k.label} className="grid grid-cols-[8.5rem_1fr_2.75rem] items-center gap-2 text-sm sm:grid-cols-[12rem_1fr_3rem]">
            <span className="text-pencil">{k.label}</span>
            <span className="h-4 rounded bg-[#f1efe4]">
              <span className={cn("block h-4 rounded transition-[width] duration-700 ease-out motion-reduce:transition-none", k.tone)} style={{ width: `${s.shares[i]}%` }} />
            </span>
            <span className="text-right font-mono tabular-nums text-ink">{s.shares[i]}%</span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm font-semibold text-ink">{s.title}</div>
      <p className="mt-1 min-h-[4.5rem] text-sm leading-relaxed text-pencil">{s.text}</p>
      <p className="mt-2 text-xs text-pencil/70">Illustrative shares of sampled responses; each stage sums to 100%.</p>
    </div>
  );
}
