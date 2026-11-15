"use client";

import { C, FONT } from "../kit";
import { appear, flash } from "./anim";

/**
 * Retrieval-augmented generation end to end (C4). Staged loop, 12 s.
 * Top row, once per document: split into chunks, embed each chunk, store the
 * vectors. Bottom row, per question: embed the question, find the chunks whose
 * vectors point most nearly the same way, put them into the context as numbered
 * passages, and let the model answer citing them.
 */

const CYCLE = 12;
const AT = { paper: 0.3, chunks: 1.1, embed: 1.9, store: 2.7, q: 4.0, qembed: 4.8, search: 5.6, context: 6.8, answer: 8.0 };

// Directions of stored chunk vectors (degrees) and which ones the query retrieves
const CHUNK_ANGLES = [4, 16, 27, 38, 50, 61, 73, 85];
const QUERY_ANGLE = 32;
const TOP = new Set([27, 38, 16]);

function Box({ x, y, w, h, title, cls, children, color = C.line }: { x: number; y: number; w: number; h: number; title: string; cls: string; children?: React.ReactNode; color?: string }) {
  return (
    <g className={cls}>
      <rect x={x} y={y} width={w} height={h} rx={8} fill="white" stroke={color} strokeWidth={1.5} />
      <text x={x + w / 2} y={y + h + 18} textAnchor="middle" fontSize={13} fill={C.ink} fontWeight={600}>
        {title}
      </text>
      {children}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, cls, color = C.muted }: { x1: number; y1: number; x2: number; y2: number; cls: string; color?: string }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} markerEnd="url(#rp-head)" className={cls} />;
}

function Fan({ cx, cy, r, withQuery }: { cx: number; cy: number; r: number; withQuery?: boolean }) {
  const rad = (a: number) => (a * Math.PI) / 180;
  return (
    <g>
      {CHUNK_ANGLES.map((a) => {
        const hit = withQuery && TOP.has(a);
        return (
          <line
            key={a}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(rad(a))}
            y2={cy - r * Math.sin(rad(a))}
            stroke={hit ? C.good : C.primarySoft}
            strokeWidth={hit ? 3 : 2}
            strokeLinecap="round"
          />
        );
      })}
      {withQuery && (
        <line x1={cx} y1={cy} x2={cx + (r + 6) * Math.cos(rad(QUERY_ANGLE))} y2={cy - (r + 6) * Math.sin(rad(QUERY_ANGLE))} stroke={C.active} strokeWidth={3} strokeLinecap="round" />
      )}
    </g>
  );
}

export default function RagPipelineFigure() {
  const css = Object.entries(AT)
    .map(([k, t]) => `${appear(`rp-${k}`, CYCLE, t)} .rp-${k} { animation: rp-${k} ${CYCLE}s linear infinite }`)
    .concat(`${flash("rp-link", CYCLE, AT.search - 0.2, 1.4)} .rp-link { opacity: 0; animation: rp-link ${CYCLE}s linear infinite }`)
    .join("\n");

  return (
    <div>
      <style>{css}</style>
      <svg viewBox="0 0 680 350" role="img" aria-label="RAG pipeline. Indexing: a paper is split into chunks, each chunk is embedded as a vector and stored. Answering: the question is embedded, the chunks pointing the most similar way are retrieved, placed in the context as numbered passages, and the model answers with citations." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <defs>
          <marker id="rp-head" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={C.muted} />
          </marker>
        </defs>

        <text x={10} y={20} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          INDEX · ONCE PER DOCUMENT
        </text>
        <text x={10} y={192} fontSize={13} fontWeight={700} fill={C.muted} letterSpacing="0.06em">
          ANSWER · EVERY QUESTION
        </text>

        {/* Row 1 */}
        <Box x={10} y={36} w={100} h={100} title="Paper" cls="rp-paper">
          {Array.from({ length: 7 }, (_, i) => (
            <line key={i} x1={24} y1={54 + i * 12} x2={i % 3 === 2 ? 76 : 96} y2={54 + i * 12} stroke={C.line} strokeWidth={4} strokeLinecap="round" />
          ))}
        </Box>
        <Arrow x1={116} y1={86} x2={150} y2={86} cls="rp-chunks" />
        <Box x={156} y={36} w={110} h={100} title="Chunks" cls="rp-chunks">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={168} y={46 + i * 22} width={86} height={16} rx={3} fill={C.primaryWash} stroke={C.primarySoft} />
          ))}
        </Box>
        <Arrow x1={272} y1={86} x2={306} y2={86} cls="rp-embed" />
        <Box x={312} y={56} w={90} h={60} title="Embed" cls="rp-embed" color={C.primary}>
          <text x={357} y={92} textAnchor="middle" fontSize={14} fill={C.primary} fontFamily={FONT.mono}>
            text→v
          </text>
        </Box>
        <Arrow x1={408} y1={86} x2={442} y2={86} cls="rp-store" />
        <Box x={448} y={36} w={222} h={100} title="Vector store" cls="rp-store">
          <Fan cx={470} cy={128} r={88} />
        </Box>

        {/* Row 2 */}
        <Box x={10} y={218} w={100} h={70} title="Question" cls="rp-q" color={C.active}>
          <text x={60} y={250} textAnchor="middle" fontSize={13} fill={C.active}>
            “How was it
          </text>
          <text x={60} y={267} textAnchor="middle" fontSize={13} fill={C.active}>
            trained?”
          </text>
        </Box>
        <Arrow x1={116} y1={253} x2={150} y2={253} cls="rp-qembed" />
        <Box x={156} y={223} w={80} h={60} title="Embed" cls="rp-qembed" color={C.primary}>
          <text x={196} y={258} textAnchor="middle" fontSize={14} fill={C.primary} fontFamily={FONT.mono}>
            q→v
          </text>
        </Box>
        <Arrow x1={242} y1={253} x2={276} y2={253} cls="rp-search" />
        <Box x={282} y={208} w={140} h={90} title="Nearest by angle" cls="rp-search" color={C.good}>
          <Fan cx={300} cy={290} r={76} withQuery />
        </Box>
        <path d="M 470 140 C 470 180, 380 172, 372 204" fill="none" stroke={C.good} strokeWidth={2} strokeDasharray="5 4" markerEnd="url(#rp-head)" className="rp-link" />
        <Arrow x1={428} y1={253} x2={462} y2={253} cls="rp-context" />
        <Box x={468} y={208} w={104} h={90} title="Context" cls="rp-context" color={C.primary}>
          <rect x={478} y={216} width={84} height={10} rx={2} fill={C.grid} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={478} y={231 + i * 19} width={84} height={16} rx={2} fill={C.goodSoft} />
              <text x={484} y={244 + i * 19} fontSize={13} fill={C.ink} fontFamily={FONT.mono}>
                [{i + 1}]
              </text>
            </g>
          ))}
          <rect x={478} y={289} width={60} height={5} rx={2} fill={C.activeSoft} />
        </Box>
        <Arrow x1={578} y1={253} x2={596} y2={253} cls="rp-answer" color={C.primary} />
        <Box x={600} y={218} w={72} h={70} title="Answer" cls="rp-answer" color={C.active}>
          <text x={636} y={250} textAnchor="middle" fontSize={13} fill={C.text}>
            … [1]
          </text>
          <text x={636} y={268} textAnchor="middle" fontSize={13} fill={C.text}>
            … [3]
          </text>
        </Box>
      </svg>
    </div>
  );
}
