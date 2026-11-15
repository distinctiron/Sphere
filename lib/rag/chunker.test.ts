import { describe, it, expect } from "vitest";
import {
  chunkAbstract,
  chunkDocument,
  chunkPaperHtml,
  classifySection,
  extractDocument,
  CHARS_PER_TOKEN,
  DEFAULT_CHUNKING_OPTIONS,
} from "./chunker";

/** A sentence of ~100 characters, numbered so chunks can be told apart */
function sentence(i: number): string {
  return `Sentence number ${i} describes the proposed confidence estimator and its effect on reasoning length. `;
}

function paragraph(start: number, count: number): string {
  return Array.from({ length: count }, (_, i) => sentence(start + i)).join("");
}

function latexmlPaper(): string {
  let pid = 0;
  const para = (sectionId: string, text: string) =>
    `<div id="${sectionId}.p${++pid}" class="ltx_para"><p class="ltx_p">${text}</p></div>`;

  return `<!DOCTYPE html><html><head><title>Paper</title><style>.x{color:red}</style></head>
<body>
<header class="arxiv-html-header"><nav>arXiv navigation</nav></header>
<article class="ltx_document">
  <h1 class="ltx_title ltx_title_document">Teaching Confidence</h1>
  <div class="ltx_authors">Jane Doe, John Smith</div>
  <div id="abstract1" class="ltx_abstract"><h6 class="ltx_title">Abstract</h6>
    <p class="ltx_p">We study reasoning efficiency with an estimate <math alttext="c_{t}\\geq 0.95" class="ltx_Math"><mi>c</mi><mo>≥</mo><mn>0.95</mn></math> of confidence.</p>
  </div>
  <section id="S1" class="ltx_section">
    <h2 class="ltx_title ltx_title_section"><span class="ltx_tag">1 </span>Introduction</h2>
    ${para("S1", paragraph(0, 20))}
    ${para("S1", paragraph(20, 20))}
  </section>
  <section id="S2" class="ltx_section">
    <h2 class="ltx_title ltx_title_section"><span class="ltx_tag">2 </span>Method</h2>
    ${para("S2", paragraph(100, 30))}
    <section id="S2.SS1" class="ltx_subsection">
      <h3 class="ltx_title ltx_title_subsection">2.1 Estimator</h3>
      ${para("S2.SS1", paragraph(200, 40))}
    </section>
  </section>
  <section id="S3" class="ltx_section">
    <h2 class="ltx_title ltx_title_section"><span class="ltx_tag">3 </span>Experiments</h2>
    ${para("S3", paragraph(300, 15))}
  </section>
  <section id="S4" class="ltx_section">
    <h2 class="ltx_title ltx_title_section"><span class="ltx_tag">4 </span>Conclusion</h2>
    ${para("S4", "We conclude that confidence supervision shortens reasoning.")}
  </section>
  <section id="bib" class="ltx_bibliography">
    <h2 class="ltx_title">References</h2>
    <ul><li>BIBLIOGRAPHY ENTRY SHOULD NOT APPEAR</li></ul>
  </section>
</article>
<footer class="arxiv-html-footer">Footer text</footer>
<script>var shouldNotAppear = 1;</script>
</body></html>`;
}

describe("classifySection", () => {
  it.each([
    ["1 Introduction", "introduction"],
    ["3 Proposed Method", "methods"],
    ["5.1 Experimental Setup", "methods"],
    ["5 Experiments", "results"],
    ["6 Discussion and Limitations", "discussion"],
    ["7 Conclusion and Future Work", "conclusion"],
    ["2 Related Work", "other"],
    ["IV Results and Discussion", "results"],
    ["VI Conclusions", "conclusion"],
    ["Introduction", "introduction"],
    ["Appendix B Additional Results", "results"],
    [null, "other"],
  ])("%s → %s", (title, expected) => {
    expect(classifySection(title)).toBe(expected);
  });
});

describe("extractDocument", () => {
  const doc = extractDocument(latexmlPaper());

  it("identifies semantic sections in order", () => {
    expect(doc.sections.map((s) => [s.type, s.title, s.anchorId])).toEqual([
      ["abstract", "Abstract", "abstract1"],
      ["introduction", "1 Introduction", "S1"],
      ["methods", "2 Method", "S2"],
      ["results", "3 Experiments", "S3"],
      ["conclusion", "4 Conclusion", "S4"],
    ]);
  });

  it("keeps math as LaTeX and drops page chrome, scripts and bibliography", () => {
    expect(doc.text).toContain("$c_{t}\\geq 0.95$");
    expect(doc.text).not.toContain("arXiv navigation");
    expect(doc.text).not.toContain("Footer text");
    expect(doc.text).not.toContain("shouldNotAppear");
    expect(doc.text).not.toContain("BIBLIOGRAPHY ENTRY");
    expect(doc.text).not.toContain("Jane Doe");
  });

  it("separates block elements with paragraph breaks and collapses whitespace", () => {
    expect(doc.text).toContain("1 Introduction\n\nSentence number 0");
    expect(doc.text).not.toMatch(/ {2,}/);
  });

  it("records subsections and anchors at the offset of their text", () => {
    const sub = doc.subsections.find((s) => s.title === "2.1 Estimator");
    expect(sub).toBeDefined();
    expect(doc.text.slice(sub!.offset)).toMatch(/^2\.1 Estimator/);
    const anchor = doc.anchors.find((a) => a.id === "S1.p1");
    expect(doc.text.slice(anchor!.offset)).toMatch(/^Sentence number 0 /);
  });

  it("falls back to generic headings for non-LaTeXML HTML", () => {
    const generic = extractDocument(
      `<html><body><main><h2 id="intro">Introduction</h2><p>${paragraph(0, 3)}</p><h2 id="res">Results</h2><p>${paragraph(3, 3)}</p></main></body></html>`
    );
    expect(generic.sections.map((s) => [s.type, s.anchorId])).toEqual([
      ["introduction", "intro"],
      ["results", "res"],
    ]);
  });
});

describe("chunkDocument", () => {
  const doc = extractDocument(latexmlPaper());
  const chunks = chunkDocument(doc);
  const maxChars = DEFAULT_CHUNKING_OPTIONS.maxTokens * CHARS_PER_TOKEN;

  it("produces chunks whose content is the exact slice at their positions", () => {
    expect(chunks.length).toBeGreaterThan(5);
    for (const chunk of chunks) {
      expect(doc.text.slice(chunk.startPosition, chunk.endPosition)).toBe(chunk.content);
      expect(chunk.content).toBe(chunk.content.trim());
    }
  });

  it("never exceeds the maximum chunk size", () => {
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(maxChars);
      expect(chunk.tokenCount).toBeLessThanOrEqual(DEFAULT_CHUNKING_OPTIONS.maxTokens);
    }
  });

  it("keeps long sections' chunks within the 500-1000 token target (except short sections)", () => {
    const methods = chunks.filter((c) => c.sectionType === "methods");
    expect(methods.length).toBeGreaterThan(1);
    for (const chunk of methods) {
      expect(chunk.tokenCount).toBeGreaterThanOrEqual(DEFAULT_CHUNKING_OPTIONS.minTokens * 0.5);
    }
  });

  it("overlaps adjacent chunks within a section by roughly 50-100 tokens", () => {
    const methods = chunks.filter((c) => c.sectionType === "methods");
    for (let i = 1; i < methods.length; i++) {
      const overlap = methods[i - 1].endPosition - methods[i].startPosition;
      expect(overlap).toBeGreaterThan(0);
      expect(overlap / CHARS_PER_TOKEN).toBeLessThanOrEqual(100);
    }
  });

  it("does not let chunks cross section boundaries", () => {
    for (const chunk of chunks) {
      const section = doc.sections.find((s) => s.type === chunk.sectionType && s.title === chunk.sectionTitle)!;
      expect(chunk.startPosition).toBeGreaterThanOrEqual(section.start);
      expect(chunk.endPosition).toBeLessThanOrEqual(section.end);
    }
  });

  it("numbers chunks globally and within each section", () => {
    expect(chunks.map((c) => c.position)).toEqual(chunks.map((_, i) => i));
    const bySection = new Map<string, number[]>();
    chunks.forEach((c) => bySection.set(c.sectionTitle ?? "", [...(bySection.get(c.sectionTitle ?? "") ?? []), c.chunkIndex]));
    bySection.forEach((indexes) => expect(indexes).toEqual(indexes.map((_, i) => i)));
  });

  it("attaches the nearest paragraph anchor and subsection", () => {
    const estimatorChunk = chunks.find((c) => c.content.includes("Sentence number 230"))!;
    expect(estimatorChunk.subsectionTitle).toBe("2.1 Estimator");
    expect(estimatorChunk.anchorId).toMatch(/^S2\.SS1/);
    expect(chunks[0].anchorId).toBe("abstract1");
  });

  it("ends chunks on sentence boundaries when possible", () => {
    const methods = chunks.filter((c) => c.sectionType === "methods");
    for (const chunk of methods.slice(0, -1)) {
      expect(chunk.content).toMatch(/[.!?]$/);
    }
  });
});

describe("chunkPaperHtml / chunkAbstract", () => {
  it("returns text and chunks together", () => {
    const { text, chunks } = chunkPaperHtml(latexmlPaper());
    expect(text.length).toBeGreaterThan(1000);
    expect(chunks[0].sectionType).toBe("abstract");
  });

  it("indexes an abstract as a single abstract chunk", () => {
    const { chunks } = chunkAbstract("  We propose   a method.\n It works.  ");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ sectionType: "abstract", content: "We propose a method. It works.", position: 0 });
  });

  it("returns no chunks for empty content", () => {
    expect(chunkAbstract("   ").chunks).toEqual([]);
  });
});
