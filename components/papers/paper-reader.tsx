"use client";

import { useEffect, useState, useRef } from "react";
import React from "react";
import { ArrowLeft, FileText, FileCode, Sparkles, MessageSquare, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { IntellisensePopover } from "./intellisense-popover";
import { DeepDivePanel, DeepDiveToggle } from "./deep-dive-panel";
import { toast } from "sonner";
import { PaperStatus } from "@prisma/client";

interface PaperReaderProps {
  paper: {
    id: string;
    arxivId: string;
    title: string;
    authors: Array<{ name: string }>;
    abstract: string;
    htmlUrl: string;
    pdfUrl: string;
    publicationDate: Date;
    categories: string[];
  };
  initialStatus?: PaperStatus;
}

interface SelectionState {
  text: string;
  position: { x: number; y: number };
  range?: {
    startContainer: Node;
    startOffset: number;
    endContainer: Node;
    endOffset: number;
  };
}

// Memoized content component to prevent re-renders when selection changes
const MemoizedContent = React.memo(
  React.forwardRef<HTMLDivElement, { htmlContent: string }>(
    ({ htmlContent }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            "prose prose-lg max-w-none relative",
            "prose-headings:font-serif prose-headings:text-slate-900",
            "prose-p:text-slate-700 prose-p:leading-relaxed",
            "prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline",
            "prose-strong:text-slate-900 prose-strong:font-semibold",
            "prose-code:text-indigo-600 prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
            "prose-pre:bg-slate-900 prose-pre:text-slate-100",
            "prose-img:rounded-lg prose-img:shadow-md",
            "prose-figcaption:text-slate-600 prose-figcaption:text-sm",
            "prose-blockquote:border-l-indigo-600 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4",
            "prose-ul:text-slate-700 prose-ol:text-slate-700",
            "prose-li:my-2",
            "font-serif",
            "select-text"
          )}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      );
    }
  )
);
MemoizedContent.displayName = "MemoizedContent";

export function PaperReader({ paper, initialStatus = PaperStatus.NEW }: PaperReaderProps) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"html" | "pdf">("html");
  const [htmlAvailable, setHtmlAvailable] = useState(false);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [deepDiveWidth, setDeepDiveWidth] = useState(600); // Will be set on mount to 50% of viewport
  const [deepDiveSelectedText, setDeepDiveSelectedText] = useState<string | null>(null);
  const [intellisenseState, setIntellisenseState] = useState<{
    text: string;
    position: { x: number; y: number };
    explanation?: string;
  } | null>(null);
  const [paperStatus, setPaperStatus] = useState<PaperStatus>(initialStatus);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  console.log("Content Rendered");

  // Set default width to 50% of viewport on mount
  useEffect(() => {
    setDeepDiveWidth(Math.floor(window.innerWidth * 0.5));
  }, []);

  useEffect(() => {
    async function fetchHtmlContent() {
      try {
        setLoading(true);
        setError(null);

        // Fetch HTML content through API route (avoids CORS issues)
        const response = await fetch(`/api/papers/${paper.id}/html`);

        if (!response.ok) {
          if (response.status === 404) {
            // HTML not available - will fall back to PDF in Story 3.2
            setError("HTML_NOT_AVAILABLE");
            return;
          }
          throw new Error(`Failed to fetch HTML: ${response.statusText}`);
        }

        const html = await response.text();
        setHtmlContent(html);
        setHtmlAvailable(true);
      } catch (err) {
        console.error("Error fetching paper HTML:", err);
        setError("FETCH_ERROR");
      } finally {
        setLoading(false);
      }
    }

    fetchHtmlContent();
  }, [paper.id]);

  // If HTML is not available, default to PDF view
  useEffect(() => {
    if (error === "HTML_NOT_AVAILABLE") {
      setViewMode("pdf");
    }
  }, [error]);

  // Handle text selection
  useEffect(() => {
    if (viewMode !== "html" || !htmlContent) return;

    const handleMouseUp = (event: MouseEvent) => {
      // Small delay to ensure selection is complete
      setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

          if (selectedText && selectedText.length > 0 && contentRef.current) {
          const range = selection?.getRangeAt(0);
          if (!range) return;

          // Check if selection is within our content area
          const isWithinContent = contentRef.current.contains(range.commonAncestorContainer);
          if (!isWithinContent) {
            setSelection(null);
            return;
          }

          const rect = range.getBoundingClientRect();
          
          // Only show menu if selection has meaningful size
          if (rect.width > 0 && rect.height > 0) {
            // Position menu above the selection (using viewport coordinates for fixed positioning)
            const x = rect.left + rect.width / 2;
            const y = rect.top - 8; // 8px above selection
            
            setSelection({
              text: selectedText,
              position: { x, y },
            });

            // Auto-quote selected text in Deep Dive if panel is open (AC: 3)
            if (isDeepDiveOpen) {
              setDeepDiveSelectedText(selectedText);
            }
          }
        }
      }, 10);
    };

    const handleClickOutside = (event: MouseEvent) => {
      // If menu is open and click is outside the menu, close it
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        // Click is outside the menu - close it
        // Use a small delay to ensure this runs after mouseup selection handling
        setTimeout(() => {
          const currentSelection = window.getSelection();
          const currentSelectedText = currentSelection?.toString().trim();
          // Only close if there's no new selection (user just clicked to dismiss)
          if (!currentSelectedText) {
            setSelection(null);
          }
        }, 20);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelection(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    // Use document-level listener since content is dynamically rendered
    document.addEventListener("mouseup", handleMouseUp);
    // Use click event instead of mousedown for better timing with selection clearing
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [viewMode, htmlContent, isDeepDiveOpen]);

  // Handle Explain button click
  const handleExplain = () => {
    if (!selection) return;

    // Store the selection position and text for the popover
    setIntellisenseState({
      text: selection.text,
      position: selection.position,
    });

    // Close the context menu but keep selection highlight
    setSelection(null);
    // Don't clear the selection - let the popover handle it
  };

  // Handle popover close
  const handleCloseIntellisense = () => {
    setIntellisenseState(null);
    window.getSelection()?.removeAllRanges();
  };

  // Handle "Ask follow-up" - opens Deep Dive with selected text from Intellisense
  const handleAskFollowUp = (text: string, explanation: string) => {
    setDeepDiveSelectedText(text);
    setIsDeepDiveOpen(true);
    setIntellisenseState(null);
    window.getSelection()?.removeAllRanges();
  };

  // Handle "Ask in Deep Dive" - opens Deep Dive with selected text
  const handleAskInDeepDive = () => {
    if (selection?.text) {
      setDeepDiveSelectedText(selection.text);
    }
    setIsDeepDiveOpen(true);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // Handle toggling Deep Dive panel
  const handleToggleDeepDive = () => {
    setIsDeepDiveOpen(!isDeepDiveOpen);
    if (isDeepDiveOpen) {
      setDeepDiveSelectedText(null);
    }
  };

  // Handle closing Deep Dive panel
  const handleCloseDeepDive = () => {
    setIsDeepDiveOpen(false);
    setDeepDiveSelectedText(null);
  };

  // Handle selected text change in Deep Dive (for auto-quote)
  const handleDeepDiveSelectedText = (text: string) => {
    setDeepDiveSelectedText(text);
  };

  // Handle marking paper as read
  const handleMarkAsRead = async () => {
    if (isMarkingAsRead || paperStatus === PaperStatus.READ) {
      return;
    }

    // Store original status for potential reversion
    const originalStatus = paperStatus;
    
    setIsMarkingAsRead(true);
    try {
      const response = await fetch(`/api/papers/${paper.id}/mark-read`, {
        method: "POST",
      });

      if (!response.ok) {
        // Handle unauthorized errors
        if (response.status === 401) {
          toast.error("Please log in to mark papers as read");
          // Could redirect to login, but for now just show error
          return;
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mark paper as read");
      }

      // Update local state to reflect read status
      setPaperStatus(PaperStatus.READ);
      toast.success("Paper marked as read");
    } catch (error) {
      console.error("Error marking paper as read:", error);
      
      // Revert UI state on error (optimistic update reversion)
      setPaperStatus(originalStatus);
      
      // Determine error message based on error type
      let errorMessage = "Failed to mark paper as read. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Render PDF view when selected or HTML not available
  const shouldShowPdf = viewMode === "pdf" || (!htmlAvailable && error !== "FETCH_ERROR");
  
  // Toggle buttons component
  const ToggleButtons = () => {
    if (!htmlAvailable) return null;
    const currentMode: "html" | "pdf" = shouldShowPdf ? "pdf" : "html";
    return (
      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
        <Button
          variant={currentMode === "html" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("html")}
          className={cn(
            "h-8 px-3",
            currentMode === "html" && "bg-white shadow-sm"
          )}
        >
          <FileCode className="w-4 h-4 mr-2" />
          HTML
        </Button>
        <Button
          variant={currentMode === "pdf" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("pdf")}
          className={cn(
            "h-8 px-3",
            currentMode === "pdf" && "bg-white shadow-sm"
          )}
        >
          <FileText className="w-4 h-4 mr-2" />
          PDF
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-slate-600">Loading paper...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">Unable to load paper. Please try again later.</p>
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (shouldShowPdf) {
    return (
      <div className="min-h-screen bg-white">
        {/* Minimal header */}
        <div className="border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {/* Mark as Read button - only show when status is NEW or BEING_PROCESSED */}
              {(paperStatus === PaperStatus.NEW || paperStatus === PaperStatus.BEING_PROCESSED) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingAsRead}
                  className="h-8 px-3"
                >
                  {isMarkingAsRead ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Mark as Read
                    </>
                  )}
                </Button>
              )}
              <ToggleButtons />
            </div>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="w-full h-[calc(100vh-64px)]">
          <iframe
            src={`${paper.pdfUrl}#toolbar=1`}
            className="w-full h-full border-0"
            title={paper.title}
          />
        </div>
      </div>
    );
  }

  // Render HTML view
  return (
    <div className="min-h-screen bg-white relative">
      {/* Minimal header */}
      <div className="border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 py-3 max-w-4xl">
          <div className="flex items-center justify-between">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {/* Mark as Read button - only show when status is NEW or BEING_PROCESSED */}
              {(paperStatus === PaperStatus.NEW || paperStatus === PaperStatus.BEING_PROCESSED) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingAsRead}
                  className="h-8 px-3"
                >
                  {isMarkingAsRead ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Mark as Read
                    </>
                  )}
                </Button>
              )}
              <ToggleButtons />
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with flex layout */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Paper content - flex-1 to take available space */}
        <div className={cn(
          "flex-1 overflow-y-auto",
          isDeepDiveOpen ? "" : "container mx-auto"
        )}>
          <div className={cn(
            "px-4 py-8",
            isDeepDiveOpen ? "" : "max-w-4xl mx-auto"
          )}>
            {/* Paper metadata */}
            <div className="mb-8 pb-8 border-b border-slate-200">
              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                {paper.publicationDate && (
                  <span className="text-sm">
                    {new Date(paper.publicationDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
                {paper.categories && paper.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {paper.categories.map((category, index) => (
                      <span
                        key={index}
                        className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* HTML content - memoized to prevent re-render on selection change */}
            {htmlContent && (
              <MemoizedContent
                ref={contentRef}
                htmlContent={htmlContent}
              />
            )}
          </div>

          {/* Context Menu */}
          {selection && (
            <div
              ref={menuRef}
              className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
              style={{
                left: `${selection.position.x}px`,
                top: `${selection.position.y}px`,
                transform: "translate(-50%, -100%)",
              }}
              role="toolbar"
              aria-label="Text selection actions"
            >
              <div className="flex items-center gap-1 bg-white rounded-full px-2 py-1.5 shadow-lg border border-slate-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExplain}
                  className="h-8 px-3 rounded-full hover:bg-slate-100 text-slate-700"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Explain
                </Button>
                <div className="w-px h-4 bg-slate-300" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAskInDeepDive}
                  className={cn(
                    "h-8 px-3 rounded-full hover:bg-slate-100 text-slate-700",
                    isDeepDiveOpen && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  )}
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Ask in Deep Dive
                </Button>
              </div>
            </div>
          )}

          {/* Intellisense Popover */}
          {intellisenseState && (
            <IntellisensePopover
              text={intellisenseState.text}
              position={intellisenseState.position}
              paperId={paper.id}
              onClose={handleCloseIntellisense}
              onAskFollowUp={handleAskFollowUp}
            />
          )}
        </div>

        {/* Deep Dive Panel */}
        {isDeepDiveOpen && (
          <div className="relative flex-shrink-0">
            <DeepDivePanel
              paperId={paper.id}
              paperTitle={paper.title}
              paperAuthors={paper.authors}
              isOpen={isDeepDiveOpen}
              width={deepDiveWidth}
              onClose={handleCloseDeepDive}
              onToggle={handleToggleDeepDive}
              onWidthChange={setDeepDiveWidth}
              onSelectedText={handleDeepDiveSelectedText}
              initialSelectedText={deepDiveSelectedText || undefined}
            />
          </div>
        )}

        {/* Chevron Toggle (shown when chat is closed) */}
        {!isDeepDiveOpen && <DeepDiveToggle onToggle={handleToggleDeepDive} />}
      </div>
    </div>
  );
}
