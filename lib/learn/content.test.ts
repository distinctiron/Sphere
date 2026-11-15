import fs from "fs";
import path from "path";
import { describe, it, expect } from "vitest";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { GLOSSARY } from "@/content/learn/glossary";
import { FIGURE_SOURCES } from "@/components/learn/figures/registry";
import { AI_LEARN_TOPIC, allLessonRefs, getLessonRef } from "./curriculum";
import { CONTENT_DIR, getLessonSource, lessonFile, lessonPlainText, validateLesson } from "./content";

/**
 * Content validation for the Learn tab (Epic 9): run with `npx vitest run lib/learn`.
 * Every written lesson must compile and pass the structural rules in content/learn/AUTHORING.md.
 */

const refs = allLessonRefs();
const written = refs.filter((r) => fs.existsSync(lessonFile(r)));
const figureNames = new Set(Object.values(FIGURE_SOURCES).flatMap((loaders) => Object.keys(loaders)));
const termIds = new Set(GLOSSARY.map((t) => t.id));

describe("curriculum registry", () => {
  it("has 43 uniquely identified lessons across four paths", () => {
    expect(AI_LEARN_TOPIC.paths).toHaveLength(4);
    expect(refs).toHaveLength(43);
    expect(new Set(refs.map((r) => r.id)).size).toBe(43);
  });

  it("has a file for every lesson, and no stray lesson files", () => {
    const missing = refs.filter((r) => !fs.existsSync(lessonFile(r))).map((r) => `${r.code} ${r.path.id}/${r.id}.mdx`);
    expect(missing).toEqual([]);
    const files = fs
      .readdirSync(CONTENT_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "glossary")
      .flatMap((d) => fs.readdirSync(path.join(CONTENT_DIR, d.name)).filter((f) => f.endsWith(".mdx")).map((f) => `${d.name}/${f}`));
    const stray = files.filter((f) => {
      const ref = getLessonRef(path.basename(f, ".mdx"));
      return !ref || `${ref.path.id}/${ref.id}.mdx` !== f;
    });
    expect(stray).toEqual([]);
  });

  it("has unique figure names across paths", () => {
    const all = Object.values(FIGURE_SOURCES).flatMap((loaders) => Object.keys(loaders));
    expect(all.length).toBe(new Set(all).size);
  });
});

describe("glossary", () => {
  it("has unique ids, known lessons and plain-text definitions", () => {
    expect(GLOSSARY.length).toBe(termIds.size);
    for (const term of GLOSSARY) {
      expect(getLessonRef(term.lesson), `${term.id}: unknown lesson ${term.lesson}`).toBeDefined();
      expect(term.id).toMatch(/^[a-z0-9-]+$/);
      expect(term.definition.length, term.id).toBeGreaterThan(20);
      expect(term.definition, term.id).not.toMatch(/\*\*|\[\[|`/);
    }
  });
});

describe("buildsOn graph", () => {
  it("is acyclic", () => {
    const graph = new Map(written.map((r) => [r.id, getLessonSource(r.id)!.meta.buildsOn]));
    const state = new Map<string, "visiting" | "done">();
    const cycles: string[] = [];
    const visit = (id: string, trail: string[]) => {
      if (state.get(id) === "done") return;
      if (state.get(id) === "visiting") {
        cycles.push([...trail, id].join(" → "));
        return;
      }
      state.set(id, "visiting");
      for (const dep of graph.get(id) ?? []) visit(dep, [...trail, id]);
      state.set(id, "done");
    };
    for (const id of Array.from(graph.keys())) visit(id, []);
    expect(cycles).toEqual([]);
  });
});

describe.each(written.map((r) => [`${r.code} ${r.id}`, r.id]))("lesson %s", (_label, id) => {
  const source = getLessonSource(id)!;

  it("follows the structural rules", () => {
    expect(validateLesson(source, figureNames, termIds)).toEqual([]);
  });

  it("compiles as MDX with math", async () => {
    await expect(
      compile(source.body, { remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [rehypeKatex] })
    ).resolves.toBeDefined();
  });

  it("has a readable plain-text version for the tutor", () => {
    const text = lessonPlainText(source.body);
    expect(text.length).toBeGreaterThan(2000);
    expect(text).not.toMatch(/<[A-Z][A-Za-z]+/);
  });
});
