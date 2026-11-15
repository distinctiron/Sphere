"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT } from "../kit";
import { fmt } from "./anim";

/**
 * Context layout and prefix caching (C2). Interactive.
 * A provider's prefix cache can reuse the stored KV cache of the longest
 * prefix identical to an earlier request. Everything after the first block
 * that changed must be prefilled again. The reader picks a layout for the same
 * blocks and sees how much of the next turn's context is reused.
 * Illustrative pricing: cached input billed at 10% of the normal input price.
 */

type BlockId = "system" | "tools" | "examples" | "history" | "passages" | "question" | "time";

const BLOCKS: Record<BlockId, { label: string; tokens: number; changes: boolean }> = {
  system: { label: "Instructions", tokens: 2000, changes: false },
  tools: { label: "Tool definitions", tokens: 3000, changes: false },
  examples: { label: "Examples", tokens: 1500, changes: false },
  history: { label: "Earlier turns", tokens: 4000, changes: false },
  passages: { label: "Retrieved passages", tokens: 6000, changes: true },
  question: { label: "New question", tokens: 200, changes: true },
  time: { label: "Current date & time", tokens: 20, changes: true },
};

const LAYOUTS = {
  stable: { label: "Stable first", order: ["system", "tools", "examples", "history", "time", "passages", "question"] as BlockId[] },
  timestamp: { label: "Date at the top", order: ["time", "system", "tools", "examples", "history", "passages", "question"] as BlockId[] },
  passages: { label: "Passages early", order: ["system", "passages", "tools", "examples", "history", "time", "question"] as BlockId[] },
} as const;
type LayoutId = keyof typeof LAYOUTS;

const CACHED_PRICE = 0.1;
const TOTAL = Object.values(BLOCKS).reduce((s, b) => s + b.tokens, 0);

export function cacheStats(order: BlockId[]) {
  const firstChange = order.findIndex((id) => BLOCKS[id].changes);
  const cached = order.slice(0, firstChange).reduce((s, id) => s + BLOCKS[id].tokens, 0);
  const cost = (CACHED_PRICE * cached + (TOTAL - cached)) / TOTAL;
  return { firstChange, cached, cost };
}

const ROW_H = 34;
const TOP = 34;
const LABEL_W = 200;
const BAR_W = 360;
const PX = BAR_W / 6000;

export default function PromptCacheLayoutFigure() {
  const [layout, setLayout] = useState<LayoutId>("stable");
  const order = LAYOUTS[layout].order;
  const { firstChange, cached, cost } = cacheStats(order);
  const boundaryY = TOP + firstChange * ROW_H - 2;

  return (
    <div>
      <svg viewBox={`0 0 680 ${TOP + order.length * ROW_H + 14}`} role="img" aria-label="The blocks of one context in order, coloured by whether the next turn can reuse them from the prefix cache" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <text x={0} y={18} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          CONTEXT, TOP TO BOTTOM
        </text>
        <text x={LABEL_W + 12} y={18} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          TOKENS
        </text>
        {order.map((id, i) => {
          const b = BLOCKS[id];
          const y = TOP + i * ROW_H;
          const hit = i < firstChange;
          const w = Math.max(4, b.tokens * PX);
          return (
            <g key={id}>
              <text x={0} y={y + 21} fontSize={14} fill={C.ink}>
                {b.label}
              </text>
              {b.changes && (
                <text x={LABEL_W - 6} y={y + 21} textAnchor="end" fontSize={14} fill={C.warn} fontWeight={700}>
                  ↻
                </text>
              )}
              <rect x={LABEL_W + 12} y={y + 6} width={w} height={ROW_H - 12} rx={3} fill={hit ? C.good : C.active} opacity={hit ? 0.85 : 0.75} />
              <text x={LABEL_W + 20 + w} y={y + 21} fontSize={13} fill={C.text}>
                {fmt(b.tokens)}
              </text>
            </g>
          );
        })}
        <line x1={0} y1={boundaryY} x2={680} y2={boundaryY} stroke={C.ink} strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={680} y={boundaryY - 5} textAnchor="end" fontSize={13} fill={C.ink} fontWeight={600}>
          {firstChange === 0 ? "first change: nothing reusable" : "cache reuse stops here"}
        </text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600 align-middle" />reused from the prefix cache</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-rose-600 align-middle" />prefilled again</span>
        <span><span className="mr-1 font-bold text-amber-600">↻</span>changes every turn</span>
      </div>
      <p className="mt-3 text-sm text-pencil">
        Next turn reuses <span className="font-mono">{fmt(cached)}</span> of <span className="font-mono">{fmt(TOTAL)}</span> tokens (
        {Math.round((100 * cached) / TOTAL)}%). Input cost of the turn:{" "}
        <span className={`font-semibold ${cost < 0.6 ? "text-emerald-700" : "text-rose-700"}`}>{Math.round(cost * 100)}% of the uncached price</span>, and
        prefill skips the same share of its work.
      </p>
      <Controls>
        <ChoiceButtons
          label="Layout"
          value={layout}
          onChange={setLayout}
          options={(Object.keys(LAYOUTS) as LayoutId[]).map((id) => ({ id, label: LAYOUTS[id].label }))}
        />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        Illustrative: cached input billed at 10% of the normal input price. Providers differ in discounts, minimum prefix sizes, cache lifetimes and
        whether writing the cache costs extra.
      </p>
    </div>
  );
}
