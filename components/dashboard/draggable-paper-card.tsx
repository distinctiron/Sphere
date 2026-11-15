"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PaperListCard } from "./paper-list-card";
import { DragHandleMark } from "./drag-handle-mark";

interface DraggablePaperCardProps {
  paper: {
    id: string;
    arxivId: string;
    title: string;
    authors: Array<{ name: string }>;
    abstract: string;
    publicationDate: Date | string;
    updatedDate: Date | string;
    categories: string[];
    pdfUrl: string;
    htmlUrl: string;
    noveltyScore: number | null;
    noveltySummary: string | null;
    status: string;
    inLibrary: boolean;
    displayOrder: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
  onViewPaper?: (paperId: string) => void;
  onAddToLibrary?: (paperId: string) => Promise<void>;
  onDismiss?: (paperId: string) => Promise<void>;
  onScore?: (paperId: string) => Promise<void>;
}

export function DraggablePaperCard({
  paper,
  onViewPaper,
  onAddToLibrary,
  onDismiss,
  onScore,
}: DraggablePaperCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: paper.id,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 z-10 -translate-x-full -translate-y-1/2 cursor-grab pr-1 text-pencil opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 active:cursor-grabbing group-hover:opacity-100"
        aria-label="Drag to move"
      >
        <DragHandleMark />
      </div>
      <PaperListCard
        paper={{
          ...paper,
          status: paper.status,
        }}
        onViewPaper={onViewPaper}
        isInLibrary={paper.inLibrary}
        onAddToLibrary={onAddToLibrary}
        onDismiss={onDismiss}
        onScore={onScore}
      />
    </div>
  );
}

