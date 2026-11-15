"use client";

import { useEffect, useState, useRef } from "react";
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrushTag, SketchDivider, SketchFrame } from "@/components/sketch";
import { IntellisensePopover } from "./intellisense-popover";
import { BackIcon, ChatIcon, CheckIcon, PencilSpinner, SparkIcon } from "./sketch-icons";
import { DeepDivePanel, DeepDiveToggle } from "./deep-dive-panel";
import { toast } from "sonner";
import { PaperStatus } from "@prisma/client";
import type { Citation } from "@/lib/rag/types";

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
  /** Text of the paragraph containing the selection (context for retrieval) */
  surroundingText?: string;
  range?: {
    startContainer: Node;
    startOffset: number;
    endContainer: Node;
    endOffset: number;
  };
}

/** Paragraph-level text around a selection, used to locate it in the paper for RAG */
function getSurroundingText(range: Range): string | undefined {
  const start = range.startContainer;
  const element = start.nodeType === Node.ELEMENT_NODE ? (start as Element) : start.parentElement;
  const block = element?.closest("p, .ltx_para, li, td, figcaption, blockquote");
  const text = block?.textContent?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 2000) : undefined;
}

const SOURCE_HIGHLIGHT_CLASS = "rag-source-highlight";

// Memoized content component to prevent re-renders when selection changes
const MemoizedContent = React.memo(
  React.forwardRef<HTMLDivElement, { htmlContent: string }>(
    ({ htmlContent }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            "prose prose-lg max-w-none relative",
            "prose-p:leading-[1.7]",
            "prose-a:underline hover:prose-a:text-pen",
            "prose-strong:font-semibold",
            "prose-code:font-mono prose-code:text-[0.9em] prose-code:bg-[#f3f1ea] prose-code:px-1 prose-code:py-0.5",
            "prose-pre:bg-[#f3f1ea] prose-pre:text-ink prose-pre:border-[1.5px] prose-pre:border-dashed prose-pre:border-ink/40 prose-pre:rounded-none",
            "prose-img:rounded-none prose-img:mix-blend-multiply",
            "prose-figcaption:text-pencil prose-figcaption:text-sm prose-figcaption:font-sans",
            "prose-blockquote:border-l-pen prose-blockquote:not-italic prose-blockquote:py-1 prose-blockquote:px-4",
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
    surroundingText?: string;
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

  // Start indexing the paper for retrieval (RAG) in the background so chat and
  // explanations can use relevant passages by the time the user asks
  useEffect(() => {
    fetch(`/api/papers/${paper.id}/rag`, { method: "POST" }).catch(() => {
      // Non-critical: chat and explanations fall back to non-RAG context
    });
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
              surroundingText: getSurroundingText(range),
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
      surroundingText: selection.surroundingText,
    });

    // Close the context menu but keep selection highlight
    setSelection(null);
    // Don't clear the selection - let the popover handle it
  };

  // Scroll to a cited passage and briefly highlight it
  const handleNavigateToSource = (citation: Citation) => {
    if (viewMode !== "html" || !contentRef.current || !citation.anchorId) {
      toast.info("This source can only be located in the HTML view.");
      return;
    }
    const target = contentRef.current.querySelector<HTMLElement>(`[id="${CSS.escape(citation.anchorId)}"]`);
    if (!target) {
      toast.info("Couldn't locate this passage in the paper.");
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add(SOURCE_HIGHLIGHT_CLASS);
    setTimeout(() => target.classList.remove(SOURCE_HIGHLIGHT_CLASS), 2500);
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
      <div className="sk-segs" role="group" aria-label="Paper format">
        {(["html", "pdf"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className="sk-seg"
            aria-pressed={currentMode === mode}
            onClick={() => setViewMode(mode)}
          >
            <span className="sk-bseg" aria-hidden="true" />
            <span className="lbl">{mode.toUpperCase()}</span>
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="sk-btn ghost small">
              <span className="sk-bsw" aria-hidden="true" />
              <span className="lbl">
                <BackIcon />
                Back to Dashboard
              </span>
            </Link>
          </div>
          <div className="flex flex-col items-center py-16" role="status">
            <PencilSpinner size={40} />
            <p className="mt-3 font-hand text-[26px] font-bold text-pencil">Loading paper...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/dashboard" className="sk-btn ghost small">
              <span className="sk-bsw" aria-hidden="true" />
              <span className="lbl">
                <BackIcon />
                Back to Dashboard
              </span>
            </Link>
          </div>
          <div className="text-center py-16">
            <p className="mb-5 font-hand text-[26px] font-bold text-pen">Unable to load paper. Please try again later.</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (shouldShowPdf) {
    return (
      <div className="min-h-screen">
        {/* Minimal header */}
        <div className="sticky top-0 z-10 bg-sheet/95 backdrop-blur-sm">
          <div className="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
            <Link href="/dashboard" className="sk-btn ghost small">
              <span className="sk-bsw" aria-hidden="true" />
              <span className="lbl">
                <BackIcon />
                Back
              </span>
            </Link>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {/* Mark as Read button - only show when status is NEW or BEING_PROCESSED */}
              {(paperStatus === PaperStatus.NEW || paperStatus === PaperStatus.BEING_PROCESSED) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAsRead}
                  disabled={isMarkingAsRead}
                >
                  {isMarkingAsRead ? (
                    <>
                      <PencilSpinner />
                      Marking...
                    </>
                  ) : (
                    <>
                      <CheckIcon />
                      Mark as Read
                    </>
                  )}
                </Button>
              )}
              {paperStatus === PaperStatus.READ && (
                <span className="font-hand text-[22px] font-bold text-pen">✓ marked as read</span>
              )}
              <ToggleButtons />
            </div>
          </div>
          <SketchDivider seed="reader-rule" w={1440} className="absolute -bottom-1.5 left-0" />
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
    <div className="min-h-screen relative">
      {/* Minimal header */}
      <div className="sticky top-0 z-10 bg-sheet/95 backdrop-blur-sm">
        <div className="container mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 max-w-4xl">
          <Link href="/dashboard" className="sk-btn ghost small">
            <span className="sk-bsw" aria-hidden="true" />
            <span className="lbl">
              <BackIcon />
              Back
            </span>
          </Link>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* Mark as Read button - only show when status is NEW or BEING_PROCESSED */}
            {(paperStatus === PaperStatus.NEW || paperStatus === PaperStatus.BEING_PROCESSED) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsRead}
                disabled={isMarkingAsRead}
              >
                {isMarkingAsRead ? (
                  <>
                    <PencilSpinner />
                    Marking...
                  </>
                ) : (
                  <>
                    <CheckIcon />
                    Mark as Read
                  </>
                )}
              </Button>
            )}
            {paperStatus === PaperStatus.READ && (
              <span className="font-hand text-[22px] font-bold text-pen">✓ marked as read</span>
            )}
            <ToggleButtons />
          </div>
        </div>
        <SketchDivider seed="reader-rule" w={1440} className="absolute -bottom-1.5 left-0" />
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
            <div className="mb-8 pb-6">
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
                {paper.publicationDate && (
                  <span className="font-mono text-[13px] text-pencil">
                    {new Date(paper.publicationDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                )}
                {paper.categories && paper.categories.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {paper.categories.map((category, index) => (
                      <BrushTag
                        key={index}
                        label={category}
                        variant={`${paper.id}:${category}`}
                        delay={0.3 + index * 0.2}
                      />
                    ))}
                  </div>
                )}
              </div>
              <SketchDivider seed={`${paper.id}:meta`} w={900} className="mt-6" />
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
              <div className="relative flex items-center bg-sheet px-1.5 shadow-[5px_5px_0_-1px_rgba(34,37,46,0.12)]">
                <SketchFrame seed="reader-selection-bar" w={300} h={46} />
                <button
                  type="button"
                  onClick={handleExplain}
                  className="relative inline-flex min-h-11 items-center gap-1.5 px-3.5 font-hand text-[21px] font-bold text-ink hover:text-pen focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-pen"
                >
                  <SparkIcon />
                  Explain
                </button>
                <svg width="4" height="26" viewBox="0 0 4 26" aria-hidden="true" className="relative">
                  <path className="sk-ink" strokeWidth={1.6} d="M2 2 C 2.5 9, 1.6 17, 2.2 24" />
                </svg>
                <button
                  type="button"
                  onClick={handleAskInDeepDive}
                  className={cn(
                    "relative inline-flex min-h-11 items-center gap-1.5 px-3.5 font-hand text-[21px] font-bold text-ink hover:text-pen focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-pen",
                    isDeepDiveOpen && "sk-bs sk-t-cv0 still"
                  )}
                >
                  <ChatIcon />
                  Ask in Deep Dive
                </button>
              </div>
              <svg width="30" height="14" viewBox="0 0 30 16" aria-hidden="true" className="mx-auto -mt-px block overflow-visible">
                <path className="sk-ink" strokeWidth={1.6} d="M3 2 C 9 7, 13 11, 15 14 C 18 9, 22 6, 27 2" />
              </svg>
            </div>
          )}

          {/* Intellisense Popover */}
          {intellisenseState && (
            <IntellisensePopover
              text={intellisenseState.text}
              position={intellisenseState.position}
              paperId={paper.id}
              surroundingText={intellisenseState.surroundingText}
              onClose={handleCloseIntellisense}
              onAskFollowUp={handleAskFollowUp}
              onNavigateToSource={handleNavigateToSource}
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
              onNavigateToSource={handleNavigateToSource}
            />
          </div>
        )}

        {/* Chevron Toggle (shown when chat is closed) */}
        {!isDeepDiveOpen && <DeepDiveToggle onToggle={handleToggleDeepDive} />}
      </div>
    </div>
  );
}
