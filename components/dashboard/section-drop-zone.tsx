"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

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
        "w-full min-h-[400px] transition-colors rounded-lg p-2",
        isActive && "bg-indigo-50 border-2 border-indigo-500 border-dashed"
      )}
    >
      {isEmpty && emptyMessage ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center min-h-[200px] flex items-center justify-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

