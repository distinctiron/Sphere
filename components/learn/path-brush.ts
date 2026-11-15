import type { BrushColor } from "@/lib/sketch";
import type { CurriculumPath } from "@/lib/learn/curriculum";

/** Brush colour for each path's accent, so path letters and lesson codes share one paint stroke per path */
export const PATH_BRUSH: Record<CurriculumPath["color"], BrushColor> = {
  indigo: "blue",
  emerald: "green",
  amber: "orange",
  rose: "pink",
};
