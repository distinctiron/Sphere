"use client";

import { useState } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * Retrieval as geometry (C4). Interactive, 2-D cartoon of an embedding space.
 * Each passage of a paper is a direction; the question is a direction; dense
 * retrieval keeps passages within a similarity threshold (the cone) and returns
 * the top k by cosine. Hybrid search adds an exact keyword match, which can
 * rescue passages whose vectors point elsewhere (e.g. "Table 3"). When nothing
 * qualifies, the harness falls back to overview passages, as Sphere's paper
 * chat does. Hybrid scoring is 0.65 × similarity + 0.35 × keyword match, borrowing the
 * weights Sphere's selection-aware "explain" retrieval uses (lib/rag/retriever.ts);
 * Sphere's paper chat itself ranks by similarity only.
 */

type Chunk = { id: string; angle: number; section: string; text: string };

const CHUNKS: Chunk[] = [
  { id: "C1", angle: 200, section: "Abstract", text: "We introduce SparseMix, a sparse attention method for long documents…" },
  { id: "C2", angle: 232, section: "Introduction", text: "Long-context models are limited by the cost of attention…" },
  { id: "C3", angle: 60, section: "Method", text: "We trained for 300k steps with AdamW on 2T tokens…" },
  { id: "C4", angle: 76, section: "Method", text: "Training data mixes web text, books and code…" },
  { id: "C5", angle: 20, section: "Results", text: "Our main results compare SparseMix with dense attention…" },
  { id: "C6", angle: 43, section: "Results", text: "Table 3: removing the router costs 4 points of accuracy…" },
  { id: "C7", angle: 152, section: "Conclusion", text: "Sparse attention can match dense quality at a fraction of the cost…" },
  { id: "C8", angle: 110, section: "Limitations", text: "We only test contexts up to 128k tokens…" },
];

const QUERIES = {
  train: { label: "How was it trained?", angle: 67, keyword: ["C3", "C4"] },
  table: { label: "What does Table 3 show?", angle: 15, keyword: ["C6"] },
  summary: { label: "Summarise the paper", angle: 300, keyword: [] as string[] },
} as const;
type QueryId = keyof typeof QUERIES;

const THRESHOLD = 0.95;
const HALF_CONE = (Math.acos(THRESHOLD) * 180) / Math.PI;
const OVERVIEW = ["C1", "C7", "C2", "C4"];
const cosDeg = (a: number, b: number) => Math.cos(((a - b) * Math.PI) / 180);

export function retrieve(query: QueryId, k: number, hybrid: boolean) {
  const q = QUERIES[query];
  const scored = CHUNKS.map((c) => {
    const similarity = cosDeg(c.angle, q.angle);
    const match = hybrid && (q.keyword as readonly string[]).includes(c.id) ? 1 : 0;
    return { ...c, similarity, match, score: hybrid ? 0.65 * similarity + 0.35 * match : similarity };
  });
  const hits = scored
    .filter((c) => c.match > 0 || c.similarity >= THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  if (hits.length > 0) return { fallback: false, hits };
  return { fallback: true, hits: OVERVIEW.slice(0, k).map((id) => scored.find((c) => c.id === id)!) };
}

const SIZE = 340;
const R = 128;
const CX = SIZE / 2;
const CY = SIZE / 2;
const pt = (angle: number, r: number): [number, number] => [CX + r * Math.cos((angle * Math.PI) / 180), CY - r * Math.sin((angle * Math.PI) / 180)];

export default function RetrievalGeometryFigure() {
  const [query, setQuery] = useState<QueryId>("train");
  const [k, setK] = useState(3);
  const [hybrid, setHybrid] = useState<"dense" | "hybrid">("dense");
  const { fallback, hits } = retrieve(query, k, hybrid === "hybrid");
  const hitIds = new Set(hits.map((h) => h.id));
  const qa = QUERIES[query].angle;
  const [c1x, c1y] = pt(qa - HALF_CONE, R + 26);
  const [c2x, c2y] = pt(qa + HALF_CONE, R + 26);
  const [qx, qy] = pt(qa, R + 10);

  return (
    <div>
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,20rem)_1fr]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Passages of a paper drawn as directions from a common origin; the question is a rose direction with a shaded cone marking the similarity threshold; retrieved passages are green." className="block h-auto w-full max-w-[20rem] justify-self-center" style={{ fontFamily: FONT.sans }}>
          <circle cx={CX} cy={CY} r={R} fill={C.wash} stroke={C.grid} />
          <path d={`M ${CX} ${CY} L ${c1x} ${c1y} A ${R + 26} ${R + 26} 0 0 0 ${c2x} ${c2y} Z`} fill={C.activeSoft} opacity={0.25} />
          {CHUNKS.map((c) => {
            const [x, y] = pt(c.angle, R);
            const [lx, ly] = pt(c.angle, R + 18);
            const hit = hitIds.has(c.id);
            return (
              <g key={c.id}>
                <line x1={CX} y1={CY} x2={x} y2={y} stroke={hit ? C.good : C.primarySoft} strokeWidth={hit ? 3.5 : 2} strokeLinecap="round" />
                <circle cx={x} cy={y} r={hit ? 5 : 3.5} fill={hit ? C.good : C.primarySoft} />
                <text x={lx} y={ly + 5} textAnchor="middle" fontSize={14} fontWeight={hit ? 700 : 500} fill={hit ? C.good : C.muted}>
                  {c.id}
                </text>
              </g>
            );
          })}
          <line x1={CX} y1={CY} x2={qx} y2={qy} stroke={C.active} strokeWidth={3.5} strokeLinecap="round" />
          <circle cx={qx} cy={qy} r={5} fill={C.active} />
          <circle cx={CX} cy={CY} r={3} fill={C.ink} />
        </svg>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-ink">
            “{QUERIES[query].label}” · {hybrid === "hybrid" ? "hybrid search" : "vector search"}, top {k}
          </div>
          {fallback ? (
            <p className="mt-1 text-sm text-amber-700">
              No passage is within the similarity threshold. Like Sphere&apos;s paper chat, the harness falls back to overview passages
              (abstract, conclusion, introduction) instead of sending nothing.
            </p>
          ) : (
            <p className="mt-1 text-sm text-pencil">Retrieved, in rank order, and placed in the context as numbered passages:</p>
          )}
          <ol className="mt-2 space-y-1.5">
            {hits.map((h, i) => (
              <li key={h.id} className="rounded-md border border-ink/20 px-2.5 py-1.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-pencil">
                  <span className="font-mono font-semibold text-emerald-700">[{i + 1}]</span>
                  <span className="font-semibold text-pencil">
                    {h.id} · {h.section}
                  </span>
                  {!fallback && <span className="font-mono">cos {h.similarity.toFixed(3)}</span>}
                  {!fallback && h.match > 0 && <span className="font-medium text-[#2b6ec4]">keyword match</span>}
                </div>
                <div className="text-pencil">{h.text}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Controls>
        <ChoiceButtons label="Question" value={query} onChange={setQuery} options={(Object.keys(QUERIES) as QueryId[]).map((id) => ({ id, label: QUERIES[id].label }))} />
        <ChoiceButtons
          label="Search"
          value={hybrid}
          onChange={setHybrid}
          options={[
            { id: "dense", label: "Vector only" },
            { id: "hybrid", label: "Hybrid (+ keywords)" },
          ]}
        />
        <Slider label="Passages to retrieve (k)" value={k} min={1} max={4} step={1} onChange={setK} />
      </Controls>
      <p className="mt-2 text-xs text-pencil/70">
        A 2-D cartoon. Real embeddings have hundreds to thousands of dimensions, where unrelated texts are nearly perpendicular rather than opposite, and
        useful similarity thresholds are much lower. The cone marks cosine ≥ {THRESHOLD}.
      </p>
    </div>
  );
}
