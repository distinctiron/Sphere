"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BrushTag } from "@/components/sketch";

interface CategoryFilterProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClearFilters: () => void;
  className?: string;
}

/** How many category chips to show before "+N more" */
const VISIBLE_CHIPS = 10;

/**
 * Category Filter Component
 *
 * arXiv categories as paintbrush strokes. With nothing selected every category
 * is painted (all shown); once some are picked, the others are crossed out in red pen.
 */
export function CategoryFilter({
  categories,
  selectedCategories,
  onCategoryToggle,
  onClearFilters,
  className,
}: CategoryFilterProps) {
  const [showAll, setShowAll] = useState(false);

  if (categories.length === 0) {
    return null;
  }

  const hasActiveFilters = selectedCategories.length > 0;
  // Keep selected categories visible even when the list is collapsed
  const visible = showAll
    ? categories
    : categories.filter((c, i) => i < VISIBLE_CHIPS || selectedCategories.includes(c));
  const hidden = categories.length - visible.length;

  return (
    <section aria-label="Filter by category" className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1", className)}>
      <span className="mr-2 font-hand text-2xl font-bold">arXiv categories:</span>
      {visible.map((category, i) => {
        const isSelected = selectedCategories.includes(category);
        const painted = !hasActiveFilters || isSelected;
        return (
          <button
            key={category}
            type="button"
            className="sk-chip"
            aria-pressed={isSelected}
            onClick={() => onCategoryToggle(category)}
          >
            {painted ? (
              <BrushTag label={category} variant={category} delay={Math.min(i, 8) * 0.08} />
            ) : (
              <span className="sk-crossed">{category}</span>
            )}
          </button>
        );
      })}
      {hidden > 0 && (
        <button type="button" className="sk-chip font-hand text-xl font-bold sk-uline" onClick={() => setShowAll(true)}>
          +{hidden} more
        </button>
      )}
      {showAll && categories.length > VISIBLE_CHIPS && (
        <button type="button" className="sk-chip font-hand text-xl font-bold sk-uline" onClick={() => setShowAll(false)}>
          show fewer
        </button>
      )}
      {hasActiveFilters ? (
        <>
          <span className="ml-2 font-hand text-xl text-pencil">
            {selectedCategories.length} categor{selectedCategories.length === 1 ? "y" : "ies"} selected
          </span>
          <button type="button" className="sk-chip font-hand text-xl font-bold text-pen sk-uline" onClick={onClearFilters}>
            Clear all
          </button>
        </>
      ) : (
        <span className="ml-2 font-hand text-xl text-pencil">(tap one to filter)</span>
      )}
    </section>
  );
}
