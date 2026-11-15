import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoreNovelty, type LLMUsage } from "@/lib/llm";
import { getSessionUserId } from "@/lib/news/session";
import { aiAccessDenied, authorizeAiUsage } from "@/lib/billing/account";
import { recordUsage } from "@/lib/billing/usage";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/score
 * Score a paper for novelty (fallback for papers the background job hasn't scored yet).
 *
 * Billing: requires a paid plan, but the cost is recorded as platform cost
 * rather than charged, because the score is stored for every user.
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

    // Get paper from database
    const paper = await db.paper.findUnique({
      where: { id: params.id },
    });

    if (!paper) {
      return NextResponse.json(
        { error: "Paper not found" },
        { status: 404 }
      );
    }

    // Check if already scored (optional - can allow re-scoring)
    // If already scored, no model call is needed
    if (paper.noveltyScore !== null) {
      return NextResponse.json(
        {
          message: "Paper already scored",
          score: paper.noveltyScore,
          summary: paper.noveltySummary,
        },
        { status: 200 }
      );
    }

    const access = await authorizeAiUsage(userId);
    if (!access.allowed) return aiAccessDenied(access);

    // Extract data for scoring
    const authors = Array.isArray(paper.authors)
      ? (paper.authors as Array<{ name: string }>)
      : [];
    const categories = Array.isArray(paper.categories)
      ? (paper.categories as string[])
      : [];

    // Score paper using LLM
    let scoreResult;
    let usage: LLMUsage | undefined;
    try {
      scoreResult = await scoreNovelty(paper.title, paper.abstract, authors, categories, (u) => (usage = u));
    } catch (error) {
      await recordUsage({ feature: "novelty-score", billing: "PLATFORM", usage, paperId: paper.id });
      console.error("Error scoring paper:", error);
      // Graceful degradation - return error but don't crash
      return NextResponse.json(
        {
          error: "Novelty scoring service unavailable",
          message: "The scoring service is currently unavailable. The paper is still available for reading.",
        },
        { status: 503 }
      );
    }

    await recordUsage({ feature: "novelty-score", billing: "PLATFORM", usage, paperId: paper.id });

    // Update paper with novelty score
    const updatedPaper = await db.paper.update({
      where: { id: paper.id },
      data: {
        noveltyScore: scoreResult.score,
        noveltySummary: scoreResult.summary,
      },
    });

    return NextResponse.json(
      {
        message: "Paper scored successfully",
        score: updatedPaper.noveltyScore,
        summary: updatedPaper.noveltySummary,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in novelty scoring route:", error);
    return NextResponse.json(
      { error: "An error occurred while scoring the paper" },
      { status: 500 }
    );
  }
}

