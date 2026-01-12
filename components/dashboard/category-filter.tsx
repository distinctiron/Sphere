"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  selectedCategories: string[];
  onCategoryToggle: (category: string) => void;
  onClearFilters: () => void;
  className?: string;
}

/**
 * Category Filter Component
 * 
 * Displays available categories as clickable badges/chips
 * Allows users to filter papers by research field categories
 */
export function CategoryFilter({
  categories,
  selectedCategories,
  onCategoryToggle,
  onClearFilters,
  className,
}: CategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }

  const hasActiveFilters = selectedCategories.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filter by Category</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs"
          >
            Clear all
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          return (
            <Badge
              key={category}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-colors",
                isSelected && "bg-primary text-primary-foreground"
              )}
              onClick={() => onCategoryToggle(category)}
            >
              {category}
              {isSelected && <X className="ml-1 h-3 w-3" />}
            </Badge>
          );
        })}
      </div>
      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          {selectedCategories.length} categor{selectedCategories.length === 1 ? "y" : "ies"} selected
        </p>
      )}
    </div>
  );
}

