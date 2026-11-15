"use client";

import { useMemo } from "react";
import { C, FONT } from "../kit";

/**
 * Static diagram (B9): KV-cache memory as 48 fixed-size blocks.
 * Left, reserve-for-maximum: each sequence is given a contiguous region big enough
 * for the longest allowed output (16 blocks), so 3 sequences fill memory while
 * actually using 5 + 9 + 3 = 17 blocks; 31 of 48 (65%) are reserved but empty.
 * Right, paged (as in vLLM's PagedAttention): blocks are handed out one at a time
 * as sequences grow, from anywhere in memory, tracked by a per-sequence block table.
 * The same 3 sequences plus 3 more (6 + 4 + 7 blocks) use 34 blocks; 14 remain free.
 */

const COLS = 8;
const ROWS = 6;
const B = 34;
const SEQ = [
  { name: "A", used: 5, fill: C.primary, text: "white" },
  { name: "B", used: 9, fill: C.active, text: "white" },
  { name: "C", used: 3, fill: C.good, text: "white" },
  { name: "D", used: 6, fill: C.primarySoft, text: C.ink },
  { name: "E", used: 4, fill: C.activeSoft, text: C.ink },
  { name: "F", used: 7, fill: C.goodSoft, text: C.ink },
];
const RESERVE = 16;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Block = { seq: number; kind: "used" | "reserved" } | null;

function reserved(): Block[] {
  const blocks: Block[] = Array(COLS * ROWS).fill(null);
  SEQ.slice(0, 3).forEach((s, i) => {
    for (let k = 0; k < RESERVE; k++) blocks[i * RESERVE + k] = { seq: i, kind: k < s.used ? "used" : "reserved" };
  });
  return blocks;
}

function paged(): { blocks: Block[]; tableB: number[] } {
  const rand = mulberry32(11);
  const order = Array.from({ length: COLS * ROWS }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const blocks: Block[] = Array(COLS * ROWS).fill(null);
  const tableB: number[] = [];
  // Interleave allocation as sequences grow step by step
  const remaining = SEQ.map((s) => s.used);
  let p = 0;
  while (remaining.some((r) => r > 0)) {
    remaining.forEach((r, i) => {
      if (r > 0) {
        blocks[order[p]] = { seq: i, kind: "used" };
        if (i === 1) tableB.push(order[p]);
        p++;
        remaining[i]--;
      }
    });
  }
  return { blocks, tableB };
}

function Grid({ x, y, blocks }: { x: number; y: number; blocks: Block[] }) {
  return (
    <g>
      {blocks.map((b, i) => {
        const bx = x + (i % COLS) * B;
        const by = y + Math.floor(i / COLS) * B;
        const s = b ? SEQ[b.seq] : null;
        return (
          <g key={i}>
            <rect x={bx + 1} y={by + 1} width={B - 3} height={B - 3} rx={4} fill={b ? (b.kind === "used" ? s!.fill : "white") : "white"} stroke={b?.kind === "reserved" ? s!.fill : C.grid} strokeWidth={b?.kind === "reserved" ? 1.5 : 1} />
            {b?.kind === "reserved" && <rect x={bx + 5} y={by + (B - 3) / 2 - 1} width={B - 11} height={4} rx={2} fill={C.warnSoft} />}
            {b?.kind === "used" && (
              <text x={bx + (B - 1) / 2} y={by + B / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={s!.text}>
                {s!.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default function PagedKvFigure() {
  const left = useMemo(reserved, []);
  const right = useMemo(paged, []);
  const gridW = COLS * B;
  const X1 = 8;
  const X2 = 680 - gridW - 8;
  const Y = 50;
  return (
    <div>
      <svg viewBox={`0 0 680 ${Y + ROWS * B + 58}`} role="img" aria-label="Two views of GPU memory for the KV cache: reserving the maximum length per sequence leaves most of it empty and fits three sequences; allocating small blocks on demand fits six with room to spare" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        <text x={X1} y={20} fontSize={15} fontWeight={700} fill={C.ink}>
          Reserve the maximum
        </text>
        <text x={X1} y={38} fontSize={13} fill={C.muted}>
          contiguous, sized for the longest output
        </text>
        <text x={X2} y={20} fontSize={15} fontWeight={700} fill={C.ink}>
          Paged
        </text>
        <text x={X2} y={38} fontSize={13} fill={C.muted}>
          one block at a time, anywhere
        </text>
        <Grid x={X1} y={Y} blocks={left} />
        <Grid x={X2} y={Y} blocks={right.blocks} />
        <text x={X1} y={Y + ROWS * B + 24} fontSize={14} fontWeight={700} fill={C.warn}>
          3 sequences · 31 of 48 blocks empty
        </text>
        <text x={X2} y={Y + ROWS * B + 24} fontSize={14} fontWeight={700} fill={C.good}>
          6 sequences · 14 blocks still free
        </text>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Each block holds the keys and values of a fixed number of tokens (for example 16). Sequence B&apos;s block table on the right: blocks{" "}
        <span className="font-mono text-pencil">{right.tableB.join(", ")}</span>. The attention kernel follows the table, so the blocks need not be
        adjacent. Hatched outlines on the left: reserved but never filled.
      </p>
    </div>
  );
}
