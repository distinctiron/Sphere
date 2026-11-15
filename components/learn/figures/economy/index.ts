import type { FigureLoaders } from "../types";

/** Figures used by the economy path lessons, lazy-loaded by name */
export const ECONOMY_FIGURES: FigureLoaders = {
  "bottleneck-chain": () => import("./bottleneck-chain"),
  "value-chain-stack": () => import("./value-chain-stack"),
  "chokepoint-map": () => import("./chokepoint-map"),
  "die-yield": () => import("./die-yield"),
  "capex-bars": () => import("./capex-bars"),
  "capex-payback": () => import("./capex-payback"),
  "circular-financing": () => import("./circular-financing"),
  "frontier-treadmill": () => import("./frontier-treadmill"),
  "token-cost-calculator": () => import("./token-cost-calculator"),
  "price-decline": () => import("./price-decline"),
  "campus-critical-path": () => import("./campus-critical-path"),
  "controlled-flows": () => import("./controlled-flows"),
  "sovereignty-map": () => import("./sovereignty-map"),
  "compute-thresholds": () => import("./compute-thresholds"),
};
