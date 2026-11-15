"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PaperStatus } from "@prisma/client";
import { BrushTag, SketchCard, SketchRing } from "@/components/sketch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaperListCardProps {
  paper: {
    id: string;
    title: string;
    authors: Array<{ name: string }>;
    noveltyScore: number | null;
    noveltySummary: string | null;
    categories?: string[];
    publicationDate?: Date | string;
    arxivId?: string;
    status?: PaperStatus | string;
  };
  onViewPaper?: (paperId: string) => void;
  isInLibrary?: boolean;
  onAddToLibrary?: (paperId: string) => Promise<void>;
  onDismiss?: (paperId: string) => Promise<void>;
  onRemoveFromLibrary?: (paperId: string) => Promise<void>;
  /** Manually trigger novelty scoring for a paper whose score is pending */
  onScore?: (paperId: string) => Promise<void>;
}

/**
 * Paper List Card Component (Rectangular)
 * 
 * Horizontal rectangular card for the ranked list view.
 * Sketchbook card: pencil score dial left, content centre, actions right.
 * Includes "Add to List" functionality (Story 2.7).
 */
export function PaperListCard({ 
  paper, 
  onViewPaper,
  isInLibrary: initialIsInLibrary = false,
  onAddToLibrary,
  onDismiss,
  onRemoveFromLibrary,
  onScore
}: PaperListCardProps) {
  const [isInLibrary, setIsInLibrary] = useState(initialIsInLibrary);
  const [isAdding, setIsAdding] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  const authorsList = paper.authors.slice(0, 3).map((a) => a.name).join(", ");
  const moreAuthors = paper.authors.length > 3 ? ` et al.` : "";
  const isRead = paper.status === PaperStatus.READ || paper.status === "READ";

  const handleClick = () => {
    onViewPaper?.(paper.id);
  };

  const handleAddToLibrary = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (isInLibrary || isAdding || !onAddToLibrary) return;

    setIsAdding(true);
    setFeedback(null);

    try {
      await onAddToLibrary(paper.id);
      setIsInLibrary(true);
      setFeedback("Added");
      setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      setFeedback("Failed");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (isDismissing || !onDismiss) return;

    setIsDismissing(true);
    
    try {
      await onDismiss(paper.id);
      setIsDismissed(true);
      // Card will be removed from view by parent component
    } catch (error) {
      setIsDismissing(false);
      setFeedback("Failed to dismiss");
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleRemoveFromLibrary = async () => {
    if (isRemoving || !onRemoveFromLibrary) return;

    setIsRemoving(true);
    setIsDialogOpen(false);
    
    try {
      await onRemoveFromLibrary(paper.id);
      setIsInLibrary(false);
      setFeedback("Removed");
      setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      setIsRemoving(false);
      setFeedback("Failed to remove");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleScore = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (isScoring || !onScore) return;

    setIsScoring(true);
    try {
      await onScore(paper.id);
    } catch (error) {
      // Parent shows the error toast
    } finally {
      setIsScoring(false);
    }
  };

  if (isDismissed) {
    return null; // Don't render if dismissed
  }

  const scoreTone = paper.noveltyScore === null ? undefined : paper.noveltyScore >= 8 ? "red" : undefined;
  const year = paper.publicationDate ? new Date(paper.publicationDate).getFullYear() : null;

  return (
    <SketchCard
      seed={paper.id}
      w={576}
      h={150}
      hover
      wedge
      as="article"
      wrapClassName={cn(isDismissing && "pointer-events-none opacity-50", isInLibrary && "z-10")}
      className={cn("cursor-pointer", isRead && "opacity-80")}
      onClick={handleClick}
    >
      <div className="flex items-start gap-4 py-[18px] pl-[18px] pr-3.5">
        {/* Score (Left): a pencil dial with shading */}
        <div className="flex-none">
          {paper.noveltyScore !== null ? (
            <SketchRing seed={`${paper.id}:score`} size={64} shading={0.35} tone={scoreTone} delay={0.2}>
              <span className="font-hand text-[30px] font-bold leading-none" title="Novelty score out of 10">
                {paper.noveltyScore.toFixed(1)}
              </span>
            </SketchRing>
          ) : (
            <SketchRing seed={`${paper.id}:score`} size={64} shading={false} delay={0.2}>
              <span
                className="font-hand text-[30px] font-bold leading-none text-pencil"
                title="Novelty scoring hasn't finished for this paper yet"
              >
                ?
              </span>
            </SketchRing>
          )}
        </div>

        {/* Content (Center) */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className={cn("m-0 text-[17px] font-bold leading-snug", isRead && "text-pencil")}>
            {paper.title}
          </h3>
          <div className="text-sm text-pencil">
            {authorsList}
            {moreAuthors}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
            {paper.categories?.slice(0, 3).map((cat, i) => (
              <BrushTag key={cat} label={cat} variant={paper.id + cat} size="sm" delay={0.3 + i * 0.15} />
            ))}
            {(paper.arxivId || year) && (
              <span className="font-mono text-xs text-pencil">
                {[paper.arxivId, year].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
          {paper.noveltyScore !== null && paper.noveltySummary && (
            <p className="m-0 mt-0.5 line-clamp-3 text-sm">{paper.noveltySummary}</p>
          )}
          {paper.noveltyScore === null && (
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-hand text-xl text-pencil">Score pending</span>
              {onScore && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleScore}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={isScoring}
                >
                  {isScoring ? (
                    <span className="lbl">
                      <Loader2 className="animate-spin" aria-hidden="true" />
                      Scoring
                    </span>
                  ) : (
                    "Score now"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Actions (Right) */}
        <div className="flex flex-none flex-col items-center gap-0.5">
          {isRead && (
            <div className="flex min-w-[56px] flex-col items-center" aria-label="Read">
              <svg width="34" height="28" viewBox="0 0 34 28" aria-hidden="true" className="overflow-visible">
                <path className="sk-draw red" pathLength={1} d="M3 15 C 7 18, 10 21, 12 24 C 17 15, 23 8, 31 3" style={{ animationDuration: ".5s" }} />
                <path className="sk-draw red p2" pathLength={1} d="M5 14 C 8 17, 11 20, 13 22 C 18 14, 24 8, 32 5" style={{ animationDelay: ".45s", animationDuration: ".4s" }} />
              </svg>
              <span className="font-hand text-lg text-pen">read</span>
            </div>
          )}
          {onAddToLibrary && (
            <button
              type="button"
              className="sk-icon"
              onClick={handleAddToLibrary}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={isAdding || isInLibrary}
              aria-label={isInLibrary ? "In your library" : "Add to library"}
              title={isInLibrary ? "In your library" : "Add to library"}
            >
              {isAdding ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : isInLibrary ? (
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="text-pen">
                  <path className="s1" d="M4 13 C 6.5 15, 8.5 17, 10 19.5 C 13 13, 16 8.5, 20 4.5" />
                  <path className="s2" d="M5 12.4 C 7.4 14.6, 9 16.4, 10.6 18.6 C 13.6 12.6, 16.6 8.6, 20.4 5.4" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path className="s1" d="M12 4.5 C 12.2 9, 11.8 15, 12 19.5 M4.5 12.2 C 9 11.8, 15 12.3, 19.5 11.9" />
                  <path className="s2" d="M12.6 5 C 12.4 10, 12.7 15, 12.4 19 M5 11.5 C 10 11.9, 14 11.4, 19 12.4" />
                </svg>
              )}
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              className="sk-icon"
              onClick={handleDismiss}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={isDismissing}
              aria-label="Dismiss paper"
              title="Dismiss"
            >
              {isDismissing ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path className="s1" d="M6 6.5 C 10 10, 14 14.5, 18 18 M18 6 C 14 10.5, 10 14, 6.2 18" />
                  <path className="s2" d="M6.6 6 C 10.5 10.5, 14.4 14, 17.6 18.6 M17.4 6.6 C 14 10, 10.4 14.6, 6 17.4" />
                </svg>
              )}
            </button>
          )}
          {onRemoveFromLibrary && isInLibrary && (
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="sk-icon text-pen"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={isRemoving}
                  aria-label="Remove from library"
                  title="Remove from library"
                >
                  {isRemoving ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                      <path className="s1" d="M4.5 7 C 9 6.6, 15 7.3, 19.5 6.8 M9.5 6.8 C 9.6 5.2, 10 4.4, 12 4.4 C 14 4.4, 14.4 5.2, 14.5 6.8 M6.5 7.4 C 7 12, 7.2 16, 7.8 19.6 C 10.5 20, 13.5 20, 16.2 19.6 C 16.8 16, 17 12, 17.5 7.4" />
                      <path className="s2" d="M10 10.5 C 10.2 13, 10.1 15, 10.3 17 M14 10.5 C 13.8 13, 13.9 15, 13.7 17" />
                    </svg>
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove from library?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove this paper from your library? You can add it back later if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline">Cancel</Button>
                  </AlertDialogCancel>
                  <AlertDialogAction
                    asChild
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromLibrary();
                    }}
                  >
                    <Button variant="destructive">Remove</Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {feedback && (
            <span
              role="status"
              className={cn("font-hand text-lg leading-none", feedback.includes("Failed") ? "text-pen" : "text-[#1f8a57]")}
            >
              {feedback}
            </span>
          )}
        </div>
      </div>
    </SketchCard>
  );
}
