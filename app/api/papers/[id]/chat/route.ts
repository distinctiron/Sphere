import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/news/session";
import { aiAccessDenied, authorizeAiUsage } from "@/lib/billing/account";
import { meteredSseResponse } from "@/lib/billing/metered-stream";
import { getChatContext, getFullTextFallback } from "@/lib/rag/context";
import { buildRetrievalQuery, formatSourcesForPrompt, trimHistory } from "@/lib/rag/query";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/chat
 * Chat with paper using LLM streaming
 * Returns streaming response
 *
 * RAG (Story 7.6): each message retrieves fresh chunks for the current question
 * (anchored to the previous question for short follow-ups). The first SSE event
 * carries the citations: data: {"citations": [...]}. If retrieval is unavailable
 * the paper's extracted text is used instead.
 *
 * Billing: every message is metered (lib/billing). Free users and empty
 * wallets get 402 with a `code` the client uses to show the payment wall.
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

    const access = await authorizeAiUsage(userId);
    if (!access.allowed) return aiAccessDenied(access);

    // Parse request body
    const body = await request.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
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

    // Validate conversation history format
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (
          msg &&
          typeof msg === "object" &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string"
        ) {
          history.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // The client includes the message being sent as the last history entry;
    // drop it so it isn't sent to the LLM twice and "first message" is detectable
    const lastTurn = history[history.length - 1];
    if (lastTurn?.role === "user" && lastTurn.content.trim() === message.trim()) {
      history = history.slice(0, -1);
    }

    // Keep the prompt within model limits: recent turns only
    const trimmedHistory = trimHistory(history);

    return meteredSseResponse(
      { userId, feature: "paper-chat", billing: access.billing, paperId: paper.id },
      "Deep Dive service unavailable. Please try again.",
      async ({ send, onUsage }) => {
        // Retrieve fresh context for this turn
        const rag = await getChatContext(paper.id, buildRetrievalQuery(message.trim(), trimmedHistory));
        send({ citations: rag.citations, ragStatus: rag.status });

        const fullContent = rag.citations.length === 0 ? await getFullTextFallback(paper.htmlUrl) : undefined;

        // Import LLM service dynamically to handle streaming
        const { chatWithPaperStreaming } = await import("@/lib/llm");
        await chatWithPaperStreaming(
          message.trim(),
          {
            title: paper.title,
            abstract: paper.abstract || "",
            fullContent,
            sources: rag.citations.length > 0 ? formatSourcesForPrompt(rag.citations) : undefined,
          },
          trimmedHistory,
          (chunk: string) => send({ chunk }),
          onUsage
        );
      }
    );
  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

