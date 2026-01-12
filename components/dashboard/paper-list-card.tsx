"use client";

import { useState } from "react";
import { ChevronRight, Plus, Check, Loader2, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PaperStatus } from "@prisma/client";
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
    status?: PaperStatus | string;
  };
  onViewPaper?: (paperId: string) => void;
  isInLibrary?: boolean;
  onAddToLibrary?: (paperId: string) => Promise<void>;
  onDismiss?: (paperId: string) => Promise<void>;
  onRemoveFromLibrary?: (paperId: string) => Promise<void>;
}

/**
 * Paper List Card Component (Rectangular)
 * 
 * Horizontal rectangular card for the ranked list view.
 * Matches UX design: Score left, content center, chevron right.
 * Includes "Add to List" functionality (Story 2.7).
 */
export function PaperListCard({ 
  paper, 
  onViewPaper,
  isInLibrary: initialIsInLibrary = false,
  onAddToLibrary,
  onDismiss,
  onRemoveFromLibrary
}: PaperListCardProps) {
  const [isInLibrary, setIsInLibrary] = useState(initialIsInLibrary);
  const [isAdding, setIsAdding] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  if (isDismissed) {
    return null; // Don't render if dismissed
  }

  return (
    <div
      className={cn(
        "bg-white border rounded-lg p-4 flex items-center gap-6",
        "hover:shadow-sm transition-all cursor-pointer group relative",
        isDismissing && "opacity-50 pointer-events-none",
        isRead && "opacity-75 bg-slate-50",
        isInLibrary
          ? "border-2 border-purple-500 shadow-md z-10"
          : "border border-slate-200 hover:border-indigo-300"
      )}
      onClick={handleClick}
    >
      {/* Score (Left) */}
      <div className="flex-shrink-0 w-16 text-center">
        {paper.noveltyScore !== null ? (
          <>
            <div className="text-xl font-bold text-indigo-600">
              {paper.noveltyScore.toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">
              Novelty
            </div>
          </>
        ) : (
          <>
            <div className="text-xl font-bold text-slate-400">—</div>
            <div className="text-[10px] text-slate-400 uppercase font-medium">
              Novelty
            </div>
          </>
        )}
      </div>

      {/* Content (Center) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "text-base font-semibold truncate group-hover:text-indigo-600 transition-colors",
            isRead ? "text-slate-600" : "text-slate-900"
          )}>
            {paper.title}
          </h3>
          {isRead && (
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" aria-label="Read" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
          <span className="font-medium text-slate-700">{authorsList}{moreAuthors}</span>
          {paper.publicationDate && (
            <>
              <span>•</span>
              <span>{new Date(paper.publicationDate).getFullYear()}</span>
            </>
          )}
          {paper.categories && paper.categories.length > 0 && (
            <>
              <span>•</span>
              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                {paper.categories[0].split(".")[1] || paper.categories[0]}
              </span>
            </>
          )}
          {isRead && (
            <>
              <span>•</span>
              <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                Read
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action (Right) */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            disabled={isDismissing}
            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100"
            title="Dismiss"
          >
            {isDismissing ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : (
              <X className="w-4 h-4 text-slate-500" />
            )}
          </Button>
        )}
        {onRemoveFromLibrary && isInLibrary && (
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                disabled={isRemoving}
                className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                title="Remove from library"
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-destructive" />
                ) : (
                  <Trash2 className="w-4 h-4 text-destructive" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from library?</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove this paper from your library? You can add it back later if needed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromLibrary();
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {onAddToLibrary && (
          <Button
            variant={isInLibrary ? "secondary" : "outline"}
            size="sm"
            onClick={handleAddToLibrary}
            disabled={isAdding || isInLibrary}
            className={cn(
              "transition-opacity",
              isInLibrary ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            {isAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isInLibrary ? (
              <Check className="w-4 h-4 text-purple-600" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        )}
        {feedback && (
          <span className={`text-xs ${
            feedback.includes("Failed") ? "text-destructive" : "text-green-600"
          } opacity-0 group-hover:opacity-100 transition-opacity`}>
            {feedback}
          </span>
        )}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
      </div>
    </div>
  );
}

