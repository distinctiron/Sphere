"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { SketchFrame } from "@/components/sketch";

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
        "relative min-h-[400px] w-full p-2 transition-colors",
        isOver && "bg-[rgba(255,212,59,0.18)]"
      )}
    >
      {isOver && <SketchFrame seed="incoming-drop-zone" w={576} h={400} dashed />}
      <div className="relative">{children}</div>
    </div>
  );
}
