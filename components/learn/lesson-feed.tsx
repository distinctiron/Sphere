"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Newspaper } from "lucide-react";
import type { LessonFeed } from "@/lib/learn/feed";
import { timeAgo } from "@/lib/news/format";

/** "In your feed": this week's stories and papers that the lesson helps explain (Story 9.5) */
export function LessonFeedLinks({ lessonId }: { lessonId: string }) {
  const [feed, setFeed] = useState<LessonFeed | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/learn/lessons/${lessonId}/feed`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setFeed)
      .catch((err) => err.name !== "AbortError" && setFailed(true));
    return () => controller.abort();
  }, [lessonId]);

  return (
    <section aria-labelledby="feed-heading">
      <h2 id="feed-heading" className="mb-3 font-hand text-[24px] font-bold leading-none">
        In your feed
      </h2>
      {!feed && !failed && (
        <div className="space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="sk-pulse h-8 bg-[repeating-linear-gradient(-55deg,rgba(34,37,46,0.12)_0_1.3px,transparent_1.3px_6px)]" />
          ))}
        </div>
      )}
      {failed && <p className="text-sm text-pen">Couldn&apos;t load related items.</p>}
      {feed && feed.stories.length === 0 && feed.papers.length === 0 && (
        <p className="text-sm text-pencil">Nothing in this week&apos;s News or your papers touches this lesson yet.</p>
      )}
      {feed && (
        <ul className="space-y-3.5 text-sm">
          {feed.stories.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <Newspaper className="mt-0.5 h-4 w-4 flex-shrink-0 text-pencil" />
              <div className="min-w-0">
                <Link href={`/news/${s.id}`} className="line-clamp-2 font-semibold text-ink no-underline hover:text-pen">
                  {s.headline}
                </Link>
                <div className="font-mono text-[11px] text-pencil">
                  {s.isBreaking && <span className="mr-1 font-hand text-base font-bold text-pen">Breaking ·</span>}
                  {timeAgo(s.lastSeenAt)} · {s.keywords.slice(0, 2).join(", ")}
                </div>
              </div>
            </li>
          ))}
          {feed.papers.map((p) => (
            <li key={p.id} className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-pencil" />
              <div className="min-w-0">
                <Link href={`/papers/${p.id}`} className="line-clamp-2 font-semibold text-ink no-underline hover:text-pen">
                  {p.title}
                </Link>
                <div className="font-mono text-[11px] text-pencil">
                  {p.inLibrary ? "In your library" : "Paper"} · {p.keywords.slice(0, 2).join(", ")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
