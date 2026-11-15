"use client";

import { C, FONT } from "../kit";
import { appear, flash, fmt } from "./anim";

/**
 * Progressive disclosure with skills (C7). Staged loop, 12 s.
 * Left: four skill folders. Right: what is in the context. At the start only
 * each skill's name and description (~100 tokens each) are loaded. A task
 * arrives; the model reads the matching SKILL.md, then one reference file it
 * points to, then runs a bundled script whose code never enters the context,
 * only its output. Token counts are illustrative.
 */

const CYCLE = 12;
const AT = { index: 0.3, task: 2.2, body: 3.4, ref: 5.6, script: 7.8 };

type Line = { text: string; depth: 0 | 1; id?: keyof typeof AT; tokens: number };
const TREE: Line[] = [
  { text: "pdf/", depth: 0, tokens: 0 },
  { text: "SKILL.md", depth: 1, id: "body", tokens: 3000 },
  { text: "forms.md", depth: 1, id: "ref", tokens: 2000 },
  { text: "fill_form.py", depth: 1, id: "script", tokens: 1500 },
  { text: "slides/", depth: 0, tokens: 0 },
  { text: "SKILL.md", depth: 1, tokens: 2500 },
  { text: "layouts.md", depth: 1, tokens: 3000 },
  { text: "brand-voice/", depth: 0, tokens: 0 },
  { text: "SKILL.md", depth: 1, tokens: 1500 },
  { text: "data-viz/", depth: 0, tokens: 0 },
  { text: "SKILL.md", depth: 1, tokens: 2000 },
];
const EVERYTHING = TREE.reduce((s, l) => s + l.tokens, 0);

const ROWS = [
  { id: "index" as const, label: "4 names + descriptions", tokens: 400, color: C.primarySoft, text: C.primary, note: "always" },
  { id: "body" as const, label: "pdf/SKILL.md", tokens: 3000, color: C.active, text: "white", note: "when relevant" },
  { id: "ref" as const, label: "forms.md", tokens: 2000, color: C.activeSoft, text: C.ink, note: "only if needed" },
  { id: "script" as const, label: "script output", tokens: 60, color: C.good, text: "white", note: "code runs, output only" },
];
const LOADED = ROWS.reduce((s, r) => s + r.tokens, 0);

const TREE_Y = 62;
const LINE_H = 24;

export default function ProgressiveDisclosureFigure() {
  const css = [
    ...Object.entries(AT).map(([k, t]) => `${appear(`pd2-${k}`, CYCLE, t)} .pd2-${k} { animation: pd2-${k} ${CYCLE}s linear infinite }`),
    ...Object.entries(AT).map(([k, t]) => `${flash(`pd2-hi-${k}`, CYCLE, t, 1.6)} .pd2-hi-${k} { opacity: 0; animation: pd2-hi-${k} ${CYCLE}s linear infinite }`),
  ].join("\n");

  const skillMdLines = TREE.map((l, i) => ({ l, i })).filter(({ l }) => l.text === "SKILL.md");

  return (
    <div>
      <style>{css}</style>
      <svg viewBox="0 0 680 350" role="img" aria-label="Skill folders on the left; on the right, the context holds only four short descriptions until a task arrives, then the matching SKILL.md, then one reference file, then only the output of a bundled script." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <text x={10} y={24} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          SKILLS ON DISK
        </text>
        <text x={330} y={24} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          IN THE CONTEXT
        </text>
        <rect x={6} y={38} width={290} height={TREE.length * LINE_H + 16} rx={8} fill={C.wash} stroke={C.grid} />

        {/* Descriptions of every SKILL.md are indexed at the start */}
        {skillMdLines.map(({ i }) => (
          <rect key={`idx${i}`} x={40} y={TREE_Y + i * LINE_H - 17} width={250} height={22} rx={4} fill={C.primaryWash} className="pd2-hi-index" />
        ))}
        {TREE.map((l, i) => {
          const y = TREE_Y + i * LINE_H;
          return (
            <g key={i}>
              {l.id && <rect x={40} y={y - 17} width={250} height={22} rx={4} fill={l.id === "script" ? C.goodSoft : C.activeSoft} className={`pd2-hi-${l.id}`} />}
              <text x={l.depth ? 48 : 18} y={y} fontSize={14} fill={l.depth ? C.text : C.ink} fontWeight={l.depth ? 400 : 700} fontFamily={l.depth ? FONT.mono : FONT.sans}>
                {l.text}
              </text>
              {l.tokens > 0 && (
                <text x={284} y={y} textAnchor="end" fontSize={13} fill={C.faint}>
                  {fmt(l.tokens)}
                </text>
              )}
            </g>
          );
        })}

        {/* Task */}
        <g className="pd2-task">
          <rect x={330} y={40} width={340} height={34} rx={17} fill="white" stroke={C.ink} />
          <text x={500} y={62} textAnchor="middle" fontSize={14} fill={C.ink}>
            Task: “fill in this PDF form”
          </text>
        </g>

        {/* Context rows */}
        {ROWS.map((r, i) => {
          const y = 92 + i * 60;
          return (
            <g key={r.id} className={`pd2-${r.id}`}>
              <rect x={330} y={y} width={340} height={46} rx={6} fill={r.color} />
              <text x={342} y={y + 20} fontSize={14} fontWeight={700} fill={r.text}>
                {r.label}
              </text>
              <text x={342} y={y + 38} fontSize={13} fill={r.text}>
                {r.note}
              </text>
              <text x={658} y={y + 29} textAnchor="end" fontSize={14} fontWeight={700} fill={r.text} fontFamily={FONT.mono}>
                +{fmt(r.tokens)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-sm text-pencil">
        Loaded for this task: <span className="font-mono">{fmt(LOADED)}</span> tokens. Loading every file of every skill up front would cost{" "}
        <span className="font-mono">{fmt(EVERYTHING)}</span> tokens on every call, for every task, whether or not it needs them.
      </p>
    </div>
  );
}
