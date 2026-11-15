export interface GlossaryTerm {
  /** Global kebab-case id, used as <Term id="…"> in lessons */
  id: string;
  term: string;
  aliases?: string[];
  /** One or two plain sentences; no Markdown */
  definition: string;
  /** Lesson that teaches the term */
  lesson: string;
}
