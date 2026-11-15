import { NextResponse } from "next/server";
import { streamStoryArticle } from "@/lib/news/article";
import type { ArticleStreamEvent } from "@/lib/news/dto";
import { getSessionUserId } from "@/lib/news/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/news/stories/[id]/article[?regenerate=true]
 * Server-sent events with the AI article for a story (Story 8.6):
 * 1. data: {"citations": [...], "related": {...}, "cached": bool} (numbered sources)
 * 2. data: {"chunk": "..."} (Markdown, repeated; one chunk when cached)
 * 3. data: [DONE]   (or data: {"error": "..."})
 * A cached article is returned when it is still fresh; otherwise the source
 * content is fetched and a new article is generated and cached.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const regenerate = new URL(request.url).searchParams.get("regenerate") === "true";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (payload: ArticleStreamEvent | "[DONE]") => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${payload === "[DONE]" ? payload : JSON.stringify(payload)}\n\n`));
        } catch {
          closed = true; // client went away; keep generating so the article gets cached
        }
      };
      try {
        const outcome = await streamStoryArticle(params.id, { regenerate }, send);
        if (outcome === "not_found") send({ error: "Story not found" });
        else send("[DONE]");
      } catch (error) {
        console.error(`Error generating article for story ${params.id}:`, error);
        send({ error: "The article couldn't be generated right now. The sources are listed alongside." });
      } finally {
        if (!closed) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
