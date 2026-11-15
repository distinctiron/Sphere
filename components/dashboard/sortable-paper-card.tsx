"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PaperListCard } from "./paper-list-card";
import { DragHandleMark } from "./drag-handle-mark";

interface SortablePaperCardProps {
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
  onRemoveFromLibrary?: (paperId: string) => Promise<void>;
}

export function SortablePaperCard({
  paper,
  onViewPaper,
  onAddToLibrary,
  onDismiss,
  onRemoveFromLibrary,
}: SortablePaperCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: paper.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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
        onRemoveFromLibrary={onRemoveFromLibrary}
      />
    </div>
  );
}

