"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface IncomingDropZoneProps {
  children: React.ReactNode;
}

export function IncomingDropZone({ children }: IncomingDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "incoming-drop-zone",
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "w-full min-h-[400px] transition-colors rounded-lg p-2",
        isOver && "bg-slate-50 border-2 border-slate-300 border-dashed"
      )}
    >
      {children}
    </div>
  );
}

