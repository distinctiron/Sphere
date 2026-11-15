"use client";

import { C, FONT } from "../kit";
import { appear, flash } from "./anim";

/**
 * A tool call as a sequence diagram (C3). Staged loop, 12 s.
 * Lanes: model, harness, tools. The model only ever emits text (here a
 * structured request for two parallel calls); the harness executes them,
 * appends the results to the context and calls the model again, which then
 * answers. Model activation bars show that there are two separate model calls.
 */

const CYCLE = 12;
const LANES = { model: 100, harness: 340, tools: 580 };
const STEP_AT = [0.3, 1.9, 3.5, 5.0, 6.6, 8.2];

type Step = {
  from: keyof typeof LANES;
  to: keyof typeof LANES;
  y: number;
  lines: string[];
  color: string;
  double?: boolean;
};

const STEPS: Step[] = [
  { from: "harness", to: "model", y: 104, lines: ["question + tool schemas"], color: C.primary },
  { from: "model", to: "harness", y: 150, lines: ["get_weather(Paris)", "get_weather(Tokyo)"], color: C.active, double: true },
  { from: "harness", to: "tools", y: 196, lines: ["check, then run both"], color: C.ink, double: true },
  { from: "tools", to: "harness", y: 242, lines: ["18 °C rain · 24 °C sun"], color: C.good },
  { from: "harness", to: "model", y: 288, lines: ["same context + 2 results"], color: C.primary },
  { from: "model", to: "harness", y: 334, lines: ["“Paris: 18 °C and rainy…”"], color: C.active },
];

function Arrow({ step, i }: { step: Step; i: number }) {
  const x1 = LANES[step.from];
  const x2 = LANES[step.to];
  const dir = Math.sign(x2 - x1);
  const pad = 10;
  const mid = (x1 + x2) / 2;
  const ys = step.double ? [step.y - 3, step.y + 3] : [step.y];
  return (
    <g className={`tc-s${i}`}>
      {ys.map((y) => (
        <line key={y} x1={x1 + dir * pad} y1={y} x2={x2 - dir * (pad + 2)} y2={y} stroke={step.color} strokeWidth={2} markerEnd={`url(#tc-head-${i})`} />
      ))}
      {step.lines.map((line, k) => (
        <text key={line} x={mid} y={step.y - 10 - (step.lines.length - 1 - k) * 17} textAnchor="middle" fontSize={13} fill={step.color} fontFamily={step.color === C.active && i === 1 ? FONT.mono : FONT.sans} fontWeight={600}>
          {line}
        </text>
      ))}
      <defs>
        <marker id={`tc-head-${i}`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={step.color} />
        </marker>
      </defs>
    </g>
  );
}

export default function ToolCallSequenceFigure() {
  const css = [
    ...STEP_AT.map((t, i) => `${appear(`tc-s${i}`, CYCLE, t)} .tc-s${i} { animation: tc-s${i} ${CYCLE}s linear infinite }`),
    `${appear("tc-call1", CYCLE, STEP_AT[0] + 0.2)} .tc-call1 { animation: tc-call1 ${CYCLE}s linear infinite }`,
    `${appear("tc-call2", CYCLE, STEP_AT[4] + 0.2)} .tc-call2 { animation: tc-call2 ${CYCLE}s linear infinite }`,
    `${flash("tc-run", CYCLE, STEP_AT[2] + 0.2, 1.6)} .tc-run { opacity: 0; animation: tc-run ${CYCLE}s linear infinite }`,
  ].join("\n");

  const header = (x: number, title: string, sub: string, color: string) => (
    <g>
      <rect x={x - 88} y={10} width={176} height={50} rx={8} fill="white" stroke={color} strokeWidth={1.5} />
      <text x={x} y={31} textAnchor="middle" fontSize={14} fontWeight={700} fill={color}>
        {title}
      </text>
      <text x={x} y={50} textAnchor="middle" fontSize={13} fill={C.muted}>
        {sub}
      </text>
    </g>
  );

  return (
    <div>
      <style>{css}</style>
      <svg viewBox="0 0 680 362" role="img" aria-label="Sequence diagram: the harness sends the question and tool schemas to the model, the model replies with two tool calls, the harness runs them, appends the results and calls the model again, which answers." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Lifelines */}
        {Object.values(LANES).map((x) => (
          <line key={x} x1={x} y1={60} x2={x} y2={352} stroke={C.line} strokeDasharray="4 4" />
        ))}
        {header(LANES.model, "Model", "only emits tokens", C.primary)}
        {header(LANES.harness, "Harness", "your code", C.ink)}
        {header(LANES.tools, "Tools", "APIs, files, shell", C.good)}

        {/* Two separate model calls (activation bars) */}
        <rect x={LANES.model - 6} y={96} width={12} height={62} rx={3} fill={C.primarySoft} className="tc-call1" />
        <rect x={LANES.model - 6} y={280} width={12} height={62} rx={3} fill={C.primarySoft} className="tc-call2" />
        <text x={LANES.model - 14} y={132} textAnchor="end" fontSize={13} fill={C.muted} className="tc-call1">
          call 1
        </text>
        <text x={LANES.model - 14} y={316} textAnchor="end" fontSize={13} fill={C.muted} className="tc-call2">
          call 2
        </text>
        {/* Tool execution */}
        <rect x={LANES.tools - 6} y={190} width={12} height={58} rx={3} fill={C.goodSoft} />
        <rect x={LANES.tools - 9} y={187} width={18} height={64} rx={4} fill="none" stroke={C.good} strokeWidth={2} className="tc-run" />

        {STEPS.map((step, i) => (
          <Arrow key={i} step={step} i={i} />
        ))}
      </svg>
    </div>
  );
}
