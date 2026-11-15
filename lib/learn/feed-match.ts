/**
 * Keyword matching between lessons and feed items (News stories, papers).
 * Pure functions; database access lives in lib/learn/feed.ts.
 */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Short all-caps acronyms (GPU, RAG, TPU, MoE…) are matched case-sensitively so "rag" ≠ "RAG" */
function isAcronym(keyword: string): boolean {
  return /^[A-Za-z0-9]{2,5}$/.test(keyword) && (keyword.match(/[A-Z]/g)?.length ?? 0) >= 2;
}

export interface KeywordMatcher {
  /** Distinct keywords found in the text */
  matches(text: string): string[];
}

export function createLessonMatcher(keywords: string[]): KeywordMatcher {
  const patterns = keywords.map((k) => ({
    keyword: k,
    re: new RegExp(`(^|[^A-Za-z0-9])${escape(k)}(?![A-Za-z0-9])`, isAcronym(k) ? "" : "i"),
  }));
  return { matches: (text) => patterns.filter((p) => p.re.test(text)).map((p) => p.keyword) };
}

export interface MatchCandidate {
  id: string;
  /** Headline or paper title: a hit here counts double */
  title: string;
  body?: string | null;
}

export interface ScoredMatch<T extends MatchCandidate> {
  item: T;
  score: number;
  keywords: string[];
}

/** Scores candidates against a lesson's keywords; drops non-matches; best first (stable) */
export function rankByKeywords<T extends MatchCandidate>(keywords: string[], candidates: T[], minScore = 1): ScoredMatch<T>[] {
  const matcher = createLessonMatcher(keywords);
  return candidates
    .map((item) => {
      const inTitle = matcher.matches(item.title);
      const inBody = item.body ? matcher.matches(item.body).filter((k) => !inTitle.includes(k)) : [];
      return { item, score: inTitle.length * 2 + inBody.length, keywords: [...inTitle, ...inBody] };
    })
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

export interface LessonKeywords {
  id: string;
  keywords: string[];
}

/** Lessons most relevant to a piece of text (e.g. a news story), best first */
export function lessonsForText(lessons: LessonKeywords[], title: string, body: string | null, limit = 3, minScore = 2) {
  return lessons
    .map((lesson) => ({ lesson, ...rankByKeywords(lesson.keywords, [{ id: lesson.id, title, body }], minScore)[0] }))
    .filter((m) => m.score !== undefined)
    .sort((a, b) => b.score! - a.score! || 0)
    .slice(0, limit)
    .map((m) => ({ id: m.lesson.id, score: m.score!, keywords: m.keywords! }));
}
