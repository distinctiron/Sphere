"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, Send, Loader2, Trash2, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Message {
  role: "user" | "assistant";
  content: string;
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
}: DeepDivePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [quotedText, setQuotedText] = useState<string | null>(initialSelectedText || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
              if (parsed.chunk) {
                assistantMessage += parsed.chunk;
                // Update the last message (assistant message)
                setMessages((prev) => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
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
          "absolute top-0 bottom-0 left-0 w-1 bg-transparent hover:bg-indigo-500 cursor-col-resize z-50 transition-colors",
          isResizing && "bg-indigo-600"
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
            "w-8 h-16 bg-white border border-slate-200 rounded-l-md",
            "flex items-center justify-center",
            "text-slate-400 hover:text-indigo-600 hover:border-indigo-500",
            "shadow-md transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500"
          )}
          aria-label="Close chat pane"
          aria-expanded="true"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Panel */}
      <div
        ref={panelRef}
        role="complementary"
        aria-label="Deep Dive Chat Panel"
        className={cn(
          "bg-white border-l border-slate-200",
          "flex flex-col h-full",
          "transition-all duration-300 ease-in-out"
        )}
        style={{ width: "100%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-slate-900 truncate">
              Chat with Paper
            </h2>
            <p className="text-xs text-slate-600 truncate mt-0.5" title={paperTitle}>
              {paperTitle}
            </p>
            {authorsText && (
              <p className="text-xs text-slate-500 truncate" title={authorsText}>
                {authorsText}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleClearConversation}
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Message Area - flex-1 to take available space, shrinks when input area expands */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-center">
              <div className="max-w-md">
                <p className="text-slate-600 mb-2">
                  Ask questions about this paper to explore it deeply.
                </p>
                <p className="text-sm text-slate-500">
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
                    "max-w-[85%] rounded-lg p-3",
                    isUser
                      ? "bg-slate-100 text-slate-900 border-l-4 border-indigo-600"
                      : "bg-white border border-slate-200 text-slate-800 prose prose-sm max-w-none"
                  )}
                >
                  {isUser ? (
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  ) : (
                    <div className="relative group">
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                          copiedMessageId === messageId && "opacity-100"
                        )}
                        onClick={() => handleCopyMessage(message.content, messageId)}
                        aria-label="Copy message"
                      >
                        {copiedMessageId === messageId ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">AI is thinking...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600 mb-2">{error}</p>
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
        <div className="border-t border-slate-200 p-4 flex-shrink-0 flex flex-col">
          {/* Quoted text blockquote - positioned at top of input area, expands input area */}
          {quotedText && (
            <div className="mb-3 p-3 bg-slate-50 border-l-4 border-indigo-600 rounded-r rounded-b relative flex-shrink-0">
              <blockquote className="text-sm text-slate-700 whitespace-pre-wrap break-words pr-8">
                {quotedText}
              </blockquote>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleRemoveQuotedText}
                aria-label="Remove quoted text"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Textarea container */}
          <div className="relative">
            <textarea
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
              className={cn(
                "w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2",
                "text-sm placeholder:text-slate-400",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
              rows={4}
              disabled={loading}
            />
            
            {/* Hints */}
            <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
              <span>Markdown supported • Ctrl+Enter to send</span>
            </div>

            {/* Send Button - Floating bottom-right */}
            <Button
              onClick={handleSend}
              disabled={!inputText.trim() || loading}
              className={cn(
                "absolute bottom-3 right-3",
                "h-8 px-4"
              )}
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
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
        "fixed right-0 top-1/2 -translate-y-1/2 z-40",
        "w-8 h-16 bg-white border border-slate-200 border-r-0 rounded-l-md",
        "flex items-center justify-center",
        "text-slate-400 hover:text-indigo-600 hover:border-indigo-500",
        "shadow-md transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500"
      )}
      aria-label="Open chat pane"
      aria-expanded="false"
    >
      <ChevronLeft className="w-5 h-5" />
    </button>
  );
}
