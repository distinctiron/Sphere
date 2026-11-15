"use client";

import { useState } from "react";
import { C, ChoiceButtons, FONT, FigureSvg } from "../kit";

/**
 * Relations as directions (A10). Each relation is shown in its own 2-D view,
 * the way published word-vector plots are made (a projection chosen to show
 * one relation). Pairs related the same way are joined by nearly parallel
 * arrows. Picking a word applies the reference offset (e.g. woman − man) to it
 * and reports the nearest other word to where it lands, excluding the three
 * inputs, as the classic analogy test does. Coordinates are hand-placed with
 * small irregularities so the offsets are close to, not exactly, parallel.
 */

type P = [number, number];
interface Relation {
  label: string;
  verb: string;
  pairs: Array<[string, P, string, P]>;
  extras: Array<[string, P]>;
}

const RELATIONS: Record<"gender" | "plural" | "capital", Relation> = {
  gender: {
    label: "male → female",
    verb: "female counterpart",
    pairs: [
      ["man", [-0.72, -0.34], "woman", [-0.67, 0.12]],
      ["king", [0.22, -0.5], "queen", [0.3, -0.02]],
      ["uncle", [-0.28, -0.72], "aunt", [-0.2, -0.26]],
      ["actor", [0.62, -0.18], "actress", [0.64, 0.3]],
    ],
    extras: [
      ["prince", [0.42, -0.74]],
      ["crown", [0.05, 0.62]],
      ["person", [-0.45, 0.62]],
    ],
  },
  plural: {
    label: "singular → plural",
    verb: "plural",
    pairs: [
      ["cat", [-0.78, 0.5], "cats", [-0.3, 0.6]],
      ["dog", [-0.7, -0.05], "dogs", [-0.2, 0.06]],
      ["house", [-0.1, -0.62], "houses", [0.4, -0.55]],
      ["child", [0.12, 0.3], "children", [0.58, 0.46]],
    ],
    extras: [
      ["kitten", [-0.55, 0.78]],
      ["home", [0.1, -0.85]],
      ["family", [0.75, 0.05]],
    ],
  },
  capital: {
    label: "country → capital",
    verb: "capital",
    pairs: [
      ["France", [-0.72, 0.6], "Paris", [-0.6, -0.05]],
      ["Japan", [-0.2, 0.72], "Tokyo", [-0.1, 0.1]],
      ["Italy", [0.28, 0.66], "Rome", [0.36, 0.0]],
      ["Kenya", [0.72, 0.56], "Nairobi", [0.8, -0.1]],
    ],
    extras: [
      ["London", [-0.3, -0.62]],
      ["Europe", [-0.5, 0.92]],
      ["Asia", [0.05, 0.9]],
    ],
  },
};
type RelId = keyof typeof RELATIONS;

const W = 640;
const H = 400;
const PAD = 40;
const px = ([x, y]: P): P => [PAD + ((x + 1) / 2) * (W - 2 * PAD), PAD + ((1 - y) / 2) * (H - 2 * PAD)];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const angle = (v: P) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;

function Arrow({ from, to, color, dashed, width = 2 }: { from: P; to: P; color: string; dashed?: boolean; width?: number }) {
  const [x1, y1] = px(from);
  const [x2, y2] = px(to);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const ex = x2 - ux * 8;
  const ey = y2 - uy * 8;
  const head = `${x2 - ux * 7},${y2 - uy * 7} ${ex - ux * 8 - uy * 5},${ey - uy * 8 + ux * 5} ${ex - ux * 8 + uy * 5},${ey - uy * 8 - ux * 5}`;
  return (
    <g>
      <line x1={x1 + ux * 7} y1={y1 + uy * 7} x2={ex - ux * 4} y2={ey - uy * 4} stroke={color} strokeWidth={width} strokeDasharray={dashed ? "6 5" : undefined} />
      <polygon points={head} fill={color} />
    </g>
  );
}

export default function EmbeddingDirectionsFigure() {
  const [rel, setRel] = useState<RelId>("gender");
  const [pick, setPick] = useState(1);
  const r = RELATIONS[rel];
  const [refA, refAp, refB, refBp] = r.pairs[0];
  const target = r.pairs[pick];
  const offset = sub(refBp, refAp);
  const landed = add(target[1], offset);

  const inputs = new Set([refA, refB, target[0]]);
  const candidates: Array<[string, P]> = [...r.pairs.flatMap(([a, ap, b, bp]) => [[a, ap] as [string, P], [b, bp] as [string, P]]), ...r.extras];
  const ranked = candidates
    .filter(([w]) => !inputs.has(w))
    .map(([w, p]) => ({ w, d: dist(p, landed) }))
    .sort((a, b) => a.d - b.d);
  const nearest = ranked[0];
  const angles = r.pairs.map(([, ap, , bp]) => angle(sub(bp, ap)));
  const spread = Math.max(...angles) - Math.min(...angles);

  const [lx, ly] = px(landed);

  return (
    <div>
      <FigureSvg width={W} height={H} label={`Word pairs related by ${r.label} joined by nearly parallel arrows, with ${target[0]} − ${refA} + ${refB} landing near ${nearest.w}`}>
        <rect x={0} y={0} width={W} height={H} rx={8} fill={C.wash} />
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke={C.grid} />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke={C.grid} />

        {r.pairs.map(([a, ap, b, bp], i) => (
          <Arrow key={a} from={ap} to={bp} color={i === 0 ? C.primary : C.primarySoft} width={i === 0 ? 2.5 : 2} />
        ))}

        {/* The arithmetic: start at the picked word, add the reference offset */}
        <Arrow from={target[1]} to={landed} color={C.active} dashed width={2.2} />
        <circle cx={lx} cy={ly} r={7} fill="none" stroke={C.active} strokeWidth={2} />
        <circle cx={lx} cy={ly} r={2.5} fill={C.active} />

        {[...candidates].map(([w, p]) => {
          const [x, y] = px(p);
          const isNearest = w === nearest.w;
          const isInput = inputs.has(w);
          return (
            <g key={w}>
              <circle cx={x} cy={y} r={5} fill={isNearest ? C.active : isInput ? C.primary : C.faint} />
              <text
                x={x + 9}
                y={y - 8}
                fontSize={17}
                fontWeight={isNearest || isInput ? 700 : 400}
                fill={isNearest ? C.active : isInput ? C.ink : C.muted}
                style={{ fontFamily: FONT.sans }}
              >
                {w}
              </text>
            </g>
          );
        })}
      </FigureSvg>

      <p className="mt-3 text-sm text-pencil">
        <span className="font-mono">
          {target[0]} − {refA} + {refB}
        </span>{" "}
        lands nearest to <span className="font-semibold text-rose-700">{nearest.w}</span>{" "}
        <span className="text-pencil">
          (distance {nearest.d.toFixed(2)}; next: {ranked[1].w}, {ranked[1].d.toFixed(2)})
        </span>
        . The four {r.label} arrows point within {Math.round(spread)}° of each other.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ChoiceButtons
          label="Relation"
          value={rel}
          onChange={(v) => {
            setRel(v);
            setPick(1);
          }}
          options={(Object.keys(RELATIONS) as RelId[]).map((id) => ({ id, label: RELATIONS[id].label }))}
        />
        <ChoiceButtons
          label="Word to transform"
          value={String(pick)}
          onChange={(v) => setPick(Number(v))}
          options={r.pairs.slice(1).map(([a], i) => ({ id: String(i + 1), label: `${a} → ?` }))}
        />
      </div>
      <p className="mt-2 text-xs text-pencil">
        Hand-placed 2-D view, one per relation, with the three input words excluded from the answer as in the standard analogy test.
      </p>
    </div>
  );
}
