"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readBillingDenial, UpgradeNotice, type BillingDenial } from "@/components/billing/upgrade-notice";
import { GraduationCap, Loader2, MessageCircleQuestion, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Brush, SketchCorner, SketchFrame } from "@/components/sketch";
import { TutorMarkdown, type LessonLinkMap } from "./tutor-markdown";

type Turn = { role: "user" | "assistant"; content: string; selection?: string };

interface TutorPanelProps {
  lessonId: string;
  lessonTitle: string;
  lessons: LessonLinkMap;
}

const SUGGESTIONS = [
  "Explain the main picture of this lesson in a different way",
  "Give me a concrete example with numbers",
  "What should I be able to reason out after this lesson?",
];

/**
 * "Ask the tutor" (Story 9.4): floating button + slide-over chat about the
 * current lesson. Selecting text in the lesson offers "Ask about this".
 */
export function TutorPanel({ lessonId, lessonTitle, lessons }: TutorPanelProps) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denial, setDenial] = useState<BillingDenial | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Offer "Ask about this" when text inside the lesson body is selected
  useEffect(() => {
    const onMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? "";
        const body = document.getElementById("lesson-body");
        if (!sel || !text || text.length < 3 || !body || !sel.anchorNode || !body.contains(sel.anchorNode)) {
          setPendingSelection(null);
          return;
        }
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        setPendingSelection({ text: text.slice(0, 1500), x: rect.left + rect.width / 2, y: rect.top });
      }, 0);
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchend", onMouseUp);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchend", onMouseUp);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (message: string) => {
      const text = message.trim();
      if (!text || streaming) return;
      const history = turns.map(({ role, content }) => ({ role, content }));
      const quoted = selection ?? undefined;
      setTurns((prev) => [...prev, { role: "user", content: text, selection: quoted }, { role: "assistant", content: "" }]);
      setInput("");
      setSelection(null);
      setError(null);
      setDenial(null);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(`/api/learn/lessons/${lessonId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history, selection: quoted }),
          signal: controller.signal,
        });
        const billingDenial = await readBillingDenial(response);
        if (billingDenial) {
          setDenial(billingDenial);
          setTurns((prev) => prev.slice(0, -2));
          setInput(text);
          return;
        }
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            const data = event.replace(/^data: /, "");
            if (data === "[DONE]") continue;
            const payload = JSON.parse(data) as { chunk?: string; error?: string };
            if (payload.error) throw new Error(payload.error);
            if (payload.chunk) {
              setTurns((prev) => {
                const next = prev.slice();
                const last = next[next.length - 1];
                next[next.length - 1] = { ...last, content: last.content + payload.chunk };
                return next;
              });
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message.startsWith("HTTP") ? "The tutor is unavailable right now." : (err as Error).message);
        setTurns((prev) => (prev[prev.length - 1]?.content ? prev : prev.slice(0, -1)));
      } finally {
        setStreaming(false);
      }
    },
    [lessonId, selection, streaming, turns]
  );

  const askAboutSelection = () => {
    if (!pendingSelection) return;
    setSelection(pendingSelection.text);
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      {pendingSelection && !open && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={askAboutSelection}
          style={{ left: Math.min(Math.max(pendingSelection.x, 80), window.innerWidth - 80), top: Math.max(pendingSelection.y - 44, 8) }}
          className="sk-btn small fixed z-40 -translate-x-1/2"
        >
          <span className="sk-bsw" aria-hidden="true" />
          <SketchFrame seed="tutor:ask-selection" w={170} h={40} />
          <span className="lbl">
            <MessageCircleQuestion className="h-4 w-4" />
            Ask about this
          </span>
        </button>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="sk-btn primary fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30"
        >
          <span className="sk-bsw" aria-hidden="true" />
          <SketchFrame seed="tutor:open" w={180} h={46} />
          <SketchCorner seed="tutor:open:c" size="button" />
          <span className="lbl">
            <GraduationCap className="h-5 w-5" />
            Ask the tutor
          </span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Lesson tutor"
          className="sk-sheet sk-fade fixed inset-x-0 bottom-0 z-40 flex h-[85vh] flex-col sm:inset-x-auto sm:bottom-4 sm:right-4 sm:h-[min(640px,calc(100vh-2rem))] sm:w-[26rem]"
        >
          <div className="flex items-center justify-between border-b-2 border-dashed border-ink/20 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-hand text-[28px] font-bold leading-none">
                <GraduationCap className="h-5 w-5" />
                <Brush color="blue" variant="tutor" className="px-1">
                  Tutor
                </Brush>
              </div>
              <div className="mt-1 truncate font-mono text-[11px] text-pencil">{lessonTitle}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close tutor"
              className="sk-icon"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="font-serif text-[15px] leading-relaxed">
                  Ask anything about this lesson. The tutor knows the lesson, the lessons it builds on, and the rest of the curriculum. You can
                  also select a passage in the lesson and choose “Ask about this”.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="relative min-h-[44px] bg-sheet px-3 py-2 text-left text-sm hover:bg-[rgba(255,212,59,0.3)]"
                    >
                      <SketchFrame seed={`tutor:suggest:${s}`} w={360} h={44} />
                      <span className="relative">{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((turn, i) =>
              turn.role === "user" ? (
                <div key={i} className="relative ml-8 bg-[rgba(125,185,255,0.18)] px-3 py-2 text-sm">
                  <SketchFrame seed={`tutor:turn:${i}`} w={320} h={60} />
                  {turn.selection && (
                    <blockquote className="relative mb-1.5 line-clamp-3 border-l-[3px] border-dashed border-ink/40 pl-2 font-serif text-xs italic text-pencil">
                      {turn.selection}
                    </blockquote>
                  )}
                  <span className="relative">{turn.content}</span>
                </div>
              ) : (
                <div key={i} className="mr-4">
                  {turn.content ? (
                    <TutorMarkdown text={turn.content} lessons={lessons} />
                  ) : (
                    <span className="sk-pulse font-hand text-xl text-pencil" aria-label="Thinking">thinking…</span>
                  )}
                </div>
              )
            )}
            {denial && <UpgradeNotice denial={denial} className="m-3" />}
            {error && <div className="relative p-3 text-sm text-pen">
                <SketchFrame seed="tutor:error" w={360} h={50} tone="red" />
                <span className="relative">{error}</span>
              </div>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t-2 border-dashed border-ink/20 p-3"
          >
            {selection && (
              <div className="mb-2 flex items-start gap-2 bg-[rgba(255,212,59,0.25)] px-2 py-1.5 text-xs">
                <span className="line-clamp-2 flex-1 border-l-[3px] border-dashed border-ink/40 pl-2 font-serif italic">{selection}</span>
                <button type="button" onClick={() => setSelection(null)} aria-label="Remove quoted passage" className="text-pencil hover:text-pen">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <span className="sk-field flex-1">
                <SketchFrame seed="tutor:input" w={300} h={56} />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={2}
                  placeholder={selection ? "What's unclear about this passage?" : "Ask a question…"}
                  className="sk-inp !min-h-[3.5rem] resize-none py-2 text-sm"
                />
              </span>
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label="Send"
                className={cn("sk-icon", !(streaming || !input.trim()) && "bg-[rgba(255,212,59,0.6)]")}
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
