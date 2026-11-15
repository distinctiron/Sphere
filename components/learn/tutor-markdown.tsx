"use client";

import Link from "next/link";
import katex from "katex";
import { Fragment, type ReactNode } from "react";

/**
 * Renders tutor answers: paragraphs, ##/### headings, lists, fenced code,
 * $$display$$ and $inline$ math (KaTeX), **bold**, *italic*, `code`, and
 * [[lesson:id]] links. Tolerates partial Markdown while streaming.
 */

export type LessonLinkMap = Record<string, { code: string; title: string; href: string }>;

type Block =
  | { type: "p" | "h"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "code"; text: string }
  | { type: "math"; text: string };

export function parseTutorBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split("\n");
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("```")) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) code.push(lines[i]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (line.startsWith("$$")) {
      flush();
      const single = line.length > 4 && line.endsWith("$$");
      if (single) {
        blocks.push({ type: "math", text: line.slice(2, -2) });
        continue;
      }
      const math: string[] = [line.slice(2)];
      for (i++; i < lines.length && !lines[i].includes("$$"); i++) math.push(lines[i]);
      if (i < lines.length) math.push(lines[i].replace("$$", ""));
      blocks.push({ type: "math", text: math.join("\n") });
      continue;
    }
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (!line) flush();
    else if (heading) {
      flush();
      blocks.push({ type: "h", text: heading[1] });
    } else if (bullet || numbered) {
      flush();
      const type = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1];
      const last = blocks[blocks.length - 1];
      if (last && last.type === type) last.items.push(text);
      else blocks.push({ type, items: [text] });
    } else paragraph.push(line);
  }
  flush();
  return blocks;
}

function renderMath(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false });
  } catch {
    return tex;
  }
}

const INLINE = /(\[\[lesson:[a-z0-9-]+\]\]|\$[^$\n]+\$|`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;

function Inline({ text, lessons }: { text: string; lessons: LessonLinkMap }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of Array.from(text.matchAll(INLINE))) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    if (token.startsWith("[[lesson:")) {
      const lesson = lessons[token.slice(9, -2)];
      nodes.push(
        lesson ? (
          <Link key={index} href={lesson.href} className="sk-uline font-semibold">
            {lesson.code} · {lesson.title}
          </Link>
        ) : (
          token.slice(9, -2)
        )
      );
    } else if (token.startsWith("$")) {
      nodes.push(<span key={index} dangerouslySetInnerHTML={{ __html: renderMath(token.slice(1, -1), false) }} />);
    } else if (token.startsWith("`")) {
      nodes.push(
        <code key={index} className="bg-[rgba(255,212,59,0.35)] px-1 font-mono text-[0.9em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={index} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(<em key={index}>{token.slice(1, -1)}</em>);
    }
    last = index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export function TutorMarkdown({ text, lessons }: { text: string; lessons: LessonLinkMap }) {
  return (
    <div className="space-y-2 font-serif text-[15px] leading-relaxed text-ink">
      {parseTutorBlocks(text).map((block, i) => (
        <Fragment key={i}>
          {block.type === "p" && (
            <p>
              <Inline text={block.text} lessons={lessons} />
            </p>
          )}
          {block.type === "h" && (
            <p className="pt-1 font-hand text-[22px] font-bold leading-tight">
              <Inline text={block.text} lessons={lessons} />
            </p>
          )}
          {(block.type === "ul" || block.type === "ol") &&
            (() => {
              const List = block.type;
              return (
                <List className={block.type === "ul" ? "list-disc space-y-1 pl-5" : "list-decimal space-y-1 pl-5"}>
                  {block.items.map((item, j) => (
                    <li key={j}>
                      <Inline text={item} lessons={lessons} />
                    </li>
                  ))}
                </List>
              );
            })()}
          {block.type === "code" && (
            <pre className="overflow-x-auto border-l-[3px] border-ink/40 bg-[rgba(34,37,46,0.05)] p-3 font-mono text-xs text-ink">{block.text}</pre>
          )}
          {block.type === "math" && (
            <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: renderMath(block.text, true) }} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
