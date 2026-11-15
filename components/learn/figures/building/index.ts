import type { FigureLoaders } from "../types";

/** Figures used by the building path lessons, lazy-loaded by name */
export const BUILDING_FIGURES: FigureLoaders = {
  "context-window": () => import("./context-window"),
  "prompt-cache-layout": () => import("./prompt-cache-layout"),
  "tool-call-sequence": () => import("./tool-call-sequence"),
  "rag-pipeline": () => import("./rag-pipeline"),
  "retrieval-geometry": () => import("./retrieval-geometry"),
  "agent-loop": () => import("./agent-loop"),
  "reliability-compounding": () => import("./reliability-compounding"),
  "harness-layers": () => import("./harness-layers"),
  "context-compaction": () => import("./context-compaction"),
  "progressive-disclosure": () => import("./progressive-disclosure"),
  "mcp-architecture": () => import("./mcp-architecture"),
  "eval-noise": () => import("./eval-noise"),
  "pass-at-k": () => import("./pass-at-k"),
  "injection-path": () => import("./injection-path"),
  "lethal-trifecta": () => import("./lethal-trifecta"),
};
