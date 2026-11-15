import type { FigureLoaders } from "../types";

/** Figures used by the math path's "From networks to LLMs" module, lazy-loaded by name */
export const LLM_FIGURES: FigureLoaders = {
  "embedding-lookup": () => import("./embedding-lookup"),
  "embedding-directions": () => import("./embedding-directions"),
  "attention-geometry": () => import("./attention-geometry"),
  "attention-explorer": () => import("./attention-explorer"),
  "residual-stream": () => import("./residual-stream"),
  "transformer-param-count": () => import("./transformer-param-count"),
  "next-token-loss": () => import("./next-token-loss"),
  "scaling-laws": () => import("./scaling-laws"),
  "generation-loop": () => import("./generation-loop"),
  "sampling-lab": () => import("./sampling-lab"),
  "post-training-stages": () => import("./post-training-stages"),
  "kl-leash": () => import("./kl-leash"),
};
