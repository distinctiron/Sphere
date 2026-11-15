import type { FigureLoaders } from "../types";

/** Figures used by the compute path lessons, lazy-loaded by name */
export const COMPUTE_FIGURES: FigureLoaders = {
  "prefill-decode": () => import("./prefill-decode"),
  "kv-cache-calculator": () => import("./kv-cache-calculator"),
  // B1 cpu
  "cpu-pipeline": () => import("./cpu-pipeline"),
  "cache-hierarchy": () => import("./cache-hierarchy"),
  // B2 gpu
  "cpu-vs-gpu-matmul": () => import("./cpu-vs-gpu-matmul"),
  "warp-scheduling": () => import("./warp-scheduling"),
  // B3 memory-wall
  roofline: () => import("./roofline"),
  "hbm-package": () => import("./hbm-package"),
  // B4 accelerators
  "systolic-array": () => import("./systolic-array"),
  "number-formats": () => import("./number-formats"),
  // B5 distributed-training
  "ring-allreduce": () => import("./ring-allreduce"),
  "parallelism-modes": () => import("./parallelism-modes"),
  // B6 data-center
  "dc-zoom": () => import("./dc-zoom"),
  "cooling-loop": () => import("./cooling-loop"),
  // B7 energy
  "power-chain": () => import("./power-chain"),
  // B9 serving-at-scale
  "continuous-batching": () => import("./continuous-batching"),
  "paged-kv": () => import("./paged-kv"),
  "speculative-decoding": () => import("./speculative-decoding"),
  // B10 hosting
  "deployment-sizer": () => import("./deployment-sizer"),
};
