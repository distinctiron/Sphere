"use client";

import { useState } from "react";
import { ChoiceButtons } from "../kit";

/**
 * Who holds which link (D8). Interactive, qualitative.
 * For each state or bloc, each link of the chain is marked as held (a
 * domestic leader others depend on), partial (real domestic capacity, but
 * behind the leader or not enough) or dependent (mostly imported).
 * A rough, simplified judgement as of mid-2026; the notes say why.
 */

type Status = "held" | "partial" | "depends";

const LINKS = [
  { id: "tools", label: "Lithography & tools" },
  { id: "design", label: "Chip design & EDA" },
  { id: "fabs", label: "Leading-edge fabs" },
  { id: "hbm", label: "HBM memory" },
  { id: "pack", label: "Advanced packaging" },
  { id: "power", label: "Power & sites" },
  { id: "cloud", label: "Cloud & data centers" },
  { id: "models", label: "Frontier models" },
] as const;
type LinkId = (typeof LINKS)[number]["id"];

type Actor = { label: string; strategy: string; links: Record<LinkId, [Status, string]> };

const ACTORS: Record<string, Actor> = {
  us: {
    label: "United States",
    strategy: "Holds design, cloud and models. Uses subsidies and tariffs to bring fabs and packaging home, and export controls to deny rivals.",
    links: {
      tools: ["partial", "Applied, Lam, KLA; EUV is Dutch"],
      design: ["held", "Nvidia, AMD, custom chips; EDA"],
      fabs: ["partial", "Intel; TSMC Arizona ramping"],
      hbm: ["partial", "Micron"],
      pack: ["depends", "mostly Taiwan; US plants planned"],
      power: ["partial", "ample fuel, slow grid connections"],
      cloud: ["held", "the largest hyperscalers"],
      models: ["held", "most frontier labs"],
    },
  },
  china: {
    label: "China",
    strategy: "Builds every link at home and accepts lower performance per chip, leaning on scale, cheap power and open-weight models.",
    links: {
      tools: ["partial", "domestic tools advancing; no EUV"],
      design: ["partial", "Huawei, Cambricon; limited by fabs"],
      fabs: ["partial", "SMIC 7 nm-class, limited volume"],
      hbm: ["partial", "domestic HBM early, behind"],
      pack: ["partial", "large packaging industry"],
      power: ["held", "fast growth in generation and grid"],
      cloud: ["held", "Alibaba, Huawei, Tencent, others"],
      models: ["held", "DeepSeek, Qwen, Kimi; close behind"],
    },
  },
  eu: {
    label: "EU",
    strategy: "Holds the EUV chokepoint through ASML. Funds shared compute (AI factories and gigafactories) and leads on regulation, but relies on US clouds and Asian fabs.",
    links: {
      tools: ["held", "ASML (EUV), Zeiss optics"],
      design: ["depends", "little accelerator design; Arm is British"],
      fabs: ["depends", "no leading-edge logic fab"],
      hbm: ["depends", "none"],
      pack: ["depends", "small"],
      power: ["partial", "costly; cheap in the Nordics"],
      cloud: ["depends", "US providers hold most of the market"],
      models: ["partial", "Mistral and others"],
    },
  },
  taiwan: {
    label: "Taiwan",
    strategy: "Stays indispensable: keeps the most advanced node and packaging at home while building abroad for customers.",
    links: {
      tools: ["depends", "imports tools"],
      design: ["partial", "MediaTek, custom-chip design houses"],
      fabs: ["held", "TSMC"],
      hbm: ["depends", "from Korea and the US"],
      pack: ["held", "TSMC CoWoS"],
      power: ["depends", "imports almost all its fuel"],
      cloud: ["partial", "server assembly giants, small clouds"],
      models: ["depends", "mostly foreign models"],
    },
  },
  korea: {
    label: "South Korea",
    strategy: "Leverages memory: HBM makes it indispensable to every accelerator, and it is pushing into foundry and its own chips.",
    links: {
      tools: ["partial", "some domestic tools"],
      design: ["partial", "Samsung; startups such as Rebellions"],
      fabs: ["partial", "Samsung Foundry"],
      hbm: ["held", "SK hynix, Samsung"],
      pack: ["partial", "memory stacking at home"],
      power: ["partial", "nuclear-heavy grid"],
      cloud: ["partial", "Naver, KT"],
      models: ["partial", "LG, Naver"],
    },
  },
  japan: {
    label: "Japan",
    strategy: "Holds materials and many tools, and is funding a return to leading-edge logic through Rapidus alongside TSMC’s Kumamoto fabs.",
    links: {
      tools: ["partial", "Tokyo Electron; dominant in resists"],
      design: ["partial", "Preferred Networks; SoftBank owns Arm"],
      fabs: ["partial", "Rapidus targets 2 nm around 2027"],
      hbm: ["depends", "none at scale"],
      pack: ["partial", "substrates and materials"],
      power: ["partial", "imports most fuel"],
      cloud: ["partial", "mostly US providers"],
      models: ["partial", "Sakana, SoftBank and others"],
    },
  },
  gulf: {
    label: "Gulf states",
    strategy: "Trades cheap power, capital and fast permits for access to US chips, under security conditions set by Washington.",
    links: {
      tools: ["depends", "none"],
      design: ["depends", "none"],
      fabs: ["depends", "none"],
      hbm: ["depends", "none"],
      pack: ["depends", "none"],
      power: ["held", "cheap gas and solar, fast permits"],
      cloud: ["partial", "G42, Humain, with US partners"],
      models: ["partial", "Falcon, Jais"],
    },
  },
  india: {
    label: "India",
    strategy: "Uses its market and engineering talent; subsidises first fabs, assembly plants and shared GPU access for local model builders.",
    links: {
      tools: ["depends", "none"],
      design: ["partial", "large chip-design workforce"],
      fabs: ["depends", "first fabs under construction"],
      hbm: ["depends", "none"],
      pack: ["partial", "assembly and test plants coming"],
      power: ["partial", "growing, strained grid"],
      cloud: ["partial", "local and US providers"],
      models: ["partial", "Sarvam, IndiaAI-backed labs"],
    },
  },
};
type ActorId = keyof typeof ACTORS;

const STYLE: Record<Status, { box: string; tag: string; label: string }> = {
  held: { box: "border-emerald-300 bg-emerald-50", tag: "text-emerald-700", label: "holds" },
  partial: { box: "border-amber-300 bg-amber-50", tag: "text-amber-700", label: "partial" },
  depends: { box: "border-ink/20 bg-paper", tag: "text-pencil", label: "depends" },
};

export default function SovereigntyMapFigure() {
  const [actor, setActor] = useState<ActorId>("eu");
  const a = ACTORS[actor];
  const held = LINKS.filter((l) => a.links[l.id][0] === "held").length;
  const depends = LINKS.filter((l) => a.links[l.id][0] === "depends").length;
  return (
    <div>
      <ChoiceButtons label="State or bloc" value={actor} onChange={setActor} options={(Object.keys(ACTORS) as ActorId[]).map((id) => ({ id, label: ACTORS[id].label }))} />
      <div role="list" aria-label={`Which links of the AI chain ${a.label} holds, partly holds or depends on`} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LINKS.map((l, i) => {
          const [status, note] = a.links[l.id];
          const s = STYLE[status];
          return (
            <div role="listitem" key={l.id} className={`rounded-lg border p-2 ${s.box}`}>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-[11px] font-mono text-pencil/70">{i + 1}</span>
                <span className={`text-[11px] font-bold uppercase tracking-wide ${s.tag}`}>{s.label}</span>
              </div>
              <div className="text-sm font-semibold leading-tight text-ink">{l.label}</div>
              <div className="mt-0.5 text-xs leading-snug text-pencil">{note}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-sm text-pencil">
        <span className="font-semibold">{a.label}</span> holds {held} of 8 links and depends on others for {depends}. {a.strategy}
      </p>
      <p className="mt-2 text-xs text-pencil/70">
        Links run from the bottom of the chain (1) to the top (8). A rough, simplified judgement as of mid-2026: “holds” means a domestic leader others
        rely on; “partial” means real capacity that is behind the leader or too small.
      </p>
    </div>
  );
}
