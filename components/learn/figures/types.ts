import type { ComponentType } from "react";

/** Lazy loaders for figure components, keyed by the name used in <Figure name="…"> */
export type FigureLoaders = Record<string, () => Promise<{ default: ComponentType }>>;
