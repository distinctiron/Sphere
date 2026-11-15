import { BUILDING_FIGURES } from "./building";
import { COMPUTE_FIGURES } from "./compute";
import { ECONOMY_FIGURES } from "./economy";
import { LLM_FIGURES } from "./llm";
import { MATH_FIGURES } from "./math";
import { SHARED_FIGURES } from "./shared";
import type { FigureLoaders } from "./types";

/** Every figure available to lessons. Names are unique across paths (checked in content tests). */
export const FIGURE_LOADERS: FigureLoaders = {
  ...SHARED_FIGURES,
  ...MATH_FIGURES,
  ...LLM_FIGURES,
  ...COMPUTE_FIGURES,
  ...BUILDING_FIGURES,
  ...ECONOMY_FIGURES,
};

export const FIGURE_SOURCES = { SHARED_FIGURES, MATH_FIGURES, LLM_FIGURES, COMPUTE_FIGURES, BUILDING_FIGURES, ECONOMY_FIGURES };
