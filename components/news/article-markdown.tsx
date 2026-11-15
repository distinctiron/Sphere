"use client";

import { Fragment, type ReactNode } from "react";
import { splitCitations } from "@/lib/rag/citation-text";
import type { NewsCitation } from "@/lib/news/dto";
import { parseBlocks } from "@/lib/news/markdown";

/**
 * Renders the Markdown subset produced for story articles: ## / ### headings,
 * paragraphs, bullet and numbered lists, **bold**, *italic*, [text](url)
 * links, and inline [n] citations. Tolerates partial Markdown while streaming.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;

function renderFormatting(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(INLINE.source, "g");
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;
    if (token.startsWith("**")) nodes.push(<strong key={key} className="font-semibold">{token.slice(2, -2)}</strong>);
    else if (token.startsWith("*")) nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    else {
      const link = token.match(/^\[([^\]]+)\]\((.+)\)$/)!;
      nodes.push(
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer" className="sk-uline">
          {link[1]}
        </a>
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

interface InlineProps {
  text: string;
  citations: Map<number, NewsCitation>;
  onCite: (id: number) => void;
}

function Inline({ text, citations, onCite }: InlineProps) {
  const parts = splitCitations(text, new Set(citations.keys()));
  return (
    <>
      {parts.map((part, i) =>
        typeof part === "string" ? (
          <Fragment key={i}>{renderFormatting(part, String(i))}</Fragment>
        ) : (
          <sup key={i} className="mx-0.5 whitespace-nowrap">
            {part.map((id) => {
              const citation = citations.get(id)!;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onCite(id)}
                  title={`${citation.sourceName}: ${citation.title}`}
                  aria-label={`Source ${id}: ${citation.sourceName}`}
                  className="px-0.5 font-mono text-[11px] font-bold text-pen hover:underline focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-pen"
                >
                  [{id}]
                </button>
              );
            })}
          </sup>
        )
      )}
    </>
  );
}

export function ArticleMarkdown({
  markdown,
  citations,
  onCite,
}: {
  markdown: string;
  citations: NewsCitation[];
  onCite: (id: number) => void;
}) {
  const byId = new Map(citations.map((c) => [c.id, c]));
  const inline = (text: string) => <Inline text={text} citations={byId} onCite={onCite} />;

  return (
    <div className="space-y-3.5 font-serif text-[17px] leading-[1.7]">
      {parseBlocks(markdown).map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={i} className="pt-4 font-hand text-[34px] font-bold leading-[1.1] first:pt-0">
                {inline(block.text)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="pt-2 font-hand text-[28px] font-bold leading-[1.1]">
                {inline(block.text)}
              </h3>
            );
          case "ul":
          case "ol": {
            const List = block.type === "ul" ? "ul" : "ol";
            return (
              <List key={i} className={block.type === "ul" ? "list-disc space-y-2 pl-6 marker:text-pencil" : "list-decimal space-y-2 pl-6 marker:font-hand marker:text-pencil"}>
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </List>
            );
          }
          default:
            return <p key={i}>{inline(block.text)}</p>;
        }
      })}
    </div>
  );
}
