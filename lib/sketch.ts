/**
 * Geometry for the sketchbook UI: wobbly pencil frames, circles, shading and
 * dividers. Everything is seeded, so server and client render identical paths.
 */

export type Rand = () => number;

export function rng(seed: number): Rand {
  let s = ((seed % 233280) + 233280) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Stable numeric seed from any string (ids, labels). */
export function seedOf(str: string | number): number {
  let h = 7;
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) % 233280;
  return h;
}

const f = (n: number) => n.toFixed(1);
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`;

/** A pencil circle: one loose loop that overshoots where it started. */
export function ring(cx: number, cy: number, r: number, seed: number, overshoot = 1.09): string {
  const R = rng(seed);
  const a0 = -Math.PI * 0.55 + R() * 0.6;
  const span = Math.PI * 2 * overshoot;
  const sx = 1 + (R() - 0.5) * 0.08;
  const sy = 1 + (R() - 0.5) * 0.08;
  const ph = R() * 6;
  const pts: string[] = [];
  for (let i = 0; i <= 56; i++) {
    const t = i / 56;
    const a = a0 + span * t;
    const rr = r * (1 + 0.035 * Math.sin(t * 9 + ph) + (t - 0.5) * 0.07);
    pts.push(pt(cx + rr * Math.cos(a) * sx, cy + rr * Math.sin(a) * sy));
  }
  return "M" + pts.join(" L");
}

/** Back-and-forth shading inside a circle: one continuous zigzag across a crescent. */
export function shade(cx: number, cy: number, r: number, seed: number, from: number, gap: number, angle = Math.PI / 4): string {
  const R = rng(seed);
  const nx = Math.cos(angle);
  const ny = Math.sin(angle);
  const ux = -ny;
  const uy = nx;
  const pts: string[] = [];
  let i = 0;
  for (let d = r * from; d <= r * 0.96; d += gap * (0.8 + R() * 0.4)) {
    const L = Math.sqrt(Math.max(0, r * r - d * d)) * (0.8 + R() * 0.2);
    const bx = cx + nx * d;
    const by = cy + ny * d;
    const p1 = [bx - ux * L, by - uy * L];
    const p2 = [bx + ux * L, by + uy * L];
    const [a, b] = i % 2 ? [p2, p1] : [p1, p2];
    pts.push(pt(a[0] + (R() - 0.5), a[1] + (R() - 0.5)), pt(b[0] + (R() - 0.5), b[1] + (R() - 0.5)));
    i++;
  }
  return "M" + pts.join(" L");
}

export type FramePasses = { a: string; b: string; c: string };

/**
 * A sketched box: every edge its own wobbly stroke running past the corners,
 * drawn in three passes. Use with viewBox="0 0 w h" preserveAspectRatio="none".
 */
export function frame(w: number, h: number, seed: number): FramePasses {
  const R = rng(seed);
  const edges: [number, number, number, number][] = [
    [0, 0, w, 0],
    [w, 0, w, h],
    [w, h, 0, h],
    [0, h, 0, 0],
  ];
  const pass = (k: number) =>
    edges
      .map(([x0, y0, x1, y1]) => {
        const len = Math.hypot(x1 - x0, y1 - y0);
        const dx = (x1 - x0) / len;
        const dy = (y1 - y0) / len;
        const nx = -dy;
        const ny = dx;
        const amp = [1.2, 2.6, 3.6][k];
        const e0 = 3 + R() * (6 + k * 4);
        const e1 = 3 + R() * (8 + k * 4);
        const j0 = (R() - 0.5) * 2 * amp;
        const j1 = (R() - 0.5) * 2 * amp;
        const bow = (R() - 0.5) * 2 * amp;
        const pts: string[] = [];
        const N = Math.max(6, Math.round(len / 40));
        for (let i = 0; i <= N; i++) {
          const t = i / N;
          const along = -e0 + (len + e0 + e1) * t;
          const off = j0 * (1 - t) + j1 * t + bow * Math.sin(Math.PI * t) + (i > 0 && i < N ? (R() - 0.5) * 0.9 : 0);
          pts.push(pt(x0 + dx * along + nx * off, y0 + dy * along + ny * off));
        }
        return "M" + pts.join(" L");
      })
      .join(" ");
  return { a: pass(0), b: pass(1), c: pass(2) };
}

/** A wobbly line in two passes. Use in an svg with viewBox "0 0 w 12" preserveAspectRatio="none". */
export function line(w: number, seed: number): { a: string; b: string } {
  const R = rng(seed);
  const mk = (y: number, amp: number) => {
    const pts: string[] = [];
    const N = Math.max(6, Math.round(w / 40));
    for (let i = 0; i <= N; i++) pts.push(pt(-4 + ((w + 8) * i) / N, y + (R() - 0.5) * amp));
    return "M" + pts.join(" L");
  };
  return { a: mk(6, 1.6), b: mk(7.5, 2.4) };
}

/** Shadow at a bottom-right corner: zigzag hatching back and forth along an L-shaped strip. */
export function corner(size: number, inset: number, len: number, wmax: number, seed: number): { a: string; b: string } {
  const K = size - inset;
  const mk = (seedOff: number, wScale: number, gap: number, shift: number) => {
    const R = rng(seed + seedOff);
    const pts: string[] = [];
    const total = len * 2;
    let i = 0;
    for (let s = 0; s <= total; s += gap * (0.85 + R() * 0.3)) {
      const t = s / total;
      const w = wmax * wScale * Math.pow(Math.sin(Math.PI * Math.min(0.999, Math.max(0.001, t))), 0.55) * (0.8 + R() * 0.4);
      let px: number, py: number, nx: number, ny: number;
      if (s <= len) {
        px = K + shift;
        py = K - len + s;
        nx = 1;
        ny = 0;
      } else {
        px = K - (s - len);
        py = K + shift;
        nx = 0;
        ny = 1;
      }
      if (Math.abs(s - len) < wmax) {
        nx = 0.75;
        ny = 0.75;
      }
      const out = i % 2 === 1;
      const k = out ? w : 0.5;
      pts.push(pt(px + nx * k + (R() - 0.5) * 0.8 + (out ? 1.2 : 0), py + ny * k + (R() - 0.5) * 0.8 + (out ? 1.2 : 0)));
      i++;
    }
    return "M" + pts.join(" L");
  };
  return { a: mk(0, 1, 2.2, 0), b: mk(57, 0.75, 3.3, 1.5) };
}

/** Small wedge of back-and-forth strokes tucked into a top-left corner. */
export function wedge(o: number, size: number, seed: number): string {
  const R = rng(seed);
  const pts: string[] = [];
  let i = 0;
  for (let d = 2; d <= size; d += 2 + R() * 0.8) {
    const a = [o + d * (1.02 + (R() - 0.5) * 0.15), o + (R() - 0.5) * 0.8];
    const b = [o + (R() - 0.5) * 0.8, o + d * (1.02 + (R() - 0.5) * 0.15)];
    const [p, q] = i % 2 ? [b, a] : [a, b];
    pts.push(pt(p[0], p[1]), pt(q[0], q[1]));
    i++;
  }
  return "M" + pts.join(" L");
}

/** Brush colour family for an arXiv category. Unknown categories get a stable colour from their name. */
const CATEGORY_BRUSH: Record<string, string> = {
  "cs.CL": "cl",
  "cs.LG": "lg",
  "cs.CV": "cv",
  "quant-ph": "qp",
  "stat.ML": "sm",
  "cs.AI": "cl",
  "cs.NE": "lg",
  "cs.RO": "cv",
  "cs.IR": "sm",
};
const BRUSH_FAMILIES = ["cl", "lg", "cv", "qp", "sm"];

export type BrushColor = "yellow" | "green" | "blue" | "pink" | "orange";
const COLOR_FAMILY: Record<BrushColor, string> = { yellow: "cl", green: "lg", blue: "cv", pink: "qp", orange: "sm" };

/** CSS class (t-xx0 / t-xx1) that paints a brush stroke behind a .tag or .bs element. */
export function brushClass(key: string, variantSeed?: string | number): string {
  const fam =
    CATEGORY_BRUSH[key] ??
    (key in COLOR_FAMILY ? COLOR_FAMILY[key as BrushColor] : BRUSH_FAMILIES[seedOf(key) % BRUSH_FAMILIES.length]);
  return `sk-t-${fam}${seedOf(variantSeed ?? key) % 2}`;
}
