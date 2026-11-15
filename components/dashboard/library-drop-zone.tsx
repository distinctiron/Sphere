"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { SketchFrame } from "@/components/sketch";

interface LibraryDropZoneProps {
  children: React.ReactNode;
  isEmpty: boolean;
}

export function LibraryDropZone({ children, isEmpty }: LibraryDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "library-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative min-h-[400px] w-full p-2 transition-colors",
        isOver && "bg-[rgba(255,212,59,0.18)]"
      )}
    >
      {isOver && <SketchFrame seed="library-drop-zone" w={576} h={400} dashed />}
      {isEmpty ? (
        <p className="relative font-hand text-2xl text-pencil">Add article to your library.</p>
      ) : (
        <div className="relative">{children}</div>
      )}
    </div>
  );
}
