import { db } from "@/lib/db";
import { allLessonMetas, getLessonMeta } from "./content";
import { createLessonMatcher, lessonsForText, rankByKeywords } from "./feed-match";

/** Links between lessons and the user's News stories and papers (Story 9.5) */

const FEED_WINDOW_DAYS = 7;

export interface LessonFeedStory {
  id: string;
  headline: string;
  lastSeenAt: string;
  isBreaking: boolean;
  keywords: string[];
}

export interface LessonFeedPaper {
  id: string;
  title: string;
  inLibrary: boolean;
  keywords: string[];
}

export interface LessonFeed {
  stories: LessonFeedStory[];
  papers: LessonFeedPaper[];
}

async function recentStories(userId: string) {
  const since = new Date(Date.now() - FEED_WINDOW_DAYS * 86_400_000);
  return db.newsStory.findMany({
    where: {
      status: "ACTIVE",
      lastSeenAt: { gte: since },
      NOT: { userStates: { some: { userId, status: "DISMISSED" } } },
    },
    orderBy: { heatScore: "desc" },
    take: 400,
    select: { id: true, headline: true, summary: true, whyItMatters: true, lastSeenAt: true, isBreaking: true },
  });
}

async function candidatePapers(userId: string) {
  const [library, recent] = await Promise.all([
    db.userPaperState.findMany({
      where: { userId, inLibrary: true },
      select: { paper: { select: { id: true, title: true, abstract: true } } },
      take: 200,
    }),
    db.paper.findMany({
      where: { NOT: { userStates: { some: { userId, status: "DISMISSED" } } } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, title: true, abstract: true },
    }),
  ]);
  const libraryIds = new Set(library.map((s) => s.paper.id));
  const papers = [...library.map((s) => s.paper), ...recent.filter((p) => !libraryIds.has(p.id))];
  return papers.map((p) => ({ ...p, inLibrary: libraryIds.has(p.id) }));
}

export async function getLessonFeed(lessonId: string, userId: string, limit = 5): Promise<LessonFeed> {
  const meta = getLessonMeta(lessonId);
  if (!meta) return { stories: [], papers: [] };
  const [stories, papers] = await Promise.all([recentStories(userId), candidatePapers(userId)]);

  const rankedStories = rankByKeywords(
    meta.keywords,
    stories.map((s) => ({ ...s, title: s.headline, body: [s.summary, s.whyItMatters].filter(Boolean).join(" ") })),
    2
  );
  const rankedPapers = rankByKeywords(
    meta.keywords,
    papers.map((p) => ({ ...p, body: p.abstract })),
    2
  ).sort((a, b) => Number(b.item.inLibrary) - Number(a.item.inLibrary) || b.score - a.score);

  return {
    stories: rankedStories.slice(0, limit).map(({ item, keywords }) => ({
      id: item.id,
      headline: item.headline,
      lastSeenAt: item.lastSeenAt.toISOString(),
      isBreaking: item.isBreaking,
      keywords,
    })),
    papers: rankedPapers.slice(0, limit).map(({ item, keywords }) => ({
      id: item.id,
      title: item.title,
      inLibrary: item.inLibrary,
      keywords,
    })),
  };
}

/** Keywords that occur in more than `share` of the texts */
function commonKeywords(keywords: string[], texts: string[], share: number): Set<string> {
  const common = new Set<string>();
  if (texts.length < 10) return common;
  for (const keyword of Array.from(new Set(keywords))) {
    const matcher = createLessonMatcher([keyword]);
    const hits = texts.filter((t) => matcher.matches(t).length > 0).length;
    if (hits / texts.length > share) common.add(keyword);
  }
  return common;
}

export interface TrendingLesson {
  lessonId: string;
  storyCount: number;
  topStory: { id: string; headline: string };
}

/** Lessons ranked by how many of this week's stories they explain ("In your feed this week") */
export async function getTrendingLessons(userId: string, limit = 6): Promise<TrendingLesson[]> {
  const stories = await recentStories(userId);
  const texts = stories.map((s) => `${s.headline} ${[s.summary, s.whyItMatters].filter(Boolean).join(" ")}`);
  // Keywords found in a large share of the week's stories (lab names, "GPU") say little
  // about which lesson a story needs, so they don't count towards trending
  const common = commonKeywords(allLessonMetas().flatMap((m) => m.keywords), texts, 0.1);
  const lessons = allLessonMetas().map((m) => ({ id: m.id, keywords: m.keywords.filter((k) => !common.has(k)) }));
  const counts = new Map<string, { count: number; top: { id: string; headline: string } }>();
  for (const story of stories) {
    const body = [story.summary, story.whyItMatters].filter(Boolean).join(" ");
    for (const match of lessonsForText(lessons, story.headline, body, 2)) {
      const entry = counts.get(match.id);
      if (entry) entry.count++;
      else counts.set(match.id, { count: 1, top: { id: story.id, headline: story.headline } });
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([lessonId, { count, top }]) => ({ lessonId, storyCount: count, topStory: top }));
}

/** Background lessons for a news story (shown on the story article page) */
export function getBackgroundLessons(headline: string, summary: string | null, limit = 3) {
  return lessonsForText(allLessonMetas(), headline, summary, limit).map((m) => {
    const meta = getLessonMeta(m.id)!;
    return { id: meta.id, code: meta.ref.code, title: meta.title, path: meta.ref.path.id };
  });
}
