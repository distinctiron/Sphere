import { BUILDING_TERMS } from "./building";
import { COMPUTE_TERMS } from "./compute";
import { ECONOMY_TERMS } from "./economy";
import { LLM_TERMS } from "./llm";
import { MATH_TERMS } from "./math";
import type { GlossaryTerm } from "./types";

export type { GlossaryTerm } from "./types";

/** All glossary terms (client-safe), sorted A–Z */
export const GLOSSARY: GlossaryTerm[] = [...MATH_TERMS, ...LLM_TERMS, ...COMPUTE_TERMS, ...BUILDING_TERMS, ...ECONOMY_TERMS].sort((a, b) =>
  a.term.localeCompare(b.term, "en", { sensitivity: "base" })
);

const BY_ID = new Map(GLOSSARY.map((t) => [t.id, t]));

export function getTerm(id: string): GlossaryTerm | undefined {
  return BY_ID.get(id);
}
