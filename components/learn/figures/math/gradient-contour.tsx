"use client";

import { useRef, useState, type PointerEvent } from "react";
import { C, Controls, FONT } from "../kit";

/**
 * The gradient on a contour map (A3). Landscape f(x, y) = x²/2 + 2y²: an
 * elongated bowl whose contour lines are ellipses. Gradient ∇f = (x, 4y).
 * Drag the point: the amber arrow (steepest ascent) is always perpendicular to
 * the contour through the point, and is the sum of the two partial slopes.
 * The dashed emerald line shows that steepest descent does not point at the minimum.
 */

type Vec = [number, number];

const f = (x: number, y: number) => x * x / 2 + 2 * y * y;
const grad = (x: number, y: number): Vec => [x, 4 * y];

const W = 640;
const H = 360;
const S = 100; // px per unit, equal on both axes so right angles look right
const cx = W / 2;
const cy = H / 2;
const px = (x: number) => cx + x * S;
const py = (y: number) => cy - y * S;
const XR = 3.1;
const YR = 1.7;

const LEVELS = [0.5, 1, 2, 3, 4.5, 6, 8];
const ARROW = 0.25; // units of arrow per unit of gradient
const MAX_ARROW = 1.6;

const PRESETS: Array<{ label: string; p: Vec }> = [
  { label: "(2, 1)", p: [2, 1] },
  { label: "(−2.5, 0.4)", p: [-2.5, 0.4] },
  { label: "(0.4, −1.3)", p: [0.4, -1.3] },
  { label: "(2.5, 0)", p: [2.5, 0] },
];

const fmt = (v: number, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? (0).toFixed(d) : v.toFixed(d)).replace("-", "−");

export default function GradientContourFigure() {
  const [p, setP] = useState<Vec>([2, 1]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const toPlot = (e: PointerEvent): Vec | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(ctm.inverse());
    const x = Math.max(-XR, Math.min(XR, (q.x - cx) / S));
    const y = Math.max(-YR, Math.min(YR, (cy - q.y) / S));
    return [Math.round(x * 20) / 20, Math.round(y * 20) / 20];
  };

  const [x, y] = p;
  const g = grad(x, y);
  const gLen = Math.hypot(g[0], g[1]);
  // Proportional arrow, shortened only if it would leave the map
  let scale = gLen * ARROW > MAX_ARROW ? MAX_ARROW / gLen : ARROW;
  const room = (pos: number, d: number, lim: number) => (d > 1e-9 ? (lim - pos) / d : d < -1e-9 ? (-lim - pos) / d : Infinity);
  scale = Math.min(scale, room(x, g[0], XR + 0.05), room(y, g[1], YR + 0.05));
  const tip: Vec = [x + g[0] * scale, y + g[1] * scale];
  const unit: Vec = gLen > 1e-9 ? [g[0] / gLen, g[1] / gLen] : [1, 0];
  const tangent: Vec = [-unit[1], unit[0]];
  const T = 0.55;

  // Angle between steepest descent and the straight line to the minimum
  const dist = Math.hypot(x, y);
  const cosA = gLen > 1e-9 && dist > 1e-9 ? (g[0] * x + g[1] * y) / (gLen * dist) : 1;
  const angle = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;

  // Right-angle marker at the point
  const m = 0.12;
  const corner = (a: Vec, b: Vec) => `${px(x + a[0] * m)},${py(y + a[1] * m)} ${px(x + (a[0] + b[0]) * m)},${py(y + (a[1] + b[1]) * m)} ${px(x + b[0] * m)},${py(y + b[1] * m)}`;

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Contour map of an elongated bowl with a draggable point; the gradient arrow is perpendicular to the contour line through the point"
        className="block h-auto w-full select-none"
        style={{ fontFamily: FONT.sans }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const q = toPlot(e);
          if (q) setP(q);
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <defs>
          <marker id="gc-head" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={C.warn} />
          </marker>
          <marker id="gc-head-soft" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="13" markerHeight="13" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={C.warnSoft} />
          </marker>
          <clipPath id="gc-clip">
            <rect x={0} y={0} width={W} height={H} rx={8} />
          </clipPath>
        </defs>
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          rx={8}
          fill={C.wash}
          stroke={C.grid}
          onClick={(e) => {
            const q = toPlot(e as unknown as PointerEvent);
            if (q) setP(q);
          }}
        />
        <g clipPath="url(#gc-clip)" pointerEvents="none">
          {LEVELS.slice()
            .reverse()
            .map((c, i) => (
              <ellipse key={c} cx={cx} cy={cy} rx={Math.sqrt(2 * c) * S} ry={Math.sqrt(c / 2) * S} fill={C.primary} fillOpacity={0.035 + i * 0.012} stroke={C.primarySoft} strokeWidth={1.3} />
            ))}
          <line x1={0} y1={cy} x2={W} y2={cy} stroke={C.line} />
          <line x1={cx} y1={0} x2={cx} y2={H} stroke={C.line} />
          {/* Height labels on the x-axis */}
          {[1, 3, 6].map((c) => (
            <text key={c} x={px(Math.sqrt(2 * c)) + 5} y={cy - 7} fontSize={19} fill={C.primary} opacity={0.8}>
              {c}
            </text>
          ))}
          <text x={cx + 8} y={cy + 24} fontSize={19} fontWeight={600} fill={C.good}>
            min
          </text>
          <circle cx={cx} cy={cy} r={4} fill={C.good} />

          {/* Straight line to the minimum */}
          {dist > 0.05 && <line x1={px(x)} y1={py(y)} x2={cx} y2={cy} stroke={C.good} strokeWidth={2} strokeDasharray="6 5" />}

          {/* Contour tangent through the point */}
          <line x1={px(x - tangent[0] * T)} y1={py(y - tangent[1] * T)} x2={px(x + tangent[0] * T)} y2={py(y + tangent[1] * T)} stroke={C.ink} strokeWidth={2} />
          {gLen > 1e-9 && <polyline points={corner(unit, tangent)} fill="none" stroke={C.ink} strokeWidth={1.2} />}

          {/* Partial-derivative components */}
          {gLen > 1e-9 && (
            <g>
              {Math.abs(g[0]) > 0.05 && (
                <line x1={px(x)} y1={py(y)} x2={px(x + g[0] * scale)} y2={py(y)} stroke={C.warnSoft} strokeWidth={3} markerEnd="url(#gc-head-soft)" />
              )}
              {Math.abs(g[1]) > 0.05 && (
                <line x1={px(x + g[0] * scale)} y1={py(y)} x2={px(tip[0])} y2={py(tip[1])} stroke={C.warnSoft} strokeWidth={3} strokeDasharray="5 4" />
              )}
              <line x1={px(x)} y1={py(y)} x2={px(tip[0])} y2={py(tip[1])} stroke={C.warn} strokeWidth={4} markerEnd="url(#gc-head)" />
            </g>
          )}
        </g>
        {/* Draggable point */}
        <circle cx={px(x)} cy={py(y)} r={10} fill={C.active} stroke="white" strokeWidth={2} pointerEvents="none" />
        <circle
          cx={px(x)}
          cy={py(y)}
          r={24}
          fill="transparent"
          style={{ cursor: "grab", touchAction: "none" }}
          onPointerDown={(e) => {
            dragging.current = true;
            svgRef.current?.setPointerCapture(e.pointerId);
          }}
        />
      </svg>

      <div className="mt-3 grid gap-1 text-sm leading-relaxed text-pencil">
        <p>
          At <span className="font-mono">({fmt(x)}, {fmt(y)})</span>: height <span className="font-mono">f = {fmt(f(x, y))}</span> · slope east{" "}
          <span className="font-mono">∂f/∂x = {fmt(g[0])}</span> · slope north <span className="font-mono">∂f/∂y = {fmt(g[1])}</span>
        </p>
        <p>
          Gradient <span className="font-mono font-semibold text-amber-700">∇f = ({fmt(g[0])}, {fmt(g[1])})</span>, steepness{" "}
          <span className="font-mono">|∇f| = {fmt(gLen)}</span>.{" "}
          {gLen < 1e-9
            ? "At the bottom the gradient is zero: no direction is uphill."
            : angle < 0.5
              ? "Here steepest descent (−∇f) happens to point straight at the minimum."
              : `Steepest descent (−∇f) points ${angle.toFixed(0)}° away from the straight line to the minimum.`}
        </p>
      </div>
      <Controls>
        <div className="flex flex-wrap items-center gap-1 text-xs text-pencil">
          <span className="mr-1 font-medium text-pencil">Drag the dot, tap the map, or jump to</span>
          {PRESETS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setP(q.p)}
              className="rounded-md bg-[#f1efe4] px-2 py-1 font-mono text-pencil hover:bg-[#e8e5d6]"
            >
              {q.label}
            </button>
          ))}
        </div>
      </Controls>
      <p className="mt-2 font-mono text-xs text-pencil">f(x, y) = x²/2 + 2y² · ∇f = (x, 4y) · contour heights 0.5, 1, 2, 3, 4.5, 6, 8</p>
    </div>
  );
}
