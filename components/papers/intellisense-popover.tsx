"use client";

import { useEffect, useState, useRef } from "react";
import { readBillingDenial, UpgradeNotice, type BillingDenial } from "@/components/billing/upgrade-notice";
import { Button } from "@/components/ui/button";
import type { Citation } from "@/lib/rag/types";
import { SketchCorner, SketchFrame, SketchWedge } from "@/components/sketch";
import { CitedText, SourceList, citedIdsIn } from "./citations";
import { ChatIcon, CloseIcon, PencilSpinner } from "./sketch-icons";

interface IntellisensePopoverProps {
  text: string;
  position: { x: number; y: number };
  paperId: string;
  /** Paragraph the selection was made in; improves retrieval and the explanation */
  surroundingText?: string;
  onClose: () => void;
  onAskFollowUp?: (text: string, explanation: string) => void;
  /** Scroll the paper to a cited passage */
  onNavigateToSource?: (citation: Citation) => void;
}

export function IntellisensePopover({
  text,
  position,
  paperId,
  surroundingText,
  onClose,
  onAskFollowUp,
  onNavigateToSource,
}: IntellisensePopoverProps) {
  const [explanation, setExplanation] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denial, setDenial] = useState<BillingDenial | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch explanation on mount. Abort on unmount so a remount (e.g. React
    // Strict Mode in development) doesn't stream two explanations into one.
    const controller = new AbortController();
    fetchExplanation(controller.signal);

    // Handle Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      controller.abort();
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    // Use setTimeout to avoid immediate close on mount
    setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const fetchExplanation = async (signal: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      setDenial(null);
      setExplanation("");
      setCitations([]);

      const response = await fetch(`/api/papers/${paperId}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, surroundingText }),
        signal,
      });

      const billingDenial = await readBillingDenial(response);
      if (billingDenial) {
        setDenial(billingDenial);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch explanation");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setLoading(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
                setLoading(false);
                return;
              }
              if (Array.isArray(parsed.citations)) {
                setCitations(parsed.citations);
              }
              if (parsed.chunk) {
                setExplanation((prev) => prev + parsed.chunk);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setLoading(false);
    } catch (err) {
      if (signal.aborted) return;
      console.error("Error fetching explanation:", err);
      setError("Explanation unavailable. Try the Deep Dive panel for more help.");
      setLoading(false);
    }
  };

  const handleAskFollowUp = () => {
    if (onAskFollowUp && explanation) {
      onAskFollowUp(text, explanation);
      onClose();
    }
  };

  // Calculate popover position (above selection, centered horizontally)
  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    left: `${position.x}px`,
    top: `${position.y - 8}px`, // 8px above the selection
    transform: "translate(-50%, -100%) rotate(-0.4deg)",
    zIndex: 50,
    maxWidth: "420px",
    width: "max-content",
    minWidth: "280px",
  };

  return (
    <div
      ref={popoverRef}
      className="sk-card shadow-[7px_7px_0_-1px_rgba(34,37,46,0.12)]"
      style={popoverStyle}
      role="dialog"
      aria-label="Intellisense explanation"
    >
      <SketchFrame seed={`explain:${text.slice(0, 40)}`} w={420} h={300} />
      <SketchCorner seed={`explain:${text.slice(0, 40)}:c`} delay={0.5} />
      <SketchWedge seed={`explain:${text.slice(0, 40)}:w`} />

      {/* Header */}
      <div className="relative flex items-start gap-2 px-[18px] pt-4">
        <p className="flex-1 min-w-0 font-hand text-[22px] font-bold leading-tight truncate">
          “{text}”
        </p>
        <button
          type="button"
          className="sk-icon -mr-2.5 -mt-2.5"
          onClick={onClose}
          aria-label="Close explanation"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      <div className="relative px-[18px] pb-4 pt-1.5 max-h-80 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 text-pencil" role="status">
            <PencilSpinner />
            <p className="font-hand text-[21px] font-bold">Generating explanation...</p>
          </div>
        )}

        {denial && <UpgradeNotice denial={denial} />}

        {error && (
          <div className="space-y-3">
            <p className="text-sm text-pen">{error}</p>
            {onAskFollowUp && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskFollowUp}
                className="w-full"
              >
                <ChatIcon />
                Try Deep Dive Panel
              </Button>
            )}
          </div>
        )}

        {!loading && !error && explanation && (
          <div className="space-y-3">
            <CitedText
              text={explanation}
              citations={citations}
              onCitationClick={onNavigateToSource}
              className="text-[15px] leading-relaxed"
            />
            <SourceList
              citations={citations}
              citedIds={citedIdsIn(explanation)}
              onNavigate={onNavigateToSource}
              compact
            />
            {onAskFollowUp && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskFollowUp}
              >
                <ChatIcon />
                Ask follow-up in Deep Dive
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
