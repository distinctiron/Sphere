"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrushTag, SketchRing } from "@/components/sketch";
import { CheckIcon, PencilSpinner } from "./sketch-icons";

interface ImpactCardProps {
  paper: {
    id: string;
    title: string;
    authors: Array<{ name: string }>;
    noveltyScore: number | null;
    noveltySummary: string | null;
    categories?: string[];
    publicationDate?: Date | string;
  };
  onViewPaper?: (paperId: string) => void;
  isInLibrary?: boolean;
  onAddToLibrary?: (paperId: string) => Promise<void>;
}

/**
 * Impact Card Component
 * 
 * Displays a paper's key information: title, authors, and novelty score.
 * Includes "Add to List" functionality (Story 2.7).
 */
export function ImpactCard({ 
  paper, 
  onViewPaper, 
  isInLibrary: initialIsInLibrary = false,
  onAddToLibrary 
}: ImpactCardProps) {
  const [isInLibrary, setIsInLibrary] = useState(initialIsInLibrary);
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const authorsList = paper.authors.map((a) => a.name).join(", ");
  const publicationDate = paper.publicationDate
    ? new Date(paper.publicationDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const handleAddToLibrary = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (isInLibrary || isAdding || !onAddToLibrary) return;

    setIsAdding(true);
    setFeedback(null);

    try {
      await onAddToLibrary(paper.id);
      setIsInLibrary(true);
      setFeedback("Added to library");
      // Clear feedback after 2 seconds
      setTimeout(() => setFeedback(null), 2000);
    } catch (error) {
      setFeedback("Failed to add. Please try again.");
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="sk-wrap hover">
    <div className="sk-hatch" aria-hidden="true" />
    <Card seed={`impact:${paper.id}`}>
      <CardHeader 
        className="cursor-pointer"
        onClick={() => onViewPaper?.(paper.id)}
      >
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-[26px] leading-tight line-clamp-2">
            {paper.title}
          </CardTitle>
          {paper.noveltyScore !== null && (
            <SketchRing
              seed={`impact-score:${paper.id}`}
              size={52}
              className="shrink-0 font-hand text-[22px] font-bold"
            >
              {paper.noveltyScore.toFixed(1)}
            </SketchRing>
          )}
        </div>
        <CardDescription className="line-clamp-2">
          {authorsList}
        </CardDescription>
      </CardHeader>
      <CardContent 
        className="cursor-pointer"
        onClick={() => onViewPaper?.(paper.id)}
      >
        {paper.noveltySummary && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {paper.noveltySummary}
          </p>
        )}
        {paper.categories && paper.categories.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-2 mt-3">
            {paper.categories.slice(0, 3).map((category, i) => (
              <BrushTag key={category} label={category} variant={`${paper.id}:${category}`} size="sm" delay={0.3 + i * 0.15} />
            ))}
            {paper.categories.length > 3 && (
              <span className="self-center font-mono text-xs text-pencil">
                +{paper.categories.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-4">
        {publicationDate && (
          <span className="font-mono text-xs text-pencil">
            Published {publicationDate}
          </span>
        )}
        {onAddToLibrary && (
          <Button
            variant={isInLibrary ? "outline" : "default"}
            size="sm"
            onClick={handleAddToLibrary}
            disabled={isAdding || isInLibrary}
            className="ml-auto"
          >
            {isAdding ? (
              <>
                <PencilSpinner />
                Adding...
              </>
            ) : isInLibrary ? (
              <>
                <CheckIcon />
                Added
              </>
            ) : (
              <>
                Add to List
              </>
            )}
          </Button>
        )}
        {feedback && (
          <span className={`font-hand text-lg font-bold ml-2 ${
            feedback.includes("Failed") ? "text-pen" : "text-[#1f8a57]"
          }`}>
            {feedback}
          </span>
        )}
      </CardFooter>
    </Card>
    </div>
  );
}

