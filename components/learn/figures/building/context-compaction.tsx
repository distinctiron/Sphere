"use client";

import { C, FONT } from "../kit";
import { appear, flash, fmt } from "./anim";

/**
 * Two ways a harness keeps a long task inside the window (C6). Staged loop, 12 s.
 * Top: tool results pile up until the context passes a threshold (85% of a
 * 200k window); the harness replaces the history with a model-written summary
 * and the task continues. Bottom: the main agent hands a search to a sub-agent,
 * whose fresh window absorbs the reading; only its short report enters the
 * main context. Token counts are illustrative.
 */

const CYCLE = 12;
const WINDOW = 200_000;
const X0 = 20;
const W = 640;
const px = (tokens: number) => (tokens / WINDOW) * W;

type Seg = { label: string; tokens: number; kind: "sys" | "result" | "summary" | "report" | "task"; show: [number, number] | "always" | number; labelAt?: "below" | "right" };

const SYS = 15_000;
const ROW_A: Seg[] = [
  { label: "system", tokens: SYS, kind: "sys", show: "always" },
  ...[30_000, 25_000, 40_000, 35_000, 25_000].map((t, i) => ({ label: "result", tokens: t, kind: "result" as const, show: [0.5 + i * 0.8, 5.4] as [number, number] })),
];
const SUMMARY: Seg = { label: "summary", tokens: 12_000, kind: "summary", show: 5.6, labelAt: "below" };
const AFTER: Seg[] = [20_000, 30_000].map((t, i) => ({ label: "result", tokens: t, kind: "result", show: 6.6 + i * 0.8 }));
const BEFORE_TOTAL = ROW_A.reduce((s, b) => s + b.tokens, 0);

const SUB: Seg[] = [
  { label: "prompt + brief", tokens: 8_000, kind: "task", show: 1.0 },
  ...[30_000, 40_000, 35_000, 30_000].map((t, i) => ({ label: "read", tokens: t, kind: "result" as const, show: 1.8 + i * 0.8 })),
];
const SUB_TOTAL = SUB.reduce((s, b) => s + b.tokens, 0);
const REPORT: Seg = { label: "report (3k tokens)", tokens: 3_000, kind: "report", show: 5.4, labelAt: "right" };

const STYLE: Record<Seg["kind"], { fill: string; stroke: string; text: string }> = {
  sys: { fill: C.grid, stroke: C.line, text: C.text },
  task: { fill: C.grid, stroke: C.line, text: C.text },
  result: { fill: C.primaryWash, stroke: C.primarySoft, text: C.primary },
  summary: { fill: C.good, stroke: C.good, text: "white" },
  report: { fill: C.good, stroke: C.good, text: "white" },
};

let seq = 0;
function Bar({ y, segs, css, offset = 0 }: { y: number; segs: Seg[]; css: string[]; offset?: number }) {
  let x = X0 + px(offset);
  return (
    <g>
      {segs.map((s) => {
        const w = px(s.tokens);
        const cls = `cc-${seq++}`;
        if (Array.isArray(s.show)) {
          css.push(`${flash(cls, CYCLE, s.show[0], s.show[1] - s.show[0], 0.3)} .${cls} { opacity: 0; animation: ${cls} ${CYCLE}s linear infinite }`);
        } else if (typeof s.show === "number") {
          css.push(`${appear(cls, CYCLE, s.show)} .${cls} { animation: ${cls} ${CYCLE}s linear infinite }`);
        }
        const st = STYLE[s.kind];
        const el = (
          <g key={cls} className={s.show === "always" ? undefined : cls}>
            <rect x={x + 1} y={y} width={w - 2} height={34} rx={3} fill={st.fill} stroke={st.stroke} />
            {!s.labelAt && w > 44 && (
              <text x={x + w / 2} y={y + 22} textAnchor="middle" fontSize={13} fill={st.text} fontWeight={600}>
                {s.label}
              </text>
            )}
            {s.labelAt === "below" && (
              <text x={x + w / 2} y={y + 54} textAnchor="middle" fontSize={13} fill={C.good} fontWeight={700}>
                {s.label}
              </text>
            )}
            {s.labelAt === "right" && (
              <text x={x + w + 8} y={y + 22} fontSize={13} fill={C.good} fontWeight={700}>
                {s.label}
              </text>
            )}
          </g>
        );
        x += w;
        return el;
      })}
    </g>
  );
}

function Frame({ y, label }: { y: number; label: string }) {
  return (
    <g>
      <text x={X0} y={y - 10} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.04em">
        {label}
      </text>
      <rect x={X0 - 3} y={y - 3} width={W + 6} height={40} rx={6} fill="none" stroke={C.line} />
    </g>
  );
}

export default function ContextCompactionFigure() {
  seq = 0;
  const css: string[] = [];
  const threshold = X0 + px(0.85 * WINDOW);
  css.push(`${flash("cc-th", CYCLE, 4.3, 1.4)} .cc-th { opacity: 0; animation: cc-th ${CYCLE}s linear infinite }`);
  css.push(`${flash("cc-up", CYCLE, 5.0, 1.2)} .cc-up { opacity: 0; animation: cc-up ${CYCLE}s linear infinite }`);

  const rowA = Bar({ y: 56, segs: ROW_A, css });
  const rowA2 = Bar({ y: 56, segs: [SUMMARY, ...AFTER], css, offset: SYS });
  const main = Bar({ y: 200, segs: [{ label: "system", tokens: SYS, kind: "sys", show: "always" }, { label: "task", tokens: 5_000, kind: "task", show: "always" }, REPORT], css });
  const sub = Bar({ y: 290, segs: SUB, css });

  return (
    <div>
      <style>{css.join("\n")}</style>
      <svg viewBox="0 0 680 340" role="img" aria-label="Top: a context fills with tool results, passes a threshold and is replaced by a short summary, after which work continues. Bottom: a sub-agent reads a large amount in its own fresh context and returns a short report to the main context." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <Frame y={56} label="COMPACTION · one context, 200k window" />
        {rowA}
        {rowA2}
        <line x1={threshold} y1={44} x2={threshold} y2={100} stroke={C.warn} strokeWidth={2} strokeDasharray="4 3" />
        <text x={threshold} y={118} textAnchor="middle" fontSize={13} fill={C.warn} fontWeight={600}>
          85%: compact
        </text>
        <rect x={threshold - 4} y={50} width={8} height={46} fill={C.warn} opacity={0.5} className="cc-th" />

        <Frame y={200} label="SUB-AGENT · main context" />
        {main}
        <Frame y={290} label="" />
        <text x={X0 + W} y={280} textAnchor="end" fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.04em">
          SUB-AGENT&apos;S OWN FRESH CONTEXT · discarded after
        </text>
        {sub}
        <path d={`M ${X0 + px(SYS + 5_000) + 5} 286 L ${X0 + px(SYS + 5_000) + 5} 242`} stroke={C.good} strokeWidth={2.5} markerEnd="url(#cc-head)" className="cc-up" />
        <defs>
          <marker id="cc-head" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.good} />
          </marker>
        </defs>
      </svg>
      <p className="mt-2 text-sm text-pencil">
        Compaction: {fmt(BEFORE_TOTAL)} tokens of history become a {fmt(SUMMARY.tokens)}-token summary, and the task carries on with room to spare.
        Sub-agent: it reads {fmt(SUB_TOTAL)} tokens in its own window; the main context grows by the {fmt(REPORT.tokens)}-token report.
      </p>
    </div>
  );
}
