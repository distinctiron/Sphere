import type { FigureLoaders } from "../types";

/** Figures used by the math path lessons, lazy-loaded by name */
export const MATH_FIGURES: FigureLoaders = {
  // A1 vectors
  "vector-alignment": () => import("./vector-alignment"),
  "random-directions": () => import("./random-directions"),
  // A2 matrices
  "matrix-transform": () => import("./matrix-transform"),
  // A3 derivatives
  "tangent-slope": () => import("./tangent-slope"),
  "gradient-contour": () => import("./gradient-contour"),
  "chain-rule": () => import("./chain-rule"),
  // A4 probability
  "softmax-temperature": () => import("./softmax-temperature"),
  // A5 neuron
  "neuron-boundary": () => import("./neuron-boundary"),
  // A6 forward pass
  "forward-pass": () => import("./forward-pass"),
  "space-folding": () => import("./space-folding"),
  // A7 gradient descent
  "descent-landscape": () => import("./descent-landscape"),
  "optimizer-paths": () => import("./optimizer-paths"),
  // A8 backpropagation
  "backward-pass": () => import("./backward-pass"),
  "vanishing-gradients": () => import("./vanishing-gradients"),
  // A9 training in practice
  "fit-complexity": () => import("./fit-complexity"),
  "train-val-curves": () => import("./train-val-curves"),
};
