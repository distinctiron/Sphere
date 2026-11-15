"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { SketchFrame } from "@/components/sketch";

interface SectionDropZoneProps {
  id: string;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  isManuallyOver?: boolean;
}

export function SectionDropZone({ 
  id, 
  children, 
  isEmpty = false,
  emptyMessage,
  isManuallyOver = false
}: SectionDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // Use manual override if provided, otherwise use collision detection result
  const isActive = isManuallyOver || isOver;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[400px] w-full p-2 transition-colors",
        isActive && "bg-[rgba(255,212,59,0.18)]"
      )}
    >
      {/* Dashed pencil outline while a paper hovers over the zone */}
      {isActive && <SketchFrame seed={`${id}:active`} w={576} h={400} tone="red" dashed />}
      {isEmpty && emptyMessage ? (
        <div className="relative flex min-h-[200px] items-center justify-center gap-3.5 bg-sheet/60 p-5">
          <SketchFrame seed={`${id}:empty`} w={576} h={200} dashed faint />
          <svg width="70" height="56" viewBox="0 0 70 56" aria-hidden="true" className="flex-none overflow-visible">
            <path className="sk-draw thin" pathLength={1} d="M4 8 C 20 4, 44 10, 52 30 C 55 38, 54 44, 52 50" style={{ animationDelay: ".6s" }} />
            <path className="sk-draw p2" pathLength={1} d="M6 11 C 22 7, 41 13, 49 31 C 52 39, 52 44, 51 48" style={{ animationDelay: "1.1s", animationDuration: ".6s" }} />
            <path className="sk-draw thin" pathLength={1} d="M43 41 L 52 51 L 61 40" style={{ animationDelay: "1.5s", animationDuration: ".35s" }} />
          </svg>
          <p className="relative m-0 max-w-[280px] font-hand text-[26px] leading-[1.1] text-pencil">{emptyMessage}</p>
        </div>
      ) : (
        <div className="relative">{children}</div>
      )}
    </div>
  );
}
