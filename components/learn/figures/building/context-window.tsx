"use client";

import { C, FONT } from "../kit";
import { appear, flash, fmt } from "./anim";

/**
 * The context window across a conversation (C1). Staged loop, 12 s.
 * Four API calls side by side. Each call sends the system prompt and the whole
 * history again (the model keeps nothing between calls), then the model's reply
 * (rose) is generated at the top. The stack climbs towards the context limit.
 * Tokens: system 500, each user message 300, each reply 500, limit 4,000.
 */

const CYCLE = 12;
const SYSTEM = 500;
const USER = 300;
const REPLY = 500;
const LIMIT = 4000;
const BASE = 330;
const S = 0.064; // px per token
const GAP = 1.5;
const COL_W = 120;
const colX = (k: number) => 40 + k * 160;
const stageAt = (k: number) => 0.4 + k * 2.7;

type Block = { kind: "system" | "user" | "reply" | "new"; label: string; tokens: number };

function blocksFor(call: number): Block[] {
  const blocks: Block[] = [{ kind: "system", label: "system", tokens: SYSTEM }];
  for (let j = 1; j < call; j++) {
    blocks.push({ kind: "user", label: `U${j}`, tokens: USER });
    blocks.push({ kind: "reply", label: `A${j}`, tokens: REPLY });
  }
  blocks.push({ kind: "user", label: `U${call}`, tokens: USER });
  blocks.push({ kind: "new", label: `A${call} (new)`, tokens: REPLY });
  return blocks;
}

const STYLE: Record<Block["kind"], { fill: string; stroke: string; text: string }> = {
  system: { fill: C.grid, stroke: C.line, text: C.text },
  user: { fill: C.primaryWash, stroke: C.primarySoft, text: C.primary },
  reply: { fill: "white", stroke: C.activeSoft, text: C.active },
  new: { fill: C.active, stroke: C.active, text: "white" },
};

const CALLS = [1, 2, 3, 4].map((call) => {
  const blocks = blocksFor(call);
  const input = blocks.filter((b) => b.kind !== "new").reduce((s, b) => s + b.tokens, 0);
  return { call, blocks, input, output: REPLY };
});
const TOTAL_IN = CALLS.reduce((s, c) => s + c.input, 0);
const TOTAL_OUT = CALLS.reduce((s, c) => s + c.output, 0);
const CONVERSATION = CALLS[3].input + REPLY;

export default function ContextWindowFigure() {
  const limitY = BASE - LIMIT * S;
  const css = [
    ...CALLS.map((_, k) => appear(`cw-in${k}`, CYCLE, stageAt(k))),
    ...CALLS.map((_, k) => appear(`cw-out${k}`, CYCLE, stageAt(k) + 1.1, 0.9)),
    ...CALLS.map((_, k) => flash(`cw-on${k}`, CYCLE, stageAt(k), 2.6)),
    ...CALLS.map((_, k) => `.cw-in${k} { animation: cw-in${k} ${CYCLE}s linear infinite } .cw-out${k} { animation: cw-out${k} ${CYCLE}s linear infinite } .cw-on${k} { opacity: 0; animation: cw-on${k} ${CYCLE}s linear infinite }`),
  ].join("\n");

  return (
    <div>
      <style>{css}</style>
      <svg
        viewBox="0 0 680 372"
        role="img"
        aria-label="Four API calls in one conversation. Each call resends the system prompt and all earlier messages, so the context stack grows with every turn towards the context limit."
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        {/* Context limit */}
        <line x1={24} y1={limitY} x2={668} y2={limitY} stroke={C.warn} strokeWidth={1.5} strokeDasharray="6 5" />
        <text x={668} y={limitY - 8} textAnchor="end" fontSize={13} fill={C.warn} fontWeight={600}>
          context limit · {fmt(LIMIT)} tokens
        </text>
        <line x1={24} y1={BASE + 0.5} x2={668} y2={BASE + 0.5} stroke={C.line} />

        {CALLS.map(({ call, blocks, input, output }, k) => {
          const x = colX(k);
          let y = BASE;
          return (
            <g key={call}>
              <text x={x + COL_W / 2} y={26} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink}>
                Call {call}
              </text>
              {/* "now" frame */}
              <rect x={x - 6} y={limitY + 6} width={COL_W + 12} height={BASE - limitY - 2} rx={8} fill="none" stroke={C.active} strokeWidth={2} className={`cw-on${k}`} />
              {blocks.map((b) => {
                const h = b.tokens * S - GAP;
                y -= b.tokens * S;
                const st = STYLE[b.kind];
                return (
                  <g key={b.label} className={b.kind === "new" ? `cw-out${k}` : `cw-in${k}`}>
                    <rect x={x} y={y} width={COL_W} height={h} rx={3} fill={st.fill} stroke={st.stroke} />
                    <text x={x + COL_W / 2} y={y + h / 2 + 4.5} textAnchor="middle" fontSize={13} fill={st.text} fontWeight={b.kind === "new" ? 700 : 500}>
                      {b.label}
                    </text>
                  </g>
                );
              })}
              <text x={x + COL_W / 2} y={354} textAnchor="middle" fontSize={13} fill={C.text} className={`cw-in${k}`}>
                in {fmt(input)} · out {fmt(output)}
              </text>
              {k > 0 && (
                <g className={`cw-on${k}`}>
                  <path d={`M ${x - 32} 120 L ${x - 12} 120`} stroke={C.active} strokeWidth={2} markerEnd="url(#cw-arrow)" />
                </g>
              )}
            </g>
          );
        })}
        <defs>
          <marker id="cw-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.active} />
          </marker>
        </defs>
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-ink/30 bg-[#e8e5d6] align-middle" />system prompt</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-[#9cc2f0] bg-[#e6effa] align-middle" />user message (U)</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-rose-300 bg-sheet align-middle" />earlier reply, resent (A)</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-rose-600 align-middle" />reply generated by this call</span>
      </div>
      <p className="mt-2 text-sm text-pencil">
        Across the four calls the client pays for <span className="font-mono">{fmt(TOTAL_IN)}</span> input and{" "}
        <span className="font-mono">{fmt(TOTAL_OUT)}</span> output tokens, for a conversation that is only{" "}
        <span className="font-mono">{fmt(CONVERSATION)}</span> tokens long. Every earlier message is read again on every call.
      </p>
    </div>
  );
}
