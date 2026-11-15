/**
 * Story articles (Story 8.6)
 *
 * When a story is opened, an AI-written article explains it in three parts:
 * what's happening, a per-source breakdown, and the bigger picture. The
 * article is grounded in the content of the story's items (numbered sources,
 * cited as [n]) and cached on the story until the story grows.
 */

import { db } from "@/lib/db";
import { generateStoryArticleStreaming, getLLMModelName, isLLMConfigured } from "@/lib/llm";
import { recordUsage } from "@/lib/billing/usage";
import { getEmbeddingConfig } from "@/lib/rag/embeddings";
import { cosineSimilarity, deserializeEmbedding } from "@/lib/rag/vector-search";
import { clusterThreshold } from "./clustering";
import { ensureItemContent } from "./content";
import type { ArticleStreamEvent, NewsCitation, RelatedLinks } from "./dto";
import { truncate } from "./normalize";
import { orderItems } from "./stories";
import { NEWS_SOURCE_LABELS, type NewsSourceId } from "./types";

const MAX_SOURCES = 12;
/** Items whose full content is fetched (the rest use their snippet) */
const MAX_CONTENT_SOURCES = 8;
const MAX_CHARS_PER_SOURCE = 2500;
const RELATED_LIMIT = 3;

/** Aggregator links (Google News) are JS redirects whose article text can't be fetched */
function hasFetchableContent(item: { url: string; content: string | null }): boolean {
  return !!item.content || !/^https:\/\/news\.google\.com\//.test(item.url);
}

/**
 * Sources for the article: the leading item of each platform, then items whose
 * text can be read, then headline-only coverage (still useful: it shows who
 * reported what). Readable items come first so they get the content budget.
 */
export function selectArticleSources<T extends { source: string; engagement: number; publishedAt: Date; url: string; content: string | null }>(
  items: T[],
  max = MAX_SOURCES
): T[] {
  const ordered = orderItems(items);
  const readable = ordered.filter(hasFetchableContent);
  const leaders = new Map<string, T>();
  [...readable, ...ordered].forEach((item) => {
    if (!leaders.has(item.source)) leaders.set(item.source, item);
  });
  const chosen = new Set<T>(Array.from(leaders.values()));
  readable.forEach((item) => chosen.add(item));
  ordered.forEach((item) => chosen.add(item));
  return Array.from(chosen)
    .slice(0, max)
    .sort((a, b) => Number(hasFetchableContent(b)) - Number(hasFetchableContent(a)));
}

export interface ArticleCacheState {
  article: string | null;
  articleItemCount: number | null;
  articleSourceCount: number | null;
  itemCount: number;
  sourceCount: number;
}

/** Regenerate once the story gained 2+ items or a new platform since the article was written */
export function isArticleStale(story: ArticleCacheState): boolean {
  if (!story.article) return true;
  return (
    story.itemCount - (story.articleItemCount ?? 0) >= 2 || story.sourceCount > (story.articleSourceCount ?? 0)
  );
}

function formatSource(citation: NewsCitation, content: string | null): string {
  const platform = NEWS_SOURCE_LABELS[citation.source];
  const where = citation.sourceName === platform ? platform : `${platform} · ${citation.sourceName}`;
  const stats = [
    citation.engagement > 0 ? `${citation.engagement} ${citation.source === "github" ? "stars" : "points"}` : null,
    citation.comments > 0 ? `${citation.comments} comments` : null,
    `${citation.publishedAt.slice(0, 16).replace("T", " ")} UTC`,
  ]
    .filter(Boolean)
    .join(", ");
  const body = content ? truncate(content.replace(/\n{3,}/g, "\n\n"), MAX_CHARS_PER_SOURCE) : "(no content available beyond the title)";
  return `[${citation.id}] ${where}: "${citation.title}" (${stats})\n${body}`;
}

async function findRelated(storyId: string, centroid: Uint8Array | null, embeddingModel: string | null): Promise<RelatedLinks> {
  const related: RelatedLinks = { stories: [], papers: [] };
  if (!centroid || !embeddingModel) return related;
  const vector = deserializeEmbedding(centroid);
  const threshold = clusterThreshold(embeddingModel);

  const others = await db.newsStory.findMany({
    where: { id: { not: storyId }, embeddingModel, centroid: { not: null } },
    orderBy: { lastSeenAt: "desc" },
    take: 500,
    select: { id: true, headline: true, lastSeenAt: true, centroid: true },
  });
  related.stories = others
    .map((s) => ({ s, similarity: cosineSimilarity(vector, deserializeEmbedding(s.centroid!)) }))
    .filter((r) => r.similarity >= threshold * 0.7)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, RELATED_LIMIT)
    .map(({ s }) => ({ id: s.id, headline: s.headline, lastSeenAt: s.lastSeenAt.toISOString() }));

  // Papers are compared through their abstract chunk (same embedding model only)
  if (getEmbeddingConfig().model === embeddingModel) {
    const abstracts = await db.paperChunk.findMany({
      where: { sectionType: "abstract", embeddingModel, embedding: { not: null } },
      select: { embedding: true, paper: { select: { id: true, title: true } } },
    });
    related.papers = abstracts
      .map((c) => ({ paper: c.paper, similarity: cosineSimilarity(vector, deserializeEmbedding(c.embedding!)) }))
      .filter((r) => r.similarity >= threshold * 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, RELATED_LIMIT)
      .map((r) => r.paper);
  }
  return related;
}

/** Citations, grounding text and related links for a story's article */
export async function buildArticleContext(storyId: string) {
  const story = await db.newsStory.findUnique({
    where: { id: storyId },
    select: {
      id: true,
      headline: true,
      summary: true,
      itemCount: true,
      sourceCount: true,
      centroid: true,
      embeddingModel: true,
      items: {
        select: {
          id: true,
          source: true,
          sourceName: true,
          externalId: true,
          title: true,
          url: true,
          canonicalUrl: true,
          discussionUrl: true,
          snippet: true,
          content: true,
          contentFetchedAt: true,
          engagement: true,
          comments: true,
          publishedAt: true,
        },
      },
    },
  });
  if (!story) return null;

  const selected = selectArticleSources(story.items);
  const contents = await ensureItemContent(selected.filter(hasFetchableContent).slice(0, MAX_CONTENT_SOURCES));

  const citations: NewsCitation[] = selected.map((item, i) => ({
    id: i + 1,
    itemId: item.id,
    source: item.source as NewsSourceId,
    sourceName: item.sourceName,
    title: item.title,
    url: item.url,
    discussionUrl: item.discussionUrl,
    engagement: item.engagement,
    comments: item.comments,
    publishedAt: item.publishedAt.toISOString(),
    excerpt: truncate((contents.get(item.id) ?? item.snippet ?? item.title).replace(/\s+/g, " "), 280),
  }));
  const sources = citations
    .map((c, i) => formatSource(c, contents.get(c.itemId) ?? selected[i].snippet))
    .join("\n\n");

  const related = await findRelated(story.id, story.centroid, story.embeddingModel);
  const relatedText = [
    ...related.stories.map((s) => `- Earlier story (${s.lastSeenAt.slice(0, 10)}): ${s.headline}`),
    ...related.papers.map((p) => `- Research paper: ${p.title}`),
  ].join("\n");

  return { story, citations, sources, related, relatedText };
}

/** Generations in progress, so concurrent opens of a story don't pay for the LLM twice */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Emits the article for a story: the cached version when fresh, otherwise a
 * newly generated one (streamed, then cached). Mock-mode articles are never cached.
 * While a story's article is being generated, other requests wait for it and
 * then receive the cached result.
 */
export async function streamStoryArticle(
  storyId: string,
  options: { regenerate?: boolean },
  emit: (event: ArticleStreamEvent) => void
): Promise<"cached" | "generated" | "not_found"> {
  const pending = inFlight.get(storyId);
  if (pending) {
    await pending.catch(() => undefined);
    return emitOrGenerate(storyId, { regenerate: false }, emit);
  }
  const run = emitOrGenerate(storyId, options, emit);
  inFlight.set(storyId, run);
  try {
    return await run;
  } finally {
    if (inFlight.get(storyId) === run) inFlight.delete(storyId);
  }
}

async function emitOrGenerate(
  storyId: string,
  options: { regenerate?: boolean },
  emit: (event: ArticleStreamEvent) => void
): Promise<"cached" | "generated" | "not_found"> {
  const cached = await db.newsStory.findUnique({
    where: { id: storyId },
    select: {
      article: true,
      articleCitations: true,
      articleItemCount: true,
      articleSourceCount: true,
      articleGeneratedAt: true,
      itemCount: true,
      sourceCount: true,
    },
  });
  if (!cached) return "not_found";

  const stale = isArticleStale(cached);
  if (cached.article && !options.regenerate && (!stale || !isLLMConfigured())) {
    const { citations, related } = (cached.articleCitations ?? { citations: [], related: { stories: [], papers: [] } }) as {
      citations: NewsCitation[];
      related: RelatedLinks;
    };
    emit({ citations, related, cached: true, generatedAt: cached.articleGeneratedAt?.toISOString(), stale });
    emit({ chunk: cached.article });
    return "cached";
  }

  const context = await buildArticleContext(storyId);
  if (!context) return "not_found";
  emit({ citations: context.citations, related: context.related, cached: false });

  let article = "";
  await generateStoryArticleStreaming(
    {
      headline: context.story.headline,
      summary: context.story.summary,
      sources: context.sources,
      related: context.relatedText || undefined,
      now: new Date(),
    },
    (chunk) => {
      article += chunk;
      emit({ chunk });
    },
    // Articles are cached and shared by all readers: platform cost, not charged
    (usage) => void recordUsage({ feature: "story-article", billing: "PLATFORM", usage })
  );

  if (isLLMConfigured() && article.trim()) {
    await db.newsStory.update({
      where: { id: storyId },
      data: {
        article: article.trim(),
        articleCitations: { citations: context.citations, related: context.related } as object,
        articleItemCount: context.story.itemCount,
        articleSourceCount: context.story.sourceCount,
        articleGeneratedAt: new Date(),
        articleModel: getLLMModelName(),
      },
    });
  }
  return "generated";
}
