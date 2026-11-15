/**
 * Small helpers shared by the "From networks to LLMs" figures (A10–A15).
 * Not a figure itself: not registered in index.ts.
 */

/** Deterministic PRNG so figures look the same on every visit */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Numerically stable softmax */
export function softmax(xs: number[]): number[] {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

/**
 * CSS for a staged loop: element class `${prefix}-s${i}` fades in at starts[i]
 * seconds and stays visible until the shared fade-out near the end of the cycle.
 * Under reduced motion the animation is removed and overlays stay hidden, so the
 * base layer must carry the meaning on its own.
 */
export function stagedCss(prefix: string, cycle: number, starts: number[], fadeIn = 0.4, holdUntil = 0.92): string {
  return starts
    .map((s, i) => {
      const a = ((s / cycle) * 100).toFixed(2);
      const b = (((s + fadeIn) / cycle) * 100).toFixed(2);
      const c = (holdUntil * 100).toFixed(2);
      const d = Math.min(holdUntil * 100 + 4, 100).toFixed(2);
      return `.${prefix}-s${i} { opacity: 0; animation: ${prefix}-k${i} ${cycle}s linear infinite; }
@keyframes ${prefix}-k${i} { 0%, ${a}% { opacity: 0 } ${b}%, ${c}% { opacity: 1 } ${d}%, 100% { opacity: 0 } }`;
    })
    .join("\n");
}

/**
 * CSS for elements visible only inside a time window of a staged loop:
 * class `${prefix}-w${i}` fades in at windows[i][0] and out at windows[i][1] (seconds).
 */
export function windowCss(prefix: string, cycle: number, windows: Array<[number, number]>, fade = 0.3): string {
  const pct = (t: number) => ((Math.max(0, Math.min(cycle, t)) / cycle) * 100).toFixed(2);
  return windows
    .map(([a, b], i) => `.${prefix}-w${i} { opacity: 0; animation: ${prefix}-v${i} ${cycle}s linear infinite; }
@keyframes ${prefix}-v${i} { 0%, ${pct(a)}% { opacity: 0 } ${pct(a + fade)}%, ${pct(b)}% { opacity: 1 } ${pct(b + fade)}%, 100% { opacity: 0 } }`)
    .join("\n");
}
