/**
 * A tiny hand-written "language model" for the sampling figures (A14).
 * It is a lookup table from the last token to logits over a few candidate next
 * tokens (a bigram model), standing in for a transformer's output layer. Real
 * models condition on the whole context and score the entire vocabulary; this
 * toy only exists to make the sampling step visible.
 */

export const END = "⟨end⟩";
export const PROMPT = ["Once", " upon", " a", " time", ",", " a"];

type Row = Array<[string, number]>;

const NOUNS: Row = [
  [" fox", 2.6],
  [" dragon", 2.2],
  [" king", 2.0],
  [" girl", 1.9],
  [" robot", 0.8],
  [" teapot", -0.6],
];
const AFTER_NOUN: Row = [
  [" lived", 2.5],
  [" found", 1.8],
  [" wanted", 1.6],
  [" who", 1.2],
  [" sang", 0.3],
  [".", -0.5],
];
const PLACES: Row = [
  [" forest", 2.5],
  [" castle", 2.0],
  [" sea", 1.4],
  [" sky", 0.8],
  [" library", 0.6],
];
const ENDING: Row = [
  [".", 2.4],
  [",", 1.3],
  [" and", 1.1],
  [" until", 0.4],
];

const TABLE: Record<string, Row> = {
  a: NOUNS,
  fox: AFTER_NOUN,
  dragon: AFTER_NOUN,
  king: AFTER_NOUN,
  girl: AFTER_NOUN,
  robot: AFTER_NOUN,
  teapot: AFTER_NOUN,
  lived: [
    [" in", 3.0],
    [" alone", 1.6],
    [" happily", 0.8],
    [" forever", 0.3],
  ],
  in: [
    [" the", 2.6],
    [" peace", 0.9],
    [" secret", 0.6],
  ],
  the: PLACES,
  found: [
    [" the", 1.6],
    [" a", 1.2],
    [" nothing", 0.4],
  ],
  wanted: [
    [" to", 3.2],
    [" more", 1.0],
  ],
  to: [
    [" fly", 1.8],
    [" sing", 1.4],
    [" sleep", 1.3],
    [" leave", 1.1],
    [" win", 1.0],
  ],
  who: [
    [" loved", 1.9],
    [" could", 1.7],
    [" lived", 1.5],
    [" never", 0.6],
  ],
  loved: [
    [" the", 2.0],
    [" to", 1.6],
    [" music", 1.2],
  ],
  could: [
    [" fly", 2.0],
    [" talk", 1.8],
    [" sing", 1.7],
  ],
  never: [
    [" slept", 1.5],
    [" sang", 1.3],
    [" smiled", 1.2],
  ],
  happily: [
    [" ever", 2.4],
    [".", 1.0],
  ],
  ever: [[" after", 4.0]],
  after: [
    [".", 3.0],
    [",", 0.5],
  ],
  ",": [
    [" and", 1.6],
    [" but", 1.3],
    [" until", 0.7],
  ],
  and: [
    [" sang", 1.2],
    [" slept", 1.1],
    [" then", 0.9],
  ],
  but: [
    [" sang", 1.0],
    [" slept", 1.0],
    [" then", 1.2],
  ],
  then: [
    [" the", 1.3],
    [" a", 1.1],
  ],
  until: [
    [" the", 1.2],
    [" one", 1.0],
  ],
  one: [[" day", 3.0]],
  day: [
    [",", 2.0],
    [".", 1.2],
  ],
  ".": [
    [END, 2.6],
    [" The", 1.2],
    [" One", 0.8],
  ],
};

for (const w of ["forest", "castle", "sea", "sky", "library", "alone", "forever", "peace", "secret", "nothing", "more", "fly", "sing", "sleep", "leave", "win", "music", "talk", "slept", "sang", "smiled"]) {
  TABLE[w] = ENDING;
}

/** Candidate next tokens and their logits, given the context so far */
export function nextLogits(context: string[]): Row {
  const last = context[context.length - 1] ?? "";
  const key = last.trim().toLowerCase();
  return TABLE[key] ?? ENDING;
}

export type Strategy = "greedy" | "temperature" | "top-k" | "top-p";

export interface Candidate {
  token: string;
  logit: number;
  /** Probability at temperature 1 with no truncation: the model's own belief */
  raw: number;
  /** Probability actually used for sampling after temperature and truncation */
  p: number;
  kept: boolean;
}

/** Apply a decoding strategy: temperature first, then truncation, then renormalise */
export function candidates(context: string[], strategy: Strategy, temperature: number, k: number, topP: number): Candidate[] {
  const row = nextLogits(context);
  const soft = (T: number) => {
    const m = Math.max(...row.map(([, l]) => l));
    const e = row.map(([, l]) => Math.exp((l - m) / T));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / s);
  };
  const raw = soft(1);
  const T = strategy === "greedy" ? 1 : temperature;
  const probs = soft(T);
  const order = probs.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p);
  const keep = new Set<number>();
  if (strategy === "greedy") keep.add(order[0].i);
  else if (strategy === "top-k") order.slice(0, k).forEach((o) => keep.add(o.i));
  else if (strategy === "top-p") {
    let cum = 0;
    for (const o of order) {
      keep.add(o.i);
      cum += o.p;
      if (cum >= topP - 1e-9) break;
    }
  } else order.forEach((o) => keep.add(o.i));
  const total = order.filter((o) => keep.has(o.i)).reduce((a, o) => a + o.p, 0);
  return row.map(([token, logit], i) => ({
    token,
    logit,
    raw: raw[i],
    p: keep.has(i) ? probs[i] / total : 0,
    kept: keep.has(i),
  }));
}

/** Pick a candidate with a uniform random number u in [0, 1) */
export function pick(cands: Candidate[], u: number): Candidate {
  let cum = 0;
  for (const c of cands) {
    cum += c.p;
    if (u < cum) return c;
  }
  return cands.filter((c) => c.kept).slice(-1)[0];
}
