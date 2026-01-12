import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { scoreNovelty } from "@/lib/llm";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/score
 * Score a paper for novelty
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
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

    // Extract data for scoring
    const authors = Array.isArray(paper.authors)
      ? (paper.authors as Array<{ name: string }>)
      : [];
    const categories = Array.isArray(paper.categories)
      ? (paper.categories as string[])
      : [];

    // Score paper using LLM
    let scoreResult;
    try {
      scoreResult = await scoreNovelty(
        paper.title,
        paper.abstract,
        authors,
        categories
      );
    } catch (error) {
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

