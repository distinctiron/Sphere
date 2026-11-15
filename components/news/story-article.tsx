"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { citedIdsIn } from "@/lib/rag/citation-text";
import type { ArticleStreamEvent, NewsCitation, RelatedLinks, StoryDTO, StoryItemDTO } from "@/lib/news/dto";
import { engagementLabel, timeAgo } from "@/lib/news/format";
import { NEWS_SOURCE_LABELS, type NewsSourceId } from "@/lib/news/types";
import { ArticleMarkdown } from "./article-markdown";
import { AppHeader } from "@/components/sketch/app-header";
import { BrushTag, SketchCard, SketchFrame } from "@/components/sketch";
import { SourceGlyph } from "./source-badge";
import {
  BookmarkIcon,
  BreakingMark,
  CapIcon,
  CrossIcon,
  HandUnderline,
  NewspaperIcon,
  PaperIcon,
  ScribbleSkeleton,
  SparkleIcon,
} from "./sketch-icons";
import { SourceChips, StoryItemRow } from "./story-card";

type ArticleStatus = "loading" | "streaming" | "done" | "error";

interface ArticleState {
  status: ArticleStatus;
  text: string;
  citations: NewsCitation[];
  related: RelatedLinks;
  cached: boolean;
  stale: boolean;
  generatedAt?: string;
  error?: string;
}

const INITIAL: ArticleState = {
  status: "loading",
  text: "",
  citations: [],
  related: { stories: [], papers: [] },
  cached: false,
  stale: false,
};

/** Reads the article SSE stream into state */
function useStoryArticle(storyId: string) {
  const [state, setState] = useState<ArticleState>(INITIAL);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const regenerate = generation > 0;
    setState({ ...INITIAL });

    (async () => {
      try {
        const response = await fetch(`/api/news/stories/${storyId}/article${regenerate ? "?regenerate=true" : ""}`, {
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            const data = event.replace(/^data: /, "");
            if (data === "[DONE]") {
              setState((s) => ({ ...s, status: "done" }));
              continue;
            }
            const payload = JSON.parse(data) as ArticleStreamEvent;
            if ("citations" in payload) {
              setState((s) => ({
                ...s,
                status: "streaming",
                citations: payload.citations,
                related: payload.related,
                cached: payload.cached,
                stale: payload.stale ?? false,
                generatedAt: payload.generatedAt,
              }));
            } else if ("chunk" in payload) {
              setState((s) => ({ ...s, text: s.text + payload.chunk }));
            } else if ("error" in payload) {
              setState((s) => ({ ...s, status: "error", error: payload.error }));
            }
          }
        }
        setState((s) => (s.status === "streaming" ? { ...s, status: "done" } : s));
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Error loading story article:", error);
        setState((s) => ({ ...s, status: "error", error: "The article couldn't be loaded. The sources are listed alongside." }));
      }
    })();

    return () => controller.abort();
  }, [storyId, generation]);

  const regenerate = useCallback(() => setGeneration((g) => g + 1), []);
  return { ...state, regenerate };
}

function groupByPlatform(items: StoryItemDTO[]): Array<[NewsSourceId, StoryItemDTO[]]> {
  const groups = new Map<NewsSourceId, StoryItemDTO[]>();
  items.forEach((item) => groups.set(item.source, [...(groups.get(item.source) ?? []), item]));
  return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
}

function CitationList({ storyId, citations, cited }: { storyId: string; citations: NewsCitation[]; cited: Set<number> }) {
  const shown = cited.size > 0 ? citations.filter((c) => cited.has(c.id)) : citations;
  if (shown.length === 0) return null;
  return (
    <SketchCard
      as="section"
      aria-labelledby="cited-heading"
      seed={`${storyId}:sources`}
      w={800}
      h={640}
      panel
      wedge
      wrapClassName="mt-10"
      className="px-5 pb-3.5 pt-[22px]"
    >
      <h2 id="cited-heading" className="mb-1.5 font-hand text-[32px] font-bold leading-none">
        {cited.size > 0 ? "Sources cited" : "Sources used"}
      </h2>
      <ol>
        {shown.map((c) => {
          const engagement = engagementLabel(c.source, c.engagement);
          return (
            <li
              key={c.id}
              id={`source-${c.id}`}
              className="flex scroll-mt-24 items-start gap-2.5 border-t border-dashed border-ink/25 px-2 py-2.5 transition-colors duration-300 first:border-t-0 target:bg-[#7db9ff]/35"
            >
              <span className="min-w-[26px] pt-0.5 font-mono text-xs font-bold text-pen">[{c.id}]</span>
              <SourceGlyph source={c.source} className="mt-0.5" still />
              <div className="min-w-0">
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold no-underline hover:underline">
                  {c.title}
                </a>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[11.5px] text-pencil">
                  <span>{c.sourceName}</span>
                  <span>{timeAgo(c.publishedAt)}</span>
                  {engagement && <span>{engagement}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </SketchCard>
  );
}

export interface BackgroundLesson {
  id: string;
  code: string;
  title: string;
  path: string;
}

export function StoryArticle({ story: initialStory, backgroundLessons = [] }: { story: StoryDTO; backgroundLessons?: BackgroundLesson[] }) {
  const router = useRouter();
  const [story, setStory] = useState(initialStory);
  const article = useStoryArticle(story.id);
  const saved = story.userState?.saved ?? false;

  const cited = useMemo(() => citedIdsIn(article.text), [article.text]);

  const scrollToSource = (id: number) => {
    const el = document.getElementById(`source-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    history.replaceState(null, "", `#source-${id}`);
    el.classList.add("bg-[#7db9ff]/35");
    setTimeout(() => el.classList.remove("bg-[#7db9ff]/35"), 1500);
  };

  const patch = async (body: { status?: "DISMISSED"; saved?: boolean }) => {
    const response = await fetch(`/api/news/stories/${story.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  };

  const toggleSave = async () => {
    const next = !saved;
    setStory((s) => ({ ...s, userState: { status: s.userState?.status ?? "READ", saved: next } }));
    try {
      await patch({ saved: next });
      toast.success(next ? "Story saved" : "Removed from saved");
    } catch {
      setStory((s) => ({ ...s, userState: { status: s.userState?.status ?? "READ", saved: !next } }));
      toast.error("Failed to update saved stories");
    }
  };

  const dismiss = async () => {
    try {
      await patch({ status: "DISMISSED" });
      router.push("/dashboard?tab=news");
    } catch {
      toast.error("Failed to dismiss story");
    }
  };

  const groups = groupByPlatform(story.items);
  const generating = article.status === "loading" || (article.status === "streaming" && !article.cached);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pb-16 pt-6 sm:px-6">
      <AppHeader active="news" />

      <Link
        href="/dashboard?tab=news"
        className="inline-flex min-h-11 items-center self-start font-hand text-2xl font-bold no-underline"
      >
        ← Breaking in AI
      </Link>

      <header className="flex max-w-[900px] flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {story.isBreaking && <BreakingMark />}
          <span className="font-mono text-xs text-pencil">
            First seen {timeAgo(story.firstSeenAt)} · Latest {timeAgo(story.lastSeenAt)} · {story.itemCount}{" "}
            {story.itemCount === 1 ? "source" : "sources"}
            {story.sourceCount > 1 ? ` on ${story.sourceCount} platforms` : ""}
          </span>
        </div>
        <h1 className="font-hand text-[40px] font-bold leading-[1.02] sm:text-[58px]">{story.headline}</h1>
        <HandUnderline width={420} />
        {story.whyItMatters && (
          <p className="max-w-[760px] text-[17px]">
            <span className="font-hand text-2xl font-bold text-pen">Why it matters: </span>
            {story.whyItMatters}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5">
          <SourceChips sources={story.sources} />
          <div className="ml-auto flex gap-2.5">
            <Button variant="outline" size="sm" onClick={toggleSave} aria-pressed={saved}>
              <BookmarkIcon saved={saved} size={16} />
              {saved ? "Saved" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              <CrossIcon size={14} /> Dismiss
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-11 lg:grid-cols-[minmax(0,1fr)_330px]">
        <main className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SparkleIcon />
            <span className="font-hand text-[22px] text-pencil">
              AI-generated from the sources on this page
              {article.cached && article.generatedAt ? ` · written ${timeAgo(article.generatedAt)}` : ""}
            </span>
            {article.status === "done" && (
              <button
                type="button"
                onClick={article.regenerate}
                className="sk-uline min-h-11 px-1 font-hand text-[21px] font-bold hover:text-pen focus-visible:outline-dashed focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-pen"
              >
                Regenerate
              </button>
            )}
          </div>

          {article.stale && article.status !== "loading" && (
            <div className="relative flex -rotate-[0.8deg] flex-wrap items-center gap-x-5 gap-y-3 bg-[#fff3b8] px-[22px] pb-[18px] pt-[22px]">
              <div aria-hidden className="absolute -top-2.5 left-[42%] h-5 w-[70px] -rotate-[4deg] bg-[rgba(220,210,180,.7)]" />
              <SketchFrame seed={`${story.id}:stale`} w={860} h={90} />
              <p className="relative flex-[1_1_360px] font-hand text-[25px]">This story has new coverage since the article was written.</p>
              <Button size="sm" variant="outline" onClick={article.regenerate} className="relative">
                Update article
              </Button>
            </div>
          )}

          {article.status === "loading" ? (
            <div className="sk-fade flex flex-col gap-3" aria-live="polite">
              <p className="font-hand text-2xl text-pencil">
                Reading {Math.min(story.itemCount, 12)} sources and writing the breakdown…
              </p>
              <ScribbleSkeleton />
            </div>
          ) : (
            <article aria-busy={generating} aria-live="polite" className="sk-fade">
              {article.text && <ArticleMarkdown markdown={article.text} citations={article.citations} onCite={scrollToSource} />}
              {generating && article.status === "streaming" && (
                <span className="sk-pulse ml-0.5 inline-block h-[1.1em] w-[2px] bg-ink align-[-2px]" aria-hidden />
              )}
              {article.status === "error" && (
                <div className="relative mt-4 bg-sheet p-4" role="alert">
                  <SketchFrame seed={`${story.id}:error`} w={700} h={60} tone="red" />
                  <p className="relative font-hand text-[22px] text-pen">
                    {article.error}{" "}
                    <button type="button" onClick={article.regenerate} className="font-bold underline">
                      Try again
                    </button>
                  </p>
                </div>
              )}
              {article.status === "done" && <CitationList storyId={story.id} citations={article.citations} cited={cited} />}
            </article>
          )}

          {(backgroundLessons.length > 0 || article.related.stories.length > 0 || article.related.papers.length > 0) && (
            <div className="mt-4 grid gap-9 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
              {backgroundLessons.length > 0 && (
                <section aria-labelledby="background-heading">
                  <h2 id="background-heading" className="mb-1.5 font-hand text-[30px] font-bold leading-none">
                    Background lessons
                  </h2>
                  <ul>
                    {backgroundLessons.map((lesson, i) => (
                      <li key={lesson.id} className="border-t border-dashed border-ink/25 first:border-t-0">
                        <Link href={`/learn/${lesson.path}/${lesson.id}`} className="flex min-h-11 items-start gap-2.5 py-2.5 no-underline">
                          <CapIcon />
                          <span>
                            <BrushTag size="sm" label={lesson.code} variant={lesson.id} delay={0.3 + i * 0.1} />{" "}
                            <span className="font-semibold">{lesson.title}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {(article.related.stories.length > 0 || article.related.papers.length > 0) && (
                <section aria-labelledby="related-heading">
                  <h2 id="related-heading" className="mb-1.5 font-hand text-[30px] font-bold leading-none">
                    Related in Sphere
                  </h2>
                  <ul>
                    {article.related.stories.map((s) => (
                      <li key={s.id} className="border-t border-dashed border-ink/25 first:border-t-0">
                        <Link href={`/news/${s.id}`} className="flex min-h-11 items-start gap-2.5 py-2.5 no-underline">
                          <NewspaperIcon />
                          <span className="min-w-0">
                            <span className="font-semibold">{s.headline}</span>
                            <br />
                            <span className="font-mono text-[11.5px] text-pencil">{timeAgo(s.lastSeenAt)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                    {article.related.papers.map((p) => (
                      <li key={p.id} className="border-t border-dashed border-ink/25 first:border-t-0">
                        <Link href={`/papers/${p.id}`} className="flex min-h-11 items-start gap-2.5 py-2.5 no-underline">
                          <PaperIcon />
                          <span className="min-w-0">
                            <span className="font-semibold">{p.title}</span>{" "}
                            <BrushTag size="xs" color="yellow" variant={1} still>
                              paper
                            </BrushTag>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </main>

        <aside aria-labelledby="coverage-heading" className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:p-4 lg:pl-0">
          <SketchCard seed={`${story.id}:coverage`} w={330} h={1000} wedge className="px-[18px] pb-4 pt-[22px]">
            <h2 id="coverage-heading" className="mb-2 font-hand text-[32px] font-bold leading-none">
              Coverage ({story.itemCount})
            </h2>
            {groups.map(([source, items]) => (
              <div key={source} className="mt-3.5">
                <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold">
                  <SourceGlyph source={source} />
                  {NEWS_SOURCE_LABELS[source]} ({items.length})
                </h3>
                <ul>
                  {items.map((item) => (
                    <StoryItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </SketchCard>
        </aside>
      </div>
    </div>
  );
}
