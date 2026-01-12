"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
    const someSelected = categories.some((cat) => selectedCategories.includes(cat.code));

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">{title}</Label>
          <button
            type="button"
            onClick={() => handleSelectAll(parent)}
            className="text-sm text-primary hover:underline"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md">
          {categories.map((category) => (
            <div key={category.code} className="flex items-start space-x-2">
              <Checkbox
                id={category.code}
                checked={selectedCategories.includes(category.code)}
                onCheckedChange={() => handleCategoryToggle(category.code)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={category.code}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {category.name}
                </Label>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      {renderCategoryGroup(csCategories, "Computer Science", "cs")}
      {renderCategoryGroup(physicsCategories, "Physics", "physics")}
      {selectedCategories.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selectedCategories.length} categor{selectedCategories.length === 1 ? "y" : "ies"} selected
        </p>
      )}
    </div>
  );
}

