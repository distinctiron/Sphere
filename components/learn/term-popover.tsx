"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TermPopoverProps {
  id: string;
  term: string;
  definition: string;
  lesson?: { code: string; title: string; href: string; isCurrent: boolean };
  children: ReactNode;
}

/** Glossary term: dotted underline, definition on hover (desktop) or tap (touch) */
export function TermPopover({ id, term, definition, lesson, children }: TermPopoverProps) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const hoverOpen = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hoverClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={hoverOpen}
          onMouseLeave={hoverClose}
          className="sk-dotted text-inherit hover:text-pen hover:decoration-pen"
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={hoverOpen}
        onMouseLeave={hoverClose}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-80 max-w-[calc(100vw-2rem)] p-4 text-sm"
      >
        <div className="mb-1 font-hand text-[26px] font-bold leading-none">{term}</div>
        <p className="font-serif leading-relaxed">{definition}</p>
        {lesson && !lesson.isCurrent && (
          <Link href={lesson.href} className="sk-uline mt-3 inline-block text-xs font-semibold">
            Taught in {lesson.code} · {lesson.title} →
          </Link>
        )}
        <Link href={`/learn/glossary#${id}`} className="mt-2 block font-hand text-lg text-pencil no-underline">
          Glossary →
        </Link>
      </PopoverContent>
    </Popover>
  );
}
