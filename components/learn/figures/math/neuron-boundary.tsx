"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { C, ChoiceButtons, Controls, FONT, Slider } from "../kit";

/**
 * One neuron in a 2-D input space (A5). z = w·x + b. The boundary z = 0 is a
 * line perpendicular to the weight vector w, at signed distance −b/|w| from the
 * origin along w. Shading shows the neuron's output a = f(z) (ReLU or sigmoid).
 * Drag the tip of w (or use the sliders). The "best any line can do" figure is
 * found by brute force over 360 angles × 241 offsets, so it is exact for these points.
 * The XOR clusters match the space-folding figure of A6.
 */

type Vec = [number, number];
type DataId = "separable" | "xor";
type ActId = "relu" | "sigmoid";

const SIZE = 360;
const RANGE = 3;
const toPx = ([x, y]: Vec): Vec => [((x + RANGE) / (2 * RANGE)) * SIZE, SIZE - ((y + RANGE) / (2 * RANGE)) * SIZE];
const fromPx = (px: number, py: number): Vec => [(px / SIZE) * 2 * RANGE - RANGE, ((SIZE - py) / SIZE) * 2 * RANGE - RANGE];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeData(id: DataId) {
  const rand = mulberry32(id === "xor" ? 7 : 11);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());
  const clusters: Array<{ c: Vec; cls: 0 | 1; n: number; sd: number }> =
    id === "xor"
      ? [
          { c: [1, 1], cls: 1, n: 12, sd: 0.25 },
          { c: [-1, -1], cls: 1, n: 12, sd: 0.25 },
          { c: [1, -1], cls: 0, n: 12, sd: 0.25 },
          { c: [-1, 1], cls: 0, n: 12, sd: 0.25 },
        ]
      : [
          { c: [1.1, 0.9], cls: 1, n: 20, sd: 0.55 },
          { c: [-1.0, -0.9], cls: 0, n: 20, sd: 0.55 },
        ];
  return clusters.flatMap(({ c, cls, n, sd }) =>
    Array.from({ length: n }, () => ({ p: [c[0] + gauss() * sd, c[1] + gauss() * sd] as Vec, cls }))
  );
}

function correctCount(points: Array<{ p: Vec; cls: 0 | 1 }>, w: Vec, b: number) {
  return points.filter(({ p, cls }) => (w[0] * p[0] + w[1] * p[1] + b > 0 ? 1 : 0) === cls).length;
}

function bestLine(points: Array<{ p: Vec; cls: 0 | 1 }>) {
  let best = 0;
  for (let a = 0; a < 360; a++) {
    const w: Vec = [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)];
    for (let i = 0; i <= 240; i++) best = Math.max(best, correctCount(points, w, -3 + i * 0.025));
  }
  return best;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const CELL = 12;

export default function NeuronBoundaryFigure() {
  const [data, setData] = useState<DataId>("separable");
  const [act, setAct] = useState<ActId>("sigmoid");
  const [angle, setAngle] = useState(120);
  const [mag, setMag] = useState(1.5);
  const [bias, setBias] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const datasets = useMemo(() => {
    const sep = makeData("separable");
    const xor = makeData("xor");
    return { separable: { points: sep, best: bestLine(sep) }, xor: { points: xor, best: bestLine(xor) } };
  }, []);
  const { points, best } = datasets[data];

  const rad = (angle * Math.PI) / 180;
  const w: Vec = [mag * Math.cos(rad), mag * Math.sin(rad)];
  const z = (p: Vec) => w[0] * p[0] + w[1] * p[1] + bias;
  const correct = correctCount(points, w, bias);

  // Output shading, one cell per CELL px
  const cells = useMemo(() => {
    const out: Array<{ x: number; y: number; o: number }> = [];
    for (let py = 0; py < SIZE; py += CELL) {
      for (let px = 0; px < SIZE; px += CELL) {
        const p = fromPx(px + CELL / 2, py + CELL / 2);
        const zz = w[0] * p[0] + w[1] * p[1] + bias;
        const a = act === "relu" ? Math.min(Math.max(0, zz) / 4, 1) : sigmoid(zz);
        out.push({ x: px, y: py, o: a * 0.42 });
      }
    }
    return out;
  }, [w[0], w[1], bias, act]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lines of constant z, perpendicular to w, spaced 1/|w| apart
  const levelLine = (c: number) => {
    const n2 = mag * mag;
    const foot: Vec = [((c - bias) / n2) * w[0], ((c - bias) / n2) * w[1]];
    const d: Vec = [-Math.sin(rad), Math.cos(rad)];
    const a = toPx([foot[0] - d[0] * 10, foot[1] - d[1] * 10]);
    const b = toPx([foot[0] + d[0] * 10, foot[1] + d[1] * 10]);
    return { x1: a[0], y1: a[1], x2: b[0], y2: b[1] };
  };
  const foot = toPx([(-bias / (mag * mag)) * w[0], (-bias / (mag * mag)) * w[1]]);
  const [ox, oy] = toPx([0, 0]);
  const [tx, ty] = toPx(w);
  const axisFar = toPx([Math.cos(rad) * 10, Math.sin(rad) * 10]);
  const axisNear = toPx([-Math.cos(rad) * 10, -Math.sin(rad) * 10]);

  const onPointer = (e: PointerEvent<SVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const [x, y] = fromPx(pt.x, pt.y);
    const m = Math.min(Math.max(Math.hypot(x, y), 0.3), 2.8);
    setMag(Math.round(m * 10) / 10);
    setAngle(Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360));
  };

  const fmt = (v: number) => (v < 0 ? `−${Math.abs(v).toFixed(2)}` : v.toFixed(2));

  return (
    <div>
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,22rem)_1fr]">
        <svg
          ref={svgRef}
          viewBox={`-6 -6 ${SIZE + 12} ${SIZE + 12}`}
          role="img"
          aria-label="Two classes of points, a weight vector and the neuron's straight decision boundary perpendicular to it, with the neuron's output shaded"
          className="block h-auto w-full max-w-[22rem] select-none justify-self-center"
          style={{ fontFamily: FONT.sans }}
          onPointerMove={onPointer}
          onPointerUp={() => (dragging.current = false)}
          onPointerLeave={() => (dragging.current = false)}
        >
          <defs>
            <clipPath id="nb-clip">
              <rect x={0} y={0} width={SIZE} height={SIZE} />
            </clipPath>
            <marker id="nb-head" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={C.primary} />
            </marker>
          </defs>
          <rect x={0} y={0} width={SIZE} height={SIZE} fill="white" stroke={C.grid} />
          <g clipPath="url(#nb-clip)">
            {cells.map((c, i) => (
              <rect key={i} x={c.x} y={c.y} width={CELL} height={CELL} fill={C.activeSoft} opacity={c.o} />
            ))}
            <line x1={0} y1={oy} x2={SIZE} y2={oy} stroke={C.line} />
            <line x1={ox} y1={0} x2={ox} y2={SIZE} stroke={C.line} />
            {/* the direction w, extended as a faint axis */}
            <line x1={axisNear[0]} y1={axisNear[1]} x2={axisFar[0]} y2={axisFar[1]} stroke={C.primarySoft} strokeDasharray="2 4" />
            {[-2, -1, 1, 2].map((c) => (
              <line key={c} {...levelLine(c)} stroke={C.faint} strokeWidth={0.8} strokeDasharray="3 4" opacity={0.7} />
            ))}
            <line {...levelLine(0)} stroke={C.ink} strokeWidth={2.2} />
            <circle cx={foot[0]} cy={foot[1]} r={3} fill={C.ink} />
            {points.map(({ p, cls }, i) => {
              const [x, y] = toPx(p);
              const ok = (z(p) > 0 ? 1 : 0) === cls;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={5}
                  fill={cls ? C.active : C.primary}
                  fillOpacity={0.9}
                  stroke={ok ? "white" : C.warn}
                  strokeWidth={ok ? 1 : 2}
                />
              );
            })}
            <line x1={ox} y1={oy} x2={tx} y2={ty} stroke={C.primary} strokeWidth={3} markerEnd="url(#nb-head)" />
          </g>
          <text x={tx + (tx >= ox ? 18 : -18)} y={ty + (ty <= oy ? -12 : 24)} textAnchor={tx >= ox ? "start" : "end"} fontSize={15} fontWeight={700} fill={C.primary}>
            w
          </text>
          {/* drag handle */}
          <circle
            cx={tx}
            cy={ty}
            r={14}
            fill={C.primary}
            fillOpacity={0.12}
            stroke={C.primary}
            strokeOpacity={0.5}
            style={{ cursor: "grab", touchAction: "none" }}
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }}
            onPointerMove={onPointer}
            onPointerUp={() => (dragging.current = false)}
          />
          <text x={SIZE - 6} y={oy - 6} textAnchor="end" fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
            x₁
          </text>
          <text x={ox + 6} y={16} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
            x₂
          </text>
        </svg>

        <div className="min-w-0 space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <ChoiceButtons
              label="Data"
              value={data}
              onChange={setData}
              options={[
                { id: "separable", label: "Two clusters" },
                { id: "xor", label: "XOR corners" },
              ]}
            />
            <ChoiceButtons
              label="Activation"
              value={act}
              onChange={setAct}
              options={[
                { id: "sigmoid", label: "Sigmoid" },
                { id: "relu", label: "ReLU" },
              ]}
            />
          </div>
          <div className="font-mono text-xs text-pencil">
            w = ({fmt(w[0])}, {fmt(w[1])}) · b = {fmt(bias)} · |w| = {mag.toFixed(1)}
          </div>
          <div className="text-pencil">
            Boundary sits {Math.abs(bias / mag).toFixed(2)} from the origin (|b| ÷ |w|), always at right angles to w.
          </div>
          <div className={`font-semibold ${correct === points.length ? "text-emerald-700" : "text-ink"}`}>
            On the correct side: {correct} / {points.length}
          </div>
          <div className="text-pencil">
            Best any single straight line can do here: {best} / {points.length}
            {data === "xor" ? ". No setting of one neuron can separate XOR." : "."}
          </div>
        </div>
      </div>
      <Controls>
        <Slider label="Direction of w" value={angle} min={0} max={359} step={1} onChange={setAngle} format={(v) => `${Math.round(v)}°`} />
        <Slider label="Length |w| (sharpness)" value={mag} min={0.3} max={2.8} step={0.1} onChange={setMag} format={(v) => v.toFixed(1)} />
        <Slider label="Bias b" value={bias} min={-3} max={3} step={0.1} onChange={setBias} format={(v) => fmt(v)} />
      </Controls>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-pencil">
        <span>
          <span className="text-rose-600">●</span> class that should fire
        </span>
        <span>
          <span className="text-[#2b6ec4]">●</span> class that should not
        </span>
        <span>
          <span className="text-amber-600">◯</span> on the wrong side
        </span>
        <span>rose shading = output f(z) · dashed lines: z = ±1, ±2</span>
      </div>
    </div>
  );
}
