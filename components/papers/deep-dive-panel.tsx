"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { readBillingDenial, UpgradeNotice, type BillingDenial } from "@/components/billing/upgrade-notice";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/rag/types";
import { SketchCorner, SketchDivider, SketchFrame, SketchWedge } from "@/components/sketch";
import { CitedText, SourceList, citedIdsIn } from "./citations";
import { CheckIcon, ChevronIcon, CloseIcon, CopyIcon, PencilSpinner, SendIcon, TrashIcon } from "./sketch-icons";

export interface Message {
  role: "user" | "assistant";
  content: string;
  /** Passages retrieved for this answer (RAG) */
  citations?: Citation[];
}

interface DeepDivePanelProps {
  paperId: string;
  paperTitle: string;
  paperAuthors?: Array<{ name: string }>;
  isOpen: boolean;
  width: number;
  onClose: () => void;
  onToggle: () => void;
  onWidthChange: (width: number) => void;
  onSelectedText?: (text: string) => void;
  initialSelectedText?: string;
  /** Scroll the paper to a cited passage */
  onNavigateToSource?: (citation: Citation) => void;
}

export function DeepDivePanel({
  paperId,
  paperTitle,
  paperAuthors,
  isOpen,
  width,
  onClose,
  onToggle,
  onWidthChange,
  onSelectedText,
  initialSelectedText,
  onNavigateToSource,
}: DeepDivePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [quotedText, setQuotedText] = useState<string | null>(initialSelectedText || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denial, setDenial] = useState<BillingDenial | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle initial selected text
  useEffect(() => {
    if (initialSelectedText) {
      setQuotedText(initialSelectedText);
    }
  }, [initialSelectedText]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing || !isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.7;
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onWidthChange(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, isOpen, onWidthChange]);

  const handleSend = useCallback(async () => {
    const textToSend = quotedText
      ? `> ${quotedText}\n\n${inputText.trim()}`
      : inputText.trim();

    if (!textToSend) return;

    // Add user message
    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setQuotedText(null);
    setLoading(true);
    setError(null);
    setDenial(null);

    // Create conversation history
    const conversationHistory: Message[] = [...messages, userMessage];

    try {
      const response = await fetch(`/api/papers/${paperId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      const billingDenial = await readBillingDenial(response);
      if (billingDenial) {
        // Not an error to retry: show the plans and give the question back
        setDenial(billingDenial);
        setMessages((prev) => prev.slice(0, -1));
        setInputText(textToSend);
        setLoading(false);
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      let assistantMessage = "";
      let assistantCitations: Citation[] = [];

      // Add assistant message placeholder
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

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
                // Remove the empty assistant message
                setMessages((prev) => prev.slice(0, -1));
                return;
              }
              if (Array.isArray(parsed.citations)) {
                assistantCitations = parsed.citations;
              }
              if (parsed.chunk) {
                assistantMessage += parsed.chunk;
                // Update the last message (assistant message)
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                    citations: assistantCitations,
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Deep Dive service unavailable. Please try again.");
      setLoading(false);
      // Remove the empty assistant message
      setMessages((prev) => prev.slice(0, -1));
    }
  }, [paperId, inputText, quotedText, messages]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to send
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (inputText.trim()) {
          e.preventDefault();
          handleSend();
        }
      }
      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, inputText, handleSend, onClose]);

  const handleClearConversation = () => {
    setMessages([]);
    setInputText("");
    setQuotedText(null);
    setError(null);
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRemoveQuotedText = () => {
    setQuotedText(null);
  };

  // Format authors for display
  const authorsText = paperAuthors?.map((a) => a.name).join(", ") || "";

  if (!isOpen) return null;

  return (
    <div className="relative h-full flex-shrink-0" style={{ width: `${width}px` }}>
      {/* Resizer Handle - on left edge of chat panel */}
      <div
        ref={resizerRef}
        className={cn(
          "absolute top-0 bottom-0 left-0 w-1.5 bg-transparent hover:bg-pen/30 cursor-col-resize z-50 transition-colors",
          isResizing && "bg-pen/50"
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
        role="separator"
        aria-label="Resize chat pane"
        aria-valuenow={Math.round((width / (typeof window !== "undefined" ? window.innerWidth : 1200)) * 100)}
        aria-valuemin={Math.round((300 / (typeof window !== "undefined" ? window.innerWidth : 1200)) * 100)}
        aria-valuemax={70}
      >
        {/* Chevron Toggle on Resizer */}
        <button
          onClick={onToggle}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-7 h-16 bg-sheet text-ink hover:text-pen",
            "flex items-center justify-center",
            "focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-pen"
          )}
          aria-label="Close chat pane"
          aria-expanded="true"
        >
          <SketchFrame seed="deep-dive-edge-open" w={28} h={64} />
          <ChevronIcon direction="right" className="relative" />
        </button>
      </div>

      {/* Chat Panel */}
      <div className="h-full py-3 pl-4 pr-4 pb-4">
        <div
          ref={panelRef}
          role="complementary"
          aria-label="Deep Dive Chat Panel"
          className={cn(
            "sk-card",
            "flex flex-col h-full",
            "transition-all duration-300 ease-in-out"
          )}
          style={{ width: "100%" }}
        >
          <SketchFrame seed={`deep-dive-${paperId}`} w={600} h={1100} />
          <SketchCorner seed={`deep-dive-${paperId}:c`} size="panel" />
          <SketchWedge seed={`deep-dive-${paperId}:w`} />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-2 px-5 pt-5 flex-shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="font-hand text-[36px] font-bold leading-none truncate">
                Chat with Paper
              </h2>
              <p className="mt-1.5 font-semibold truncate" title={paperTitle}>
                {paperTitle}
              </p>
              {authorsText && (
                <p className="text-[13px] text-pencil truncate" title={authorsText}>
                  {authorsText}
                </p>
              )}
            </div>
            <div className="flex items-center flex-shrink-0 -mr-2 -mt-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  className="sk-icon"
                  onClick={handleClearConversation}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                >
                  <TrashIcon />
                </button>
              )}
              <button type="button" className="sk-icon" onClick={onClose} aria-label="Close panel">
                <CloseIcon />
              </button>
            </div>
          </div>
          <SketchDivider seed={`deep-dive-${paperId}:rule`} w={560} className="relative mx-5 mt-3 w-auto flex-shrink-0" />

          {/* Message Area - flex-1 to take available space, shrinks when input area expands */}
          <div className="relative flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="max-w-md">
                  <p className="font-hand text-[26px] font-bold leading-tight mb-1">
                    Ask questions about this paper to explore it deeply.
                  </p>
                  <p className="text-sm text-pencil">
                    Try asking about concepts, methodology, results, or references.
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const messageId = `message-${index}`;
              const isUser = message.role === "user";

              return (
                <div
                  key={messageId}
                  className={cn(
                    "flex flex-col gap-2",
                    isUser ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "relative p-4",
                      isUser
                        ? "max-w-[88%] bg-[#f3f1ea]"
                        : "max-w-[96%] bg-sheet prose prose-sm"
                    )}
                  >
                    <SketchFrame seed={`${paperId}:${messageId}`} w={isUser ? 470 : 540} h={isUser ? 120 : 360} />
                    {!isUser && <SketchWedge seed={`${paperId}:${messageId}:w`} delay={0.2} />}
                    {isUser ? (
                      <p className="relative text-[15px] whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    ) : (
                      <div className="relative group">
                        <CitedText
                          text={message.content}
                          citations={message.citations ?? []}
                          onCitationClick={onNavigateToSource}
                          className="font-sans text-[15px] leading-relaxed"
                        />
                        {message.citations && message.citations.length > 0 && (
                          <SourceList
                            citations={message.citations}
                            citedIds={citedIdsIn(message.content)}
                            onNavigate={onNavigateToSource}
                          />
                        )}
                        <button
                          type="button"
                          className={cn(
                            "sk-icon !absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity",
                            copiedMessageId === messageId && "opacity-100"
                          )}
                          onClick={() => handleCopyMessage(message.content, messageId)}
                          aria-label="Copy message"
                        >
                          {copiedMessageId === messageId ? (
                            <CheckIcon size={16} className="text-[#1f8a57]" />
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-pencil" role="status">
                <PencilSpinner />
                <p className="font-hand text-[22px] font-bold">AI is thinking...</p>
              </div>
            )}

            {denial && <UpgradeNotice denial={denial} />}

            {error && (
              <div className="relative bg-sheet p-4">
                <SketchFrame seed={`${paperId}:error`} w={540} h={110} tone="red" />
                <p className="relative text-sm text-pen mb-3">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSend}
                  className="w-full"
                >
                  Retry
                </Button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - flex-shrink-0 at bottom, quoted text expands this area, pushing message area up */}
          <div className="relative px-5 pb-5 pt-2 flex-shrink-0 flex flex-col">
            {/* Quoted text blockquote - positioned at top of input area, expands input area */}
            {quotedText && (
              <div className="relative mb-3 bg-[#f3f1ea] py-2.5 pl-3.5 pr-10 flex-shrink-0">
                <SketchFrame seed={`${paperId}:quote`} w={500} h={70} dashed />
                <blockquote className="relative max-h-32 overflow-y-auto font-serif italic text-sm whitespace-pre-wrap break-words">
                  “{quotedText}”
                </blockquote>
                <button
                  type="button"
                  className="sk-icon !absolute right-0 top-0"
                  onClick={handleRemoveQuotedText}
                  aria-label="Remove quoted text"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            )}

            {/* Textarea container */}
            <div className="relative">
              <span className="sk-field">
                <SketchFrame seed={`${paperId}:input`} w={556} h={130} />
                <label htmlFor={`deep-dive-input-${paperId}`} className="sr-only">
                  Ask a question about this paper
                </label>
                <textarea
                  id={`deep-dive-input-${paperId}`}
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    // Ctrl+Enter to send
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask a question about this paper..."
                  className="sk-inp block resize-none !pb-14"
                  rows={4}
                  disabled={loading}
                />

                {/* Send Button - Floating bottom-right */}
                <Button
                  onClick={handleSend}
                  disabled={!inputText.trim() || loading}
                  className="!absolute bottom-2.5 right-2.5"
                  size="sm"
                  aria-label={loading ? "Sending" : undefined}
                >
                  {loading ? (
                    <PencilSpinner />
                  ) : (
                    <>
                      Send
                      <SendIcon />
                    </>
                  )}
                </Button>
              </span>

              {/* Hints */}
              <p className="sk-help mt-2 mb-0">Markdown supported • Ctrl+Enter to send</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chevron Toggle Button (shown when chat is closed)
export function DeepDiveToggle({ onToggle }: { onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "fixed right-2 top-1/2 -translate-y-1/2 z-40",
        "w-[30px] h-24 bg-sheet text-ink hover:text-pen",
        "flex items-center justify-center",
        "focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-pen"
      )}
      aria-label="Open chat pane"
      aria-expanded="false"
    >
      <SketchFrame seed="deep-dive-edge-closed" w={30} h={96} />
      <ChevronIcon direction="left" className="relative" />
    </button>
  );
}
