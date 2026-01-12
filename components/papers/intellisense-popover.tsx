"use client";

import { useEffect, useState, useRef } from "react";
import { X, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IntellisensePopoverProps {
  text: string;
  position: { x: number; y: number };
  paperId: string;
  onClose: () => void;
  onAskFollowUp?: (text: string, explanation: string) => void;
}

export function IntellisensePopover({
  text,
  position,
  paperId,
  onClose,
  onAskFollowUp,
}: IntellisensePopoverProps) {
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch explanation on mount
    fetchExplanation();

    // Handle Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
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

  const fetchExplanation = async () => {
    try {
      setLoading(true);
      setError(null);
      setExplanation("");

      const response = await fetch(`/api/papers/${paperId}/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

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
    transform: "translate(-50%, -100%)",
    zIndex: 50,
    maxWidth: "400px",
    width: "max-content",
    minWidth: "280px",
  };

  return (
    <div
      ref={popoverRef}
      className="bg-white rounded-md border border-slate-200 shadow-lg"
      style={popoverStyle}
      role="dialog"
      aria-label="Intellisense explanation"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {text}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-2 flex-shrink-0"
          onClick={onClose}
          aria-label="Close explanation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-sm">Generating explanation...</p>
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <p className="text-sm text-red-600">{error}</p>
            {onAskFollowUp && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskFollowUp}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Try Deep Dive Panel
              </Button>
            )}
          </div>
        )}

        {!loading && !error && explanation && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {explanation}
            </p>
            {onAskFollowUp && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskFollowUp}
                className="w-full"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask follow-up in Deep Dive
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

