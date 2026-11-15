/**
 * Document Chunking Service (Story 7.2)
 *
 * Turns a paper's arXiv HTML (LaTeXML output) into retrieval chunks:
 * 1. extractDocument(): walks the DOM once, producing plain text plus the
 *    offsets of semantic sections and of element ids (used as citation anchors).
 *    Math is kept as its LaTeX `alttext`; bibliography and page chrome are dropped.
 * 2. chunkDocument(): splits each section into ~500-1000 token chunks that end
 *    on paragraph/sentence boundaries and overlap the previous chunk by ~75 tokens.
 *
 * Chunk content is always an exact slice of the extracted text, so
 * startPosition/endPosition are precise character offsets.
 * Token counts use the ~4 characters/token heuristic (no tokenizer dependency).
 */

import { parse, type HTMLElement, type Node } from "node-html-parser";
import type { ChunkDraft, SectionType } from "./types";

export const CHARS_PER_TOKEN = 4;

export interface ChunkingOptions {
  targetTokens: number;
  minTokens: number;
  maxTokens: number;
  overlapTokens: number;
}

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  targetTokens: 800,
  minTokens: 500,
  maxTokens: 1000,
  overlapTokens: 75,
};

interface DocumentSection {
  type: SectionType;
  title: string | null;
  anchorId: string | null;
  start: number;
  end: number;
}

interface Anchor {
  offset: number;
  id: string;
}

export interface ExtractedDocument {
  text: string;
  sections: DocumentSection[];
  anchors: Anchor[];
  subsections: Array<{ offset: number; title: string }>;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// Section classification
// ---------------------------------------------------------------------------

const SECTION_RULES: Array<[RegExp, SectionType]> = [
  [/\babstract\b/, "abstract"],
  [/introduc|\boverview\b|\bmotivation\b/, "introduction"],
  [/conclu|\bsummary\b|future (work|direction)|\boutlook\b|closing remarks/, "conclusion"],
  [/results? (and|&) discussion/, "results"],
  [/discussion|limitation|broader impact|implication|\bethic/, "discussion"],
  [/experimental (setup|settings?|details)|implementation details/, "methods"],
  [/result|experiment|evaluation|empirical|benchmark|ablation|finding|performance|case stud|analysis/, "results"],
  [
    /method|approach|\bmodel|architecture|framework|algorithm|proposed|design|implementation|setup|preliminar|formulation|theor|technique|training|dataset|data collection|materials/,
    "methods",
  ],
];

/** Map a section heading (e.g. "3 Proposed Method") to a semantic section type */
export function classifySection(title: string | null): SectionType {
  if (!title) return "other";
  const normalized = title
    .toLowerCase()
    .replace(/^(appendix\s+)?([a-z]|\d+|[ivxlc]+)(\.\d+)*[.:]?\s+/, "")
    .trim();
  for (const [pattern, type] of SECTION_RULES) {
    if (pattern.test(normalized)) return type;
  }
  return "other";
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

const SKIP_TAGS = new Set([
  "script", "style", "noscript", "nav", "header", "footer", "button", "img", "svg",
  "iframe", "form", "input", "select", "textarea", "template", "head",
]);

const SKIP_CLASSES = [
  "ltx_bibliography", "ltx_page_header", "ltx_page_footer", "ltx_authors", "ltx_dates",
  "ltx_TOC", "ltx_page_navbar", "ltx_role_footnote", "ltx_note_outer", "ltx_ERROR",
];

const BLOCK_TAGS = new Set([
  "p", "div", "section", "article", "main", "aside", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd", "table", "thead", "tbody", "tr", "figure",
  "figcaption", "blockquote", "pre", "br", "hr", "caption",
]);

const TOP_SECTION_CLASSES = ["ltx_section", "ltx_appendix", "ltx_abstract", "ltx_acknowledgements"];

/**
 * Accumulates plain text with collapsed whitespace and paragraph breaks.
 * Anchors/markers are resolved lazily to the offset of the next emitted text,
 * so they point at real content rather than at whitespace.
 */
class TextBuilder {
  private parts: string[] = [];
  length = 0;
  private lastChar = "\n";
  private pendingBreak = false;
  private pendingMarks: Array<(offset: number) => void> = [];

  append(raw: string) {
    let text = raw.replace(/\s+/g, " ");
    if (this.pendingBreak && text.trim()) {
      this.commitBreak();
    }
    if (this.lastChar === " " || this.lastChar === "\n") text = text.replace(/^ /, "");
    if (!text) return;
    if (this.pendingMarks.length > 0 && text.trim()) {
      const offset = this.length;
      this.pendingMarks.forEach((resolve) => resolve(offset));
      this.pendingMarks = [];
    }
    this.parts.push(text);
    this.length += text.length;
    this.lastChar = text[text.length - 1];
  }

  blockBreak() {
    if (this.length > 0) this.pendingBreak = true;
  }

  mark(resolve: (offset: number) => void) {
    this.pendingMarks.push(resolve);
  }

  private commitBreak() {
    this.pendingBreak = false;
    if (this.lastChar === " ") {
      const last = this.parts.length - 1;
      this.parts[last] = this.parts[last].slice(0, -1);
      this.length -= 1;
    }
    this.parts.push("\n\n");
    this.length += 2;
    this.lastChar = "\n";
  }

  toString() {
    return this.parts.join("");
  }
}

function hasAnyClass(el: HTMLElement, classes: string[]): boolean {
  return classes.some((c) => el.classList.contains(c));
}

function tagOf(el: HTMLElement): string {
  return (el.rawTagName || "").toLowerCase();
}

function mathText(el: HTMLElement): string {
  const alt = el.getAttribute("alttext");
  return alt ? ` $${alt}$ ` : ` ${el.text} `;
}

/** Plain text of an element (headings), with the same math/skip rules as the body */
function elementText(el: HTMLElement): string {
  const builder = new TextBuilder();
  walk(el, builder, () => {});
  return builder.toString().replace(/\s+/g, " ").trim();
}

function walk(node: Node, builder: TextBuilder, onElement: (el: HTMLElement) => void) {
  if (node.nodeType === 3) {
    builder.append(node.text);
    return;
  }
  if (node.nodeType !== 1) return;

  const el = node as HTMLElement;
  const tag = tagOf(el);
  if (SKIP_TAGS.has(tag) || hasAnyClass(el, SKIP_CLASSES)) return;
  if (tag === "math") {
    builder.append(mathText(el));
    return;
  }

  const isBlock = BLOCK_TAGS.has(tag);
  if (isBlock) builder.blockBreak();
  onElement(el);
  for (const child of el.childNodes) walk(child, builder, onElement);
  if (isBlock) builder.blockBreak();
  else if (tag === "td" || tag === "th") builder.append(" ");
}

function headingOf(section: HTMLElement): HTMLElement | null {
  for (const child of section.childNodes) {
    if (child.nodeType === 1 && /^h[1-6]$/.test(tagOf(child as HTMLElement))) {
      return child as HTMLElement;
    }
  }
  return null;
}

/** Extract plain text, section boundaries and anchors from paper HTML */
export function extractDocument(html: string): ExtractedDocument {
  const root = parse(html, {
    comment: false,
    blockTextElements: { script: false, style: false, noscript: false, pre: true },
  });
  const content =
    root.querySelector("article.ltx_document") ||
    root.querySelector("article") ||
    root.querySelector("main") ||
    root.querySelector("body") ||
    root;
  const isLatexml = !!content.querySelector(".ltx_section, .ltx_abstract");

  const builder = new TextBuilder();
  const markers: Array<{ offset: number; title: string | null; anchorId: string | null; type: SectionType }> = [];
  const anchors: Anchor[] = [];
  const subsections: Array<{ offset: number; title: string }> = [];

  walk(content, builder, (el) => {
    const tag = tagOf(el);
    const id = el.getAttribute("id");

    if (isLatexml && hasAnyClass(el, TOP_SECTION_CLASSES)) {
      const heading = headingOf(el);
      const title = heading ? elementText(heading) : el.classList.contains("ltx_abstract") ? "Abstract" : null;
      const type = el.classList.contains("ltx_abstract") ? "abstract" : classifySection(title);
      const marker = { offset: -1, title, anchorId: id || null, type };
      markers.push(marker);
      builder.mark((offset) => (marker.offset = offset));
    } else if (isLatexml && el.classList.contains("ltx_subsection")) {
      const heading = headingOf(el);
      if (heading) {
        const sub = { offset: -1, title: elementText(heading) };
        subsections.push(sub);
        builder.mark((offset) => (sub.offset = offset));
      }
    } else if (!isLatexml && /^h[1-3]$/.test(tag)) {
      const title = elementText(el);
      const marker = { offset: -1, title, anchorId: id || null, type: classifySection(title) };
      markers.push(marker);
      builder.mark((offset) => (marker.offset = offset));
    }

    if (id && BLOCK_TAGS.has(tag)) {
      const anchor = { offset: -1, id };
      anchors.push(anchor);
      builder.mark((offset) => (anchor.offset = offset));
    }
  });

  const text = builder.toString();
  const resolvedMarkers = markers.filter((m) => m.offset >= 0);
  const sections: DocumentSection[] = [];

  // Text before the first section (title block) is kept only if substantial
  const firstStart = resolvedMarkers.length > 0 ? resolvedMarkers[0].offset : text.length;
  if (firstStart > 0 && (resolvedMarkers.length === 0 || firstStart > 1200)) {
    sections.push({ type: "other", title: null, anchorId: null, start: 0, end: firstStart });
  }
  resolvedMarkers.forEach((marker, i) => {
    const end = i + 1 < resolvedMarkers.length ? resolvedMarkers[i + 1].offset : text.length;
    if (end > marker.offset) {
      sections.push({ type: marker.type, title: marker.title, anchorId: marker.anchorId, start: marker.offset, end });
    }
  });

  return {
    text,
    sections,
    anchors: anchors.filter((a) => a.offset >= 0),
    subsections: subsections.filter((s) => s.offset >= 0),
  };
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

function closestTo<T extends number>(values: T[], ideal: number): T | undefined {
  let best: T | undefined;
  for (const v of values) {
    if (best === undefined || Math.abs(v - ideal) < Math.abs(best - ideal)) best = v;
  }
  return best;
}

/** Choose where a chunk ends: paragraph break, else sentence end, else whitespace, closest to `ideal` */
function findBreak(text: string, lo: number, hi: number, ideal: number): number {
  const window = text.slice(lo, hi);
  const collect = (pattern: RegExp, offset: number) => {
    const positions: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(window)) !== null) positions.push(lo + match.index + offset);
    return positions;
  };

  // Don't break right after a heading-like line: it belongs with the text below it
  const endsAfterHeading = (pos: number) => {
    const blockStart = text.lastIndexOf("\n\n", pos - 1) + 2;
    return pos - blockStart < 100 && !/[.!?:]["')\]]?$/.test(text.slice(blockStart, pos));
  };
  const paragraph = closestTo(collect(/\n\n/g, 0).filter((pos) => !endsAfterHeading(pos)), ideal);
  if (paragraph !== undefined) return paragraph;
  const sentence = closestTo(collect(/[.!?]["')\]]?\s/g, 1), ideal);
  if (sentence !== undefined) return sentence;
  const space = closestTo(collect(/\s/g, 0), ideal);
  return space ?? hi;
}

/** Where the next chunk starts: a sentence (or word) start shortly after `from` */
function findOverlapStart(text: string, from: number, end: number): number {
  const window = text.slice(from, end);
  const sentence = window.match(/[.!?]["')\]]?\s+(?=\S)/);
  if (sentence && sentence.index! < window.length / 2) {
    return from + sentence.index! + sentence[0].length;
  }
  const word = window.match(/\s+(?=\S)/);
  return word ? from + word.index! + word[0].length : end;
}

function lastAtOrBefore<T extends { offset: number }>(items: T[], offset: number): T | undefined {
  let lo = 0;
  let hi = items.length - 1;
  let found: T | undefined;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid].offset <= offset) {
      found = items[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export interface ChunkDraftWithMeta extends ChunkDraft {
  subsectionTitle: string | null;
}

/** Split an extracted document into overlapping, section-aware chunks */
export function chunkDocument(
  doc: ExtractedDocument,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): ChunkDraftWithMeta[] {
  const { text } = doc;
  const targetChars = options.targetTokens * CHARS_PER_TOKEN;
  const minChars = options.minTokens * CHARS_PER_TOKEN;
  const maxChars = options.maxTokens * CHARS_PER_TOKEN;
  const overlapChars = options.overlapTokens * CHARS_PER_TOKEN;

  const chunks: ChunkDraftWithMeta[] = [];

  for (const section of doc.sections) {
    let cursor = section.start;
    let chunkIndex = 0;

    while (cursor < section.end) {
      const remaining = section.end - cursor;
      let end: number;
      if (remaining <= maxChars) {
        end = section.end;
      } else if (remaining < maxChars + minChars) {
        // Split the tail evenly instead of leaving a tiny last chunk
        const ideal = cursor + Math.floor(remaining / 2);
        end = findBreak(text, ideal - minChars / 4, ideal + minChars / 4, ideal);
      } else {
        end = findBreak(text, cursor + minChars, cursor + maxChars, cursor + targetChars);
      }

      // Trim whitespace while keeping offsets exact
      let start = cursor;
      while (start < end && /\s/.test(text[start])) start++;
      let trimmedEnd = end;
      while (trimmedEnd > start && /\s/.test(text[trimmedEnd - 1])) trimmedEnd--;

      if (trimmedEnd > start) {
        const content = text.slice(start, trimmedEnd);
        const anchor = lastAtOrBefore(doc.anchors, start);
        const subsection = lastAtOrBefore(doc.subsections, start);
        chunks.push({
          content,
          sectionType: section.type,
          sectionTitle: section.title,
          subsectionTitle:
            subsection && subsection.offset >= section.start ? subsection.title : null,
          anchorId:
            anchor && anchor.offset >= section.start ? anchor.id : section.anchorId,
          position: chunks.length,
          chunkIndex: chunkIndex++,
          startPosition: start,
          endPosition: trimmedEnd,
          tokenCount: estimateTokens(content),
        });
      }

      if (end >= section.end) break;
      const next = findOverlapStart(text, Math.max(cursor + 1, end - overlapChars), end);
      cursor = next > cursor ? next : end;
    }
  }

  return chunks;
}

/** Chunk paper HTML. Returns the extracted text too (hashed to detect content changes). */
export function chunkPaperHtml(html: string, options?: ChunkingOptions) {
  const doc = extractDocument(html);
  return { text: doc.text, chunks: chunkDocument(doc, options) };
}

/** Fallback when no HTML version exists: index the abstract alone */
export function chunkAbstract(abstract: string, options?: ChunkingOptions) {
  const text = abstract.replace(/\s+/g, " ").trim();
  const doc: ExtractedDocument = {
    text,
    sections: text ? [{ type: "abstract", title: "Abstract", anchorId: null, start: 0, end: text.length }] : [],
    anchors: [],
    subsections: [],
  };
  return { text, chunks: chunkDocument(doc, options) };
}
