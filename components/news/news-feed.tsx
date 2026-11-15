"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { NewsFeedMeta, NewsFeedResponse, NewsSort, NewsWindow, StoryDTO } from "@/lib/news/dto";
import { timeAgo } from "@/lib/news/format";
import { NEWS_SOURCE_IDS, NEWS_SOURCE_LABELS, type NewsSourceId } from "@/lib/news/types";
import { AppHeader } from "@/components/sketch/app-header";
import { Brush, BrushTag, SketchFrame } from "@/components/sketch";
import { SOURCE_STYLES } from "./source-badge";
import { HandUnderline, RefreshIcon, WarningIcon } from "./sketch-icons";
import { StoryCard } from "./story-card";

/** How often the feed silently refreshes (the news pipeline runs every 15 min) */
const REFRESH_INTERVAL_MS = 2 * 60_000;
const PAGE_SIZE = 30;
const BREAKING_STRIP_SIZE = 3;

const WINDOWS: Array<{ id: NewsWindow; label: string }> = [
  { id: "24h", label: "24h" },
  { id: "3d", label: "3 days" },
  { id: "7d", label: "Week" },
];

type View = "all" | "saved";

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="sk-segs">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className="sk-seg"
        >
          <span className="sk-bseg" aria-hidden="true" />
          <span className="lbl">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function SourceStatus({ meta }: { meta: NewsFeedMeta }) {
  const failed = Object.entries(meta.sources)
    .filter(([, s]) => s.failed)
    .map(([id]) => NEWS_SOURCE_LABELS[id as NewsSourceId] ?? id);
  if (failed.length === 0) return null;
  return (
    <p className="mt-0.5 flex -rotate-[0.6deg] items-center gap-2 font-hand text-[22px] text-[#9a5b00]">
      <WarningIcon />
      {failed.join(", ")} {failed.length === 1 ? "was" : "were"} unavailable in the last update; stories may be missing.
    </p>
  );
}

/**
 * `tabs` is still accepted for callers that pass a section switch, but the
 * shared AppHeader now renders the Papers | News | Learn tabs itself.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function NewsFeed(_props: { tabs?: ReactNode } = {}) {
  const [timeWindow, setTimeWindow] = useState<NewsWindow>("24h");
  const [sort, setSort] = useState<NewsSort>("heat");
  const [view, setView] = useState<View>("all");
  const [sources, setSources] = useState<NewsSourceId[]>([]);
  const [stories, setStories] = useState<StoryDTO[]>([]);
  const [meta, setMeta] = useState<NewsFeedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const buildUrl = useCallback(
    (offset: number, limit = PAGE_SIZE) => {
      const params = new URLSearchParams({ window: timeWindow, sort, offset: String(offset), limit: String(limit) });
      if (sources.length > 0) params.set("source", sources.join(","));
      if (view === "saved") params.set("saved", "true");
      return `/api/news/stories?${params}`;
    },
    [timeWindow, sort, sources, view]
  );

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      const id = ++requestId.current;
      if (!silent) setLoading(true);
      try {
        // A silent refresh reloads everything currently shown
        const response = await fetch(buildUrl(0, silent ? Math.max(PAGE_SIZE, stories.length) : PAGE_SIZE));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data: NewsFeedResponse = await response.json();
        if (id !== requestId.current) return;
        setStories(data.stories);
        setMeta(data.meta);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        console.error("Error loading news:", err);
        if (!silent) setError("Failed to load news. Please try again.");
      } finally {
        if (id === requestId.current && !silent) setLoading(false);
      }
    },
    // stories.length is read for silent refreshes only; don't refetch when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buildUrl]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load({ silent: true });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await fetch(buildUrl(stories.length));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: NewsFeedResponse = await response.json();
      setStories((prev) => [...prev, ...data.stories.filter((s) => !prev.some((p) => p.id === s.id))]);
      setMeta(data.meta);
    } catch {
      toast.error("Failed to load more stories");
    } finally {
      setLoadingMore(false);
    }
  };

  const updateState = async (id: string, body: { status?: "DISMISSED"; saved?: boolean }) => {
    const response = await fetch(`/api/news/stories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  };

  const handleDismiss = async (id: string) => {
    const previous = stories;
    setStories((prev) => prev.filter((s) => s.id !== id));
    try {
      await updateState(id, { status: "DISMISSED" });
    } catch {
      setStories(previous);
      toast.error("Failed to dismiss story");
    }
  };

  const handleToggleSave = async (id: string, saved: boolean) => {
    const apply = (value: boolean) =>
      setStories((prev) =>
        prev
          .map((s) => (s.id === id ? { ...s, userState: { status: s.userState?.status ?? "NEW", saved: value } } : s))
          .filter((s) => view !== "saved" || s.userState?.saved)
      );
    apply(saved);
    try {
      await updateState(id, { saved });
      if (saved) toast.success("Story saved");
    } catch {
      apply(!saved);
      toast.error("Failed to update saved stories");
    }
  };

  const toggleSource = (source: NewsSourceId) =>
    setSources((prev) => (prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]));

  const showStrip = view === "all" && sort === "heat";
  const breaking = showStrip ? stories.filter((s) => s.isBreaking).slice(0, BREAKING_STRIP_SIZE) : [];
  const rest = stories.filter((s) => !breaking.includes(s));
  const total = meta?.total ?? 0;
  const enabledSources = NEWS_SOURCE_IDS.filter((id) => !meta?.skipped[id]);

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pb-16 pt-6 sm:px-6">
      <AppHeader active="news" />

      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-hand text-[48px] font-bold leading-none sm:text-[64px]">
            Breaking in{" "}
            <Brush color="pink" wide delay={0.3} className="px-1.5">
              AI
            </Brush>
          </h1>
          <HandUnderline width={300} />
          <p className="mt-2.5 max-w-[640px] text-pencil">
            Stories breaking across Hacker News, Reddit, GitHub, X and news outlets, grouped and ranked.
            {meta?.lastFetchedAt && <> Updated {timeAgo(meta.lastFetchedAt)}.</>}
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading} aria-label="Refresh">
          <RefreshIcon spinning={loading} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </section>

      <section aria-label="Filters" className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-7 gap-y-1.5">
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { id: "all", label: "All stories" },
              { id: "saved", label: "Saved" },
            ]}
          />
          {view === "all" && <Segmented label="Time window" value={timeWindow} onChange={setTimeWindow} options={WINDOWS} />}
          <Segmented
            label="Sort"
            value={sort}
            onChange={setSort}
            options={[
              { id: "heat", label: "Hottest" },
              { id: "latest", label: "Latest" },
            ]}
          />
        </div>
        <div role="group" aria-label="Filter by platform" className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="mr-1.5 font-hand text-[22px] font-bold" aria-hidden="true">
            Platforms:
          </span>
          {enabledSources.map((source, i) => {
            const active = sources.includes(source);
            // With no filter every platform is shown, so every tag is painted
            const painted = active || sources.length === 0;
            const text = `${SOURCE_STYLES[source].glyph} · ${NEWS_SOURCE_LABELS[source]}`;
            return (
              <button key={source} type="button" aria-pressed={active} onClick={() => toggleSource(source)} className="sk-chip">
                {painted ? (
                  <BrushTag color={SOURCE_STYLES[source].color} variant={source} delay={0.3 + i * 0.12}>
                    {text}
                  </BrushTag>
                ) : (
                  <span className="sk-crossed">{text}</span>
                )}
              </button>
            );
          })}
        </div>
        {meta && <SourceStatus meta={meta} />}
      </section>

      {loading && stories.length === 0 ? (
        <p className="sk-pulse py-16 font-hand text-[26px] text-pencil" aria-live="polite">
          Loading stories…
        </p>
      ) : error ? (
        <div className="relative bg-sheet p-6" role="alert">
          <SketchFrame seed="news-error" w={1192} h={90} tone="red" />
          <p className="relative font-hand text-[26px] text-pen">{error}</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="sk-fade relative bg-sheet p-7">
          <SketchFrame seed="news-empty" w={1192} h={120} dashed />
          <div className="relative font-hand text-[26px] text-pencil">
            {view === "saved" ? (
              "You haven't saved any stories yet. Use the bookmark on a story to keep it here."
            ) : !meta?.lastFetchedAt ? (
              <>
                <p className="text-ink">No news has been collected yet.</p>
                <p className="mt-1 font-sans text-sm">
                  News is fetched every 15 minutes by the background scheduler (<code className="font-mono">ENABLE_SCHEDULER=true</code>), or run{" "}
                  <code className="font-mono">npm run jobs:run -- process-news</code>.
                </p>
              </>
            ) : sources.length > 0 ? (
              <>
                No stories from the selected platforms in this window.
                <div>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setSources([])}>
                    Show all platforms
                  </Button>
                </div>
              </>
            ) : (
              <>
                No stories in this window.
                {timeWindow !== "7d" && (
                  <div>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setTimeWindow("7d")}>
                      Show the past week
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {breaking.length > 0 && (
            <section aria-labelledby="breaking-heading" className="flex flex-col gap-[22px]">
              <h2 id="breaking-heading" className="font-hand text-[40px] font-bold leading-none text-pen">
                Breaking now
              </h2>
              <div className="grid items-start gap-9 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
                {breaking.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    variant="breaking"
                    onDismiss={handleDismiss}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section aria-labelledby="stories-heading" className="flex flex-col gap-[22px]">
              <div className="flex items-baseline gap-3.5">
                <h2 id="stories-heading" className="font-hand text-[40px] font-bold leading-none">
                  {view === "saved" ? "Saved stories" : sort === "heat" ? "Top stories" : "Latest stories"}
                </h2>
                <span className="font-hand text-[22px] text-pencil">({rest.length})</span>
              </div>
              <div className="grid items-start gap-9 [grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr))]">
                {rest.map((story) => (
                  <StoryCard key={story.id} story={story} onDismiss={handleDismiss} onToggleSave={handleToggleSave} />
                ))}
              </div>
            </section>
          )}

          {stories.length < total && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore && <RefreshIcon spinning />}
                Load more ({total - stories.length} more)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
