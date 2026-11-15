"use client";

import { C, FONT } from "../kit";
import { stagedCss } from "./util";

/**
 * Text → tokens → ids → rows of the embedding table → points in space (A10).
 * Staged loop, 11 s: tokens light one by one; each id selects its row of the
 * embedding matrix E (V × d); each row is a point in d-dimensional space,
 * shown here in a 2-D view next to neighbours that play similar roles.
 * Token split and ids are illustrative (every tokenizer differs); positions in
 * the 2-D view are hand-placed to show the kind of neighbourhoods training produces.
 */

const CYCLE = 11;
const TOKENS = [
  { text: "The", id: 464, p: [0.14, 0.2] },
  { text: "␣un", id: 7543, p: [0.34, 0.76] },
  { text: "friend", id: 18935, p: [0.64, 0.6] },
  { text: "li", id: 11297, p: [0.2, 0.62] },
  { text: "est", id: 2395, p: [0.1, 0.52] },
  { text: "␣cat", id: 29797, p: [0.8, 0.2] },
] as const;

const NEIGHBOURS: Array<{ label: string; p: [number, number] }> = [
  { label: "the", p: [0.26, 0.14] },
  { label: "of", p: [0.08, 0.32] },
  { label: "and", p: [0.28, 0.3] },
  { label: "not", p: [0.24, 0.9] },
  { label: "dis", p: [0.46, 0.86] },
  { label: "pal", p: [0.76, 0.52] },
  { label: "ally", p: [0.72, 0.72] },
  { label: "ing", p: [0.08, 0.72] },
  { label: "er", p: [0.04, 0.44] },
  { label: "dog", p: [0.9, 0.3] },
  { label: "kitten", p: [0.7, 0.1] },
];

const V = 50_000;
const ROW_Y = (i: number) => 124 + i * 40;
const M = { x: 238, y: 108, w: 64, h: 248 };
const S = { x: 352, y: 108, w: 316, h: 248 };
const matrixRowY = (id: number) => M.y + 6 + (id / V) * (M.h - 12);
const space = ([u, v]: readonly [number, number] | readonly number[]) => [S.x + 14 + u * (S.w - 28), S.y + 12 + v * (S.h - 24)] as const;

const starts = [
  ...TOKENS.map((_, i) => 0.3 + i * 0.3),
  ...TOKENS.map((_, i) => 2.5 + i * 0.3),
  ...TOKENS.map((_, i) => 4.8 + i * 0.3),
];

export default function EmbeddingLookupFigure() {
  return (
    <div>
      <style>{stagedCss("el", CYCLE, starts)}</style>
      <svg viewBox="0 0 680 384" role="img" aria-label="The text ‘The unfriendliest cat’ is split into six tokens, each token id selects one row of the embedding table, and each row is a point in a space where related pieces sit near each other" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Raw text */}
        <rect x={20} y={12} width={640} height={40} rx={8} fill={C.wash} stroke={C.grid} />
        <text x={36} y={38} fontSize={13} fontWeight={700} letterSpacing="0.06em" fill={C.muted}>
          TEXT
        </text>
        <text x={96} y={39} fontSize={17} fill={C.ink} fontFamily={FONT.mono}>
          The unfriendliest cat
        </text>

        {/* Column headers */}
        {[
          { x: 20, label: "TOKENS · IDS" },
          { x: M.x - 6, label: "TABLE E" },
          { x: S.x, label: "POINTS IN SPACE (2-D VIEW)" },
        ].map((h) => (
          <text key={h.label} x={h.x} y={90} fontSize={13} fontWeight={700} letterSpacing="0.06em" fill={C.text}>
            {h.label}
          </text>
        ))}

        {/* Embedding matrix: V rows × d columns */}
        <rect x={M.x} y={M.y} width={M.w} height={M.h} rx={4} fill={C.wash} stroke={C.line} />
        {Array.from({ length: 30 }, (_, i) => (
          <line key={i} x1={M.x + 4} x2={M.x + M.w - 4} y1={M.y + 6 + i * 8.2} y2={M.y + 6 + i * 8.2} stroke={C.grid} />
        ))}
        <text x={M.x + M.w / 2} y={M.y + M.h + 20} textAnchor="middle" fontSize={13} fill={C.muted}>
          50k × 768
        </text>

        {/* Space panel */}
        <rect x={S.x} y={S.y} width={S.w} height={S.h} rx={6} fill="white" stroke={C.grid} />
        {NEIGHBOURS.map((n) => {
          const [x, y] = space(n.p);
          return (
            <g key={n.label}>
              <circle cx={x} cy={y} r={4} fill={C.faint} />
              <text x={x + 7} y={y + 4.5} fontSize={13} fill={C.muted}>
                {n.label}
              </text>
            </g>
          );
        })}

        {TOKENS.map((t, i) => {
          const y = ROW_Y(i);
          const ry = matrixRowY(t.id);
          const [px, py] = space(t.p);
          const link1 = `M 184 ${y} C 212 ${y}, 212 ${ry}, ${M.x} ${ry}`;
          const link2 = `M ${M.x + M.w} ${ry} C ${M.x + M.w + 30} ${ry}, ${px - 40} ${py}, ${px - 6} ${py}`;
          return (
            <g key={t.text}>
              {/* Base layer: the full structure, neutral */}
              <rect x={20} y={y - 15} width={92} height={30} rx={6} fill="white" stroke={C.line} />
              <text x={30} y={y + 5} fontSize={15} fill={C.ink} fontFamily={FONT.mono}>
                {t.text}
              </text>
              <text x={120} y={y + 5} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                {t.id.toLocaleString("en-US")}
              </text>
              <path d={link1} fill="none" stroke={C.grid} strokeWidth={1.2} />
              <path d={link2} fill="none" stroke={C.grid} strokeWidth={1.2} />
              <rect x={M.x + 2} y={ry - 2} width={M.w - 4} height={4} rx={1} fill={C.faint} />
              <circle cx={px} cy={py} r={6} fill={C.primary} />
              <text x={px + 9} y={py + 5} fontSize={14} fontWeight={600} fill={C.ink}>
                {t.text.replace("␣", "")}
              </text>

              {/* Stage 1: the token is read */}
              <rect className={`el-s${i}`} x={20} y={y - 15} width={92} height={30} rx={6} fill={C.primaryWash} stroke={C.primary} strokeWidth={1.5} />
              <text className={`el-s${i}`} x={30} y={y + 5} fontSize={15} fill={C.primary} fontFamily={FONT.mono}>
                {t.text}
              </text>
              {/* Stage 2: its id selects one row of E */}
              <g className={`el-s${i + TOKENS.length}`}>
                <path d={link1} fill="none" stroke={C.active} strokeWidth={1.8} />
                <rect x={M.x + 2} y={ry - 2.5} width={M.w - 4} height={5} rx={1} fill={C.active} />
              </g>
              {/* Stage 3: that row is a point in the space */}
              <g className={`el-s${i + 2 * TOKENS.length}`}>
                <path d={link2} fill="none" stroke={C.active} strokeWidth={1.5} strokeOpacity={0.7} />
                <circle cx={px} cy={py} r={11} fill="none" stroke={C.active} strokeWidth={2} />
              </g>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-xs text-pencil">
        ␣ marks a leading space, which is part of the token. Split, ids and 2-D positions are illustrative; real tables have 30k–250k rows
        and hundreds to thousands of columns.
      </p>
    </div>
  );
}
