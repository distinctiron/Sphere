import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/news/session";
import { aiAccessDenied, authorizeAiUsage } from "@/lib/billing/account";
import { meteredSseResponse } from "@/lib/billing/metered-stream";
import { getSelectionContext } from "@/lib/rag/context";
import { formatSourcesForPrompt } from "@/lib/rag/query";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/explain
 * Generate explanation for selected text using LLM
 * Returns streaming response
 *
 * Body: { text: string, surroundingText?: string }
 * RAG (Story 7.5): the passages most relevant to the selection are retrieved
 * (hybrid semantic + position search) and sent to the LLM as numbered sources.
 * The first SSE event carries the citations: data: {"citations": [...]}.
 * Without an index or relevant passages, the explanation uses the selection only.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Billing: each explanation is metered; free users / empty wallets get 402
    const access = await authorizeAiUsage(userId);
    if (!access.allowed) return aiAccessDenied(access);

    // Parse request body
    const body = await request.json();
    const { text, surroundingText } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Get paper from database for context
    const paper = await db.paper.findUnique({
      where: { id: params.id },
    });

    if (!paper) {
      return NextResponse.json(
        { error: "Paper not found" },
        { status: 404 }
      );
    }

    const selection = text.trim();
    const paragraph =
      typeof surroundingText === "string" && surroundingText.trim()
        ? surroundingText.trim().slice(0, 4000)
        : undefined;

    return meteredSseResponse(
      { userId, feature: "explain", billing: access.billing, paperId: paper.id },
      "Explanation unavailable. Try the Deep Dive panel for more help.",
      async ({ send, onUsage }) => {
        const rag = await getSelectionContext(paper.id, selection, paragraph);
        send({ citations: rag.citations, ragStatus: rag.status });

        // Import LLM service dynamically to handle streaming
        const { explainTextStreaming } = await import("@/lib/llm");
        await explainTextStreaming(
          selection,
          {
            title: paper.title,
            abstract: paper.abstract,
            surroundingText: paragraph,
            sources: rag.citations.length > 0 ? formatSourcesForPrompt(rag.citations) : undefined,
          },
          (chunk: string) => send({ chunk }),
          onUsage
        );
      }
    );
  } catch (error) {
    console.error("Error in explanation route:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the explanation" },
      { status: 500 }
    );
  }
}
