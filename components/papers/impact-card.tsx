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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Plus, Loader2 } from "lucide-react";

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
    <Card
      className="hover:shadow-lg transition-shadow"
    >
      <CardHeader 
        className="cursor-pointer"
        onClick={() => onViewPaper?.(paper.id)}
      >
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            {paper.title}
          </CardTitle>
          {paper.noveltyScore !== null && (
            <Badge variant="secondary" className="shrink-0">
              {paper.noveltyScore.toFixed(1)}
            </Badge>
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
          <div className="flex flex-wrap gap-1 mt-3">
            {paper.categories.slice(0, 3).map((category) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
            {paper.categories.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{paper.categories.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-4">
        {publicationDate && (
          <span className="text-xs text-muted-foreground">
            Published {publicationDate}
          </span>
        )}
        {onAddToLibrary && (
          <Button
            variant={isInLibrary ? "secondary" : "default"}
            size="sm"
            onClick={handleAddToLibrary}
            disabled={isAdding || isInLibrary}
            className="ml-auto"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : isInLibrary ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Added
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add to List
              </>
            )}
          </Button>
        )}
        {feedback && (
          <span className={`text-xs ml-2 ${
            feedback.includes("Failed") ? "text-destructive" : "text-green-600"
          }`}>
            {feedback}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

