import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import {
  allLessonRefs,
  getLessonRef,
  getMentalModel,
  isEarlierLesson,
  type LessonRef,
} from "./curriculum";
import { LessonFrontmatterSchema, type LessonFrontmatter } from "./schema";

/**
 * Server-only access to lesson files (content/learn/<path>/<lesson>.mdx):
 * frontmatter, raw MDX body, plain text for the tutor, and the
 * cross-references derived from them (leads-to, prev/next).
 */

export const CONTENT_DIR = path.join(process.cwd(), "content", "learn");

export interface LessonMeta extends LessonFrontmatter {
  ref: LessonRef;
  file: string;
}

export interface LessonSource {
  meta: LessonMeta;
  body: string;
}

export function lessonFile(ref: LessonRef): string {
  return path.join(CONTENT_DIR, ref.path.id, `${ref.id}.mdx`);
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseLessonFile(raw: string, file: string): { frontmatter: LessonFrontmatter; body: string } {
  const match = raw.match(FRONTMATTER);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  const parsed = LessonFrontmatterSchema.safeParse(parseYaml(match[1]));
  if (!parsed.success) {
    throw new Error(`${file}: invalid frontmatter: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
  return { frontmatter: parsed.data, body: raw.slice(match[0].length) };
}

const cache = new Map<string, { mtimeMs: number; source: LessonSource }>();

/** Lesson source, or null when the lesson has not been written yet */
export function getLessonSource(id: string): LessonSource | null {
  const ref = getLessonRef(id);
  if (!ref) return null;
  const file = lessonFile(ref);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return null;
  }
  const hit = cache.get(id);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.source;

  const { frontmatter, body } = parseLessonFile(fs.readFileSync(file, "utf8"), file);
  if (frontmatter.id !== id) throw new Error(`${file}: frontmatter id "${frontmatter.id}" does not match "${id}"`);
  const source = { meta: { ...frontmatter, ref, file }, body };
  cache.set(id, { mtimeMs: stat.mtimeMs, source });
  return source;
}

/**
 * Like getLessonSource, but a malformed lesson file is logged and treated as
 * missing, so one bad file can't take down every Learn page. The content
 * tests call getLessonSource directly and still fail loudly.
 */
export function safeLessonSource(id: string): LessonSource | null {
  try {
    return getLessonSource(id);
  } catch (error) {
    console.error(`[learn] skipping lesson "${id}": ${(error as Error).message}`);
    return null;
  }
}

export function getLessonMeta(id: string): LessonMeta | null {
  return safeLessonSource(id)?.meta ?? null;
}

/** Metadata of every written lesson, in suggested-route order */
export function allLessonMetas(): LessonMeta[] {
  return allLessonRefs()
    .map((ref) => getLessonMeta(ref.id))
    .filter((m): m is LessonMeta => m !== null);
}

/** Lessons that list `id` in buildsOn ("Where this comes back") */
export function getLeadsTo(id: string): LessonMeta[] {
  return allLessonMetas().filter((m) => m.buildsOn.includes(id));
}

/** Lessons that list `id` as related, plus the lesson's own related list (deduplicated) */
export function getRelated(id: string): LessonMeta[] {
  const own = getLessonMeta(id)?.related ?? [];
  const ids = new Set([...own, ...allLessonMetas().filter((m) => m.related.includes(id)).map((m) => m.id)]);
  ids.delete(id);
  return Array.from(ids)
    .map((r) => getLessonMeta(r))
    .filter((m): m is LessonMeta => m !== null)
    .sort((a, b) => a.ref.order - b.ref.order);
}

/** Previous/next lesson within the same path */
export function getPrevNext(id: string): { prev: LessonRef | null; next: LessonRef | null } {
  const ref = getLessonRef(id);
  if (!ref) return { prev: null, next: null };
  const siblings = allLessonRefs().filter((r) => r.path.id === ref.path.id);
  return { prev: siblings[ref.index - 1] ?? null, next: siblings[ref.index + 1] ?? null };
}

// ---------------------------------------------------------------------------
// References inside MDX bodies
// ---------------------------------------------------------------------------

export interface BodyRefs {
  recalls: string[];
  previews: string[];
  lessonLinks: string[];
  terms: string[];
  figures: string[];
  headings: string[];
}

const attr = (tag: string, name: string) => new RegExp(`<${tag}\\b[^>]*?\\b${name}="([^"]+)"`, "g");
const collect = (body: string, re: RegExp) => Array.from(body.matchAll(re), (m) => m[1]);

export function extractBodyRefs(body: string): BodyRefs {
  return {
    recalls: collect(body, attr("Recall", "id")),
    previews: collect(body, attr("Preview", "id")),
    lessonLinks: collect(body, attr("LessonLink", "id")),
    terms: collect(body, attr("Term", "id")),
    figures: collect(body, attr("Figure", "name")),
    headings: collect(body, /^##\s+(.+?)\s*$/gm),
  };
}

/** Section headings every lesson must have (see content/learn/AUTHORING.md) */
export const REQUIRED_SECTIONS = ["The picture", "Reason with it", "Where this picture breaks", "Recap"] as const;

/**
 * Structural problems with a lesson's cross-references and sections.
 * Used by the content tests; an empty list means the lesson is well-formed.
 */
export function validateLesson(source: LessonSource, knownFigures: Set<string>, knownTerms: Set<string>): string[] {
  const { meta, body } = source;
  const problems: string[] = [];
  const refs = extractBodyRefs(body);
  const exists = (id: string) => !!getLessonRef(id);

  if (!getMentalModel(meta.model)) problems.push(`unknown mental model "${meta.model}"`);
  for (const id of [...meta.buildsOn, ...meta.related]) if (!exists(id)) problems.push(`unknown lesson "${id}" in frontmatter`);
  for (const id of meta.buildsOn) if (id === meta.id) problems.push("lesson builds on itself");
  for (const id of meta.buildsOn) {
    const target = getLessonRef(id);
    if (target && target.path.id === meta.ref.path.id && target.index > meta.ref.index) {
      problems.push(`buildsOn "${id}" comes later in the same path`);
    }
  }
  for (const id of [...refs.lessonLinks, ...refs.previews]) if (!exists(id)) problems.push(`unknown lesson "${id}" in body`);
  for (const id of refs.recalls) {
    if (!exists(id)) problems.push(`<Recall> of unknown lesson "${id}"`);
    else if (!meta.buildsOn.includes(id) && !(meta.related.includes(id) && isEarlierLesson(id, meta.id))) {
      problems.push(`<Recall id="${id}"> must target a buildsOn lesson or an earlier related lesson`);
    }
  }
  for (const id of meta.buildsOn) if (!refs.recalls.includes(id)) problems.push(`buildsOn "${id}" is never recalled in the body`);
  for (const id of refs.previews) {
    if (isEarlierLesson(id, meta.id) || meta.buildsOn.includes(id)) problems.push(`<Preview id="${id}"> points backwards; use <Recall>`);
  }
  for (const name of refs.figures) if (!knownFigures.has(name)) problems.push(`unknown figure "${name}"`);
  for (const term of refs.terms) if (!knownTerms.has(term)) problems.push(`unknown glossary term "${term}"`);
  for (const section of REQUIRED_SECTIONS) {
    if (!refs.headings.includes(section)) problems.push(`missing "## ${section}" section`);
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Plain text (tutor context)
// ---------------------------------------------------------------------------

function attrValue(tag: string, name: string): string | undefined {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

/** Lesson body as readable plain text: components replaced by their meaning, markup removed */
export function lessonPlainText(body: string): string {
  return body
    .replace(/^import .*$/gm, "")
    .replace(/<Figure\b[^>]*\/>/g, (tag) => {
      const title = attrValue(tag, "title");
      const caption = attrValue(tag, "caption");
      return `\n[Figure${title ? `: ${title}` : ""}${caption ? ` — ${caption}` : ""}]\n`;
    })
    .replace(/<(Recall|Preview|LessonLink)\b[^>]*\bid="([^"]+)"[^>]*\/>/g, (_m, _t, id) => {
      const ref = getLessonRef(id);
      return ref ? `${ref.code} (${id})` : id;
    })
    .replace(/<(Recall|Preview)\b[^>]*\bid="([^"]+)"[^>]*>/g, (_m, tag, id) => {
      const ref = getLessonRef(id);
      return `[${tag === "Recall" ? "Recall" : "Preview"} ${ref ? ref.code : id}: `;
    })
    .replace(/<\/(Recall|Preview)>/g, "]")
    .replace(/<\/?[A-Z][A-Za-z]*\b[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
