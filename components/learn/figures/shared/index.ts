import type { FigureLoaders } from "../types";

/** Figures shared across paths (e.g. the overview's end-to-end thread) */
export const SHARED_FIGURES: FigureLoaders = {
  "ai-thread": () => import("./ai-thread"),
};
