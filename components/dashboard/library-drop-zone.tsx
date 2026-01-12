"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface LibraryDropZoneProps {
  children: React.ReactNode;
  isEmpty: boolean;
}

export function LibraryDropZone({ children, isEmpty }: LibraryDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "library-drop-zone",
  });

  if (isEmpty) {
    return (
      <div
      ref={setNodeRef}
      className={cn(
        "w-full min-h-[400px] transition-colors rounded-lg p-2",
        isOver && "bg-slate-50 border-2 border-slate-300 border-dashed"
      )}
    >
      <p className="text-muted-foreground">
          Add article to your library.
        </p>
    </div>
    );
  }

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

