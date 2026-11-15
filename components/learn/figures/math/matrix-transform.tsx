"use client";

import { useRef, useState } from "react";
import { C, ChoiceButtons, FONT, Slider, useAnimationFrame, useFigure } from "../kit";

/**
 * A matrix transforms the whole plane (A2). The grid morphs from the identity
 * to the chosen matrix M (M(t) = (1 − t)I + tM). The basis vectors e₁ (indigo)
 * and e₂ (rose) land on M's columns; the unit square becomes a parallelogram
 * of area |det M|; the sample vector x = (2, 1) lands on 2·col₁ + 1·col₂.
 * Loop (while playing and not scrubbed): 1 s identity, 1.5 s morph, 3.5 s hold, 1 s back.
 */

type Vec = [number, number];
type Mat = [number, number, number, number]; // [a, b, c, d] = [[a, b], [c, d]]

const PRESETS = {
  rotate: { label: "Rotate", m: [0.866, -0.5, 0.5, 0.866] as Mat, text: "A 30° rotation. Lengths and angles are preserved, so areas are too (det = 1)." },
  stretch: { label: "Stretch", m: [1.5, 0, 0, 0.5] as Mat, text: "Stretch the x-axis by 1.5 and squash the y-axis to half. Areas scale by 1.5 × 0.5 = 0.75." },
  shear: { label: "Shear", m: [1, 1, 0, 1] as Mat, text: "A shear: e₁ stays put, e₂ tilts over to (1, 1). Squares become slanted, but area is unchanged (det = 1)." },
  project: { label: "Project", m: [0.5, 0.5, 0.5, 0.5] as Mat, text: "A projection onto the diagonal line. Both columns land on the same line, so the whole plane collapses onto it (rank 1, det = 0). Points that differ only along (1, −1) end up identical." },
  example: { label: "Worked example", m: [2, -1, 1, 1] as Mat, text: "The matrix from the worked example: columns (2, 1) and (−1, 1). Areas triple (det = 3)." },
  custom: { label: "Your own", m: [1, 0.5, -0.5, 1] as Mat, text: "Set the four entries yourself. The first column is where e₁ lands, the second is where e₂ lands." },
} as const;
type PresetId = keyof typeof PRESETS;

const X: Vec = [2, 1];
const SIZE = 360;
const RANGE = 4.6;
const toPx = ([x, y]: Vec): Vec => [((x + RANGE) / (2 * RANGE)) * SIZE, SIZE - ((y + RANGE) / (2 * RANGE)) * SIZE];
const apply = ([a, b, c, d]: Mat, [x, y]: Vec): Vec => [a * x + b * y, c * x + d * y];
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const n2 = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return (Object.is(r, -0) || r === 0 ? "0" : String(r)).replace("-", "−");
};
const CYCLE = 7;

function phaseToT(p: number) {
  if (p < 1) return 0;
  if (p < 2.5) return ease((p - 1) / 1.5);
  if (p < 6) return 1;
  return 1 - ease(p - 6);
}

function Arrow({ from, to, color, width = 3.5 }: { from: Vec; to: Vec; color: string; width?: number }) {
  const [x0, y0] = toPx(from);
  const [x, y] = toPx(to);
  const len = Math.hypot(x - x0, y - y0);
  if (len < 2) return <circle cx={x} cy={y} r={4} fill={color} />;
  const ux = (x - x0) / len;
  const uy = (y - y0) / len;
  const head = Math.min(11, len * 0.6);
  const hx = x - ux * head;
  const hy = y - uy * head;
  return (
    <g>
      <line x1={x0} y1={y0} x2={hx} y2={hy} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={`${x},${y} ${hx - uy * 6.5},${hy + ux * 6.5} ${hx + uy * 6.5},${hy - ux * 6.5}`} fill={color} />
    </g>
  );
}

export default function MatrixTransformFigure() {
  const { playing, reducedMotion } = useFigure();
  const [preset, setPreset] = useState<PresetId>("example");
  const [custom, setCustom] = useState<Mat>([...PRESETS.custom.m] as Mat);
  const [scrub, setScrub] = useState<number | null>(null);
  const phase = useRef(2.5);
  const [, force] = useState(0);

  useAnimationFrame(
    (dt) => {
      phase.current = (phase.current + dt) % CYCLE;
      force((n) => n + 1);
    },
    scrub === null && preset !== "custom"
  );

  const M: Mat = preset === "custom" ? custom : PRESETS[preset].m;
  const t = preset === "custom" ? 1 : scrub ?? (reducedMotion ? 1 : phaseToT(phase.current));
  const Mt: Mat = [1 + (M[0] - 1) * t, M[1] * t, M[2] * t, 1 + (M[3] - 1) * t];

  const det = M[0] * M[3] - M[1] * M[2];
  const rank = Math.abs(det) > 1e-9 ? 2 : M.every((v) => Math.abs(v) < 1e-9) ? 0 : 1;
  const col1: Vec = [M[0], M[2]];
  const col2: Vec = [M[1], M[3]];
  const Mx = apply(M, X);

  const e1 = apply(Mt, [1, 0]);
  const e2 = apply(Mt, [0, 1]);
  const xImg = apply(Mt, X);
  const partial = apply(Mt, [X[0], 0]);

  const L = 8;
  const gridLines: Array<[Vec, Vec]> = [];
  for (let k = -6; k <= 6; k++) {
    gridLines.push([apply(Mt, [k, -L]), apply(Mt, [k, L])]);
    gridLines.push([apply(Mt, [-L, k]), apply(Mt, [L, k])]);
  }
  const square = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => toPx(apply(Mt, p as Vec)).join(",")).join(" ");
  const [ox, oy] = toPx([0, 0]);

  const choose = (p: PresetId) => {
    setPreset(p);
    setScrub(null);
    phase.current = playing ? 0 : 2.5;
  };

  return (
    <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,22rem)_1fr]">
      <svg
        viewBox={`-6 -6 ${SIZE + 12} ${SIZE + 12}`}
        role="img"
        aria-label="A square grid being transformed by a 2 by 2 matrix; the two basis arrows land on the matrix columns"
        className="block h-auto w-full max-w-[22rem] justify-self-center"
        style={{ fontFamily: FONT.sans }}
      >
        <defs>
          <clipPath id="mt-clip">
            <rect x={0} y={0} width={SIZE} height={SIZE} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={SIZE} height={SIZE} fill={C.wash} stroke={C.grid} />
        <g clipPath="url(#mt-clip)">
          {/* original grid, faint */}
          {Array.from({ length: 9 }, (_, i) => i - 4).map((k) => {
            const [gx] = toPx([k, 0]);
            const [, gy] = toPx([0, k]);
            return (
              <g key={k}>
                <line x1={gx} y1={0} x2={gx} y2={SIZE} stroke={C.grid} />
                <line x1={0} y1={gy} x2={SIZE} y2={gy} stroke={C.grid} />
              </g>
            );
          })}
          <polygon points={square} fill={C.primarySoft} opacity={0.35} />
          {gridLines.map(([p, q], i) => {
            const [x1, y1] = toPx(p);
            const [x2, y2] = toPx(q);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.faint} strokeWidth={1} />;
          })}
          {/* transformed axes */}
          {[apply(Mt, [-L, 0]), apply(Mt, [0, -L])].map((p, i) => {
            const q = apply(Mt, i === 0 ? [L, 0] : [0, L]);
            const [x1, y1] = toPx(p);
            const [x2, y2] = toPx(q);
            return <line key={`ax${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.muted} strokeWidth={1.5} />;
          })}
          {/* column picture for x: x1·col1 then + x2·col2 */}
          <line x1={ox} y1={oy} x2={toPx(partial)[0]} y2={toPx(partial)[1]} stroke={C.primary} strokeWidth={2} strokeDasharray="5 4" opacity={0.7} />
          <line x1={toPx(partial)[0]} y1={toPx(partial)[1]} x2={toPx(xImg)[0]} y2={toPx(xImg)[1]} stroke={C.active} strokeWidth={2} strokeDasharray="5 4" opacity={0.7} />
          <Arrow from={[0, 0]} to={xImg} color={C.ink} width={2.5} />
          <Arrow from={[0, 0]} to={e1} color={C.primary} />
          <Arrow from={[0, 0]} to={e2} color={C.active} />
        </g>
        {(() => {
          const [lx, ly] = toPx(xImg);
          const inside = lx > 20 && lx < SIZE - 20 && ly > 20 && ly < SIZE - 10;
          return inside ? (
            <text x={lx + 8} y={ly - 8} fontSize={15} fontWeight={700} fill={C.ink} fontFamily={FONT.mono}>
              {t > 0.5 ? "Mx" : "x"}
            </text>
          ) : null;
        })()}
      </svg>

      <div className="min-w-0">
        <ChoiceButtons label="Matrix" value={preset} onChange={choose} options={(Object.keys(PRESETS) as PresetId[]).map((id) => ({ id, label: PRESETS[id].label }))} />
        <div className="mt-3 flex items-center gap-3">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-md border-x-2 border-ink/40 px-2 py-1 font-mono text-sm tabular-nums">
            <span className="text-right text-[#2b6ec4]">{n2(M[0])}</span>
            <span className="text-right text-rose-700">{n2(M[1])}</span>
            <span className="text-right text-[#2b6ec4]">{n2(M[2])}</span>
            <span className="text-right text-rose-700">{n2(M[3])}</span>
          </div>
          <div className="text-xs leading-relaxed text-pencil">
            <div>
              <span className="font-semibold text-[#2b6ec4]">e₁ → column 1</span> = ({n2(col1[0])}, {n2(col1[1])})
            </div>
            <div>
              <span className="font-semibold text-rose-700">e₂ → column 2</span> = ({n2(col2[0])}, {n2(col2[1])})
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-pencil">{PRESETS[preset].text}</p>
        <div className="mt-2 space-y-0.5 font-mono text-xs text-pencil">
          <div>
            x = (2, 1) → 2·col₁ + 1·col₂ = <span className="font-semibold text-ink">({n2(Mx[0])}, {n2(Mx[1])})</span>
          </div>
          <div>
            det = {n2(det)} (area of the shaded square × {n2(Math.abs(det))}
            {det < -1e-9 ? ", flipped" : ""}) · rank {rank}
          </div>
        </div>
        {preset === "custom" ? (
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {(["top left", "top right", "bottom left", "bottom right"] as const).map((name, i) => (
              <Slider
                key={name}
                label={name}
                value={custom[i]}
                min={-2}
                max={2}
                step={0.1}
                format={n2}
                onChange={(v) => setCustom((m) => m.map((old, j) => (j === i ? v : old)) as Mat)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <Slider label="Identity → matrix" value={Math.round(t * 100) / 100} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onChange={setScrub} />
          </div>
        )}
      </div>
    </div>
  );
}
