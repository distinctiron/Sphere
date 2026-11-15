/**
 * Keyframe helpers for the building-path staged loops (not a figure).
 *
 * Every figure here uses one cycle length and derives each element's timing
 * from it, so all overlays stay in step. Two shapes:
 * - appear(): hidden until `at`, visible until near the end of the cycle.
 *   Elements using it have no default opacity, so with reduced motion
 *   (animations removed) they show the complete final state.
 * - flash(): a highlight that is visible only between `at` and `at + dur`.
 *   Elements using it set `opacity: 0` by default, so with reduced motion
 *   highlights disappear and the base diagram remains.
 */

const pct = (cycle: number, s: number) => `${Math.min(100, Math.max(0, (100 * s) / cycle)).toFixed(2)}%`;

export function appear(name: string, cycle: number, at: number, fade = 0.35, until = cycle - 0.5): string {
  return `@keyframes ${name} { 0%, ${pct(cycle, at)} { opacity: 0 } ${pct(cycle, at + fade)}, ${pct(cycle, until)} { opacity: 1 } ${pct(cycle, until + 0.3)}, 100% { opacity: 0 } }`;
}

export function flash(name: string, cycle: number, at: number, dur: number, fade = 0.25): string {
  return `@keyframes ${name} { 0%, ${pct(cycle, at)} { opacity: 0 } ${pct(cycle, at + fade)}, ${pct(cycle, at + dur - fade)} { opacity: 1 } ${pct(cycle, at + dur)}, 100% { opacity: 0 } }`;
}

/** Seeded PRNG (mulberry32), for figures that need deterministic "random" layouts */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
