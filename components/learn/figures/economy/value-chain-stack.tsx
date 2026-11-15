"use client";

import { C } from "../kit";

/**
 * The AI value chain as a stack (D1). Staged loop, 11 s.
 * A dollar of end-customer spending (rose dot) falls from applications down
 * to equipment; as it passes each layer, that layer's margin bar fills.
 * Then the layers with one or very few credible suppliers are outlined:
 * they are the ones with the widest margins.
 * Margins are rough gross margins for the leading players around 2024–25
 * (public filings, rounded); labs and apps are especially uncertain.
 * Rendered in HTML so the text stays readable at phone width.
 */

const CYCLE = 11;
const STEP = 0.62; // seconds per layer for the falling dollar

const LAYERS = [
  { name: "Applications", who: "Copilots, coding tools, chat apps, enterprise software", suppliers: "thousands", margin: 0.45, marginText: "wide range", choke: false },
  { name: "Model labs", who: "OpenAI, Anthropic, Google DeepMind, Meta, xAI, DeepSeek, Mistral", suppliers: "~5 at the frontier", margin: 0.45, marginText: "uncertain, before training", choke: false },
  { name: "Cloud & neoclouds", who: "AWS, Azure, Google Cloud, Oracle; CoreWeave, Nebius", suppliers: "~4 + neoclouds", margin: 0.35, marginText: "thinner on GPU rental", choke: false },
  { name: "Systems & networking", who: "Server makers and ODMs (Foxconn, Quanta, Dell, Supermicro), switches, optics", suppliers: "many", margin: 0.12, marginText: "~10% on servers", choke: false },
  { name: "Chip design", who: "Nvidia, AMD; custom chips (Google TPU, AWS Trainium) with Broadcom, Marvell", suppliers: "1 dominant", margin: 0.75, marginText: "~70–75% (Nvidia)", choke: true },
  { name: "Memory & packaging", who: "HBM: SK hynix, Samsung, Micron · packaging: TSMC CoWoS", suppliers: "3 · 1", margin: 0.5, marginText: "high in HBM, cyclical", choke: true },
  { name: "Leading-edge fabs", who: "TSMC; Samsung and Intel trying to catch up", suppliers: "1", margin: 0.58, marginText: "~55–60% (TSMC)", choke: true },
  { name: "Equipment & EDA", who: "ASML (EUV), Applied Materials, Lam, Tokyo Electron, KLA; Synopsys, Cadence", suppliers: "1 for EUV", margin: 0.55, marginText: "~50% tools, ~80% EDA", choke: true },
];

export default function ValueChainStackFigure() {
  const n = LAYERS.length;
  const fallEnd = (n * STEP) / CYCLE; // fraction of cycle when the dollar reaches the bottom
  const pct = (s: number) => `${((s / CYCLE) * 100).toFixed(1)}%`;
  return (
    <div>
      <style>{`
        .vc-dot { animation: vc-fall ${CYCLE}s linear infinite; }
        @keyframes vc-fall {
          0% { top: 0%; opacity: 0 }
          2% { opacity: 1 }
          ${(fallEnd * 100).toFixed(1)}% { top: calc(100% - 12px); opacity: 1 }
          ${(fallEnd * 100 + 4).toFixed(1)}%, 100% { top: calc(100% - 12px); opacity: 0 }
        }
        .vc-fill { transform-origin: left center; animation: vc-fill ${CYCLE}s ease-out infinite backwards; }
        @keyframes vc-fill { 0% { transform: scaleX(0) } 4%, 96% { transform: scaleX(1) } 100% { transform: scaleX(0) } }
        .vc-choke { animation: vc-choke ${CYCLE}s ease-in-out infinite; }
        @keyframes vc-choke {
          0%, ${pct(n * STEP + 0.4)} { box-shadow: 0 0 0 0 rgba(225,29,72,0) }
          ${pct(n * STEP + 1.1)}, 94% { box-shadow: 0 0 0 2px ${C.active} }
          100% { box-shadow: 0 0 0 0 rgba(225,29,72,0) }
        }
      `}</style>

      <div role="img" aria-label="The AI value chain from applications down to equipment, with each layer's number of credible suppliers and approximate gross margin; the layers with one or few suppliers have the widest margins" className="relative pl-5">
        {/* the falling dollar track */}
        <div className="absolute bottom-1 left-1.5 top-1 w-px bg-[#e8e5d6]" />
        <div className="vc-dot absolute left-0 h-3 w-3 rounded-full" style={{ background: C.active, top: "calc(100% - 12px)" }} />

        <div className="mb-1 hidden grid-cols-[minmax(0,1fr)_7.5rem_9.5rem] gap-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-pencil/70 sm:grid">
          <span>Layer · leading players</span>
          <span>Credible suppliers</span>
          <span>Rough gross margin</span>
        </div>

        <div className="space-y-1.5">
          {LAYERS.map((l, i) => (
            <div
              key={l.name}
              className={`${l.choke ? "vc-choke" : ""} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-ink/20 bg-paper px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_7.5rem_9.5rem]`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{l.name}</div>
                <div className="text-xs leading-snug text-pencil">{l.who}</div>
              </div>
              <div className={`text-xs font-semibold sm:text-sm ${l.choke ? "text-rose-700" : "text-pencil"}`}>{l.suppliers}</div>
              <div className="col-span-2 sm:col-span-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#e8e5d6]">
                  <div
                    className="vc-fill h-full rounded-full"
                    style={{ width: `${l.margin * 100}%`, background: l.choke ? C.active : C.primary, animationDelay: `${(i + 0.6) * STEP}s` }}
                  />
                </div>
                <div className="mt-0.5 text-[11px] text-pencil">{l.marginText}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-pencil/70">
        Money flows down the stack (rose dot); each layer keeps its margin and passes the rest on as purchases. Margins are rough gross margins of the
        leading firms around 2024–25, rounded from public filings; lab and application margins are estimates and vary widely.
      </p>
    </div>
  );
}
