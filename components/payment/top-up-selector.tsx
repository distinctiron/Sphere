"use client";

import { Button } from "@/components/ui/button";
import { Brush, BrushTag, SketchCorner, SketchFrame, SketchWedge } from "@/components/sketch";
import { formatEurCents, TOP_UP_OPTIONS, type TopUpId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

const PRICE_BRUSH = ["green", "yellow", "blue"] as const;

interface TopUpSelectorProps {
  onSelect: (id: TopUpId) => void;
  selected?: TopUpId;
  disabled?: boolean;
}

export function TopUpSelector({ onSelect, selected, disabled = false }: TopUpSelectorProps) {
  return (
    <div className="grid gap-x-6 gap-y-8 sm:grid-cols-3">
      {TOP_UP_OPTIONS.map((option, i) => {
        const isSelected = selected === option.id;
        const popular = "popular" in option && option.popular;
        return (
          <div key={option.id} className="sk-wrap hover flex flex-col">
            {popular && (
              <div className="pointer-events-none absolute -top-4 right-3 z-10">
                <BrushTag color="pink" size="sm" delay={0.8}>
                  Popular
                </BrushTag>
              </div>
            )}
            <div className="sk-hatch" aria-hidden="true" />
            <div
              className={cn("sk-card flex h-full cursor-pointer flex-col gap-2 px-5 pb-5 pt-6", isSelected && "!bg-[#fffbe6]")}
              onClick={() => !disabled && onSelect(option.id)}
            >
              <SketchFrame seed={`topup-${option.id}`} w={300} h={220} tone={isSelected ? "red" : undefined} />
              <SketchCorner seed={`topup-${option.id}:c`} />
              {isSelected && <SketchWedge seed={`topup-${option.id}:w`} delay={0} />}
              <span className="sk-lift">
                <Brush color={PRICE_BRUSH[i % PRICE_BRUSH.length]} variant={option.id} still className="px-2.5 py-0.5 font-hand text-[40px] font-bold leading-none">
                  {formatEurCents(option.amountCents)}
                </Brush>
              </span>
              <span className="sk-lift sk-muted text-sm">{option.description}</span>
              <span className="sk-lift mt-auto pt-2">
                <Button
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(option.id);
                  }}
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
