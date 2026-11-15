"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { C, ChoiceButtons, FONT } from "../kit";

/**
 * Dot product as alignment (A1). Two draggable arrows a (indigo) and b (rose).
 * The amber segment is the projection of a onto b's direction (length |a| cos θ);
 * the dot product is that length times |b|. Readouts are computed live.
 */

type Vec = [number, number];

const SIZE = 360;
const RANGE = 4;
const toPx = ([x, y]: Vec): Vec => [((x + RANGE) / (2 * RANGE)) * SIZE, SIZE - ((y + RANGE) / (2 * RANGE)) * SIZE];
const fromPx = ([px, py]: Vec): Vec => [(px / SIZE) * 2 * RANGE - RANGE, ((SIZE - py) / SIZE) * 2 * RANGE - RANGE];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];
const norm = (a: Vec) => Math.hypot(a[0], a[1]);
const round1 = (v: number) => Math.round(v * 10) / 10;
const clamp = (v: number) => Math.max(-3.8, Math.min(3.8, v));
const f1 = (v: number) => (Math.abs(v) < 0.05 ? "0.0" : v.toFixed(1)).replace("-", "−");
const f2 = (v: number) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2)).replace("-", "−");

type Preset = "aligned" | "right" | "opposite" | "longer";
const PRESETS: Record<Preset, { label: string; a: Vec; b: Vec }> = {
  aligned: { label: "Similar", a: [3, 1], b: [1.5, 2.5] },
  right: { label: "Right angle", a: [3, 1], b: [-1, 3] },
  opposite: { label: "Opposed", a: [3, 1], b: [-2, -1.5] },
  longer: { label: "Longer a", a: [3.6, 1.2], b: [1.5, 2.5] },
};

function verdict(cos: number) {
  if (cos > 0.95) return "Pointing almost exactly the same way.";
  if (cos > 0.3) return "Pointing broadly the same way: a has a large component along b.";
  if (cos > -0.3) return "Close to a right angle: a has almost no component along b.";
  if (cos > -0.95) return "Pointing against each other: a's component along b is negative.";
  return "Pointing in opposite directions.";
}

function Arrow({ v, color, label }: { v: Vec; color: string; label: string }) {
  const [x, y] = toPx(v);
  const [ox, oy] = toPx([0, 0]);
  const len = Math.hypot(x - ox, y - oy);
  const ux = (x - ox) / len;
  const uy = (y - oy) / len;
  const head = 12;
  const hx = x - ux * head;
  const hy = y - uy * head;
  const labelX = x + ux * 28;
  const labelY = y + uy * 28 + 6;
  return (
    <g>
      <line x1={ox} y1={oy} x2={hx} y2={hy} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      <polygon points={`${x},${y} ${hx - uy * 7},${hy + ux * 7} ${hx + uy * 7},${hy - ux * 7}`} fill={color} />
      <text x={labelX} y={labelY} textAnchor="middle" fontSize={16} fontWeight={700} fill={color} fontFamily={FONT.mono}>
        {label}
      </text>
    </g>
  );
}

export default function VectorAlignmentFigure() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [a, setA] = useState<Vec>(PRESETS.aligned.a);
  const [b, setB] = useState<Vec>(PRESETS.aligned.b);
  const [preset, setPreset] = useState<Preset | "">("aligned");
  const dragging = useRef<"a" | "b" | null>(null);

  const toData = (e: ReactPointerEvent): Vec | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    const [x, y] = fromPx([p.x, p.y]);
    return [clamp(round1(x)), clamp(round1(y))];
  };

  const onDown = (which: "a" | "b") => (e: ReactPointerEvent<SVGCircleElement>) => {
    dragging.current = which;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: ReactPointerEvent<SVGCircleElement>) => {
    if (!dragging.current) return;
    const v = toData(e);
    if (!v || norm(v) < 0.5) return;
    setPreset("");
    (dragging.current === "a" ? setA : setB)(v);
  };
  const onUp = () => {
    dragging.current = null;
  };

  const d = dot(a, b);
  const na = norm(a);
  const nb = norm(b);
  const cos = d / (na * nb);
  const theta = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;

  // Projection of a onto b's line
  const k = d / (nb * nb);
  const foot: Vec = [k * b[0], k * b[1]];
  const [ox, oy] = toPx([0, 0]);
  const [fx, fy] = toPx(foot);
  const [ax, ay] = toPx(a);
  const lineEnd1 = toPx([(-b[0] / nb) * 6, (-b[1] / nb) * 6]);
  const lineEnd2 = toPx([(b[0] / nb) * 6, (b[1] / nb) * 6]);

  // Angle arc
  const angA = Math.atan2(a[1], a[0]);
  const angB = Math.atan2(b[1], b[0]);
  let delta = angB - angA;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  const arcR = 0.8;
  const arcPts = Array.from({ length: 25 }, (_, i) => {
    const t = angA + (delta * i) / 24;
    return toPx([arcR * Math.cos(t), arcR * Math.sin(t)]).join(",");
  }).join(" ");

  const choose = (p: Preset) => {
    setPreset(p);
    setA(PRESETS[p].a);
    setB(PRESETS[p].b);
  };

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,22rem)_1fr]">
      <svg
        ref={svgRef}
        viewBox={`-6 -6 ${SIZE + 12} ${SIZE + 12}`}
        role="img"
        aria-label="Two arrows a and b from the origin, the angle between them, and the shadow of a along b's direction"
        className="block h-auto w-full max-w-[22rem] select-none justify-self-center"
        style={{ fontFamily: FONT.sans }}
      >
        <defs>
          <clipPath id="va-clip">
            <rect x={0} y={0} width={SIZE} height={SIZE} />
          </clipPath>
        </defs>
        <rect x={0} y={0} width={SIZE} height={SIZE} fill={C.wash} stroke={C.grid} />
        <g clipPath="url(#va-clip)">
          {Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE).map((k) => {
            const [gx] = toPx([k, 0]);
            const [, gy] = toPx([0, k]);
            return (
              <g key={k}>
                <line x1={gx} y1={0} x2={gx} y2={SIZE} stroke={C.grid} />
                <line x1={0} y1={gy} x2={SIZE} y2={gy} stroke={C.grid} />
              </g>
            );
          })}
          <line x1={0} y1={oy} x2={SIZE} y2={oy} stroke={C.line} strokeWidth={1.5} />
          <line x1={ox} y1={0} x2={ox} y2={SIZE} stroke={C.line} strokeWidth={1.5} />
          {/* b's line through the origin */}
          <line x1={lineEnd1[0]} y1={lineEnd1[1]} x2={lineEnd2[0]} y2={lineEnd2[1]} stroke={C.activeSoft} strokeWidth={1} strokeDasharray="4 5" />
          {/* drop from a's tip to b's line */}
          <line x1={ax} y1={ay} x2={fx} y2={fy} stroke={C.muted} strokeWidth={1.2} strokeDasharray="4 4" />
          <polyline points={arcPts} fill="none" stroke={C.muted} strokeWidth={1.5} />
          {/* projection of a onto b (under the arrows) */}
          <line x1={ox} y1={oy} x2={fx} y2={fy} stroke={C.warnSoft} strokeWidth={11} strokeLinecap="round" opacity={0.9} />
          <Arrow v={a} color={C.primary} label="a" />
          <Arrow v={b} color={C.active} label="b" />
          {(["a", "b"] as const).map((which) => {
            const [hx, hy] = toPx(which === "a" ? a : b);
            return (
              <circle
                key={which}
                cx={hx}
                cy={hy}
                r={16}
                fill={which === "a" ? C.primary : C.active}
                fillOpacity={0.12}
                stroke={which === "a" ? C.primary : C.active}
                strokeWidth={1.5}
                style={{ cursor: "grab", touchAction: "none" }}
                onPointerDown={onDown(which)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
              />
            );
          })}
        </g>
      </svg>

      <div className="min-w-0 text-sm">
        <p className="mb-3 text-xs text-pencil">Drag the circled tips, or pick a case:</p>
        <ChoiceButtons
          label="Example"
          value={preset as Preset}
          onChange={choose}
          options={(Object.keys(PRESETS) as Preset[]).map((id) => ({ id, label: PRESETS[id].label }))}
        />
        <div className="mt-3 space-y-1 font-mono text-[13px] text-pencil">
          <div>
            <span className="font-semibold text-[#2b6ec4]">a</span> = ({f1(a[0])}, {f1(a[1])}) · |a| = {f2(na)}
          </div>
          <div>
            <span className="font-semibold text-rose-700">b</span> = ({f1(b[0])}, {f1(b[1])}) · |b| = {f2(nb)}
          </div>
          <div className="pt-1">
            a·b = {f1(a[0])}×{f1(b[0])} + {f1(a[1])}×{f1(b[1])} = <span className="font-semibold text-ink">{f2(d)}</span>
          </div>
          <div>
            cos θ = {f2(d)} ÷ ({f2(na)} × {f2(nb)}) = <span className="font-semibold text-ink">{f2(cos)}</span> · θ = {Math.round(theta)}°
          </div>
          <div className="text-amber-700">shadow of a along b = |a| cos θ = {f2(na * cos)}</div>
        </div>
        <p className="mt-3 leading-relaxed text-pencil">{verdict(cos)}</p>
      </div>
    </div>
  );
}
