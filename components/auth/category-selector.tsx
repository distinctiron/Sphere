"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { BrushTag, SketchCorner, SketchFrame } from "@/components/sketch";
import { ARXIV_CATEGORIES, getCategoriesByParent, type ArxivCategory } from "@/lib/arxiv-categories";
import { cn } from "@/lib/utils";

interface CategorySelectorProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  className?: string;
}

/**
 * Category Selector Component
 * 
 * Allows users to select multiple arXiv categories (CS and Physics subcategories)
 */
export function CategorySelector({
  selectedCategories,
  onCategoriesChange,
  className,
}: CategorySelectorProps) {
  const csCategories = getCategoriesByParent("cs");
  const physicsCategories = getCategoriesByParent("physics");

  const handleCategoryToggle = (categoryCode: string) => {
    if (selectedCategories.includes(categoryCode)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== categoryCode));
    } else {
      onCategoriesChange([...selectedCategories, categoryCode]);
    }
  };

  const handleSelectAll = (parent: "cs" | "physics") => {
    const categories = getCategoriesByParent(parent);
    const allSelected = categories.every((cat) => selectedCategories.includes(cat.code));
    
    if (allSelected) {
      // Deselect all
      const categoryCodes = categories.map((cat) => cat.code);
      onCategoriesChange(selectedCategories.filter((c) => !categoryCodes.includes(c)));
    } else {
      // Select all - merge arrays and remove duplicates
      const categoryCodes = categories.map((cat) => cat.code);
      const merged = [...selectedCategories, ...categoryCodes];
      const uniqueCategories = Array.from(new Set(merged));
      onCategoriesChange(uniqueCategories);
    }
  };

  const renderCategoryGroup = (categories: ArxivCategory[], title: string, parent: "cs" | "physics") => {
    const allSelected = categories.every((cat) => selectedCategories.includes(cat.code));

    return (
      <div className="relative bg-sheet px-4 pb-2.5 pt-4">
        <SketchFrame seed={`cat-group-${parent}`} w={380} h={360} />
        <SketchCorner seed={`cat-group-${parent}:c`} delay={1} />
        <div className="relative flex items-center justify-between gap-2">
          <h2 className="m-0 font-hand text-[30px] font-bold leading-tight">{title}</h2>
          <button
            type="button"
            onClick={() => handleSelectAll(parent)}
            className="sk-uline min-h-[44px] px-1.5 font-hand text-[20px] font-bold"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="relative mt-1 flex max-h-72 flex-col gap-0.5 overflow-y-auto pr-1">
          {categories.map((category) => (
            <div
              key={category.code}
              className="flex items-start gap-3 rounded px-1 py-2 hover:bg-[rgba(255,212,59,0.22)]"
            >
              <Checkbox
                id={category.code}
                checked={selectedCategories.includes(category.code)}
                onCheckedChange={() => handleCategoryToggle(category.code)}
                className="mt-0.5"
              />
              <label htmlFor={category.code} className="flex min-w-0 cursor-pointer flex-col">
                <span className="font-semibold">
                  {category.name}{" "}
                  <span className="font-mono text-xs font-medium text-pencil">{category.code}</span>
                </span>
                <span className="text-[13.5px] text-pencil">{category.description}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-0", className)}>
      <div className="grid gap-[22px] [grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr))]">
        {renderCategoryGroup(csCategories, "Computer Science", "cs")}
        {renderCategoryGroup(physicsCategories, "Physics", "physics")}
      </div>
      {selectedCategories.length > 0 && (
        <div className="mt-[18px] flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
          <span className="font-hand text-[24px] font-bold">
            {selectedCategories.length} categor{selectedCategories.length === 1 ? "y" : "ies"} selected
          </span>
          {selectedCategories.map((code) => (
            <BrushTag key={code} label={code} size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
