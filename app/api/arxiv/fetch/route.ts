import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchPapersFromArxiv } from "@/lib/arxiv";
import { scoreNovelty } from "@/lib/llm";
import { recordUsage } from "@/lib/billing/usage";
import { PaperStatus } from "@prisma/client";
import { isScheduledFetchActive } from "@/lib/jobs/status";

/**
 * Score a paper in the background (non-blocking)
 */
async function scorePaperInBackground(
  paperId: string,
  title: string,
  abstract: string,
  authors: Array<{ name: string }>,
  categories: string[]
) {
  try {
    const scoreResult = await scoreNovelty(title, abstract, authors, categories, (usage) =>
      void recordUsage({ feature: "novelty-score", billing: "PLATFORM", usage, paperId })
    );
    
    await db.paper.update({
      where: { id: paperId },
      data: {
        noveltyScore: scoreResult.score,
        noveltySummary: scoreResult.summary,
      },
    });
  } catch (error) {
    // Silently fail - paper remains available without score
    console.error(`Background scoring error for paper ${paperId}:`, error);
  }
}

export const runtime = "nodejs";

/**
 * POST /api/arxiv/fetch
 * Fetch new papers from arXiv and store them in the database
 * Called after user login to sync papers
 *
 * When the scheduled pipeline (Epic 6) is active, papers are already fetched,
 * scored and indexed in the background, so this only reports how many new
 * pre-processed papers are waiting. Otherwise it falls back to fetching now.
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (await isScheduledFetchActive()) {
      const newPapers = await db.paper.count({
        where: user.newPapersSince ? { createdAt: { gt: user.newPapersSince } } : {},
      });
      return NextResponse.json(
        { message: "Papers are pre-processed by the scheduled job", scheduled: true, newPapers },
        { status: 200 }
      );
    }

    // Get last fetch timestamp
    const lastFetchTimestamp = user.lastFetchTimestamp;
    const sinceDate = lastFetchTimestamp || null;

    // Fetch papers from arXiv (this can take time, but we handle errors gracefully)
    let fetchedPapers;
    try {
      fetchedPapers = await fetchPapersFromArxiv(sinceDate, 100);
    } catch (error) {
      console.error("Error fetching papers from arXiv:", error);
      // Return success but indicate partial failure
      return NextResponse.json(
        {
          message: "Paper fetch failed, but you can still use existing papers",
          error: "arXiv API unavailable",
        },
        { status: 503 }
      );
    }

    // Process and store papers
    let newPapersCount = 0;
    let updatedPapersCount = 0;

    for (const paperData of fetchedPapers) {
      try {
        // Upsert paper (update if exists, insert if new)
        const paper = await db.paper.upsert({
          where: { arxivId: paperData.arxivId },
          update: {
            title: paperData.title,
            authors: paperData.authors as any, // Prisma Json type
            abstract: paperData.abstract,
            publicationDate: paperData.publicationDate,
            updatedDate: paperData.updatedDate,
            categories: paperData.categories as any, // Prisma Json type
            pdfUrl: paperData.pdfUrl,
            htmlUrl: paperData.htmlUrl,
            updatedAt: new Date(),
          },
          create: {
            arxivId: paperData.arxivId,
            title: paperData.title,
            authors: paperData.authors as any,
            abstract: paperData.abstract,
            publicationDate: paperData.publicationDate,
            updatedDate: paperData.updatedDate,
            categories: paperData.categories as any,
            pdfUrl: paperData.pdfUrl,
            htmlUrl: paperData.htmlUrl,
          },
        });

        // Check if this is a new paper or updated
        const wasCreated = paper.createdAt.getTime() === paper.updatedAt.getTime();
        if (wasCreated) {
          newPapersCount++;
        } else {
          updatedPapersCount++;
        }

        // Create UserPaperState if it doesn't exist (for new papers)
        // inLibrary defaults to false - papers are not in library until explicitly added
        const existingState = await db.userPaperState.findUnique({
          where: {
            userId_paperId: {
              userId: user.id,
              paperId: paper.id,
            },
          },
        });

        if (!existingState) {
          await db.userPaperState.create({
            data: {
              userId: user.id,
              paperId: paper.id,
              status: PaperStatus.NEW,
              inLibrary: false, // Explicitly set to false (though it's the default)
            },
          });
        }

        // Score paper for novelty (async, don't block)
        // Only score if paper doesn't have a score yet
        if (paper.noveltyScore === null && wasCreated) {
          // Score in background - don't await to avoid blocking
          scorePaperInBackground(paper.id, paper.title, paper.abstract, paperData.authors, paperData.categories).catch(
            (err) => {
              console.error(`Background scoring failed for paper ${paper.id}:`, err);
              // Silently fail - paper is still available without score
            }
          );
        }
      } catch (error) {
        console.error(`Error processing paper ${paperData.arxivId}:`, error);
        // Continue processing other papers
      }
    }

    // Update user's last fetch timestamp
    await db.user.update({
      where: { id: user.id },
      data: { lastFetchTimestamp: new Date() },
    });

    return NextResponse.json(
      {
        message: "Papers fetched successfully",
        newPapers: newPapersCount,
        updatedPapers: updatedPapersCount,
        totalFetched: fetchedPapers.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in arXiv fetch route:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching papers" },
      { status: 500 }
    );
  }
}

