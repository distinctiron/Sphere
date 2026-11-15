"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT } from "../kit";

/**
 * The lethal trifecta (C9). Interactive.
 * Data exfiltration through prompt injection needs all three legs: access to
 * private data, exposure to untrusted content, and a way to send data out.
 * Toggle legs (or pick a preset agent) and see whether the path is open.
 */

type Leg = "data" | "untrusted" | "exfil";
type State = Record<Leg, boolean>;

const LEGS: Record<Leg, { title: string; examples: string; x: number; y: number; color: string }> = {
  untrusted: { title: "Untrusted content", examples: "web pages, emails, issues, documents or tool output written by others", x: 340, y: 44, color: C.warn },
  data: { title: "Private data", examples: "your files, inbox, databases, credentials", x: 110, y: 250, color: C.primary },
  exfil: { title: "A way out", examples: "web requests, sending email, posting publicly, even loading an image URL", x: 570, y: 250, color: C.active },
};

const PRESETS: Array<{ id: string; label: string; state: State }> = [
  { id: "email", label: "Email assistant that can send", state: { data: true, untrusted: true, exfil: true } },
  { id: "research", label: "Web research, no private data", state: { data: false, untrusted: true, exfil: true } },
  { id: "sandbox", label: "Coding agent, network off", state: { data: true, untrusted: true, exfil: false } },
  { id: "custom", label: "Custom", state: { data: true, untrusted: true, exfil: true } },
];

export default function LethalTrifectaFigure() {
  const [state, setState] = useState<State>(PRESETS[0].state);
  const [preset, setPreset] = useState("email");
  const open = state.data && state.untrusted && state.exfil;

  const toggle = (leg: Leg) => {
    setPreset("custom");
    setState((s) => ({ ...s, [leg]: !s[leg] }));
  };
  const pick = (id: string) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id)!;
    if (id !== "custom") setState(p.state);
  };

  const edges: Array<[Leg, Leg]> = [
    ["untrusted", "data"],
    ["data", "exfil"],
    ["exfil", "untrusted"],
  ];

  let verdict: string;
  if (open) verdict = "Open: text planted in untrusted content can make the agent read private data and send it out.";
  else if (!state.exfil && state.data && state.untrusted)
    verdict = "No way out, so no exfiltration. Injected text can still misuse the remaining tools (deleting or corrupting files), so confirm destructive actions.";
  else if (!state.data && state.untrusted && state.exfil)
    verdict = "Nothing private to steal. Injection can still waste resources or produce misleading output.";
  else if (!state.untrusted) verdict = "No attacker-controlled text reaches the context, so there is no injection path. Keep it that way as tools are added.";
  else verdict = "At most one leg remains; no exfiltration path.";

  return (
    <div>
      <svg viewBox="0 0 680 300" role="img" aria-label="A triangle whose corners are private data, untrusted content and a way out. When all three are present the triangle is closed and an exfiltration path exists." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {edges.map(([a, b]) => {
          const on = state[a] && state[b];
          return <line key={a + b} x1={LEGS[a].x} y1={LEGS[a].y} x2={LEGS[b].x} y2={LEGS[b].y} stroke={on ? (open ? C.active : C.faint) : C.grid} strokeWidth={on ? 4 : 2} strokeDasharray={on ? undefined : "6 6"} />;
        })}
        <text x={340} y={186} textAnchor="middle" fontSize={16} fontWeight={700} fill={open ? C.active : C.good}>
          {open ? "exfiltration possible" : "path closed"}
        </text>
        {(Object.keys(LEGS) as Leg[]).map((leg) => {
          const l = LEGS[leg];
          const on = state[leg];
          return (
            <g key={leg} onClick={() => toggle(leg)} style={{ cursor: "pointer" }}>
              <rect x={l.x - 92} y={l.y - 24} width={184} height={48} rx={24} fill={on ? l.color : "white"} stroke={on ? l.color : C.line} strokeWidth={2} />
              <text x={l.x} y={l.y + 6} textAnchor="middle" fontSize={15} fontWeight={700} fill={on ? "white" : C.faint}>
                {l.title}
              </text>
            </g>
          );
        })}
      </svg>
      <p className={`mt-2 text-sm font-medium ${open ? "text-rose-700" : "text-emerald-700"}`}>{verdict}</p>
      <ul className="mt-2 space-y-1 text-xs text-pencil">
        {(Object.keys(LEGS) as Leg[]).map((leg) => (
          <li key={leg}>
            <span className="font-semibold text-pencil">{LEGS[leg].title}:</span> {LEGS[leg].examples}
          </li>
        ))}
      </ul>
      <Controls>
        <ChoiceButtons label="Agent" value={preset} onChange={pick} options={PRESETS.map((p) => ({ id: p.id, label: p.label }))} />
        <ChoiceButtons
          label="Toggle a leg"
          value={"none" as string}
          onChange={(id) => toggle(id as Leg)}
          options={(Object.keys(LEGS) as Leg[]).map((leg) => ({ id: leg, label: `${state[leg] ? "Remove" : "Add"} ${LEGS[leg].title.toLowerCase()}` }))}
        />
      </Controls>
    </div>
  );
}
